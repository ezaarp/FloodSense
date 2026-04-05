'use client';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

/**
 * AppShell — layout wrapper untuk semua halaman (main).
 *
 * Strategi z-index:
 *   z-2000  Header (fixed top)
 *   z-2000  BottomNav (fixed bottom)
 *   z-1000  Kontrol dalam peta (LayerControl, Legend, GPS button)
 *   z-400   Leaflet default controls
 *   z-1     Map tiles / canvas
 *
 * Dengan Header & BottomNav menggunakan z-index 2000, mereka selalu
 * di atas Leaflet canvas bahkan jika Leaflet membuat stacking context baru.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Header — always on top */}
      <Header />

      {/* Main content area — starts below header */}
      <main
        style={{
          position: 'relative',
          marginTop: '56px',        /* header height */
          paddingBottom: '100px',   /* space for floating bottom nav */
          minHeight: 'calc(100dvh - 56px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>

      {/* Bottom Nav — always on top */}
      <BottomNav />
    </>
  );
}
