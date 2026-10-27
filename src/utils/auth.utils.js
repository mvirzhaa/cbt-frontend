export function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payloadPart = token.split('.')[1];
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
    const id = payload.id || payload.userId;
    return id !== undefined && id !== null ? String(id) : null;
  } catch (error) {
    return null;
  }
}

export function normalizeRole(rawRole) {
  return (rawRole || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function getRoleKind(rawRole) {
  const role = normalizeRole(rawRole);
  if (role.includes('admin')) return 'admin';
  if (role.includes('mahasiswa') || role.includes('student')) return 'student';
  if (role.includes('dosen') || role.includes('lecturer')) return 'lecturer';
  return '';
}

const PENDING_DESTINATION_KEY = 'cbt_pending_destination';

// RouteGuards memanggil ini SEBELUM melempar ke login eportal (sesi kosong --
// khas kalau dibuka lewat Safe Exam Browser, yang selalu sesi baru tanpa
// token tersimpan sama sekali di dalamnya). Tanpa ini, path+query yang
// sedang dituju (termasuk ?token=... dari Start URL file .seb) hilang
// begitu saja -- mahasiswa balik dari eportal mendarat di dashboard umum,
// bukan di halaman token, dan harus ketik ulang token secara manual.
export function savePendingDestination() {
  try {
    sessionStorage.setItem(PENDING_DESTINATION_KEY, window.location.pathname + window.location.search);
  } catch (_) {
    // sessionStorage bisa gak ada (mode privat dsb) -- gagal diam-diam, fallback ke alur normal
  }
}

// SsoCallback memanggil ini SEKALI setelah login SSO sukses, sebelum
// menghitung tujuan dari allowlist target= biasa. `startsWith(base)` wajib
// ada sebagai jaga-jaga tambahan -- walau window.location.pathname di atas
// selalu same-origin by construction, bukan input bebas dari luar.
export function consumePendingDestination(base) {
  try {
    const stored = sessionStorage.getItem(PENDING_DESTINATION_KEY);
    sessionStorage.removeItem(PENDING_DESTINATION_KEY);
    return stored && stored.startsWith(base) ? stored : null;
  } catch (_) {
    return null;
  }
}
