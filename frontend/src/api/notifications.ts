import { apiClient } from './client';

export interface AppNotification {
  notification_id: string;
  application_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  getAll: async (): Promise<AppNotification[]> => {
    const res = await apiClient.get('/v1/notifications');
    return res.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get('/v1/notifications/unread-count');
    return res.data.unread_count;
  },

  markRead: async (notificationId: string): Promise<void> => {
    await apiClient.patch(`/v1/notifications/${notificationId}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch('/v1/notifications/mark-all-read');
  },
};
