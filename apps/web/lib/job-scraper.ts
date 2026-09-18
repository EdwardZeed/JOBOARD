// Best-effort scraper for job posting pages. Most job boards and ATS pages
// (LinkedIn, SEEK, Greenhouse, Lever, Ashby, Workday...) embed schema.org
// `JobPosting` JSON-LD for Google for Jobs SEO — that's the most reliable
// source when present. Falls back to Open Graph tags, then <title>. Never
// throws: a failed/partial scrape just means the caller gets fewer fields
// and the user fills the rest in by hand.

const KNOWN_SOURCES: Record<string, string> = {
  'linkedin.com': 'LinkedIn',
  'seek.com.au': 'SEEK',
  'seek.com': 'SEEK',
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

// Multi-tenant job boards with their own prominent branding — their
// og:site_name / logo alt text names the platform, never the employer.
const AGGREGATOR_SOURCES = new Set(['LinkedIn', 'SEEK', 'Indeed', 'Glassdoor']);

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

// LinkedIn's job-search UI links to `/jobs/search-results/?currentJobId=...`
// (what you copy when clicking a job out of a results list) — that URL
// requires a login session and bounces to /uas/login for a logged-out
// fetch. SEEK's search results pages similarly carry the specific job only
// as a `?jobId=` query param, with none of that job's data in the static
// HTML (it's client-rendered). Both have a public canonical permalink that
// IS statically fetchable, so rewrite to it before ever hitting the network.
export function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');

    if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) {
      const jobId = parsed.searchParams.get('currentJobId');
      if (jobId && /^\d+$/.test(jobId)) {
        return `https://www.linkedin.com/jobs/view/${jobId}/`;
      }
    }

    if (hostname === 'seek.com.au' || hostname.endsWith('.seek.com.au') || hostname === 'seek.com' || hostname.endsWith('.seek.com')) {
      const jobId = parsed.searchParams.get('jobId');
      if (jobId && /^\d+$/.test(jobId) && !/^\/job\//.test(parsed.pathname)) {
        return `${parsed.protocol}//${parsed.hostname}/job/${jobId}`;
      }
    }

    return url;
  } catch {
    return url;
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

// A redirect to a login/signin page is the single most common failure mode
// across job boards (LinkedIn especially) — the fetch still comes back 200,
// so it looks like a successful scrape unless we explicitly check for it.
function looksLikeAuthWall(finalUrl: string, title: string | undefined): boolean {
  try {
    if (/\/(login|signin|sign-in|authwall)(\/|$)/i.test(new URL(finalUrl).pathname)) return true;
  } catch {
    // ignore
  }
  return title ? /\b(log\s?in|sign\s?in)\b/i.test(title) : false;
}

// LinkedIn's public job page <title>/og:title doesn't embed JSON-LD, and the
// text format itself isn't stable across requests — seen both
// "<Company> hiring <Position> in <Location> | LinkedIn" and
// "<Position> at <Company> — <Location> | LinkedIn Jobs". Try each.
function parseLinkedInTitle(title: string): { company?: string; position?: string; location?: string } | null {
  const hiringMatch = title.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)\s*\|\s*LinkedIn(?:\s+Jobs)?\s*$/i);
  if (hiringMatch) {
    return { company: hiringMatch[1].trim(), position: hiringMatch[2].trim(), location: hiringMatch[3].trim() };
  }

  const atMatch = title.match(/^(.+?)\s+at\s+(.+?)\s*[—-]\s*(.+?)\s*\|\s*LinkedIn(?:\s+Jobs)?\s*$/i);
  if (atMatch) {
    return { position: atMatch[1].trim(), company: atMatch[2].trim(), location: atMatch[3].trim() };
  }

  return null;
}

// SEEK's job page <title>/og:title reads "<Position> Job in <Location> - SEEK"
// — no company in it (see guessCompanyFromAriaLabel for where that comes from).
function parseSeekTitle(title: string): { position?: string; location?: string } | null {
  const match = title.match(/^(.+?)\s+Job\s+in\s+(.+?)\s*-\s*SEEK\s*$/i);
  if (!match) return null;
  return { position: match[1].trim(), location: match[2].trim() };
}

