import api from './api';

export const materiService = {
  async getMateri() {
    const response = await api.get('/api/materi');
    return response.data;
  },

  async uploadMateri(formData) {
    const response = await api.post('/api/materi/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async deleteMateri(id) {
    const response = await api.delete(`/api/materi/${id}`);
    return response.data;
  }
};

export default materiService;
