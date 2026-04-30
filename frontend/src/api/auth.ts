import { apiClient } from './client';

export const authApi = {
  register: async (email: string, password: string, first_name: string, last_name: string, organization_name?: string, role: string = 'candidate') => {
    const response = await apiClient.post('/v1/auth/register', {
      email, password, first_name, last_name, organization_name, role
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/v1/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token);
    }
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/v1/auth/me');
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/v1/users/me/profile');
    return response.data;
  },

  updateProfile: async (profileData: any) => {
    const response = await apiClient.put('/v1/users/me/profile', { profile_data: profileData });
    return response.data;
  },

  getHrProfile: async () => {
    const response = await apiClient.get('/v1/users/me/hr-profile');
    return response.data;
  },

  updateHrProfile: async (data: any) => {
    const response = await apiClient.put('/v1/users/me/hr-profile', data);
    return response.data;
  },

  listCandidates: async () => {
    const response = await apiClient.get('/v1/hr/candidates');
    return response.data;
  },

  getCandidateProfile: async (personId: string) => {
    const response = await apiClient.get(`/v1/hr/candidates/${personId}/profile`);
    return response.data;
  },

  importFromUrl: async (url: string) => {
    const response = await apiClient.post('/v1/users/me/import-from-url', { url });
    return response.data;
  },

  updatePrivacy: async (data: { visibility_level?: string; public_url_slug?: string | null }) => {
    const response = await apiClient.patch('/v1/me/privacy', data);
    return response.data;
  },

  logout: async () => {
    localStorage.removeItem('auth_token');
    return { ok: true };
  },
};