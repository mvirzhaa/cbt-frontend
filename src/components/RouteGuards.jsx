import { Navigate } from 'react-router-dom';

function normalizeRole(rawRole) {
  return (rawRole || '').toLowerCase().replace(/[^a-z]/g, '');
}

function getRoleKind(rawRole) {
  const role = normalizeRole(rawRole);
  if (role.includes('admin')) return 'admin';
  if (role.includes('mahasiswa') || role.includes('student')) return 'student';
  if (role.includes('dosen') || role.includes('lecturer')) return 'lecturer';
  return '';
}

export function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

export function RequireRole({ allow = [], children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;

  const roleKind = getRoleKind(localStorage.getItem('role'));
  if (!allow.includes(roleKind)) {
    if (roleKind === 'admin') return <Navigate to="/admin" replace />;
    if (roleKind === 'student') return <Navigate to="/student-dashboard" replace />;
    if (roleKind === 'lecturer') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
