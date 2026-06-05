import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor: Automatically inject token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if error is 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Avoid redirecting if we are already on login page to prevent loops
      const currentPath = window.location.pathname;
      if (currentPath !== '/cbt' && currentPath !== '/cbt/') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('nama');
        localStorage.removeItem('email');
        window.location.href = '/cbt';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
