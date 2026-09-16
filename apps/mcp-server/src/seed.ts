#!/usr/bin/env node
// Inserts a handful of sample rows so the dashboard has something to show
// on first run. Safe to re-run against a fresh database; not idempotent
// against a database that already has seed data (it will duplicate rows).
import { createServiceClient } from '@joboard/db';

const db = createServiceClient();

async function main() {
  const { data: applications, error: appError } = await db
    .from('applications')
    .insert([
      {
        company: 'Nimbus Data',
        position: 'Senior Frontend Engineer',
        job_url: 'https://example.com/jobs/nimbus-fe',
        source: 'LinkedIn',
        location: 'Remote',
        remote_type: 'remote',
        salary_min: 160000,
        salary_max: 190000,
        status: 'in_progress',
        match_score: 88,
        tech_stack: ['React', 'TypeScript', 'Next.js', 'GraphQL'],
        resume_version: 'v3-frontend',
        applied_at: '2026-08-20T00:00:00Z',
      },
      {
        company: 'Fernbank Labs',
        position: 'Full Stack Engineer',
        job_url: 'https://example.com/jobs/fernbank-fs',
        source: 'Referral',
        location: 'New York, NY',
        remote_type: 'hybrid',
        salary_min: 150000,
        salary_max: 175000,
        status: 'applied',
        match_score: 76,
        tech_stack: ['Node.js', 'PostgreSQL', 'React', 'AWS'],
        resume_version: 'v3-fullstack',
        applied_at: '2026-09-02T00:00:00Z',
      },
      {
        company: 'Solace AI',
        position: 'Platform Engineer',
        job_url: 'https://example.com/jobs/solace-platform',
        source: 'Company site',
        location: 'San Francisco, CA',
        remote_type: 'onsite',
        salary_min: 170000,
        salary_max: 210000,
        status: 'offer',
        match_score: 91,
        tech_stack: ['Kubernetes', 'Go', 'Terraform', 'AWS'],
        resume_version: 'v2-platform',
        applied_at: '2026-08-05T00:00:00Z',
      },
      {
        company: 'Brightloop',
        position: 'Frontend Engineer',
        source: 'LinkedIn',
        location: 'Remote',
        remote_type: 'remote',
        status: 'rejected',
        match_score: 64,
        tech_stack: ['Vue', 'JavaScript'],
        applied_at: '2026-07-28T00:00:00Z',
      },
      {
        company: 'Ridgeline Systems',
        position: 'Software Engineer, Backend',
        source: 'Referral',
        location: 'Austin, TX',
        remote_type: 'hybrid',
        status: 'wishlist',
        match_score: 70,
        tech_stack: ['Python', 'Django', 'PostgreSQL'],
      },
    ])
    .select('*');

  if (appError) throw appError;
  console.log(`Inserted ${applications.length} applications`);

  // Every object in a bulk insert must share the same keys — PostgREST derives
  // the column set from the batch, so a key missing on some rows is sent as
  // NULL rather than falling back to the column default.
  const events = applications.flatMap((app) => [
    {
      application_id: app.id,
      event_type: 'status_change' as const,
      from_status: null as string | null,
      to_status: 'wishlist',
      detail: 'Added to tracker',
      created_at: app.applied_at ?? app.created_at,
    },
    ...(app.status !== 'wishlist'
      ? [
          {
            application_id: app.id,
            event_type: 'status_change' as const,
            from_status: 'wishlist' as string | null,
            to_status: app.status,
            detail: 'Seed data',
            created_at: app.updated_at,
          },
        ]
      : []),
  ]);
  const { error: eventsError } = await db.from('application_events').insert(events);
  if (eventsError) throw eventsError;
  console.log(`Inserted ${events.length} application_events`);

  const { data: postings, error: postingsError } = await db
    .from('job_postings')
    .insert([
      {
        title: 'Staff Frontend Engineer',
        company: 'Hollow Peak',
        url: 'https://example.com/jobs/hollow-peak-staff-fe',
        tech_stack: ['React', 'TypeScript', 'Design Systems'],
        source: 'agent-discovered',
        match_score: 82,
        status: 'reviewed',
      },
      {
        title: 'Backend Engineer, Payments',
        company: 'Ledgerly',
        url: 'https://example.com/jobs/ledgerly-backend',
        tech_stack: ['Go', 'PostgreSQL', 'Kafka'],
        source: 'agent-discovered',
        match_score: 58,
        status: 'new',
      },
      {
        title: 'AI Platform Engineer',
        company: 'Cortex Works',
        url: 'https://example.com/jobs/cortex-ai-platform',
        tech_stack: ['Python', 'Kubernetes', 'PyTorch'],
        source: 'agent-discovered',
        match_score: 74,
        status: 'new',
      },
    ])
    .select('*');
  if (postingsError) throw postingsError;
  console.log(`Inserted ${postings.length} job_postings`);

  const techSamples: Array<[string, number]> = [
    ['React', 42],
    ['TypeScript', 39],
    ['Next.js', 24],
    ['Kubernetes', 18],
    ['Go', 15],
    ['PostgreSQL', 21],
    ['AWS', 27],
    ['Python', 30],
    ['GraphQL', 12],
    ['Terraform', 9],
  ];
  const signals = techSamples.flatMap(([tech_name, count]) =>
    Array.from({ length: count }, () => ({ tech_name, source: 'seed', weight: 1 }))
  );
  const { error: signalsError } = await db.from('tech_trend_signals').insert(signals);
  if (signalsError) throw signalsError;
  console.log(`Inserted ${signals.length} tech_trend_signals`);

  const { error: skillsError } = await db.from('profile_skills').upsert(
    [
      { skill_name: 'React', proficiency: 5 },
      { skill_name: 'TypeScript', proficiency: 4 },
      { skill_name: 'Node.js', proficiency: 4 },
      { skill_name: 'PostgreSQL', proficiency: 3 },
      { skill_name: 'Kubernetes', proficiency: 2 },
      { skill_name: 'Go', proficiency: 2 },
    ],
    { onConflict: 'skill_name' }
  );
  if (skillsError) throw skillsError;
  console.log('Upserted profile_skills');

  console.log('Seed complete.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
