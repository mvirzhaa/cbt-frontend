import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleKind } from '../utils/auth.utils';

export function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function RequireRole({ allow = [], children }) {
  const { token, role } = useAuth();
  if (!token) {
    return <Navigate to="/" replace />;
  }

  const roleKind = getRoleKind(role);
  if (!allow.includes(roleKind)) {
    if (roleKind === 'admin') return <Navigate to="/admin" replace />;
    if (roleKind === 'student') return <Navigate to="/student-dashboard" replace />;
    if (roleKind === 'lecturer') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
