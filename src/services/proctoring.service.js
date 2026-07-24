import api from './api';

export const proctoringService = {
  async reportViolation(formData) {
    const response = await api.post('/api/proctoring/report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async sendHeartbeat(exam_id) {
    const response = await api.post('/api/proctoring/heartbeat', { exam_id });
    return response.data;
  },

  async getViolations(params = {}) {
    const response = await api.get('/api/proctoring', { params });
    return response.data;
  },

  async reviewViolation(id) {
    const response = await api.patch(`/api/proctoring/${id}/review`);
    return response.data;
  }
};

export default proctoringService;
