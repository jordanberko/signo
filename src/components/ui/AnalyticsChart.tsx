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
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DB" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          interval={tickInterval}
          tick={{ fontSize: 11, fill: '#9B9688' }}
          axisLine={{ stroke: '#E5E2DB' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9B9688' }}
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
            backgroundColor: '#FFFDF8',
            border: '1px solid #E5E2DB',
            borderRadius: '8px',
            fontSize: '13px',
            padding: '8px 12px',
          }}
          labelStyle={{ fontWeight: 600, marginBottom: 2 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
