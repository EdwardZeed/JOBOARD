'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/data';

export async function updateSearchPreferences(formData: FormData) {
  const locationTiersRaw = String(formData.get('location_tiers') ?? '');
  const location_tiers = locationTiersRaw
    .split('\n')
    .map((line) =>
      line
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .filter((tier) => tier.length > 0);

  const postedWithinDaysRaw = Number(formData.get('posted_within_days'));
  const posted_within_days = Number.isFinite(postedWithinDaysRaw)
    ? Math.min(365, Math.max(1, Math.round(postedWithinDaysRaw)))
    : 7;

  const country = String(formData.get('country') ?? '').trim() || 'australia';

  const site_domains = String(formData.get('site_domains') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await db
    .from('search_preferences')
    .update({
      location_tiers: location_tiers.length > 0 ? location_tiers : [['Perth', 'Remote'], ['Australia']],
      posted_within_days,
      country,
      site_domains,
    })
    .eq('id', true);
  if (error) throw new Error(error.message);

  revalidatePath('/settings');
}

export async function updateApplicantProfile(formData: FormData) {
  const { data: current, error: fetchError } = await db
    .from('applicant_profile')
    .select('facts, confirmed_fields')
    .eq('id', true)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const facts: Record<string, unknown> = { ...current.facts };

  const toDelete = new Set<string>();
  for (const key of formData.keys()) {
    if (key.startsWith('delete__') && formData.get(key) === 'on') {
      toDelete.add(key.slice('delete__'.length));
    }
  }

  for (const [key, rawValue] of formData.entries()) {
    if (!key.startsWith('value__')) continue;
    const factKey = key.slice('value__'.length);
    if (toDelete.has(factKey)) continue;
    const value = String(rawValue).trim();
    if (value) facts[factKey] = value;
  }

  for (const factKey of toDelete) {
    delete facts[factKey];
  }

  // Rebuild confirmed_fields from scratch: every pre-existing fact's
  // checkbox is unchecked-by-default-omitted, so its presence/absence in
  // the submitted form is the source of truth, not the previous value.
  const confirmed = new Set<string>();
  for (const factKey of Object.keys(current.facts)) {
    if (toDelete.has(factKey)) continue;
    if (formData.get(`confirmed__${factKey}`) === 'on') confirmed.add(factKey);
  }

  const newKey = String(formData.get('new_key') ?? '').trim();
  const newValue = String(formData.get('new_value') ?? '').trim();
  if (newKey && newValue) {
    facts[newKey] = newValue;
    if (formData.get('new_confirmed') === 'on') confirmed.add(newKey);
  }

  const { error } = await db
    .from('applicant_profile')
    .update({
      facts,
      confirmed_fields: Array.from(confirmed).filter((key) => key in facts),
    })
    .eq('id', true);
  if (error) throw new Error(error.message);

  revalidatePath('/settings');
}
