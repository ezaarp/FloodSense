'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface TimeRangeFilterProps {
  value: string;
  onChange: (val: string) => void;
}

const TIME_RANGES = [
  { key: '24h', label: '24 Jam Terakhir' },
  { key: '7d', label: '7 Hari Terakhir' },
  { key: '30d', label: '30 Hari Terakhir' },
  { key: '90d', label: '90 Hari Terakhir' },
  { key: 'all', label: 'Semua Waktu' },
];

export default function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div style={{ position: 'relative' }}>
      <Calendar size={12} color="var(--text-muted)" style={{
        position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
      }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 28px 8px 28px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
          fontSize: '0.75rem', appearance: 'none', cursor: 'pointer',
        }}
      >
        {TIME_RANGES.map((r) => (
          <option key={r.key} value={r.key}>{r.label}</option>
        ))}
      </select>
      <ChevronDown size={12} color="var(--text-muted)" style={{
        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

export function getTimeRangeDate(range: string): string | null {
  const now = Date.now();
  switch (range) {
    case '24h': return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    default: return null;
  }
}
