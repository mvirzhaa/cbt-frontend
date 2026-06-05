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
