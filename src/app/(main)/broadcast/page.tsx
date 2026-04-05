'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Radio, ChevronLeft, Loader2, Send, Clock,
  AlertTriangle, Info, XCircle,
} from 'lucide-react';
import WaveLoader from '@/components/ui/WaveLoader';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  severity: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  profiles: { full_name: string } | null;
}

const SEVERITY_META: Record<string, { color: string; label: string; icon: typeof Info }> = {
  info: { color: '#3b82f6', label: 'Info', icon: Info },
  warning: { color: '#f59e0b', label: 'Peringatan', icon: AlertTriangle },
  critical: { color: '#ef4444', label: 'Kritis', icon: XCircle },
};

export default function BroadcastPage() {
  const { user, role, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [expiresHours, setExpiresHours] = useState('24');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['tlm', 'admin'].includes(role || ''))) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, role, router]);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/broadcast');
    if (res.ok) {
      const data = await res.json();
      setBroadcasts(data.broadcasts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && ['tlm', 'admin'].includes(role || '')) fetchBroadcasts();
  }, [user, role, fetchBroadcasts]);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          severity,
          expires_hours: parseInt(expiresHours) || 24,
        }),
      });

      if (res.ok) {
        setTitle('');
        setMessage('');
        setSeverity('info');
        setShowForm(false);
        fetchBroadcasts();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <WaveLoader size={48} />
      </div>
    );
  }

  return (
    <div className="page-scroll" style={{ paddingBottom: '100px' }}>
      <div style={{
        padding: '1rem', background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <ChevronLeft size={20} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={20} color="var(--primary-400)" />
              Broadcast
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Send size={12} />
            Buat
          </button>
        </div>
      </div>

      <div style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto' }}>
        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Buat Broadcast Baru
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul broadcast..."
                style={{
                  padding: '8px 12px', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '0.8125rem', outline: 'none',
                }}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Pesan broadcast..."
                rows={4}
                style={{
                  padding: '8px 12px', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: '0.8125rem', resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {Object.entries(SEVERITY_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setSeverity(key)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${severity === key ? meta.color : 'var(--border-primary)'}`,
                      background: severity === key ? `${meta.color}10` : 'var(--bg-secondary)',
                      color: severity === key ? meta.color : 'var(--text-secondary)',
                      fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}
                  >
                    <meta.icon size={12} />
                    {meta.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Berlaku:</span>
                <select
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                  style={{
                    padding: '4px 8px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '0.75rem',
                  }}
                >
                  <option value="6">6 Jam</option>
                  <option value="12">12 Jam</option>
                  <option value="24">24 Jam</option>
                  <option value="48">48 Jam</option>
                  <option value="168">7 Hari</option>
                </select>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !message.trim() || submitting}
                className="btn btn-primary"
                style={{
                  padding: '10px', width: '100%',
                  opacity: !title.trim() || !message.trim() || submitting ? 0.5 : 1,
                }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Kirim Broadcast'}
              </button>
            </div>
          </div>
        )}

        {/* Broadcast List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <WaveLoader size={48} />
          </div>
        ) : broadcasts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Radio size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem' }}>Belum ada broadcast aktif.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {broadcasts.map((b) => {
              const meta = SEVERITY_META[b.severity] || SEVERITY_META.info;
              const SevIcon = meta.icon;
              return (
                <div key={b.id} className="card" style={{ padding: '0.75rem', borderLeft: `3px solid ${meta.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <SevIcon size={14} color={meta.color} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{b.title}</span>
                    <span style={{
                      fontSize: '0.5625rem', fontWeight: 600, padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      background: `${meta.color}15`, color: meta.color,
                    }}>
                      {meta.label}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.375rem' }}>
                    {b.message}
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.625rem', color: 'var(--text-muted)',
                  }}>
                    <span>Oleh: {(b.profiles as Record<string, unknown>)?.full_name as string || 'Sistem'}</span>
                    <span>•</span>
                    <span>{new Date(b.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
