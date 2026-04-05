'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface SeverityData {
  label: string;
  ringan: number;
  sedang: number;
  berat: number;
  sangat_berat: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  ringan: '#22c55e',
  sedang: '#eab308',
  berat: '#f97316',
  sangat_berat: '#ef4444',
};

export default function SeverityBarChart({ data }: { data: SeverityData[] }) {
  if (data.length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Tidak ada data severitas.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>
        Distribusi Severitas
      </h3>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
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
            <Bar dataKey="ringan" stackId="a" name="Ringan" fill={SEVERITY_COLORS.ringan} radius={[0, 0, 0, 0]} />
            <Bar dataKey="sedang" stackId="a" name="Sedang" fill={SEVERITY_COLORS.sedang} />
            <Bar dataKey="berat" stackId="a" name="Berat" fill={SEVERITY_COLORS.berat} />
            <Bar dataKey="sangat_berat" stackId="a" name="Sangat Berat" fill={SEVERITY_COLORS.sangat_berat} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '1rem',
        marginTop: '0.75rem', flexWrap: 'wrap',
      }}>
        {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {key.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
