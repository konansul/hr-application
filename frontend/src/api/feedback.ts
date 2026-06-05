import { apiClient } from './client';

export interface FeedbackEntry {
  feedback_id: string;
  user_email: string;
  user_role: string;
  stars: number;
  comment: string;
  submitted_at: string | null;
  updated_at: string | null;
}

export interface AllFeedbackResponse {
  total: number;
  avg_stars: number;
  distribution: Record<string, number>;
  entries: FeedbackEntry[];
}

export const feedbackApi = {
  submit: async (stars: number, comment: string) => {
    const response = await apiClient.post('/v1/feedback', { stars, comment });
    return response.data;
  },
  getMine: async () => {
    const response = await apiClient.get('/v1/feedback/mine');
    return response.data as { feedback_id: string; stars: number; comment: string } | null;
  },
  getAll: async () => {
    const response = await apiClient.get('/v1/admin/feedback');
    return response.data as AllFeedbackResponse;
  },
};
