import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/broadcast — Get active broadcasts
 * POST /api/broadcast — Create broadcast (TLM/admin only)
 */

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('broadcast_messages')
      .select(`
        id, title, message, severity, is_active, created_at, expires_at,
        profiles!broadcast_messages_created_by_fkey (full_name)
      `)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ broadcasts: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['tlm', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, message, severity, expires_hours } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    const expires_at = expires_hours
      ? new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('broadcast_messages')
      .insert({
        title,
        message,
        severity: severity || 'info',
        created_by: user.id,
        is_active: true,
        expires_at,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'broadcast',
      target_type: 'broadcast',
      target_id: data.id,
      details: { title, severity },
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
