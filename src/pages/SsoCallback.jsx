import { useEffect, useState } from 'react';
import { getRoleKind } from '../utils/auth.utils';

/**
 * Penerima SSO dari LMS (fe-ucl). LMS sudah menukar token via tias-backend -> cbt-api
 * (lihat CbtAuthController di tias-backend) dan mengirim token CBT yang sudah valid lewat
 * `?token=`. Kita hanya membaca payload JWT (userId/email/role) untuk mengisi state lokal
 * yang sama seperti login manual — verifikasi signature tetap dilakukan server-side oleh
 * cbt-api pada setiap panggilan API berikutnya, jadi decode di sini murni utk populate UI.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (_) {
    return null;
  }
}

export default function SsoCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const returnTo = params.get('returnTo');

    // Buang query string dari address bar secepatnya, apa pun hasilnya.
    window.history.replaceState({}, '', window.location.pathname);

    // Dipakai DashboardLayout utk tombol "Kembali ke LMS" — tanpa ini dosen/mahasiswa
    // yang masuk lewat tab baru dari LMS tidak punya jalan balik sama sekali.
    if (returnTo) {
      try { sessionStorage.setItem('lms_return_url', returnTo); } catch (_) { /* noop */ }
    }

    if (!token) {
      setError('Token SSO tidak ditemukan.');
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload?.role || !payload?.email) {
      setError('Token SSO tidak valid.');
      return;
    }

    localStorage.setItem('token', token);
    localStorage.setItem('role', payload.role);
    localStorage.setItem('email', payload.email);
    localStorage.setItem('nama', payload.email);

    // BASE_URL (dari vite.config.js `base`) mengandung prefix deployment (mis. "/cbt/")
    // — wajib dipakai karena ini navigasi absolut dari root domain, bukan lewat router.
    const base = import.meta.env.BASE_URL;
    const roleKind = getRoleKind(payload.role);
    const target =
      roleKind === 'lecturer' ? `${base}dashboard` :
      roleKind === 'student' ? `${base}student-dashboard` :
      base;

    // Full navigation (bukan react-router navigate) supaya AuthProvider re-init dari
    // localStorage yang baru saja ditulis, sama seperti pola SSO receiver di fe-ucl.
    window.location.href = target;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-semibold">
      {error ? `SSO gagal: ${error}. Silakan login manual.` : 'Memproses SSO...'}
    </div>
  );
}
