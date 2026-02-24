# CBT Frontend

Frontend aplikasi CBT (Computer Based Test) berbasis React + Vite untuk 3 role:

- `admin`
- `dosen` (lecturer)
- `mahasiswa` (student)

## Stack

- React 19
- React Router 7
- Vite 7
- Tailwind CSS 4
- Axios
- SweetAlert2
- Framer Motion
- XLSX

## Prasyarat

- Node.js `20.19+` atau `22.12+` (disarankan)
- npm

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat file environment:

```bash
cp .env.example .env
```

3. Sesuaikan value backend:

```env
VITE_API_BASE_URL=https://u-talent.uika-bogor.ac.id/cbt-api
```

4. Jalankan development server:

```bash
npm run dev
```

## Scripts

- `npm run dev`: jalankan mode development
- `npm run lint`: cek lint ESLint
- `npm run build`: build production
- `npm run preview`: preview hasil build

## Struktur Routing (ringkas)

- Public:
  - `/` login
  - `/register`
- Protected:
  - `/profile` (harus login)
  - `/take-exam` (khusus mahasiswa)
  - Area dashboard dengan layout:
    - Admin: `/admin`, `/admin/verifikasi`, `/admin/pengguna`, `/admin/matkul`
    - Dosen: `/dashboard`, `/manage-matkul`, `/manage-questions`, `/create-exam`, `/grading`, `/rekap-nilai`
    - Mahasiswa: `/student-dashboard`, `/panduan`

Route guard menggunakan komponen di `src/components/RouteGuards.jsx`.

## Konfigurasi API

- Base URL Axios diatur global di `src/main.jsx` menggunakan:
  - `import.meta.env.VITE_API_BASE_URL`
- Endpoint pada halaman menggunakan path relatif (`/api/...`), bukan hardcoded host.

## Optimasi yang sudah diterapkan

- Route-level lazy loading di `src/App.jsx` untuk menurunkan beban initial bundle.
- Lint hook warnings utama sudah dibereskan.

## Catatan

- Jika backend URL berbeda per environment (staging/production), cukup ubah `.env` tanpa mengubah source code.
