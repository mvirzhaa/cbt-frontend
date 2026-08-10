import api from './api';

export const cpmkService = {
  async getCpmk(params) {
    const response = await api.get('/api/cpmk', { params });
    return response.data;
  },

  async deleteCpmk(id) {
    const response = await api.delete(`/api/cpmk/${id}`);
    return response.data;
  },

  async deleteSubCpmk(id) {
    const response = await api.delete(`/api/cpmk/sub-cpmk/${id}`);
    return response.data;
  }
};

export default cpmkService;
