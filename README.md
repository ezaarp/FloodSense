# FloodSense

Aplikasi pelaporan dan pemantauan banjir berbasis komunitas untuk Indonesia. Warga dapat melaporkan kejadian banjir secara real-time, staf memverifikasi laporan, dan tim manajemen memantau status wilayah melalui dashboard analitik.

## Fitur Utama

- **Peta Interaktif** — laporan banjir divisualisasikan dengan marker, heatmap, dan clustering berbasis Leaflet
- **Pelaporan Warga** — submit laporan dengan foto, tinggi air, koordinat GPS, dan deskripsi
- **Sistem Verifikasi** — staf dapat memverifikasi, menolak, atau menjadwalkan peninjauan ulang laporan
- **Status Wilayah** — status per wilayah (normal / waspada / siaga / banjir aktif / mereda) dipicu otomatis atau manual
- **Dashboard Analitik** — KPI cards, trend chart, severity breakdown, dan perbandingan antar wilayah
- **Sistem Voting** — warga dapat upvote/downvote laporan untuk meningkatkan credibility score
- **Broadcast Pesan** — TLM/admin dapat mengirim pesan darurat ke wilayah tertentu
- **Push Notification** — notifikasi Web Push untuk perubahan status laporan dan siaran darurat
- **Manajemen Pengguna** — role-based access: `warga`, `staf`, `tlm`, `admin`
- **Audit Log** — semua aksi tercatat untuk keperluan akuntabilitas

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database & Auth | Supabase (PostgreSQL + PostGIS) |
| Maps | Leaflet + React Leaflet |
| Charts | Recharts |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Push | Web Push API |
| PDF Export | jsPDF + jsPDF-AutoTable |

## Struktur Role

| Role | Akses |
|---|---|
| `warga` | Submit laporan, voting, notifikasi |
| `staf` | Verifikasi laporan, halaman staff |
| `tlm` | Broadcast pesan, semua akses staf |
| `admin` | Manajemen pengguna, audit log, semua akses |

## Instalasi

```bash
# Clone repo
git clone https://github.com/ezaarp/FloodSense.git
cd FloodSense

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dll.

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

## Database Setup

Jalankan migration di Supabase SQL Editor:

```bash
supabase/migrations/001_check_nearby_report.sql
```

Migration ini membuat:
- Function `check_nearby_report` — deteksi laporan duplikat dalam radius 100m / 30 menit
- Function `increment_reputation` — update skor reputasi pelapor
- View `v_report_clusters` — agregasi laporan untuk tampilan peta

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```
