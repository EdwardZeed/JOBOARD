-- Tavily accepts a country to bias results towards; without it a query like "qa jobs remote"
-- returns listings from everywhere. Stored next to the other search preferences.
alter table search_preferences add column if not exists country text not null default 'australia';
alter table search_preferences add column if not exists site_domains jsonb not null default '["seek.com.au"]'::jsonb;
