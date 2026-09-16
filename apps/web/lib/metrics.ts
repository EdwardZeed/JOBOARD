import { differenceInCalendarDays, format, startOfWeek } from 'date-fns';
import type { ApplicationRow, ApplicationStatus } from '@joboard/db';
import { APPLICATION_STATUS_LABELS } from './labels';

// "responded" = actually heard back — a rejection counts, being ghosted
// explicitly does not.
const RESPONDED_STATUSES: ApplicationStatus[] = ['in_progress', 'offer', 'rejected'];
const FUNNEL_STATUSES: ApplicationStatus[] = ['wishlist', 'applied', 'in_progress', 'offer'];

export function computeOverviewKpis(applications: ApplicationRow[]) {
  const total = applications.length;
  const wishlistCount = applications.filter((a) => a.status === 'wishlist').length;
  const submitted = total - wishlistCount;
  const active = applications.filter((a) =>
    (['applied', 'in_progress'] as ApplicationStatus[]).includes(a.status)
  ).length;
  const offers = applications.filter((a) => a.status === 'offer').length;
  const responded = applications.filter((a) => RESPONDED_STATUSES.includes(a.status)).length;
  const responseRate = submitted > 0 ? Math.round((responded / submitted) * 100) : 0;

  const responseDurations = applications
    .filter((a) => a.applied_at && RESPONDED_STATUSES.includes(a.status))
    .map((a) => differenceInCalendarDays(new Date(a.updated_at), new Date(a.applied_at as string)))
    .filter((days) => days >= 0);
  const avgResponseDays =
    responseDurations.length > 0
      ? Math.round(responseDurations.reduce((sum, d) => sum + d, 0) / responseDurations.length)
      : null;

  return { total, submitted, active, offers, responseRate, avgResponseDays };
}

export function computeStatusFunnel(applications: ApplicationRow[]) {
  return FUNNEL_STATUSES.map((status) => ({
    label: APPLICATION_STATUS_LABELS[status],
    count: applications.filter((a) => a.status === status).length,
  }));
}

export function computeWeeklyTrend(applications: ApplicationRow[], weeks = 8) {
  const buckets = new Map<string, { weekStart: Date; count: number }>();

  for (const app of applications) {
    const dateSource = app.applied_at ?? app.created_at;
    const weekStart = startOfWeek(new Date(dateSource), { weekStartsOn: 1 });
    const key = format(weekStart, 'yyyy-MM-dd');
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { weekStart, count: 1 });
    }
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  const recent = sorted.slice(-weeks);

  return recent.map((bucket) => ({
    week: format(bucket.weekStart, 'MM-dd'),
    count: bucket.count,
  }));
}
