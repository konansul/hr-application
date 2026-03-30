import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

export const submitApplication = async (formData: FormData) => {
  const response = await axios.post(`${BASE_URL}/v1/applications/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};