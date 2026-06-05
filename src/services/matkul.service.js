import api from './api';

export const matkulService = {
  async getMatkul() {
    const response = await api.get('/api/matakuliah');
    return response.data;
  },

  async getMatkulScores(mkId) {
    const response = await api.get(`/api/matakuliah/${mkId}/scores`);
    return response.data;
  },

  async createMatkul(payload) {
    const response = await api.post('/api/matakuliah', payload);
    return response.data;
  },

  async updateMatkul(kodeMk, payload) {
    const response = await api.put(`/api/matakuliah/${kodeMk}`, payload);
    return response.data;
  },

  async deleteMatkul(kodeMk) {
    const response = await api.delete(`/api/matakuliah/${kodeMk}`);
    return response.data;
  }
};

export default matkulService;
