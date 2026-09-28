-- Search preferences the discover workflow reads on every run: where to look (ordered location tiers,
-- earlier tiers preferred) and how recent a posting must be. A single row (id is always true).
create table if not exists search_preferences (
  id boolean primary key default true check (id),
  location_tiers jsonb not null default '[["Perth","Remote"],["Australia"]]'::jsonb,
  posted_within_days integer not null default 7 check (posted_within_days between 1 and 365),
  updated_at timestamptz not null default now()
);

insert into search_preferences (id) values (true) on conflict do nothing;

alter table search_preferences enable row level security;
