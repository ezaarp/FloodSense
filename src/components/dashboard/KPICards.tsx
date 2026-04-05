'use client';

import { FileText, CheckCircle2, AlertTriangle, Users, TrendingUp, TrendingDown } from 'lucide-react';

interface KPIData {
  totalReports: number;
  verified: number;
  flagged: number;
  activeUsers: number;
  delta?: { reports: number; verified: number };
}

export default function KPICards({ data }: { data: KPIData }) {
  const cards = [
    {
      label: 'Total Laporan',
      value: data.totalReports,
      icon: FileText,
      color: '#3b82f6',
      delta: data.delta?.reports,
    },
    {
      label: 'Terverifikasi',
      value: data.verified,
      icon: CheckCircle2,
      color: '#22c55e',
      delta: data.delta?.verified,
    },
    {
      label: 'Ditandai',
      value: data.flagged,
      icon: AlertTriangle,
      color: '#f97316',
    },
    {
      label: 'Pengguna Aktif',
      value: data.activeUsers,
      icon: Users,
      color: '#8b5cf6',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '0.75rem',
    }}>
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = (card.delta ?? 0) >= 0;
        return (
          <div
            key={card.label}
            className="card"
            style={{
              padding: '1rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: '-8px', right: '-8px',
              width: '48px', height: '48px', borderRadius: '50%',
              background: `${card.color}10`,
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                background: `${card.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={14} color={card.color} />
              </div>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>
              {card.value.toLocaleString('id-ID')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {card.label}
              </p>
              {card.delta !== undefined && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '2px',
                  fontSize: '0.625rem', fontWeight: 600,
                  color: isPositive ? '#22c55e' : '#ef4444',
                }}>
                  {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {Math.abs(card.delta)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
