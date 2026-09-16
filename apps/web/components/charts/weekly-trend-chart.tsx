'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function WeeklyTrendChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} width={28} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            background: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
          }}
          formatter={(value) => [String(value ?? 0), '投递数']}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--viz-series-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--viz-series-1)', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
