import api from './api';

export const questionBankService = {
  async getBankSoal(params) {
    const response = await api.get('/api/question-bank', { params });
    return response.data;
  },

  async createBankSoal(payload) {
    const response = await api.post('/api/question-bank', payload);
    return response.data;
  },

  async updateBankSoal(id, payload) {
    const response = await api.put(`/api/question-bank/${id}`, payload);
    return response.data;
  },

  async deleteBankSoal(id) {
    const response = await api.delete(`/api/question-bank/${id}`);
    return response.data;
  },

  async importToExam(payload) {
    const response = await api.post('/api/question-bank/import', payload);
    return response.data;
  },

  async generateAI(payload) {
    const response = await api.post('/api/question-bank/generate-ai', payload);
    return response.data;
  }
};

export default questionBankService;
