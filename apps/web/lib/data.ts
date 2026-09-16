import { createServiceClient } from '@joboard/db';
import type { ApplicationStatus } from '@joboard/db';

const db = createServiceClient();

export async function listApplications(status?: ApplicationStatus) {
  let query = db.from('applications').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getApplication(id: string) {
  const { data, error } = await db.from('applications').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listApplicationEvents(applicationId: string) {
  const { data, error } = await db
    .from('application_events')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listJobPostings() {
  const { data, error } = await db.from('job_postings').select('*').order('discovered_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listTechTrendWeekly() {
  const { data, error } = await db
    .from('tech_trend_weekly')
    .select('*')
    .order('week_start', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listProfileSkills() {
  const { data, error } = await db.from('profile_skills').select('*').order('skill_name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function listAgentRuns() {
  const { data, error } = await db
    .from('agent_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export { db };
