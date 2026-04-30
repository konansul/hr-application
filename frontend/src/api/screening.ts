import { apiClient } from './client';

export const screeningApi = {
  runFile: async (file: File, jobId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);
    const response = await apiClient.post('/v1/screening/run-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  improveCvFile: async (file: File, jobDescription: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);
    const response = await apiClient.post('/v1/improve-cv-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateStatus: async (applicationId: string, status: string) => {
    const response = await apiClient.patch(`/v1/applications/${applicationId}/status`, { status });
    return response.data;
  },

  getApplicationsByJob: async (jobId: string) => {
    const response = await apiClient.get(`/v1/applications/job/${jobId}`);
    return response.data;
  },

  runBulk: async (documentIds: string[], jobDescription: string, jobId: string) => {
    const response = await apiClient.post('/v1/screening/bulk', { document_ids: documentIds, job_id: jobId, job_description: jobDescription });
    return response.data;
  },

  applyToJob: async (jobId: string, answers?: Record<string, string> | null, resumeId?: string | null) => {
    const response = await apiClient.post('/v1/applications/apply', { job_id: jobId, answers: answers ?? null, resume_id: resumeId ?? null });
    return response.data;
  },

  getCandidateAnswers: async (ownerUserId: string, jobId: string) => {
    const response = await apiClient.get('/v1/applications/answers', { params: { owner_user_id: ownerUserId, job_id: jobId } });
    return response.data;
  },

  getAllOrganizationApplications: async () => {
    const response = await apiClient.get('/v1/applications/organization');
    return response.data;
  },

  getMyApplications: async () => {
    const response = await apiClient.get('/v1/applications/my');
    return response.data;
  },

  deleteApplication: async (applicationId: string) => {
    await apiClient.delete(`/v1/applications/${applicationId}`);
  },

  getStoredResults: async (jobId: string) => {
    const response = await apiClient.get(`/v1/screening/results/${jobId}`);
    return response.data;
  },

  improveCvExisting: async (resumeId: string, jobDescription: string) => {
    const formData = new FormData();
    formData.append('resume_id', resumeId);
    formData.append('job_description', jobDescription);
    const response = await apiClient.post('/v1/improve-cv-existing', formData);
    return response.data;
  },
};