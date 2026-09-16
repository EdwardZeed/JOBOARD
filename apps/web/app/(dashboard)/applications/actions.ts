'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/data';
import { fetchJobPosting, guessSourceFromUrl, normalizeJobUrl } from '@/lib/job-scraper';
import type { ApplicationStatus, ApplicationUpdate, RemoteType } from '@joboard/db';

function optionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.trim();
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = optionalString(formData, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTechStack(formData: FormData): string[] {
  const raw = optionalString(formData, 'tech_stack');
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createApplicationFromUrl(formData: FormData) {
  const url = String(formData.get('job_url') ?? '').trim();
  if (!url) throw new Error('请输入职位链接');

  const status = (optionalString(formData, 'status') as ApplicationStatus | null) ?? 'applied';

  const parsed: Awaited<ReturnType<typeof fetchJobPosting>> = await fetchJobPosting(url).catch((err: unknown) => ({
    source: guessSourceFromUrl(url),
    resolvedUrl: normalizeJobUrl(url),
    error: err instanceof Error ? err.message : '抓取失败',
  }));

  const company = parsed.company?.trim() || '待补充公司';
  const position = parsed.title?.trim() || '待补充职位';

  const { data, error } = await db
    .from('applications')
    .insert({
      company,
      position,
      job_url: parsed.resolvedUrl,
      source: parsed.source,
      location: parsed.location,
      status,
      notes: parsed.description,
      applied_at: status !== 'wishlist' ? new Date().toISOString() : null,
    })
    .select('id, status')
    .single();

  if (error) throw new Error(error.message);

  await db.from('application_events').insert({
    application_id: data.id,
    event_type: 'status_change',
    to_status: data.status,
    detail: parsed.error ? `从链接自动抓取（部分信息缺失：${parsed.error}），请检查并补全` : '从职位链接自动抓取创建',
  });

  revalidatePath('/applications');
  revalidatePath('/');
  redirect(`/applications/${data.id}`);
}

export async function createApplication(formData: FormData) {
  const company = String(formData.get('company') ?? '').trim();
  const position = String(formData.get('position') ?? '').trim();
  if (!company || !position) {
    throw new Error('公司和职位为必填项');
  }

  const status = (optionalString(formData, 'status') as ApplicationStatus | null) ?? 'wishlist';

  const { data, error } = await db
    .from('applications')
    .insert({
      company,
      position,
      job_url: optionalString(formData, 'job_url'),
      source: optionalString(formData, 'source'),
      location: optionalString(formData, 'location'),
      remote_type: optionalString(formData, 'remote_type') as RemoteType | null,
      status,
      tech_stack: parseTechStack(formData),
      notes: optionalString(formData, 'notes'),
      applied_at: status !== 'wishlist' ? new Date().toISOString() : null,
    })
    .select('id, status')
    .single();

  if (error) throw new Error(error.message);

  await db.from('application_events').insert({
    application_id: data.id,
    event_type: 'status_change',
    to_status: data.status,
    detail: '手动创建',
  });

  revalidatePath('/applications');
  revalidatePath('/');
  redirect(`/applications/${data.id}`);
}

export async function updateApplicationStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const status = formData.get('status') as ApplicationStatus | null;
  const note = optionalString(formData, 'note');
  if (!id || !status) throw new Error('缺少必要参数');

  const { data: current, error: currentError } = await db
    .from('applications')
    .select('status, applied_at')
    .eq('id', id)
    .single();
  if (currentError) throw new Error(currentError.message);

  const patch: ApplicationUpdate = { status };
  if (status !== 'wishlist' && !current.applied_at) {
    patch.applied_at = new Date().toISOString();
  }

  const { error } = await db.from('applications').update(patch).eq('id', id);
  if (error) throw new Error(error.message);

  await db.from('application_events').insert({
    application_id: id,
    event_type: 'status_change',
    from_status: current.status,
    to_status: status,
    detail: note,
  });

  revalidatePath('/applications');
  revalidatePath(`/applications/${id}`);
  revalidatePath('/');
}

export async function updateApplicationDetails(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('缺少 id');

  const patch: ApplicationUpdate = {
    company: String(formData.get('company') ?? '').trim() || undefined,
    position: String(formData.get('position') ?? '').trim() || undefined,
    job_url: optionalString(formData, 'job_url'),
    source: optionalString(formData, 'source'),
    location: optionalString(formData, 'location'),
    remote_type: optionalString(formData, 'remote_type') as RemoteType | null,
    salary_min: optionalNumber(formData, 'salary_min'),
    salary_max: optionalNumber(formData, 'salary_max'),
    tech_stack: parseTechStack(formData),
    resume_version: optionalString(formData, 'resume_version'),
    notes: optionalString(formData, 'notes'),
    next_action: optionalString(formData, 'next_action'),
  };

  const { error } = await db.from('applications').update(patch).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath(`/applications/${id}`);
  revalidatePath('/applications');
}

export async function addApplicationNote(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const detail = optionalString(formData, 'detail');
  if (!id || !detail) throw new Error('缺少必要参数');

  const { error } = await db.from('application_events').insert({
    application_id: id,
    event_type: 'note',
    detail,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/applications/${id}`);
}
