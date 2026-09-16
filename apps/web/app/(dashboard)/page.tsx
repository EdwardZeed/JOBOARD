import { listApplications } from '@/lib/data';
import { computeOverviewKpis, computeStatusFunnel, computeWeeklyTrend } from '@/lib/metrics';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusFunnelChart } from '@/components/charts/status-funnel-chart';
import { WeeklyTrendChart } from '@/components/charts/weekly-trend-chart';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const applications = await listApplications();
  const kpis = computeOverviewKpis(applications);
  const funnel = computeStatusFunnel(applications);
  const trend = computeWeeklyTrend(applications);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">总览</h1>
        <p className="text-sm text-muted-foreground">找工作进度一览</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="跟踪中职位" value={kpis.total} />
        <KpiCard label="已投递" value={kpis.submitted} />
        <KpiCard label="进行中" value={kpis.active} />
        <KpiCard label="Offer" value={kpis.offers} />
        <KpiCard label="回复率" value={`${kpis.responseRate}%`} />
        <KpiCard
          label="平均响应天数"
          value={kpis.avgResponseDays ?? '—'}
          hint={kpis.avgResponseDays !== null ? '投递到收到回复' : '暂无数据'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">投递状态漏斗</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusFunnelChart data={funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">每周投递趋势</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <WeeklyTrendChart data={trend} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">暂无投递数据</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
