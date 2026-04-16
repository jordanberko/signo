'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartProps {
  data: Array<{ date: string; value: number }>;
  color: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

export default function AnalyticsChart({
  data,
  color,
  height = 220,
  valueFormatter,
}: ChartProps) {
  // Show ~6-8 ticks max on X axis
  const tickInterval = Math.max(1, Math.floor(data.length / 7));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,26,24,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          interval={tickInterval}
          tick={{ fontSize: 10, fill: '#9a9488', fontFamily: 'var(--font-sans)' }}
          axisLine={{ stroke: 'rgba(26,26,24,0.06)' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: '#9a9488', fontFamily: 'var(--font-sans)' }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          labelFormatter={(label) => formatDateLabel(String(label))}
          formatter={(value) => [
            valueFormatter ? valueFormatter(Number(value)) : value,
            '',
          ]}
          contentStyle={{
            backgroundColor: '#fcfbf8',
            border: '1px solid rgba(26,26,24,0.1)',
            borderRadius: '2px',
            fontSize: '12px',
            padding: '8px 12px',
            fontFamily: 'var(--font-sans)',
            color: '#1a1a18',
          }}
          labelStyle={{ fontWeight: 500, marginBottom: 2, color: '#1a1a18' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
