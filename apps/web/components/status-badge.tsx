import type { ApplicationStatus } from '@joboard/db';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_STYLES } from '@/lib/labels';

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(APPLICATION_STATUS_STYLES[status], className)}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
