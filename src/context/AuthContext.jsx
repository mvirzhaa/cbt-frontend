/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from 'react';
import authService from '../services/auth.service';
import { getRoleKind } from '../utils/auth.utils';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [role, setRole] = useState(() => localStorage.getItem('role') || null);
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem('email') || '';
    const nama = localStorage.getItem('nama') || '';
    return email || nama ? { email, nama } : null;
  });

  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const dataUtama = await authService.login(email, password);
      // Backend may structure user data differently
      const dataUser = dataUtama.data?.user || dataUtama.user || dataUtama.data || dataUtama; 
      
      const jwtToken = dataUtama.token || dataUtama.data?.token;
      const userRole = dataUser.role; 
      const nama = dataUser.nama || dataUser.name || 'Pengguna Sistem';
      const emailUser = dataUser.email || email;

      if (!userRole) {
        throw new Error("Backend tidak mengirimkan role.");
      }

      localStorage.setItem('token', jwtToken);
      localStorage.setItem('role', userRole); 
      localStorage.setItem('nama', nama);
      localStorage.setItem('email', emailUser);

      setToken(jwtToken);
      setRole(userRole);
      setUser({ email: emailUser, nama });

      return userRole;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('nama');
    localStorage.removeItem('email');
    setToken(null);
    setRole(null);
    setUser(null);
  };

  const roleKind = getRoleKind(role);
  const isAdmin = roleKind === 'admin';
  const isLecturer = roleKind === 'lecturer';
  const isStudent = roleKind === 'student';

  const value = {
    token,
    role,
    user,
    loading,
    isAdmin,
    isLecturer,
    isStudent,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export default AuthContext;
