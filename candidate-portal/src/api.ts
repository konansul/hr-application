import axios from 'axios';

const BASE_URL = 'https://hr-application-grhdhvazdfftbna4.canadacentral-01.azurewebsites.net';

export const submitApplication = async (formData: FormData) => {
  const response = await axios.post(`${BASE_URL}/v1/applications/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};