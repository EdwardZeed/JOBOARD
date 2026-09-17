import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoboardClient, ApplicationStatus, ApplicationUpdate } from '@joboard/db';

const APPLICATION_STATUSES = [
  'wishlist',
  'applied',
  'in_progress',
  'offer',
  'rejected',
  'ghosted',
] as const satisfies readonly ApplicationStatus[];

const AGENT_RUN_STAGES = ['think', 'search', 'match', 'apply', 'update_status', 'sync'] as const;
const AGENT_RUN_STATUSES = ['running', 'success', 'error'] as const;
const JOB_POSTING_STATUSES = ['new', 'reviewed', 'matched', 'applied', 'skipped'] as const;

// Mirrors ResumeDocument in @joboard/db — kept as a literal zod shape (rather
// than z.custom<ResumeDocument>()) so the MCP tool's inputSchema is a real,
// introspectable JSON Schema the calling agent can see.
const resumeDocumentSchema = z.object({
  name: z.string().min(1),
  contact: z.array(z.object({ label: z.string(), value: z.string(), href: z.string().optional() })),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  experience: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  projects: z.array(z.object({ title: z.string(), link: z.string().optional(), description: z.string() })),
  education: z.array(z.object({ dates: z.string(), institution: z.string(), detail: z.string() })),
});

function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

/**
 * Builds a fresh McpServer wired to the given Supabase client, registering
 * every tool the agentic loop and the dashboard's manual tooling need.
 * Shared between the local stdio server (apps/mcp-server) and the
 * network-reachable HTTP endpoint (apps/web's /api/mcp route) so both
 * transports expose exactly the same tool set with no duplicated logic.
 */
