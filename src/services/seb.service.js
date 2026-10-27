import api from './api';

export const sebService = {
  async setExamSettings(examId, payload) {
    const response = await api.put(`/api/seb/exams/${examId}/settings`, payload);
    return response.data;
  },

  async downloadConfig(examId) {
    const response = await api.get(`/api/seb/exams/${examId}/config`, { responseType: 'blob' });
    return response.data;
  }
};

export default sebService;
