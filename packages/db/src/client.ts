import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type JoboardClient = SupabaseClient<Database>;

/**
 * Server-only Supabase client using the service-role key. Never import this
 * from browser code — the key bypasses Row Level Security entirely.
 */
export function createServiceClient(options?: { url?: string; serviceRoleKey?: string }): JoboardClient {
  const url = options?.url ?? process.env.SUPABASE_URL;
  const serviceRoleKey = options?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env(.local) and fill them in.'
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