export function createMcpServer(db: JoboardClient): McpServer {
  const server = new McpServer({ name: 'joboard-mcp', version: '0.1.0' });

  server.registerTool(
    'list_applications',
    {
      title: 'List job applications',
      description: 'List tracked job applications, optionally filtered by status.',
      inputSchema: {
        status: z.enum(APPLICATION_STATUSES).optional(),
        limit: z.number().int().positive().max(200).default(50),
      },
    },
    async ({ status, limit }) => {
      let query = db.from('applications').select('*').order('created_at', { ascending: false }).limit(limit);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'get_application',
    {
      title: 'Get a job application',
      description: 'Get a single application by id, including its status/event timeline.',
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      const [{ data: application, error: appError }, { data: events, error: eventsError }] = await Promise.all([
        db.from('applications').select('*').eq('id', id).single(),
        db.from('application_events').select('*').eq('application_id', id).order('created_at', { ascending: false }),
      ]);
      if (appError) return errorResult(appError.message);
      if (eventsError) return errorResult(eventsError.message);
      return jsonResult({ application, events });
    }
  );

  server.registerTool(
    'create_application',
    {
      title: 'Create a job application',
      description:
        'Track a new job application (or wishlist entry). Also writes the initial application_events row.',
      inputSchema: {
        company: z.string().min(1),
        position: z.string().min(1),
        job_url: z.string().url().optional(),
        source: z.string().optional(),
        location: z.string().optional(),
        remote_type: z.enum(['onsite', 'hybrid', 'remote']).optional(),
        salary_min: z.number().int().optional(),
        salary_max: z.number().int().optional(),
        status: z.enum(APPLICATION_STATUSES).default('wishlist'),
        match_score: z.number().min(0).max(100).optional(),
        tech_stack: z.array(z.string()).default([]),
        resume_version: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async (input) => {
      const { data, error } = await db.from('applications').insert(input).select('*').single();
      if (error) return errorResult(error.message);

      await db.from('application_events').insert({
        application_id: data.id,
        event_type: 'status_change',
        to_status: data.status,
        detail: 'Application created',
      });

      return jsonResult(data);
    }
  );

  server.registerTool(
    'update_application_status',
    {
      title: 'Update a job application status',
      description:
        'Move an application to a new status and append a status_change event to its timeline.',
      inputSchema: {
        id: z.string().uuid(),
        status: z.enum(APPLICATION_STATUSES),
        note: z.string().optional(),
      },
    },
    async ({ id, status, note }) => {
      const { data: current, error: currentError } = await db
        .from('applications')
        .select('status')
        .eq('id', id)
        .single();
      if (currentError) return errorResult(currentError.message);

      const patch: ApplicationUpdate = { status };
      if (status === 'applied' && !note) patch.applied_at = new Date().toISOString();

      const { data, error } = await db.from('applications').update(patch).eq('id', id).select('*').single();
      if (error) return errorResult(error.message);

      await db.from('application_events').insert({
        application_id: id,
        event_type: 'status_change',
        from_status: current.status,
        to_status: status,
        detail: note ?? null,
      });

      return jsonResult(data);
    }
  );

  server.registerTool(
    'list_job_postings',
    {
      title: 'List discovered job postings',
      description:
        'List job_postings, optionally filtered by status. Use this during the search stage to check whether a candidate posting (by url or company+title) has already been logged, before calling log_job_posting again.',
      inputSchema: {
        status: z.enum(JOB_POSTING_STATUSES).optional(),
        limit: z.number().int().positive().max(200).default(100),
      },
    },
    async ({ status, limit }) => {
      let query = db.from('job_postings').select('*').order('discovered_at', { ascending: false }).limit(limit);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'log_job_posting',
    {
      title: 'Log a discovered job posting',
      description:
        "Record a job posting found during the agent's search stage, before deciding whether to apply.",
      inputSchema: {
        title: z.string().min(1),
        company: z.string().min(1),
        url: z.string().url().optional(),
        description: z.string().optional(),
        tech_stack: z.array(z.string()).default([]),
        source: z.string().optional(),
        match_score: z.number().min(0).max(100).optional(),
        status: z.enum(JOB_POSTING_STATUSES).default('new'),
      },
    },
    async (input) => {
      const { data, error } = await db.from('job_postings').insert(input).select('*').single();
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'convert_posting_to_application',
    {
      title: 'Convert a discovered posting into a tracked application',
      description: 'Create an application from a job_postings row and link the two records.',
      inputSchema: {
        posting_id: z.string().uuid(),
        status: z.enum(APPLICATION_STATUSES).default('applied'),
        resume_version: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ posting_id, status, resume_version, notes }) => {
      const { data: posting, error: postingError } = await db
        .from('job_postings')
        .select('*')
        .eq('id', posting_id)
        .single();
      if (postingError) return errorResult(postingError.message);

      const { data: application, error: appError } = await db
        .from('applications')
        .insert({
          company: posting.company,
          position: posting.title,
          job_url: posting.url,
          source: posting.source,
          tech_stack: posting.tech_stack,
          match_score: posting.match_score,
          status,
          resume_version,
          notes,
          applied_at: status === 'applied' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (appError) return errorResult(appError.message);

      await db.from('application_events').insert({
        application_id: application.id,
        event_type: 'status_change',
        to_status: application.status,
        detail: `Converted from job posting ${posting_id}`,
      });

      const { error: updateError } = await db
        .from('job_postings')
        .update({ status: 'applied', application_id: application.id })
        .eq('id', posting_id);
      if (updateError) return errorResult(updateError.message);

      return jsonResult(application);
    }
  );

  server.registerTool(
    'record_tech_signals',
    {
      title: 'Record technology demand signals',
      description:
        'Bulk-log technology mentions observed while parsing a job description, for the /trends dashboard page.',
      inputSchema: {
        tech_names: z.array(z.string().min(1)).min(1),
        source: z.string().optional(),
        weight: z.number().positive().default(1),
      },
    },
    async ({ tech_names, source, weight }) => {
      const rows = tech_names.map((tech_name) => ({ tech_name, source, weight }));
      const { data, error } = await db.from('tech_trend_signals').insert(rows).select('*');
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'log_agent_run',
    {
      title: 'Log an agentic-loop run',
      description:
        'Record one iteration of the agentic loop (think/search/match/apply/update_status/sync) for the /agent dashboard page.',
      inputSchema: {
        stage: z.enum(AGENT_RUN_STAGES),
        summary: z.string().optional(),
        detail: z.record(z.string(), z.unknown()).default({}),
        status: z.enum(AGENT_RUN_STATUSES).default('running'),
        finished: z.boolean().default(false),
      },
    },
    async ({ stage, summary, detail, status, finished }) => {
      const { data, error } = await db
        .from('agent_runs')
        .insert({
          stage,
          summary,
          detail,
          status,
          finished_at: finished ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'update_profile_skills',
    {
      title: 'Update profile skills',
      description: 'Upsert the user current skill set, used for the /trends gap analysis.',
      inputSchema: {
        skills: z
          .array(
            z.object({
              skill_name: z.string().min(1),
              proficiency: z.number().int().min(1).max(5).optional(),
            })
          )
          .min(1),
      },
    },
    async ({ skills }) => {
      const { data, error } = await db
        .from('profile_skills')
        .upsert(skills, { onConflict: 'skill_name' })
        .select('*');
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'get_profile_resume',
    {
      title: 'Get the current resume',
      description:
        'Get the most recent full resume text. The think and match stages use this (not profile_skills, which is too thin) to generate search keywords and score job fit.',
      inputSchema: {},
    },
    async () => {
      const { data, error } = await db
        .from('profile_resume')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult('No resume on file yet — call update_profile_resume first.');
      return jsonResult(data);
    }
  );

  server.registerTool(
    'update_profile_resume',
    {
      title: 'Update the current resume',
      description:
        'Store a new version of the full resume text. Inserts a new row (history is kept) rather than overwriting — get_profile_resume always returns the most recent one.',
      inputSchema: {
        full_text: z.string().min(1),
        source_filename: z.string().optional(),
        structured: resumeDocumentSchema.optional(),
      },
    },
    async ({ full_text, source_filename, structured }) => {
      const { data, error } = await db
        .from('profile_resume')
        .insert({ full_text, source_filename, structured: structured ?? null })
        .select('*')
        .single();
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'record_resume_tailoring',
    {
      title: 'Record a tailored resume for a job posting',
      description:
        'Store a JD-tailored resume draft against a job_postings row (match stage, when match_score is below the apply threshold), in the same structured shape as the canonical resume so it renders through the same template. tailored_resume must only reword/reorder/re-emphasize real experience from the resume on file — never invent skills, employers, projects, or metrics that are not there.',
      inputSchema: {
        posting_id: z.string().uuid(),
        tailored_resume: resumeDocumentSchema,
        tailored_match_score: z.number().min(0).max(100),
      },
    },
    async ({ posting_id, tailored_resume, tailored_match_score }) => {
      const { data, error } = await db
        .from('job_postings')
        .update({
          tailored_resume,
          tailored_match_score,
          resume_tailored_at: new Date().toISOString(),
        })
        .eq('id', posting_id)
        .select('*')
        .single();
      if (error) return errorResult(error.message);
      return jsonResult(data);
    }
  );

  return server;
}
