-- Joboard initial schema
-- Single-user job search tracker. All tables have RLS enabled with no
-- permissive policies: only the service_role key (used server-side by the
-- Next.js dashboard and the MCP server) can read/write. anon/authenticated
-- clients have zero access by default.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- applications: the core job-application tracker
-- ---------------------------------------------------------------------------
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  position text not null,
  job_url text,
  source text,
  location text,
  remote_type text check (remote_type in ('onsite', 'hybrid', 'remote')),
  salary_min integer,
  salary_max integer,
  status text not null default 'wishlist' check (
    status in (
      'wishlist',
      'applied',
      'phone_screen',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
      'ghosted'
    )
  ),
  match_score numeric(5, 2) check (match_score is null or (match_score >= 0 and match_score <= 100)),
  tech_stack text[] not null default '{}',
  resume_version text,
  notes text,
  applied_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_status_idx on applications (status);
create index if not exists applications_company_idx on applications (company);
create index if not exists applications_created_at_idx on applications (created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists applications_set_updated_at on applications;
create trigger applications_set_updated_at
  before update on applications
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- application_events: append-only status/timeline history per application
-- ---------------------------------------------------------------------------
create table if not exists application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  event_type text not null default 'status_change' check (
    event_type in ('status_change', 'note', 'agent_action')
  ),
  from_status text,
  to_status text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists application_events_application_id_idx
  on application_events (application_id, created_at desc);

-- ---------------------------------------------------------------------------
-- job_postings: raw postings discovered by the agent's search stage,
-- before a decision is made to turn them into an application
-- ---------------------------------------------------------------------------
create table if not exists job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  url text,
  description text,
  tech_stack text[] not null default '{}',
  source text,
  match_score numeric(5, 2) check (match_score is null or (match_score >= 0 and match_score <= 100)),
  status text not null default 'new' check (
    status in ('new', 'reviewed', 'matched', 'applied', 'skipped')
  ),
  application_id uuid references applications (id) on delete set null,
  discovered_at timestamptz not null default now()
);

create index if not exists job_postings_status_idx on job_postings (status);
create index if not exists job_postings_discovered_at_idx on job_postings (discovered_at desc);

-- ---------------------------------------------------------------------------
-- tech_trend_signals: one row per observed mention of a technology,
-- typically logged after the agent parses a job description
-- ---------------------------------------------------------------------------
create table if not exists tech_trend_signals (
  id uuid primary key default gen_random_uuid(),
  tech_name text not null,
  source text,
  weight numeric(5, 2) not null default 1,
  observed_at timestamptz not null default now()
);

create index if not exists tech_trend_signals_tech_name_idx
  on tech_trend_signals (tech_name, observed_at desc);

-- Weekly aggregate of tech demand signals, used by the /trends dashboard page.
create or replace view tech_trend_weekly as
select
  date_trunc('week', observed_at) as week_start,
  tech_name,
  count(*) as mentions,
  sum(weight) as weighted_mentions
from tech_trend_signals
group by 1, 2
order by 1 desc, weighted_mentions desc;

-- ---------------------------------------------------------------------------
-- agent_runs: observability log for each agentic-loop iteration
-- (populated once the agent loop itself is built; empty for now)
-- ---------------------------------------------------------------------------
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (
    stage in ('think', 'search', 'match', 'apply', 'update_status', 'sync')
  ),
  summary text,
  detail jsonb not null default '{}'::jsonb,
  status text not null default 'running' check (
    status in ('running', 'success', 'error')
  ),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists agent_runs_started_at_idx on agent_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- profile_skills: the user's current skill set, for gap analysis against
-- tech_trend_weekly on the /trends page
-- ---------------------------------------------------------------------------
create table if not exists profile_skills (
  id uuid primary key default gen_random_uuid(),
  skill_name text not null unique,
  proficiency smallint check (proficiency between 1 and 5),
  updated_at timestamptz not null default now()
);

drop trigger if exists profile_skills_set_updated_at on profile_skills;
create trigger profile_skills_set_updated_at
  before update on profile_skills
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: lock every table down to service_role only
-- ---------------------------------------------------------------------------
alter table applications enable row level security;
alter table application_events enable row level security;
alter table job_postings enable row level security;
alter table tech_trend_signals enable row level security;
alter table agent_runs enable row level security;
alter table profile_skills enable row level security;
