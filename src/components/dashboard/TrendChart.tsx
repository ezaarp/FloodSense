'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendDataPoint {
  label: string;
  total: number;
  verified: number;
  flagged: number;
}

export default function TrendChart({ data }: { data: TrendDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Tidak ada data tren untuk periode ini.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>
        Tren Laporan
      </h3>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-primary)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: '0.75rem',
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              fill="url(#colorTotal)"
              strokeWidth={2}
              name="Total"
            />
            <Area
              type="monotone"
              dataKey="verified"
              stroke="#22c55e"
              fill="url(#colorVerified)"
              strokeWidth={2}
              name="Terverifikasi"
            />
            <Area
              type="monotone"
              dataKey="flagged"
              stroke="#f97316"
              fill="none"
              strokeWidth={2}
              strokeDasharray="4 4"
              name="Ditandai"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
