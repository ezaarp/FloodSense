'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { GitCompareArrows, X, Plus } from 'lucide-react';
import WaveLoader from '@/components/ui/WaveLoader';

interface Region {
  id: string;
  name: string;
  level: string;
}

interface ComparisonData {
  region: Region;
  totalReports: number;
  verified: number;
  flagged: number;
  avgCredibility: number;
  bySeverity: { ringan: number; sedang: number; berat: number; sangat_berat: number };
}

const REGION_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#22c55e'];

export default function RegionComparison({ timeRange }: { timeRange: string }) {
  const supabase = createClient();
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [selected, setSelected] = useState<Region[]>([]);
  const [selectingRegion, setSelectingRegion] = useState<'province' | 'city'>('province');
  const [compData, setCompData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [activeProvince, setActiveProvince] = useState('');

  // Load provinces
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name, level')
        .eq('level', 'provinsi')
        .order('name');
      setProvinces(data || []);
    };
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load cities when province picked in modal
  useEffect(() => {
    if (!activeProvince) { setCities([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name, level')
        .eq('level', 'kabupaten')
        .eq('parent_id', activeProvince)
        .order('name');
      setCities(data || []);
    };
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProvince]);

  const fetchComparisonData = useCallback(async () => {
    if (selected.length === 0) { setCompData([]); return; }
    setLoading(true);

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 1;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const results: ComparisonData[] = await Promise.all(
      selected.map(async (region) => {
        const { data: reports } = await supabase
          .from('reports')
          .select('status, severity, credibility_score, region_id')
          .eq('region_id', region.id)
          .gte('created_at', since);

        const r = reports || [];
        const sev = { ringan: 0, sedang: 0, berat: 0, sangat_berat: 0 };
        r.forEach((rep: { severity: string; status: string; credibility_score: number | null }) => {
          if (rep.severity in sev) sev[rep.severity as keyof typeof sev]++;
        });

        return {
          region,
          totalReports: r.length,
          verified: r.filter((rep: { status: string }) => rep.status === 'verified').length,
          flagged: r.filter((rep: { status: string }) => rep.status === 'flagged').length,
          avgCredibility: r.length > 0
            ? Math.round(r.reduce((a: number, b: { credibility_score: number | null }) => a + (b.credibility_score || 0), 0) / r.length)
            : 0,
          bySeverity: sev,
        };
      })
    );

    setCompData(results);
    setLoading(false);
  }, [selected, timeRange, supabase]);

  useEffect(() => { fetchComparisonData(); }, [fetchComparisonData]);

  const addRegion = (region: Region) => {
    if (selected.find((r) => r.id === region.id)) return;
    if (selected.length >= 4) return;
    setSelected((prev) => [...prev, region]);
    setShowAdd(false);
    setActiveProvince('');
  };

  const removeRegion = (id: string) => {
    setSelected((prev) => prev.filter((r) => r.id !== id));
  };

  // Chart data: flattened for grouped bar
  const barData = [
    { name: 'Total Laporan', ...Object.fromEntries(compData.map((d) => [d.region.name, d.totalReports])) },
    { name: 'Terverifikasi', ...Object.fromEntries(compData.map((d) => [d.region.name, d.verified])) },
    { name: 'Ditandai', ...Object.fromEntries(compData.map((d) => [d.region.name, d.flagged])) },
  ];

  const severityData = ['ringan', 'sedang', 'berat', 'sangat_berat'].map((sev) => ({
    name: sev === 'sangat_berat' ? 'Sangat Berat' : sev.charAt(0).toUpperCase() + sev.slice(1),
    ...Object.fromEntries(compData.map((d) => [d.region.name, d.bySeverity[sev as keyof typeof d.bySeverity]])),
  }));

  return (
    <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
        <GitCompareArrows size={16} color="var(--primary-400)" />
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, flex: 1 }}>
          Perbandingan Wilayah
        </h3>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          Maks. 4 wilayah
        </span>
      </div>

      {/* Selected regions chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {selected.map((region, idx) => (
          <div
            key={region.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '4px 10px 4px 8px',
              background: `${REGION_COLORS[idx]}20`,
              border: `1px solid ${REGION_COLORS[idx]}60`,
              borderRadius: 'var(--radius-full)',
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: REGION_COLORS[idx],
            }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: REGION_COLORS[idx] }}>
              {region.name}
            </span>
            <button
              onClick={() => removeRegion(region.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', marginLeft: '2px' }}
            >
              <X size={12} color={REGION_COLORS[idx]} />
            </button>
          </div>
        ))}

        {selected.length < 4 && (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '4px 10px',
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border-primary)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)',
            }}
          >
            <Plus size={10} />
            Tambah Wilayah
          </button>
        )}
      </div>

      {/* Add-region modal */}
      {showAdd && (
        <div className="card" style={{
          padding: '0.75rem', marginBottom: '0.75rem',
          border: '1px solid var(--border-secondary)',
          background: 'var(--bg-elevated)',
        }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Pilih wilayah untuk dibandingkan
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectingRegion('province')}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-primary)',
                background: selectingRegion === 'province' ? 'var(--primary-500)' : 'var(--bg-secondary)',
                color: selectingRegion === 'province' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.6875rem', cursor: 'pointer',
              }}
            >
              Provinsi
            </button>
            <button
              onClick={() => setSelectingRegion('city')}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-primary)',
                background: selectingRegion === 'city' ? 'var(--primary-500)' : 'var(--bg-secondary)',
                color: selectingRegion === 'city' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.6875rem', cursor: 'pointer',
              }}
            >
              Kota/Kabupaten
            </button>
          </div>

          {selectingRegion === 'province' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', maxHeight: '160px', overflowY: 'auto' }}>
              {provinces.filter((p) => !selected.find((s) => s.id === p.id)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addRegion(p)}
                  style={{
                    padding: '4px 10px', fontSize: '0.6875rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {selectingRegion === 'city' && (
            <>
              <select
                value={activeProvince}
                onChange={(e) => setActiveProvince(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', marginBottom: '0.5rem',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.75rem',
                }}
              >
                <option value="">-- Pilih Provinsi Dulu --</option>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {activeProvince && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {cities.filter((c) => !selected.find((s) => s.id === c.id)).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addRegion(c)}
                      style={{
                        padding: '4px 10px', fontSize: '0.6875rem',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <button
            onClick={() => { setShowAdd(false); setActiveProvince(''); }}
            style={{
              marginTop: '0.5rem', fontSize: '0.6875rem', color: 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            Tutup
          </button>
        </div>
      )}

      {selected.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '1.5rem 0' }}>
          Pilih minimal 2 wilayah untuk mulai membandingkan.
        </p>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
          <WaveLoader size={48} />
        </div>
      ) : compData.length > 0 ? (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {compData.map((d, idx) => (
              <div
                key={d.region.id}
                style={{
                  padding: '0.75rem', borderRadius: 'var(--radius-md)',
                  background: `${REGION_COLORS[idx]}10`,
                  border: `1px solid ${REGION_COLORS[idx]}40`,
                }}
              >
                <div style={{
                  width: 6, height: '100%', background: REGION_COLORS[idx],
                  borderRadius: 2, float: 'left', marginRight: '0.5rem',
                }} />
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: REGION_COLORS[idx], marginBottom: '0.25rem' }}>
                  {d.region.name}
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{d.totalReports}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>laporan total</p>
                <div style={{ marginTop: '0.375rem', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                  ✓ {d.verified} terverifikasi · ⚑ {d.flagged} ditandai
                </div>
              </div>
            ))}
          </div>

          {/* Grouped bar chart */}
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            Volume Laporan
          </h4>
          <div style={{ width: '100%', height: 180, marginBottom: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '0.7rem' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '0.625rem' }} />
                {compData.map((d, idx) => (
                  <Bar key={d.region.id} dataKey={d.region.name} fill={REGION_COLORS[idx]} radius={[3, 3, 0, 0]} maxBarSize={40} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Severity breakdown */}
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            Distribusi Severitas
          </h4>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={severityData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '0.7rem' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '0.625rem' }} />
                {compData.map((d, idx) => (
                  <Bar key={d.region.id} dataKey={d.region.name} fill={REGION_COLORS[idx]} radius={[3, 3, 0, 0]} maxBarSize={40} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : null}
    </div>
  );
}
