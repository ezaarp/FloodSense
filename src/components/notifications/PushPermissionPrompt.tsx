'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export default function PushPermissionPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    // Check if user has dismissed before
    const d = localStorage.getItem('push_dismissed');
    if (d) setDismissed(true);
  }, []);

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw-push.js');
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidKey) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        // Send subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        });
      }
    } catch (err) {
      console.error('Push subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push_dismissed', '1');
  };

  // Don't show if already granted, denied, or dismissed
  if (permission !== 'default' || dismissed) return null;

  return (
    <div style={{
      padding: '0.75rem', margin: '0.75rem',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(59,130,246,0.08)',
      border: '1px solid rgba(59,130,246,0.2)',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
    }}>
      <Bell size={20} color="var(--primary-400)" />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.125rem' }}>
          Aktifkan Notifikasi Banjir
        </p>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          Terima peringatan banjir di wilayah Anda secara real-time.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '6px 10px', fontSize: '0.6875rem',
            background: 'none', border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          Nanti
        </button>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '0.6875rem' }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Aktifkan'}
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
