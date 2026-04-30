import { apiClient } from './client';

export const resumesApi = {
    list: async () => {
        const response = await apiClient.get('/v1/resumes');
        return response.data;
    },
    latest: async () => {
        const response = await apiClient.get('/v1/resumes/latest');
        return response.data;
    },
    createFromProfile: async (payload: any = {}) => {
        const response = await apiClient.post('/v1/resumes/from-profile', payload);
        return response.data;
    },
    createFromJobDescription: async (payload: any) => {
        const response = await apiClient.post('/v1/resumes/from-job-description', payload);
        return response.data;
    },
    fetchJobUrl: async (url: string): Promise<{ job_title: string; job_description: string }> => {
        const response = await apiClient.post('/v1/resumes/fetch-job-url', {url});
        return response.data;
    },
    duplicate: async (resumeId: string, payload: any = {}) => {
        const response = await apiClient.post(`/v1/resumes/${resumeId}/duplicate`, payload);
        return response.data;
    },
    update: async (resumeId: string, payload: any) => {
        const response = await apiClient.put(`/v1/resumes/${resumeId}`, payload);
        return response.data;
    },
    delete: async (resumeId: string) => {
        const response = await apiClient.delete(`/v1/resumes/${resumeId}`);
        return response.data;
    },
    getPublicResume: async (resumeId: string) => {
        const response = await apiClient.get(`/v1/resumes/public/${resumeId}`);
        return response.data;
    },
    sendEmail: async (payload: any) => {
        const response = await apiClient.post('/v1/resumes/send-email', payload);
        return response.data;
    },
};