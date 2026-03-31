import axios from 'axios';

const BASE_URL = 'https://hr-application-grhdhvazdfftbna4.canadacentral-01.azurewebsites.net';
//const BASE_URL = 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: async (email: string, password: string, organization_name: string, role: string = 'hr') => {
    const response = await apiClient.post('/v1/auth/register', {
      email,
      password,
      organization_name,
      role
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

  logout: async () => {
    localStorage.removeItem('auth_token');
    return { ok: true };
  },
};

export const jobsApi = {
  create: async (title: string, description: string) => {
    const response = await apiClient.post('/jobs', { title, description });
    return response.data;
  },

  list: async () => {
    const response = await apiClient.get('/jobs');
    return response.data;
  },

  getById: async (jobId: string) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  refine: async (title: string, description: string) => {
    const response = await apiClient.post('/jobs/refine', { title, description });
    return response.data;
  },

  update: async (jobId: string, title: string, description: string) => {
    const response = await apiClient.put(`/jobs/${jobId}`, { title, description });
    return response.data;
  },
};

export const screeningApi = {
  runFile: async (file: File, jobDescription: string, jobId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);
    if (jobId) formData.append('job_id', jobId);

    const response = await apiClient.post('/run-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  improveCvFile: async (file: File, jobDescription: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);

    const response = await apiClient.post('/improve-cv-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateStatus: async (resultId: string, status: 'New' | 'Shortlisted' | 'Selected' | 'Rejected') => {
    const response = await apiClient.patch(`/results/${resultId}/status`, { status });
    return response.data;
  },

  getResultsByJob: async (jobId: string) => {
    const response = await apiClient.get(`/results/job/${jobId}`);
    return response.data;
  },

  runBulk: async (documentIds: string[], jobDescription: string, jobId: string) => {
    const response = await apiClient.post('/screening/bulk', {
      document_ids: documentIds,
      job_description: jobDescription,
      job_id: jobId
    });
    return response.data;
  },

    getAllOrganizationResults: async () => {
    const response = await apiClient.get('/results/organization');
    return response.data;
  },
};

export const documentsApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/v1/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getOrganizationDocuments: async () => {
    const response = await apiClient.get('/v1/documents/organization');
    return response.data;
  },

  getMyDocuments: async () => {
    const response = await apiClient.get('/v1/documents/me');
    return response.data;
  }
};
