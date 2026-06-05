import api from './api';

export const gradingService = {
  async getAnswers(examId) {
    const response = await api.get(`/api/grading/exams/${examId}/answers`);
    return response.data;
  },

  async getAllAnswers(examId) {
    const response = await api.get(`/api/grading/exams/${examId}/all-answers`);
    return response.data;
  },

  async getStudentAnswers(examId, studentId) {
    const response = await api.get(`/api/grading/exams/${examId}/students/${studentId}/answers`);
    return response.data;
  },

  async saveScore(responseId, skor) {
    const response = await api.put(`/api/grading/responses/${responseId}/score`, { skor });
    return response.data;
  },

  async recalculate(examId) {
    const response = await api.post(`/api/grading/exams/${examId}/recalculate`);
    return response.data;
  },

  async getAttempts(examId) {
    const response = await api.get(`/api/dosen/attempts/${examId}`);
    return response.data;
  },

  async verifyExamAttempt(attemptId, payload) {
    const response = await api.post(`/api/dosen/verify-exam/${attemptId}`, payload);
    return response.data;
  }
};

export default gradingService;
