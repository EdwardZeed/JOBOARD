// Hand-written to mirror supabase/migrations/*.sql.
// If the schema changes, update this file (and, ideally, regenerate with
// `supabase gen types typescript` once a live project exists).
//
// Row/Insert/Update are declared with `type X = {...}` (not `interface`).
// @supabase/postgrest-js structurally checks these against
// `Record<string, unknown>`, and TypeScript only grants the implicit
// index-signature compatibility that check relies on to type aliases /
// object type literals — not to `interface` declarations.

export type ApplicationStatus = 'wishlist' | 'applied' | 'in_progress' | 'offer' | 'rejected' | 'ghosted';

export type RemoteType = 'onsite' | 'hybrid' | 'remote';

export type ApplicationEventType = 'status_change' | 'note' | 'agent_action';

export type JobPostingStatus = 'new' | 'reviewed' | 'matched' | 'applied' | 'skipped';

export type AgentRunStage = 'think' | 'search' | 'match' | 'apply' | 'update_status' | 'sync';

export type AgentRunStatus = 'running' | 'success' | 'error';

export type ApplicationRow = {
  id: string;
  company: string;
  position: string;
  job_url: string | null;
  source: string | null;
  location: string | null;
  remote_type: RemoteType | null;
  salary_min: number | null;
  salary_max: number | null;
  status: ApplicationStatus;
  match_score: number | null;
  tech_stack: string[];
  resume_version: string | null;
  notes: string | null;
  applied_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationInsert = {
  company: string;
  position: string;
  job_url?: string | null;
  source?: string | null;
  location?: string | null;
  remote_type?: RemoteType | null;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: ApplicationStatus;
  match_score?: number | null;
  tech_stack?: string[];
  resume_version?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
};

export type ApplicationUpdate = {
  company?: string;
  position?: string;
  job_url?: string | null;
  source?: string | null;
  location?: string | null;
  remote_type?: RemoteType | null;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: ApplicationStatus;
  match_score?: number | null;
  tech_stack?: string[];
  resume_version?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
};

export type ApplicationEventRow = {
  id: string;
  application_id: string;
  event_type: ApplicationEventType;
  from_status: string | null;
  to_status: string | null;
  detail: string | null;
  created_at: string;
};

export type ApplicationEventInsert = {
  application_id: string;
  event_type?: ApplicationEventType;
  from_status?: string | null;
  to_status?: string | null;
  detail?: string | null;
  created_at?: string;
};

export type ApplicationEventUpdate = {
  application_id?: string;
  event_type?: ApplicationEventType;
  from_status?: string | null;
  to_status?: string | null;
  detail?: string | null;
  created_at?: string;
};

export type JobPostingRow = {
  id: string;
  title: string;
  company: string;
  url: string | null;
  description: string | null;
  tech_stack: string[];
  source: string | null;
  match_score: number | null;
  status: JobPostingStatus;
  application_id: string | null;
  discovered_at: string;
};

export type JobPostingInsert = {
  title: string;
  company: string;
  url?: string | null;
  description?: string | null;
  tech_stack?: string[];
  source?: string | null;
  match_score?: number | null;
  status?: JobPostingStatus;
  application_id?: string | null;
};

export type JobPostingUpdate = {
  title?: string;
  company?: string;
  url?: string | null;
  description?: string | null;
  tech_stack?: string[];
  source?: string | null;
  match_score?: number | null;
  status?: JobPostingStatus;
  application_id?: string | null;
};

export type TechTrendSignalRow = {
  id: string;
  tech_name: string;
  source: string | null;
  weight: number;
  observed_at: string;
};

export type TechTrendSignalInsert = {
  tech_name: string;
  source?: string | null;
  weight?: number;
  observed_at?: string;
};

export type TechTrendSignalUpdate = {
  tech_name?: string;
  source?: string | null;
  weight?: number;
  observed_at?: string;
};

export type TechTrendWeeklyRow = {
  week_start: string;
  tech_name: string;
  mentions: number;
  weighted_mentions: number;
};

export type AgentRunRow = {
  id: string;
  stage: AgentRunStage;
  summary: string | null;
  detail: Record<string, unknown>;
  status: AgentRunStatus;
  started_at: string;
  finished_at: string | null;
};

export type AgentRunInsert = {
  stage: AgentRunStage;
  summary?: string | null;
  detail?: Record<string, unknown>;
  status?: AgentRunStatus;
  finished_at?: string | null;
};

export type AgentRunUpdate = {
  stage?: AgentRunStage;
  summary?: string | null;
  detail?: Record<string, unknown>;
  status?: AgentRunStatus;
  finished_at?: string | null;
};

export type ProfileSkillRow = {
  id: string;
  skill_name: string;
  proficiency: number | null;
  updated_at: string;
};

export type ProfileSkillUpsert = {
  skill_name: string;
  proficiency?: number | null;
};

export type ProfileSkillUpdate = {
  skill_name?: string;
  proficiency?: number | null;
};

export type Database = {
  public: {
    Tables: {
      applications: {
        Row: ApplicationRow;
        Insert: ApplicationInsert;
        Update: ApplicationUpdate;
        Relationships: [];
      };
      application_events: {
        Row: ApplicationEventRow;
        Insert: ApplicationEventInsert;
        Update: ApplicationEventUpdate;
        Relationships: [];
      };
      job_postings: {
        Row: JobPostingRow;
        Insert: JobPostingInsert;
        Update: JobPostingUpdate;
        Relationships: [];
      };
      tech_trend_signals: {
        Row: TechTrendSignalRow;
        Insert: TechTrendSignalInsert;
        Update: TechTrendSignalUpdate;
        Relationships: [];
      };
      agent_runs: {
        Row: AgentRunRow;
        Insert: AgentRunInsert;
        Update: AgentRunUpdate;
        Relationships: [];
      };
      profile_skills: {
        Row: ProfileSkillRow;
        Insert: ProfileSkillUpsert;
        Update: ProfileSkillUpdate;
        Relationships: [];
      };
    };
    Views: {
      tech_trend_weekly: {
        Row: TechTrendWeeklyRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
};
