'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>加载数据失败</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            通常是 Supabase 连接没配好——检查 <code className="rounded bg-muted px-1">apps/web/.env.local</code> 里的{' '}
            <code className="rounded bg-muted px-1">SUPABASE_URL</code> /{' '}
            <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code>，以及数据库迁移是否已执行。
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{error.message}</pre>
          <Button onClick={reset} size="sm">
            重试
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
