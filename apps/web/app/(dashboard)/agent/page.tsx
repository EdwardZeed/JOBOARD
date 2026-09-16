import { format } from 'date-fns';
import { listAgentRuns } from '@/lib/data';
import { AGENT_RUN_STAGE_LABELS, AGENT_RUN_STATUS_LABELS } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AgentRunStatus } from '@joboard/db';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<AgentRunStatus, string> = {
  running: 'bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300',
  success: 'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300',
  error: 'bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300',
};

export default async function AgentPage() {
  const runs = await listAgentRuns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent 日志</h1>
        <p className="text-sm text-muted-foreground">
          agentic loop 每次迭代的记录（think / search / match / apply / update_status / sync），通过 MCP 的{' '}
          <code className="rounded bg-muted px-1">log_agent_run</code> 工具写入。这里现在是空的——等 loop 接入后会显示。
        </p>
      </div>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">暂无运行记录</CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {runs.map((run) => (
            <li key={run.id}>
              <Card>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{AGENT_RUN_STAGE_LABELS[run.stage]}</Badge>
                      <Badge variant="outline" className={STATUS_STYLES[run.status]}>
                        {AGENT_RUN_STATUS_LABELS[run.status]}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(run.started_at), 'yyyy-MM-dd HH:mm:ss')}
                    </span>
                  </div>
                  {run.summary ? <p className="text-sm">{run.summary}</p> : null}
                  {run.detail && Object.keys(run.detail).length > 0 ? (
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(run.detail, null, 2)}
                    </pre>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
