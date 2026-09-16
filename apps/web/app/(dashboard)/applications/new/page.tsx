import { headers } from 'next/headers';
import { BookmarkletLink } from '@/components/bookmarklet-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { APPLICATION_STATUS_LABELS, REMOTE_TYPE_LABELS } from '@/lib/labels';
import { createApplication, createApplicationFromUrl } from '../actions';

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  const bookmarklet = `javascript:(function(){window.open(${JSON.stringify(
    `${origin}/applications/new?url=`
  )}+encodeURIComponent(location.href),'_blank');})()`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">新增投递</h1>
        <p className="text-sm text-muted-foreground">
          在 LinkedIn / SEEK / 公司官网投完简历后，把职位链接粘过来，自动抓取公司、职位、职位描述
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">粘贴职位链接</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createApplicationFromUrl} className="space-y-3">
            <Input
              name="job_url"
              type="url"
              placeholder="https://www.linkedin.com/jobs/view/…"
              defaultValue={url ?? ''}
              required
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" name="status" value="applied">
                我已经投递了，记一下
              </Button>
              <Button type="submit" name="status" value="wishlist" variant="outline">
                还没投，先存起来
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              有些网站（比如需要登录才能看的 LinkedIn 职位）抓不全信息也没关系，会先把链接存进去，进详情页手动补几个字段就行。
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">更快一点：一键投递书签</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            把下面这个链接拖到浏览器书签栏。以后在任何职位页面投完简历，点一下书签，会自动带上当前页面链接打开这个表单。
          </p>
          <BookmarkletLink
            code={bookmarklet}
            className="inline-flex h-9 items-center rounded-md border border-dashed px-3 text-sm font-medium"
          >
            📌 记录投递（拖到收藏栏）
          </BookmarkletLink>
        </CardContent>
      </Card>

      <details className="group rounded-lg border">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground">
          没有链接？手动填写
        </summary>
        <div className="border-t px-4 py-4">
          <form action={createApplication} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">公司 *</Label>
                <Input id="company" name="company" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">职位 *</Label>
                <Input id="position" name="position" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue="wishlist"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                >
                  {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote_type">工作方式</Label>
                <select
                  id="remote_type"
                  name="remote_type"
                  defaultValue=""
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
                <Label htmlFor="location">地点</Label>
                <Input id="location" name="location" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">来源</Label>
                <Input id="source" name="source" placeholder="内推 / 邮件申请…" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_url_manual">职位链接</Label>
              <Input id="job_url_manual" name="job_url" type="url" placeholder="https://…" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tech_stack">技术栈（逗号分隔）</Label>
              <Input id="tech_stack" name="tech_stack" placeholder="React, TypeScript, Node.js" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            <Button type="submit" variant="secondary">
              保存
            </Button>
          </form>
        </div>
      </details>
    </div>
  );
}
