export const MODULE_LABELS: Record<string, string> = {
  profile: 'Profile',
  'upload-cv': 'Resumes',
  jobs: 'Explore',
  applications: 'Applications',
  improve: 'Improve CV',
  settings: 'Settings',
  'hr:profile': 'HR Overview',
  'hr:talent': 'HR Talent',
  'hr:job': 'HR Jobs',
  'hr:screen': 'HR Screen',
  'hr:compare': 'HR Compare',
  'hr:kanban': 'HR Board',
  'hr:history': 'HR History',
  'hr:settings': 'HR Settings',
};

export const MODULE_COLORS: Record<string, string> = {
  profile: '#7A60F4',
  'upload-cv': '#9EA4FF',
  jobs: '#92D8F2',
  applications: '#FF906D',
  improve: '#F5A623',
  settings: '#6B7280',
  'hr:profile': '#7A60F4',
  'hr:talent': '#9EA4FF',
  'hr:job': '#92D8F2',
  'hr:screen': '#FF906D',
  'hr:compare': '#F5A623',
  'hr:kanban': '#34D399',
  'hr:history': '#6B7280',
  'hr:settings': '#9CA3AF',
};

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeSince(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}
