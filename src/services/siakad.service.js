import api from './api';

export const siakadService = {
  async setExamTarget(examId, payload) {
    const response = await api.put(`/api/siakad/exams/${examId}/target`, payload);
    return response.data;
  },

  async pushAttempt(attemptId) {
    const response = await api.post(`/api/siakad/attempts/${attemptId}/push`);
    return response.data;
  },

  async pushExam(examId) {
    const response = await api.post(`/api/siakad/exams/${examId}/push`);
    return response.data;
  },

  async getQueueStatus() {
    const response = await api.get('/api/siakad/queue/status');
    return response.data;
  },

  async searchMataKuliah(params = {}) {
    const response = await api.get('/api/siakad/matakuliah', { params });
    return response.data;
  },

  async getRencanaEvaluasi(kodeMk, periodeId) {
    const response = await api.get('/api/siakad/rencana-evaluasi', { params: { kode_mk: kodeMk, periode_id: periodeId } });
    return response.data;
  },

  async getPemetaanCpmk(kodeMk) {
    const response = await api.get(`/api/siakad/mata-kuliah/${kodeMk}/pemetaan-cpmk`);
    return response.data;
  },

  async resolveCpmk(kodeMk, payload) {
    const response = await api.post(`/api/siakad/mata-kuliah/${kodeMk}/resolve-cpmk`, payload);
    return response.data;
  }
};

export default siakadService;
