import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getApplication, listApplicationEvents } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/status-badge';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_ORDER, REMOTE_TYPE_LABELS } from '@/lib/labels';
import { addApplicationNote, updateApplicationDetails, updateApplicationStatus } from '../actions';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const application = await getApplication(id).catch(() => null);
  if (!application) notFound();

  const events = await listApplicationEvents(id);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {application.position} · {application.company}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={application.status} />
            {application.job_url ? (
              <a
                href={application.job_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground underline"
              >
                职位链接
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">详情</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateApplicationDetails} className="space-y-4">
                <input type="hidden" name="id" value={application.id} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">公司</Label>
                    <Input id="company" name="company" defaultValue={application.company} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">职位</Label>
                    <Input id="position" name="position" defaultValue={application.position} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">地点</Label>
                    <Input id="location" name="location" defaultValue={application.location ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remote_type">工作方式</Label>
                    <select
                      id="remote_type"
                      name="remote_type"
                      defaultValue={application.remote_type ?? ''}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                      <option value="">未知</option>
                      {Object.entries(REMOTE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary_min">薪资下限</Label>
                    <Input id="salary_min" name="salary_min" type="number" defaultValue={application.salary_min ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary_max">薪资上限</Label>
                    <Input id="salary_max" name="salary_max" type="number" defaultValue={application.salary_max ?? ''} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">来源</Label>
                    <Input id="source" name="source" defaultValue={application.source ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resume_version">简历版本</Label>
                    <Input id="resume_version" name="resume_version" defaultValue={application.resume_version ?? ''} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_url">职位链接</Label>
                  <Input id="job_url" name="job_url" defaultValue={application.job_url ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech_stack">技术栈（逗号分隔）</Label>
                  <Input id="tech_stack" name="tech_stack" defaultValue={application.tech_stack.join(', ')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_action">下一步行动</Label>
                  <Input id="next_action" name="next_action" defaultValue={application.next_action ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">备注</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={application.notes ?? ''} />
                </div>
                <Button type="submit">保存修改</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">更新状态</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateApplicationStatus} className="space-y-3">
                <input type="hidden" name="id" value={application.id} />
                <select
                  name="status"
                  defaultValue={application.status}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                >
                  {APPLICATION_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {APPLICATION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <Textarea name="note" placeholder="备注（可选）" rows={2} />
                <Button type="submit" className="w-full">
                  更新
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">时间线</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={addApplicationNote} className="space-y-2">
                <input type="hidden" name="id" value={application.id} />
                <Textarea name="detail" placeholder="添加一条记录…" rows={2} />
                <Button type="submit" variant="secondary" size="sm">
                  添加记录
                </Button>
              </form>

              <Separator />

              <ul className="space-y-3">
                {events.length === 0 ? (
                  <li className="text-sm text-muted-foreground">暂无记录</li>
                ) : (
                  events.map((event) => (
                    <li key={event.id} className="text-sm">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), 'yyyy-MM-dd HH:mm')}
                      </div>
                      {event.event_type === 'status_change' ? (
                        <div>
                          {event.from_status ? (
                            <>
                              {APPLICATION_STATUS_LABELS[event.from_status as keyof typeof APPLICATION_STATUS_LABELS] ??
                                event.from_status}{' '}
                              →{' '}
                            </>
                          ) : null}
                          <span className="font-medium">
                            {event.to_status
                              ? APPLICATION_STATUS_LABELS[event.to_status as keyof typeof APPLICATION_STATUS_LABELS] ??
                                event.to_status
                              : ''}
                          </span>
                          {event.detail ? <p className="text-muted-foreground">{event.detail}</p> : null}
                        </div>
                      ) : (
                        <p>{event.detail}</p>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
