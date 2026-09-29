import { getApplicantProfile, getSearchPreferences } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateApplicantProfile, updateSearchPreferences } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [searchPreferences, profile] = await Promise.all([getSearchPreferences(), getApplicantProfile()]);

  const locationTiersText = searchPreferences.location_tiers.map((tier) => tier.join(', ')).join('\n');
  const facts = Object.entries(profile.facts).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-sm text-muted-foreground">agent 搜索、投递时读取的搜索偏好和基础信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">搜索偏好</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateSearchPreferences} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_tiers">地点优先级</Label>
              <Textarea
                id="location_tiers"
                name="location_tiers"
                rows={3}
                defaultValue={locationTiersText}
                placeholder={'Perth, Remote\nAustralia'}
              />
              <p className="text-xs text-muted-foreground">
                每行一档，同一档内逗号分隔多个地点，越靠前的档优先级越高
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="posted_within_days">只看多少天内发布的职位</Label>
                <Input
                  id="posted_within_days"
                  name="posted_within_days"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={searchPreferences.posted_within_days}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">搜索地区</Label>
                <Input id="country" name="country" defaultValue={searchPreferences.country} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_domains">限定站点（逗号分隔，留空表示不限）</Label>
              <Input
                id="site_domains"
                name="site_domains"
                defaultValue={searchPreferences.site_domains.join(', ')}
                placeholder="例如 greenhouse.io, lever.co"
              />
              <p className="text-xs text-muted-foreground">
                SEEK 的职位详情页是前端渲染的，站内搜索抓不到具体职位链接，所以默认没有限定 SEEK
              </p>
            </div>

            <Button type="submit">保存搜索偏好</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            agent 投递时用来回答申请表单里的问题（工作签证、notice period 等）。只有勾选"已确认"的字段才会被
            agent 当作可信答案使用。
          </p>

          <form action={updateApplicantProfile} className="space-y-3">
            {facts.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有任何字段，在下面添加一个</p>
            ) : (
              <div className="space-y-3 sm:space-y-2">
                {facts.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-1.5 border-b pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-2 sm:border-b-0 sm:pb-0"
                  >
                    <div className="text-sm font-medium sm:w-36 sm:shrink-0 sm:pt-2">{key}</div>
                    <Input name={`value__${key}`} defaultValue={String(value ?? '')} className="flex-1" />
                    <div className="flex gap-3 sm:contents">
                      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground sm:pt-2">
                        <input
                          type="checkbox"
                          name={`confirmed__${key}`}
                          defaultChecked={profile.confirmed_fields.includes(key)}
                        />
                        已确认
                      </label>
                      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-destructive sm:pt-2">
                        <input type="checkbox" name={`delete__${key}`} />
                        删除
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5 border-t pt-3 sm:flex-row sm:items-start sm:gap-2">
              <Input name="new_key" placeholder="新字段名，例如 linkedin_url" className="sm:w-36 sm:shrink-0" />
              <Input name="new_value" placeholder="值" className="flex-1" />
              <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground sm:pt-2">
                <input type="checkbox" name="new_confirmed" />
                已确认
              </label>
            </div>

            <Button type="submit">保存基础信息</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