// SEEK (and other sites using the same accessibility convention) render an
// "Apply for <position> at <company>" aria-label on the apply button. Unlike
// og:site_name/logo alt, this names the specific listing's employer even on
// a multi-tenant aggregator, so it's safe to trust regardless of source.
function guessCompanyFromAriaLabel(html: string): string | undefined {
  const match = html.match(/aria-label=["']Apply for .+? at ([^"']+?)["']/i);
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
  /** The URL actually fetched, after normalization (e.g. LinkedIn search-results -> /jobs/view/). */
  resolvedUrl: string;
  error?: string;
}

export async function fetchJobPosting(rawUrl: string): Promise<ScrapedJobPosting> {
  const url = normalizeJobUrl(rawUrl);
  const source = guessSourceFromUrl(url);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { source, resolvedUrl: url, error: '不是一个有效的 URL' };
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { source, resolvedUrl: url, error: '只支持 http(s) 链接' };
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
      return { source, resolvedUrl: url, error: `抓取失败（HTTP ${response.status}）` };
    }

    const html = await response.text();
    const titleTag = extractTitleTag(html);

    if (looksLikeAuthWall(response.url, titleTag)) {
      return { source, resolvedUrl: url, error: '这个链接需要登录才能查看，抓取被拦截（返回了登录页）' };
    }

    const jobPosting = extractJobPostingJsonLd(html);
    const meta = extractMetaTags(html);
    const ogTitle = meta.get('og:title');

    const linkedInParsed =
      source === 'LinkedIn' ? (parseLinkedInTitle(ogTitle ?? '') ?? parseLinkedInTitle(titleTag ?? '')) : null;
    const seekParsed = source === 'SEEK' ? (parseSeekTitle(ogTitle ?? '') ?? parseSeekTitle(titleTag ?? '')) : null;

    const title = jobPosting?.title?.trim() || linkedInParsed?.position || seekParsed?.position || ogTitle || titleTag;

    // og:site_name and a page's "logo" alt text are reliable company signals
    // on single-tenant ATS pages (Greenhouse, Lever, Ashby...) but actively
    // wrong on multi-tenant aggregators (SEEK, Indeed, Glassdoor, and
    // LinkedIn when its own title parser doesn't match) — those sites' own
    // branding logo/site-name is what gets picked up, not the employer's.
    // Better to leave company blank (a visible "fill this in" placeholder)
    // than to silently store the job board's own name as the company.
    const isAggregator = AGGREGATOR_SOURCES.has(source);

    const orgRaw = jobPosting?.hiringOrganization;
    const company =
      (typeof orgRaw === 'string' ? orgRaw : orgRaw?.name)?.trim() ||
      linkedInParsed?.company ||
      guessCompanyFromAriaLabel(html) ||
      (isAggregator ? undefined : meta.get('og:site_name')) ||
      (isAggregator ? undefined : guessCompanyFromTitleOrLogo(html));

    // og:description is unreliable off ATS pages — some (Greenhouse) put the
    // office location there instead of a real description. A real job
    // description is virtually always longer than a location line, so treat
    // a short one as a location guess instead of mislabeling it as the
    // description.
    const ogDescription = meta.get('og:description');
    const isLongEnoughForDescription = Boolean(ogDescription && ogDescription.length >= 80);

    const location =
      formatLocation(jobPosting?.jobLocation) ??
      linkedInParsed?.location ??
      seekParsed?.location ??
      (!isLongEnoughForDescription ? ogDescription : undefined);

    const rawDescription = jobPosting?.description || (isLongEnoughForDescription ? ogDescription : undefined);
    const description = rawDescription ? stripHtml(rawDescription).slice(0, 800) : undefined;

    return { title, company, location, description, source, resolvedUrl: url };
  } catch (err) {
    return { source, resolvedUrl: url, error: err instanceof Error ? err.message : '抓取失败' };
  }
}
