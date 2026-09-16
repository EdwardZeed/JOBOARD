// Best-effort scraper for job posting pages. Most job boards and ATS pages
// (LinkedIn, SEEK, Greenhouse, Lever, Ashby, Workday...) embed schema.org
// `JobPosting` JSON-LD for Google for Jobs SEO — that's the most reliable
// source when present. Falls back to Open Graph tags, then <title>. Never
// throws: a failed/partial scrape just means the caller gets fewer fields
// and the user fills the rest in by hand.

const KNOWN_SOURCES: Record<string, string> = {
  'linkedin.com': 'LinkedIn',
  'seek.com.au': 'SEEK',
  'indeed.com': 'Indeed',
  'glassdoor.com': 'Glassdoor',
  'greenhouse.io': 'Greenhouse',
  'lever.co': 'Lever',
  'ashbyhq.com': 'Ashby',
  'workable.com': 'Workable',
  'myworkdayjobs.com': 'Workday',
  'jobadder.com': 'JobAdder',
  'teamtailor.com': 'Teamtailor',
  'smartrecruiters.com': 'SmartRecruiters',
  'bamboohr.com': 'BambooHR',
};

export function guessSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, label] of Object.entries(KNOWN_SOURCES)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) return label;
    }
    return hostname;
  } catch {
    return '未知';
  }
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (m) => HTML_ENTITIES[m] ?? m);
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]).trim() : undefined;
}

// Many ATS pages don't set og:site_name, but their <title> often reads
// "<Position> at <Company>" and their logo <img alt="<Company> Logo">.
function guessCompanyFromTitleOrLogo(html: string): string | undefined {
  const title = extractTitleTag(html);
  const titleMatch = title?.match(/\bat\s+([^|\-–—]+?)\s*$/i);
  if (titleMatch) return titleMatch[1].trim();

  const logoMatch = html.match(/<img[^>]+alt=["']([^"']+?)\s+logo["']/i);
  if (logoMatch) return decodeHtmlEntities(logoMatch[1]).trim();

  return undefined;
}

function extractMetaTags(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const attrRegex = /([a-zA-Z][a-zA-Z0-9:_-]*)\s*=\s*"([^"]*)"|([a-zA-Z][a-zA-Z0-9:_-]*)\s*=\s*'([^']*)'/g;

  for (const tagMatch of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const attrMatch of tagMatch[0].matchAll(attrRegex)) {
      const key = (attrMatch[1] ?? attrMatch[3])?.toLowerCase();
      const value = attrMatch[2] ?? attrMatch[4];
      if (key) attrs[key] = value;
    }
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    if (key && attrs.content !== undefined) {
      map.set(key, decodeHtmlEntities(attrs.content));
    }
  }

  return map;
}

interface JsonLdJobPosting {
  title?: string;
  description?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?: JsonLdJobLocation | JsonLdJobLocation[];
}

interface JsonLdJobLocation {
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string | { name?: string };
  };
}

function extractJobPostingJsonLd(html: string): JsonLdJobPosting | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptRegex)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const candidates: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>)['@graph'])
        ? ((parsed as Record<string, unknown>)['@graph'] as unknown[])
        : [parsed];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const type = (candidate as Record<string, unknown>)['@type'];
      const types = Array.isArray(type) ? type : [type];
      if (types.includes('JobPosting')) return candidate as JsonLdJobPosting;
    }
  }

  return null;
}

function formatLocation(jobLocation: JsonLdJobPosting['jobLocation']): string | undefined {
  const first = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  const address = first?.address;
  if (!address) return undefined;

  const country = typeof address.addressCountry === 'string' ? address.addressCountry : address.addressCountry?.name;
  const parts = [address.addressLocality, address.addressRegion, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

export interface ScrapedJobPosting {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  source: string;
  error?: string;
}

export async function fetchJobPosting(url: string): Promise<ScrapedJobPosting> {
  const source = guessSourceFromUrl(url);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { source, error: '不是一个有效的 URL' };
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { source, error: '只支持 http(s) 链接' };
  }

  try {
    const response = await fetch(parsedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return { source, error: `抓取失败（HTTP ${response.status}）` };
    }

    const html = await response.text();
    const jobPosting = extractJobPostingJsonLd(html);
    const meta = extractMetaTags(html);

    const title = jobPosting?.title?.trim() || meta.get('og:title') || extractTitleTag(html);

    const orgRaw = jobPosting?.hiringOrganization;
    const company =
      (typeof orgRaw === 'string' ? orgRaw : orgRaw?.name)?.trim() ||
      meta.get('og:site_name') ||
      guessCompanyFromTitleOrLogo(html);

    // og:description is unreliable off ATS pages — some (Greenhouse) put the
    // office location there instead of a real description. A real job
    // description is virtually always longer than a location line, so treat
    // a short one as a location guess instead of mislabeling it as the
    // description.
    const ogDescription = meta.get('og:description');
    const isLongEnoughForDescription = Boolean(ogDescription && ogDescription.length >= 80);

    const location = formatLocation(jobPosting?.jobLocation) ?? (!isLongEnoughForDescription ? ogDescription : undefined);

    const rawDescription = jobPosting?.description || (isLongEnoughForDescription ? ogDescription : undefined);
    const description = rawDescription ? stripHtml(rawDescription).slice(0, 800) : undefined;

    return { title, company, location, description, source };
  } catch (err) {
    return { source, error: err instanceof Error ? err.message : '抓取失败' };
  }
}
