import api from './api';

export const examService = {
  async getExams() {
    const response = await api.get('/api/exams');
    return response.data;
  },

  async createExam(payload) {
    const response = await api.post('/api/exams', payload);
    return response.data;
  },

  async updateExam(id, payload) {
    const response = await api.put(`/api/exams/${id}`, payload);
    return response.data;
  },

  async deleteExam(id) {
    const response = await api.delete(`/api/exams/${id}`);
    return response.data;
  },

  async verifyToken(token) {
    const response = await api.post('/api/student/verify-token', { token });
    return response.data;
  },

  async submitExam(formData) {
    const response = await api.post('/api/student/submit-exam', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async getStudentHistory() {
    const response = await api.get('/api/student/history');
    return response.data;
  }
};

export default examService;
