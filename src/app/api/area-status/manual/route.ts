import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/area-status/manual
 * FR-039: Staff manual area status actions.
 *
 * Actions:
 *   'mereda' — marks BANJIR_AKTIF/SIAGA as mereda
 *   'normal' — confirms MEREDA back to NORMAL
 */

type AreaStatus = 'normal' | 'waspada' | 'siaga' | 'banjir_aktif' | 'mereda';

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

    const { region_id, action, note } = await req.json();
    if (!region_id || !action) {
      return NextResponse.json({ error: 'region_id and action are required' }, { status: 400 });
    }

    if (!['mereda', 'normal'].includes(action)) {
      return NextResponse.json({ error: "action must be 'mereda' or 'normal'" }, { status: 400 });
    }

    // Get current active status
    const { data: current } = await supabase
      .from('area_status')
      .select('id, status')
      .eq('region_id', region_id)
      .is('valid_until', null)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentStatus: AreaStatus = (current?.status as AreaStatus) ?? 'normal';

    if (action === 'mereda' && !['banjir_aktif', 'siaga'].includes(currentStatus)) {
      return NextResponse.json({ error: `Cannot mark as mereda from: ${currentStatus}` }, { status: 409 });
    }
    if (action === 'normal' && currentStatus !== 'mereda') {
      return NextResponse.json({ error: `Cannot mark as normal from: ${currentStatus}` }, { status: 409 });
    }

    const targetStatus: AreaStatus = action === 'mereda' ? 'mereda' : 'normal';
    const now = new Date().toISOString();

    // Invalidate current
    if (current?.id) {
      await supabase.from('area_status').update({ valid_until: now }).eq('id', current.id);
    }

    // Insert new status
    const { data: inserted, error: insertError } = await supabase
      .from('area_status')
      .insert({
        region_id,
        status: targetStatus,
        trigger_type: 'manual',
        valid_from: now,
        valid_until: null,
        requires_confirmation: false,
        confirmed_by: user.id,
        note: note || null,
      })
      .select('id')
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action_type: 'area_status_manual',
      target_type: 'area_status',
      target_id: inserted?.id,
      delta: { from: currentStatus, to: targetStatus, action, region_id, note },
    });

    // Push notification on NORMAL confirmation
    if (targetStatus === 'normal') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '✅ Kondisi Kembali Normal',
            body: 'Wilayah yang Anda pantau telah kembali normal.',
            region_id,
          }),
        });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      success: true, from: currentStatus, to: targetStatus, area_status_id: inserted?.id,
    });
  } catch (err) {
    console.error('Manual area status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const region_id = searchParams.get('region_id');
    if (!region_id) return NextResponse.json({ error: 'region_id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('area_status')
      .select('id, status, valid_from, valid_until, trigger_type, requires_confirmation, note, profiles!area_status_confirmed_by_fkey(full_name)')
      .eq('region_id', region_id)
      .order('valid_from', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ history: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
