import { listProfileSkills, listTechTrendWeekly } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TechTrendChart } from '@/components/charts/tech-trend-chart';

export const dynamic = 'force-dynamic';

export default async function TrendsPage() {
  const [weekly, skills] = await Promise.all([listTechTrendWeekly(), listProfileSkills()]);

  const totals = new Map<string, number>();
  for (const row of weekly) {
    totals.set(row.tech_name, (totals.get(row.tech_name) ?? 0) + row.mentions);
  }
  const ranked = Array.from(totals.entries())
    .map(([tech, mentions]) => ({ tech, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 12);

  const skillNames = new Set(skills.map((s) => s.skill_name.toLowerCase()));
  const gaps = ranked.filter((r) => !skillNames.has(r.tech.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">技术趋势</h1>
        <p className="text-sm text-muted-foreground">
          来自职位描述中出现的技术关键词（由 agent 通过 MCP 的{' '}
          <code className="rounded bg-muted px-1">record_tech_signals</code> 工具记录）
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">热门技术需求</CardTitle>
        </CardHeader>
        <CardContent>
          {ranked.length > 0 ? (
            <TechTrendChart data={ranked} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">暂无数据</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">我当前的技能</CardTitle>
          </CardHeader>
          <CardContent>
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                暂无数据，可通过 MCP 的 <code className="rounded bg-muted px-1">update_profile_skills</code> 工具录入
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill.id} variant="secondary">
                    {skill.skill_name}
                    {skill.proficiency ? ` · ${skill.proficiency}/5` : ''}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">值得补充的技能</CardTitle>
          </CardHeader>
          <CardContent>
            {gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无明显差距</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gaps.map((gap) => (
                  <Badge key={gap.tech} variant="outline">
                    {gap.tech}（{gap.mentions} 次提及）
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
