'use client';

import { useEffect, useState, useCallback } from 'react';
import WaveLoader from '@/components/ui/WaveLoader';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  FileText, ChevronLeft, Loader2, Clock, Shield,
  UserCheck, AlertTriangle, Filter, ChevronDown,
} from 'lucide-react';

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor?: { full_name: string; email: string } | null;
}

const ACTION_META: Record<string, { color: string; label: string }> = {
  verification: { color: '#22c55e', label: 'Verifikasi' },
  role_change: { color: '#f59e0b', label: 'Ubah Role' },
  moderation: { color: '#ef4444', label: 'Moderasi' },
  broadcast: { color: '#3b82f6', label: 'Broadcast' },
  area_status: { color: '#8b5cf6', label: 'Status Area' },
};

export default function AuditLogsPage() {
  const { user, role, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['tlm', 'admin'].includes(role || ''))) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, role, router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('audit_logs')
      .select(`
        id, actor_id, action, target_type, target_id, details, created_at,
        profiles!audit_logs_actor_id_fkey (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterAction !== 'all') {
      query = query.eq('action', filterAction);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data.map((l: Record<string, unknown>) => ({
        id: l.id as string,
        actor_id: l.actor_id as string,
        action: l.action as string,
        target_type: l.target_type as string,
        target_id: l.target_id as string | null,
        details: l.details as Record<string, unknown> | null,
        created_at: l.created_at as string,
        actor: l.profiles as AuditLog['actor'],
      })));
    }
    setLoading(false);
  }, [supabase, filterAction]);

  useEffect(() => {
    if (user && ['tlm', 'admin'].includes(role || '')) fetchLogs();
  }, [user, role, fetchLogs]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <ChevronLeft size={20} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--primary-400)" />
              Audit Log
            </h1>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{
                padding: '6px 28px 6px 10px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                fontSize: '0.75rem', appearance: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">Semua Aksi</option>
              <option value="verification">Verifikasi</option>
              <option value="role_change">Ubah Role</option>
              <option value="moderation">Moderasi</option>
              <option value="broadcast">Broadcast</option>
            </select>
            <ChevronDown size={12} color="var(--text-muted)" style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
            }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <WaveLoader size={48} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FileText size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem' }}>Belum ada audit log.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.map((log) => {
              const meta = ACTION_META[log.action] || { color: '#94a3b8', label: log.action };
              return (
                <div key={log.id} className="card" style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                      background: `${meta.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Shield size={14} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: `${meta.color}15`, color: meta.color,
                        }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {log.target_type}{log.target_id ? ` #${(log.target_id).slice(0, 8)}` : ''}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {log.actor?.full_name || 'Sistem'}
                      </p>
                      {log.details && (
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {JSON.stringify(log.details).slice(0, 100)}
                        </p>
                      )}
                      <p style={{
                        fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.375rem',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                      }}>
                        <Clock size={10} />
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
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
