'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function TechTrendChart({ data }: { data: { tech: string; mentions: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
        <YAxis
          type="category"
          dataKey="tech"
          width={110}
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
          formatter={(value) => [String(value ?? 0), '提及次数']}
        />
        <Bar dataKey="mentions" fill="var(--viz-series-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
