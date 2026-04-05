import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

/**
 * POST /api/push/send — Send push notification (staff/admin only)
 */

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

    if (!profile || !['staf', 'tlm', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, body, target_user_ids, region_id } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    // Configure VAPID
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidMailto = process.env.VAPID_MAILTO || 'mailto:admin@floodsense.id';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidMailto, vapidPublicKey, vapidPrivateKey);

    // Fetch subscriptions
    let subQuery = supabase.from('push_subscriptions').select('subscription_data, user_id');

    if (target_user_ids?.length > 0) {
      subQuery = subQuery.in('user_id', target_user_ids);
    }

    const { data: subscriptions } = await subQuery;

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({ title, body, icon: '/icons/icon-192x192.png', url: '/' });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription_data as webpush.PushSubscription, payload);
        sent++;
      } catch {
        failed++;
        // Remove invalid subscriptions
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', sub.user_id)
          .eq('subscription_data', sub.subscription_data as unknown as string);
      }
    }

    return NextResponse.json({ sent, failed });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
