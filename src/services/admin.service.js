import api from './api';

export const adminService = {
  async getPendingUsers() {
    const response = await api.get('/api/admin/users/pending');
    return response.data;
  },

  async getActiveUsers() {
    const response = await api.get('/api/admin/users/active');
    return response.data;
  },

  async approveUser(id, role) {
    const response = await api.put(`/api/admin/users/${id}/approve`, { role });
    return response.data;
  },

  async deleteUser(id) {
    const response = await api.delete(`/api/admin/users/${id}`);
    return response.data;
  }
};

export default adminService;
