-- Cache the search keywords derived from a resume on the resume row itself, so the
-- cron-driven discover workflow does not re-read and re-process the resume every run.
-- A new resume version is a new row with null keywords, which invalidates the cache.
alter table profile_resume add column if not exists search_keywords jsonb;
alter table profile_resume add column if not exists search_keywords_at timestamptz;
