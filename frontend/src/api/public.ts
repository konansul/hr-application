import axios from 'axios';
import { BASE_URL } from './client';

export const publicApi = {
  getProfile: async (slug: string) => {
    const response = await axios.get(`${BASE_URL}/v1/public/p/${slug}`);
    return response.data;
  },

  getJob: async (jobId: string) => {
    const response = await axios.get(`${BASE_URL}/v1/public/jobs/${jobId}`);
    return response.data;
  },

  submitPublicApplication: async (payload: any) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value instanceof File ? value : String(value));
      }
    });

    const response = await axios.post(`${BASE_URL}/v1/applications/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};