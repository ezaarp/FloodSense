'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Download, RefreshCw, GitCompareArrows, ChevronDown,
} from 'lucide-react';
import WaveLoader from '@/components/ui/WaveLoader';
import KPICards from '@/components/dashboard/KPICards';
import TrendChart from '@/components/dashboard/TrendChart';
import SeverityBarChart from '@/components/dashboard/SeverityBarChart';
import RegionFilter from '@/components/dashboard/RegionFilter';
import TimeRangeFilter from '@/components/dashboard/TimeRangeFilter';
import RegionComparison from '@/components/dashboard/RegionComparison';

/* ---------- Types ---------- */
interface ReportRow {
  id: string;
  status: string;
  severity: string;
  created_at: string;
  reporter_id: string;
}

interface KPIData {
  totalReports: number;
  verified: number;
  flagged: number;
  activeUsers: number;
  delta?: { reports: number; verified: number };
}

interface TrendPoint { label: string; total: number; verified: number; flagged: number }
interface SevPoint { label: string; ringan: number; sedang: number; berat: number; sangat_berat: number }

/* ---------- Helpers ---------- */
function getDateRange(range: string): { since: string; previousSince: string } {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 1;
  const now = Date.now();
  return {
    since: new Date(now - days * 86400000).toISOString(),
    previousSince: new Date(now - days * 2 * 86400000).toISOString(),
  };
}

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/* ---------- Page ---------- */
export default function DashboardPage() {
  const { user, role, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData>({ totalReports: 0, verified: 0, flagged: 0, activeUsers: 0 });
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [severity, setSeverity] = useState<SevPoint[]>([]);

  // UI state
  const [showComparison, setShowComparison] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['staf', 'tlm', 'admin'].includes(role || ''))) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, role, router]);

  /* ---------- Data fetching ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);

    const { since, previousSince } = getDateRange(timeRange);

    // Determine region filter ID (most specific wins)
    const regionId = selectedDistrict || selectedCity || selectedProvince || null;

    // Base query builder
    const buildQuery = (from: string, to: string) => {
      let q = supabase
        .from('reports')
        .select('id, status, severity, created_at, reporter_id')
        .gte('created_at', from)
        .lt('created_at', to);
      if (regionId) q = q.eq('region_id', regionId);
      return q;
    };

    try {
      // Current period reports
      const { data: currentReports } = await buildQuery(since, new Date().toISOString());
      const Reports = (currentReports || []) as ReportRow[];

      // Previous period reports (for delta)
      const { data: prevReports } = await buildQuery(previousSince, since);
      const Prev = (prevReports || []) as ReportRow[];

      // Active users (unique reporters in current period)
      const uniqueUsers = new Set(Reports.map((r) => r.reporter_id)).size;

      // KPI counts
      const totalCurrent = Reports.length;
      const verifiedCurrent = Reports.filter((r) => r.status === 'verified').length;
      const flaggedCurrent = Reports.filter((r) => r.status === 'flagged').length;

      const totalPrev = Prev.length;
      const verifiedPrev = Prev.filter((r) => r.status === 'verified').length;

      setKpi({
        totalReports: totalCurrent,
        verified: verifiedCurrent,
        flagged: flaggedCurrent,
        activeUsers: uniqueUsers,
        delta: {
          reports: calcDelta(totalCurrent, totalPrev),
          verified: calcDelta(verifiedCurrent, verifiedPrev),
        },
      });

      // Trend chart (group by day/week)
      const isShort = ['7d', '1d'].includes(timeRange);
      const groupKey = (date: string) => {
        const d = new Date(date);
        if (isShort) {
          return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }
        // Weekly bucket
        const weekNum = Math.floor((d.getTime() - new Date(since).getTime()) / (7 * 86400000));
        return `Mgg ${weekNum + 1}`;
      };

      const trendMap: Record<string, TrendPoint> = {};
      Reports.forEach((r) => {
        const key = groupKey(r.created_at);
        if (!trendMap[key]) trendMap[key] = { label: key, total: 0, verified: 0, flagged: 0 };
        trendMap[key].total++;
        if (r.status === 'verified') trendMap[key].verified++;
        if (r.status === 'flagged') trendMap[key].flagged++;
      });
      setTrend(Object.values(trendMap).slice(-10));

      // Severity by region aggregation (top 5 regions or current region)
      let sevQuery = supabase
        .from('reports')
        .select('severity, region_id, regions(name)')
        .gte('created_at', since);
      if (regionId) sevQuery = sevQuery.eq('region_id', regionId);
      const { data: sevData } = await sevQuery;

      // Group by region name
      const sevMap: Record<string, SevPoint> = {};
      (sevData || []).forEach((r: { severity: string; region_id: string; regions?: { name: string } | null }) => {
        const label = (r.regions as { name?: string } | null)?.name || r.region_id?.slice(0, 8) || 'Unknown';
        if (!sevMap[label]) sevMap[label] = { label, ringan: 0, sedang: 0, berat: 0, sangat_berat: 0 };
        if (r.severity in sevMap[label]) sevMap[label][r.severity as keyof Omit<SevPoint, 'label'>]++;
      });

      setSeverity(Object.values(sevMap).slice(0, 6));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }

    setLoading(false);
  }, [supabase, timeRange, selectedProvince, selectedCity, selectedDistrict]);

  useEffect(() => {
    if (user && ['staf', 'tlm', 'admin'].includes(role || '')) {
      fetchData();
    }
  }, [user, role, fetchData]);

  /* ---------- PDF Export ---------- */
  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(contentRef.current, {
        scale: 1.5,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content is taller than 1 page, add multiple pages
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        let yOffset = 0;
        while (yOffset < pdfHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, pdfHeight);
          yOffset += pageHeight;
        }
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`FloodSense_Dashboard_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
    setExporting(false);
  };

  /* ---------- CSV Export ---------- */
  const handleExportCSV = () => {
    setShowExportMenu(false);
    const rows = [
      ['Kategori', 'Nilai'],
      ['Total Laporan', kpi.totalReports],
      ['Terverifikasi', kpi.verified],
      ['Ditandai', kpi.flagged],
      ['Pengguna Aktif', kpi.activeUsers],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FloodSense_KPI_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- Auth loading ---------- */
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <WaveLoader size={48} />
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-primary)',
        padding: '1rem 1.25rem',
        position: 'sticky', top: '56px', zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <LayoutDashboard size={20} color="var(--primary-400)" />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.2 }}>
              Dashboard Analitik
            </h1>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {['staf', 'admin'].includes(role || '') ? 'Staff Overview' : 'Top Level Management View'}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Compare button */}
            <button
              onClick={() => setShowComparison(!showComparison)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                background: showComparison ? 'rgba(59,130,246,0.15)' : 'var(--bg-secondary)',
                border: showComparison ? '1px solid rgba(59,130,246,0.5)' : '1px solid var(--border-primary)',
                cursor: 'pointer', fontSize: '0.75rem',
                color: showComparison ? 'var(--primary-400)' : 'var(--text-secondary)',
              }}
            >
              <GitCompareArrows size={13} />
              <span style={{ display: 'none' }} className="desktop-inline">Bandingkan</span>
            </button>

            {/* Export dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem', color: 'var(--text-secondary)',
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                {exporting ? <WaveLoader size={14} /> : <Download size={13} />}
                Export
                <ChevronDown size={11} />
              </button>
              {showExportMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden', zIndex: 200, minWidth: '130px',
                }}>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      display: 'flex', width: '100%', padding: '8px 14px',
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '0.75rem', color: 'var(--text-secondary)',
                      alignItems: 'center', gap: '0.5rem',
                    }}
                  >
                    📄 Ekspor PDF
                  </button>
                  <div style={{ height: '1px', background: 'var(--border-primary)' }} />
                  <button
                    onClick={handleExportCSV}
                    style={{
                      display: 'flex', width: '100%', padding: '8px 14px',
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '0.75rem', color: 'var(--text-secondary)',
                      alignItems: 'center', gap: '0.5rem',
                    }}
                  >
                    📊 Ekspor CSV
                  </button>
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                padding: '6px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} color="var(--text-muted)"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'clamp(200px, 22%, 260px) 1fr',
        gap: '1rem',
        padding: '1rem',
        alignItems: 'start',
      }}
        className="dashboard-grid"
      >
        {/* ── SIDEBAR ── */}
        <aside>
          <div className="card" style={{ padding: '1rem', position: 'sticky', top: '72px' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Filter
            </p>

            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Periode</p>
            <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

            <div style={{ height: '1px', background: 'var(--border-primary)', margin: '0.875rem 0' }} />

            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Wilayah</p>
            <RegionFilter
              selectedProvince={selectedProvince}
              selectedCity={selectedCity}
              selectedDistrict={selectedDistrict}
              onProvinceChange={setSelectedProvince}
              onCityChange={setSelectedCity}
              onDistrictChange={setSelectedDistrict}
            />

            {(selectedProvince || selectedCity || selectedDistrict) && (
              <button
                onClick={() => {
                  setSelectedProvince('');
                  setSelectedCity('');
                  setSelectedDistrict('');
                }}
                style={{
                  marginTop: '0.5rem', fontSize: '0.6875rem',
                  color: 'var(--primary-400)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                × Reset filter wilayah
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main ref={contentRef}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <WaveLoader size={48} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* KPIs */}
              <KPICards data={kpi} />

              {/* Charts row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}>
                <TrendChart data={trend} />
                <SeverityBarChart data={severity} />
              </div>

              {/* Region Comparison (toggleable) */}
              {showComparison && <RegionComparison timeRange={timeRange} />}
            </div>
          )}
        </main>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
          aside > div {
            position: static !important;
          }
          .desktop-inline {
            display: inline !important;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
