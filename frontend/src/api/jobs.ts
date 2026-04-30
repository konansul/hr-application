import { apiClient } from './client';

export const jobsApi = {
  create: async (title: string, description: string, region?: string, level?: string, screening_questions?: string[]) => {
    const response = await apiClient.post('/v1/jobs', { title, description, region, level, screening_questions });
    return response.data;
  },

  list: async () => {
    const response = await apiClient.get('/v1/jobs');
    return response.data;
  },

  getById: async (jobId: string) => {
    const response = await apiClient.get(`/v1/jobs/${jobId}`);
    return response.data;
  },

  refine: async (title: string, description: string, options: any = {}) => {
    const response = await apiClient.post('/v1/jobs/refine', { title, description, ...options });
    return response.data;
  },

  update: async (jobId: string, data: { title: string, description: string, region?: string, level?: string, screening_questions?: any, pipeline_stages?: string[] }) => {
    const response = await apiClient.put(`/v1/jobs/${jobId}`, data);
    return response.data;
  },

  delete: async (jobId: string) => {
    await apiClient.delete(`/v1/jobs/${jobId}`);
  },
};