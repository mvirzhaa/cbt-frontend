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
