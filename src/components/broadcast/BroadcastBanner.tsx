'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';

interface BroadcastMsg {
  id: string;
  title: string;
  message: string;
  severity: string;
}

const SEV: Record<string, { color: string; bg: string; icon: typeof Info }> = {
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Info },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle },
};

export default function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<BroadcastMsg[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        const res = await fetch('/api/broadcast');
        if (res.ok) {
          const data = await res.json();
          setBroadcasts(data.broadcasts || []);
        }
      } catch {}
    };
    fetchBroadcasts();
  }, []);

  const active = broadcasts.filter((b) => !dismissed.has(b.id));
  if (active.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.5rem 0.75rem' }}>
      {active.map((b) => {
        const meta = SEV[b.severity] || SEV.info;
        const Icon = meta.icon;
        return (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)',
            background: meta.bg, border: `1px solid ${meta.color}30`,
          }}>
            <Icon size={16} color={meta.color} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color }}>
                {b.title}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {b.message}
              </p>
            </div>
            <button
              onClick={() => setDismissed((s) => new Set(s).add(b.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
            >
              <X size={12} color="var(--text-muted)" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
