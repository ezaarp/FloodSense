import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/area-status/evaluate
 * FR-039/040: Area Status State Machine (append-only log)
 *
 * Schema reality check:
 *  - area_status.status: enum ('normal','waspada','siaga','banjir_aktif','mereda')
 *  - area_status.trigger_type: enum ('auto','manual')
 *  - area_status.valid_from / valid_until: timestamptz
 *  - area_status.requires_confirmation: boolean
 *  - audit_logs.action_type: text, .delta: jsonb
 *
 * State transitions (auto-evaluated):
 *   normal → waspada     : ≥3 reports in last 60min
 *   waspada → siaga      : ≥5 berat/sangat_berat in last 90min
 *   any → banjir_aktif   : ≥8 reports in 120min OR ≥1 high-cred verified in 6hr
 *   banjir_aktif → mereda: no new reports for 3hr (requires_confirmation = true)
 */

type AreaStatus = 'normal' | 'waspada' | 'siaga' | 'banjir_aktif' | 'mereda';

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function determineNextStatus(
  current: AreaStatus,
  c: { last60: number; heavyLast90: number; last120: number; highCredLast6h: number; noReportFor3h: boolean }
): { next: AreaStatus; requiresConfirmation: boolean } | null {

  if (current === 'banjir_aktif' && c.noReportFor3h) {
    return { next: 'mereda', requiresConfirmation: true };
  }
  if ((c.last120 >= 8 || c.highCredLast6h >= 1) && current !== 'banjir_aktif') {
    return { next: 'banjir_aktif', requiresConfirmation: false };
  }
  if (current === 'waspada' && c.heavyLast90 >= 5) {
    return { next: 'siaga', requiresConfirmation: false };
  }
  if (current === 'normal' && c.last60 >= 3) {
    return { next: 'waspada', requiresConfirmation: false };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['staf', 'tlm', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { region_id } = await req.json();
    if (!region_id) return NextResponse.json({ error: 'region_id is required' }, { status: 400 });

    // 1. Get current active status
    const { data: currentRow } = await supabase
      .from('area_status')
      .select('id, status, valid_from')
      .eq('region_id', region_id)
      .is('valid_until', null)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentStatus: AreaStatus = (currentRow?.status as AreaStatus) ?? 'normal';

    // 2. Count reports in various windows
    const [
      { count: last60 },
      { count: heavyLast90 },
      { count: last120 },
      { count: highCredLast6h },
      { count: last3h },
    ] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('region_id', region_id).in('status', ['pending', 'verified', 'flagged']).gte('created_at', minutesAgo(60)),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('region_id', region_id).in('severity', ['berat', 'sangat_berat']).gte('created_at', minutesAgo(90)),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('region_id', region_id).gte('created_at', minutesAgo(120)),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('region_id', region_id).eq('status', 'verified').gte('credibility_score', 80).gte('created_at', minutesAgo(360)),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('region_id', region_id).gte('created_at', minutesAgo(180)),
    ]);

    const counts = {
      last60: last60 ?? 0,
      heavyLast90: heavyLast90 ?? 0,
      last120: last120 ?? 0,
      highCredLast6h: highCredLast6h ?? 0,
      noReportFor3h: (last3h ?? 0) === 0,
    };

    const transition = determineNextStatus(currentStatus, counts);

    if (!transition) {
      return NextResponse.json({ success: true, changed: false, current_status: currentStatus, counts });
    }

    const now = new Date().toISOString();

    // 3. Invalidate current row
    if (currentRow?.id) {
      await supabase.from('area_status').update({ valid_until: now }).eq('id', currentRow.id);
    }

    // 4. Insert new status
    const { data: inserted, error: insertError } = await supabase
      .from('area_status')
      .insert({
        region_id,
        status: transition.next,
        trigger_type: 'auto',
        valid_from: now,
        valid_until: null,
        requires_confirmation: transition.requiresConfirmation,
        note: JSON.stringify(counts),
      })
      .select('id')
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // 5. Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action_type: 'area_status_transition',
      target_type: 'area_status',
      target_id: inserted?.id,
      delta: { from: currentStatus, to: transition.next, region_id, counts },
    });

    // 6. Push notification on escalation
    if (['siaga', 'banjir_aktif'].includes(transition.next)) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `⚠️ Status: ${transition.next.toUpperCase()}`,
            body: 'Area banjir terdeteksi. Tetap waspada.',
            region_id,
          }),
        });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      success: true, changed: true,
      from: currentStatus, to: transition.next,
      requires_confirmation: transition.requiresConfirmation,
      area_status_id: inserted?.id,
    });
  } catch (err) {
    console.error('Area status evaluate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const region_id = searchParams.get('region_id');

    let query = supabase
      .from('area_status')
      .select('id, region_id, status, valid_from, valid_until, trigger_type, requires_confirmation, regions(name, level)')
      .is('valid_until', null)
      .order('valid_from', { ascending: false });

    if (region_id) query = query.eq('region_id', region_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ statuses: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
