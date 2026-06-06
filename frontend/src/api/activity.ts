import { apiClient } from './client';

export interface UserAnalytics {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_teammate: boolean;
  joined_at: string | null;
  last_seen: string | null;
  ai_used: number;
  ai_quota: number;
  module_counts: Record<string, number>;
}

export interface AnalyticsResponse {
  total_users: number;
  hr_count: number;
  candidate_count: number;
  active_last_7_days: number;
  active_last_30_days: number;
  module_totals: Record<string, number>;
  users: UserAnalytics[];
}

export interface TimelineDay {
  date: string;
  unique_users: number;
  hr_users: number;
  candidate_users: number;
  total_events: number;
}

export interface TimelineResponse {
  days: TimelineDay[];
  range_days: number;
}

export interface EventEntry {
  log_id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  module: string;
  role: string | null;
  logged_at: string;
}

export interface EventsResponse {
  total: number;
  page: number;
  per_page: number;
  pages: number;
  events: EventEntry[];
  all_modules: string[];
}

export const activityApi = {
  log: async (module: string): Promise<void> => {
    try {
      await apiClient.post('/v1/activity', { module });
    } catch {
      // silent — never break the app if logging fails
    }
  },
  getAnalytics: async (): Promise<AnalyticsResponse> => {
    const res = await apiClient.get('/v1/admin/analytics');
    return res.data;
  },
  getTimeline: async (days: 7 | 30 | 90 = 30): Promise<TimelineResponse> => {
    const res = await apiClient.get(`/v1/admin/analytics/timeline?days=${days}`);
    return res.data;
  },
  getEvents: async (params: {
    days?: number;
    role?: string;
    module?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<EventsResponse> => {
    const q = new URLSearchParams();
    if (params.days !== undefined) q.set('days', String(params.days));
    if (params.role) q.set('role', params.role);
    if (params.module) q.set('module', params.module);
    if (params.page) q.set('page', String(params.page));
    if (params.per_page) q.set('per_page', String(params.per_page));
    const res = await apiClient.get(`/v1/admin/analytics/events?${q.toString()}`);
    return res.data;
  },
};
