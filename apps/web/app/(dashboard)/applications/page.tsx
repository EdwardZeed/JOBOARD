import Link from 'next/link';
import { format } from 'date-fns';
import { listApplications } from '@/lib/data';
import type { ApplicationStatus } from '@joboard/db';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_ORDER } from '@/lib/labels';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = APPLICATION_STATUS_ORDER.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : undefined;

  const applications = await listApplications(activeStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">投递列表</h1>
          <p className="text-sm text-muted-foreground">共 {applications.length} 条记录</p>
        </div>
        <Link href="/applications/new" className={buttonVariants()}>
          + 新增投递
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/applications">
          <Badge variant={activeStatus ? 'outline' : 'default'} className="cursor-pointer">
            全部
          </Badge>
        </Link>
        {APPLICATION_STATUS_ORDER.map((s) => (
          <Link key={s} href={`/applications?status=${s}`}>
            <Badge variant={activeStatus === s ? 'default' : 'outline'} className="cursor-pointer">
              {APPLICATION_STATUS_LABELS[s]}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>公司</TableHead>
              <TableHead>职位</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>技术栈</TableHead>
              <TableHead>匹配度</TableHead>
              <TableHead>投递时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  暂无记录
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/applications/${app.id}`} className="block font-medium hover:underline">
                      {app.company}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/applications/${app.id}`} className="block">
                      {app.position}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {app.tech_stack.slice(0, 3).map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {app.tech_stack.length > 3 ? (
                        <span className="text-xs text-muted-foreground">+{app.tech_stack.length - 3}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className={cn('tabular-nums', app.match_score === null && 'text-muted-foreground')}>
                    {app.match_score !== null ? `${app.match_score}%` : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {app.applied_at ? format(new Date(app.applied_at), 'yyyy-MM-dd') : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
