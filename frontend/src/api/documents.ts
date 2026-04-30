import { apiClient } from './client';

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
    const response = await apiClient.get(`/v1/documents/${documentId}/file`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },

  getLatestResume: async () => {
    const response = await apiClient.get('/v1/resumes/latest');
    return response.data;
  }
};