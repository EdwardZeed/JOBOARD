-- The match/tailor stage needs a *structured* resume to render into the
-- print-styled template (not just the freeform full_text used for LLM
-- matching). Add structured storage alongside the existing free text.

alter table profile_resume add column if not exists structured jsonb;

-- tailored_resume_text (plain text) was never populated by anything yet —
-- replace it with a structured column so the rendered tailored resume can
-- reuse the same template as the canonical resume.
alter table job_postings drop column if exists tailored_resume_text;
alter table job_postings add column if not exists tailored_resume jsonb;
