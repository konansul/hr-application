import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000'
//const BASE_URL = 'https://hr-application-hkbxdtfvazfgcthr.canadaeast-01.azurewebsites.net';

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
  register: async (email: string, password: string, first_name: string, last_name: string, organization_name?: string, role: string = 'candidate') => {
    const response = await apiClient.post('/v1/auth/register', {
      email,
      password,
      first_name,
      last_name,
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

  getProfile: async () => {
    const response = await apiClient.get('/users/me/profile');
    return response.data;
  },

  updateProfile: async (profileData: any) => {
    const response = await apiClient.put('/users/me/profile', {
      profile_data: profileData
    });
    return response.data;
  },
  getHrProfile: async () => {
    const response = await apiClient.get('/users/me/hr-profile');
    return response.data;
  },
  updateHrProfile: async (data: any) => {
    const response = await apiClient.put('/users/me/hr-profile', data);
    return response.data;
  },

  listCandidates: async () => {
    const response = await apiClient.get('/hr/candidates');
    return response.data;
  },

  getCandidateProfile: async (personId: string) => {
    const response = await apiClient.get(`/hr/candidates/${personId}/profile`);
    return response.data;
  },

    updatePrivacy: async (data: { visibility_level?: string; public_url_slug?: string | null }) => {
    const response = await apiClient.patch('/me/privacy', data);
    return response.data;
  },

  logout: async () => {
    localStorage.removeItem('auth_token');
    return { ok: true };
  },
};

export const jobsApi = {
  create: async (title: string, description: string, region?: string, level?: string, screening_questions?: string[]) => {
    const response = await apiClient.post('/jobs', {
      title,
      description,
      region,
      level,
      screening_questions
    });
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

  refine: async (title: string, description: string, options: any = {}) => {
    const response = await apiClient.post('/jobs/refine', {
      title,
      description,
      ...options
    });
    return response.data;
  },

  update: async (jobId: string, data: { title: string, description: string, region?: string, level?: string, screening_questions?: any, pipeline_stages?: string[] }) => {
    const response = await apiClient.put(`/jobs/${jobId}`, data);
    return response.data;
  },

  delete: async (jobId: string) => {
    await apiClient.delete(`/jobs/${jobId}`);
  },
};

export const screeningApi = {
  runFile: async (file: File, jobId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);

    const response = await apiClient.post('/screening/run-file', formData, {
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

  updateStatus: async (applicationId: string, status: string) => {
    const response = await apiClient.patch(`/applications/${applicationId}/status`, { status });
    return response.data;
  },

  getApplicationsByJob: async (jobId: string) => {
    const response = await apiClient.get(`/applications/job/${jobId}`);
    return response.data;
  },

  runBulk: async (documentIds: string[], jobDescription: string, jobId: string) => {
    const response = await apiClient.post('/screening/bulk', {
      document_ids: documentIds,
      job_id: jobId,
      job_description: jobDescription
    });
    return response.data;
  },

  applyToJob: async (jobId: string, answers?: Record<string, string> | null) => {
    const response = await apiClient.post('/applications/apply', {
      job_id: jobId,
      answers: answers ?? null
    });
    return response.data;
  },

  getCandidateAnswers: async (ownerUserId: string, jobId: string) => {
    const response = await apiClient.get('/applications/answers', {
      params: { owner_user_id: ownerUserId, job_id: jobId }
    });
    return response.data;
  },

  getAllOrganizationApplications: async () => {
    const response = await apiClient.get('/applications/organization');
    return response.data;
  },

  getMyApplications: async () => {
    const response = await apiClient.get('/applications/my');
    return response.data;
  },

  deleteApplication: async (applicationId: string) => {
    await apiClient.delete(`/applications/${applicationId}`);
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
  },

  deleteDocument: async (documentId: string) => {
    await apiClient.delete(`/v1/documents/${documentId}`);
  },

  getDocumentFileUrl: async (documentId: string): Promise<string> => {
    const response = await apiClient.get(`/v1/documents/${documentId}/file`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  getLatestResume: async () => {
    const response = await apiClient.get('/v1/resumes/latest');
    return response.data;
  }
};

export const resumesApi = {
  list: async () => {
    const response = await apiClient.get('/v1/resumes');
    return response.data;
  },

  latest: async () => {
    const response = await apiClient.get('/v1/resumes/latest');
    return response.data;
  },

  createFromProfile: async (payload: {
    language?: string;
    title?: string;
    resume_data?: any;
    attach_document_id?: string | null;
    generate_from_profile_if_empty?: boolean;
    valid_until?: string | null;
    removed_sections?: string[];
  } = {}) => {
    const response = await apiClient.post('/v1/resumes/from-profile', payload);
    return response.data;
  },

  createFromJobDescription: async (payload: {
    job_description: string;
    language?: string;
    title?: string;
    valid_until?: string | null;
    removed_sections?: string[];
    job_id?: string | null;
    source_resume_id?: string | null;
  }) => {
    const response = await apiClient.post('/v1/resumes/from-job-description', payload);
    return response.data;
  },

  fetchJobUrl: async (url: string): Promise<{ job_title: string; job_description: string }> => {
    const response = await apiClient.post('/v1/resumes/fetch-job-url', { url });
    return response.data;
  },

  duplicate: async (resumeId: string, payload: {
    language?: string;
    title?: string;
    resume_data?: any;
    removed_sections?: string[];
    valid_until?: string | null;
  } = {}) => {
    const response = await apiClient.post(`/v1/resumes/${resumeId}/duplicate`, payload);
    return response.data;
  },

  update: async (resumeId: string, payload: {
    language?: string;
    title?: string;
    resume_data: any;
    generated_document_id?: string | null;
  }) => {
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

  sendEmail: async (payload: {
    to: string;
    subject: string;
    message: string;
    pdf_base64: string;
    filename?: string;
  }) => {
    const response = await apiClient.post('/v1/resumes/send-email', payload);
    return response.data;
  },
  getProfile: async (slug: string) => {
    const response = await axios.get(`${BASE_URL}/public/p/${slug}`);
    return response.data;
  }
};
