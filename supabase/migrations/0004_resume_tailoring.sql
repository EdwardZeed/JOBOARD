-- Resume tailoring support for the agentic search/match loop.
--
-- profile_resume: the user's current resume as full text, used by the
-- think/match stages instead of the thin profile_skills list. Multiple rows
-- are allowed (kept as history); callers always take the most recent by
-- updated_at.
create table if not exists profile_resume (
  id uuid primary key default gen_random_uuid(),
  source_filename text,
  full_text text not null,
  updated_at timestamptz not null default now()
);

create index if not exists profile_resume_updated_at_idx on profile_resume (updated_at desc);

alter table profile_resume enable row level security;

-- job_postings: per-posting tailored resume artifact, produced by the match
-- stage when match_score is below the apply threshold.
alter table job_postings add column if not exists tailored_resume_text text;
alter table job_postings add column if not exists tailored_match_score numeric(5, 2);
alter table job_postings add column if not exists resume_tailored_at timestamptz;

alter table job_postings drop constraint if exists job_postings_tailored_match_score_check;
alter table job_postings add constraint job_postings_tailored_match_score_check
  check (tailored_match_score is null or (tailored_match_score >= 0 and tailored_match_score <= 100));
