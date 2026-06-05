import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/api/login', { email, password });
    return response.data;
  },

  async register(formData) {
    const response = await api.post('/api/register', formData);
    return response.data;
  }
};

export default authService;
