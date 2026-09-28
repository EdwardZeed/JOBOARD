-- Site-restricted search through Tavily returned no individual job pages for seek.com.au (0 of 60 results
-- were /job/<id> pages; SEEK detail pages are client-rendered and not indexed), so the default is empty.
-- The column stays for other job boards.
alter table search_preferences alter column site_domains set default '[]'::jsonb;
update search_preferences set site_domains = '[]'::jsonb;
