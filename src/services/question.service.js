import api from './api';

export const questionService = {
  async getQuestions() {
    const response = await api.get('/api/questions');
    return response.data;
  },

  async createQuestion(payload) {
    const response = await api.post('/api/questions', payload);
    return response.data;
  },

  async updateQuestion(id, payload) {
    const response = await api.put(`/api/questions/${id}`, payload);
    return response.data;
  },

  async deleteQuestion(id) {
    const response = await api.delete(`/api/questions/${id}`);
    return response.data;
  }
};

export default questionService;
