'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function StatusFunnelChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            background: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
          }}
          formatter={(value) => [String(value ?? 0), '数量']}
        />
        <Bar dataKey="count" fill="var(--viz-series-1)" radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
