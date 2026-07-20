import api from './api';

export const cpmkService = {
  async getCpmk(params) {
    const response = await api.get('/api/cpmk', { params });
    return response.data;
  },

  async createCpmk(payload) {
    const response = await api.post('/api/cpmk', payload);
    return response.data;
  },

  async updateCpmk(id, payload) {
    const response = await api.put(`/api/cpmk/${id}`, payload);
    return response.data;
  },

  async deleteCpmk(id) {
    const response = await api.delete(`/api/cpmk/${id}`);
    return response.data;
  },

  async createSubCpmk(cpmkId, payload) {
    const response = await api.post(`/api/cpmk/${cpmkId}/sub-cpmk`, payload);
    return response.data;
  },

  async updateSubCpmk(id, payload) {
    const response = await api.put(`/api/cpmk/sub-cpmk/${id}`, payload);
    return response.data;
  },

  async deleteSubCpmk(id) {
    const response = await api.delete(`/api/cpmk/sub-cpmk/${id}`);
    return response.data;
  }
};

export default cpmkService;
