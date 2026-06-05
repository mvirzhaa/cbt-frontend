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

  async getViolations() {
    const response = await api.get('/api/proctoring');
    return response.data;
  }
};

export default proctoringService;
