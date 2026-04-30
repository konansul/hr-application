import { apiClient } from './client';

export const externalJobsApi = {
  search: async (params: any) => {
    const response = await apiClient.get('/v1/api/external-jobs/search', { params });
    return response.data;
  },
};