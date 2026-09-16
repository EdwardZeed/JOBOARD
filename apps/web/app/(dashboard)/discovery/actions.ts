'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/data';

export async function convertPostingToApplication(formData: FormData) {
  const postingId = String(formData.get('posting_id') ?? '');
  if (!postingId) throw new Error('缺少职位 id');

  const { data: posting, error: postingError } = await db
    .from('job_postings')
    .select('*')
    .eq('id', postingId)
    .single();
  if (postingError) throw new Error(postingError.message);

  const { data: application, error: appError } = await db
    .from('applications')
    .insert({
      company: posting.company,
      position: posting.title,
      job_url: posting.url,
      source: posting.source,
      tech_stack: posting.tech_stack,
      match_score: posting.match_score,
      status: 'applied',
      applied_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (appError) throw new Error(appError.message);

  await db.from('application_events').insert({
    application_id: application.id,
    event_type: 'status_change',
    to_status: 'applied',
    detail: `从发现的职位转化（${postingId}）`,
  });

  const { error: updateError } = await db
    .from('job_postings')
    .update({ status: 'applied', application_id: application.id })
    .eq('id', postingId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath('/discovery');
  revalidatePath('/applications');
  revalidatePath('/');
  redirect(`/applications/${application.id}`);
}

export async function skipPosting(formData: FormData) {
  const postingId = String(formData.get('posting_id') ?? '');
  if (!postingId) throw new Error('缺少职位 id');

  const { error } = await db.from('job_postings').update({ status: 'skipped' }).eq('id', postingId);
  if (error) throw new Error(error.message);

  revalidatePath('/discovery');
}
