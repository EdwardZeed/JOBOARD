import { listJobPostings } from '@/lib/data';
import { JOB_POSTING_STATUS_LABELS } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { convertPostingToApplication, skipPosting } from './actions';

export const dynamic = 'force-dynamic';

export default async function DiscoveryPage() {
  const postings = await listJobPostings();
  const openPostings = postings.filter((p) => p.status === 'new' || p.status === 'reviewed' || p.status === 'matched');
  const closedPostings = postings.filter((p) => p.status === 'applied' || p.status === 'skipped');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">发现职位</h1>
        <p className="text-sm text-muted-foreground">
          Agent 搜索阶段发现、尚未决定投递的职位。这里现在是空的——等 agentic loop 接入 MCP 的{' '}
          <code className="rounded bg-muted px-1">log_job_posting</code> 工具后会自动出现。
        </p>
      </div>

      <div className="space-y-3">
        {openPostings.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">暂无待处理的职位</CardContent>
          </Card>
        ) : (
          openPostings.map((posting) => (
            <Card key={posting.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="space-y-1">
                  <div className="font-medium">
                    {posting.title} · {posting.company}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{JOB_POSTING_STATUS_LABELS[posting.status]}</Badge>
                    {posting.match_score !== null ? <span>匹配度 {posting.match_score}%</span> : null}
                    {posting.source ? <span>来源：{posting.source}</span> : null}
                  </div>
                  {posting.tech_stack.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {posting.tech_stack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {posting.url ? (
                    <a href={posting.url} target="_blank" rel="noreferrer" className="text-sm underline">
                      查看原文
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={skipPosting}>
                    <input type="hidden" name="posting_id" value={posting.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      跳过
                    </Button>
                  </form>
                  <form action={convertPostingToApplication}>
                    <input type="hidden" name="posting_id" value={posting.id} />
                    <Button type="submit" size="sm">
                      转为投递
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {closedPostings.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">已处理</h2>
          <div className="space-y-2">
            {closedPostings.map((posting) => (
              <div key={posting.id} className="flex items-center justify-between rounded-md border px-4 py-2 text-sm">
                <span>
                  {posting.title} · {posting.company}
                </span>
                <Badge variant="outline">{JOB_POSTING_STATUS_LABELS[posting.status]}</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
