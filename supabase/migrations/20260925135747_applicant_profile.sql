-- Single-user server-only application profile, matching Joboard's existing access model.
create table public.applicant_profile (
  id boolean primary key default true check (id),
  facts jsonb not null default '{}'::jsonb check (jsonb_typeof(facts) = 'object'),
  confirmed_fields text[] not null default '{}',
  resume_id uuid references public.profile_resume(id) on delete set null,
  resume_file_path text,
  resume_file_sha256 text check (resume_file_sha256 is null or resume_file_sha256 ~ '^[0-9a-f]{64}$'),
  resume_file_confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.applicant_profile enable row level security;
revoke all on public.applicant_profile from anon, authenticated;
grant select, insert, update, delete on public.applicant_profile to service_role;
create trigger applicant_profile_updated_at before update on public.applicant_profile
for each row execute function public.set_updated_at();
comment on table public.applicant_profile is 'Single-user private job application facts. Only explicitly confirmed_fields may be used as answers. No account passwords.';
