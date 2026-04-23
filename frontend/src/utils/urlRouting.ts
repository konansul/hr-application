interface ResumeStub {
  resume_id: string;
  title?: string | null;
}

export function titleToSlug(title: string): string {
  return (title || 'untitled')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

export function resumeToSlug(resume: ResumeStub, allResumes: ResumeStub[]): string {
  const base = titleToSlug(resume.title || 'untitled');
  const collision = allResumes.some(
    (r) => r.resume_id !== resume.resume_id && titleToSlug(r.title || 'untitled') === base,
  );
  return collision ? `${base}-${resume.resume_id.slice(0, 6)}` : base;
}

export function slugToResumeId(slug: string, allResumes: ResumeStub[]): string | null {
  for (const r of allResumes) {
    if (titleToSlug(r.title || 'untitled') === slug) return r.resume_id;
  }
  for (const r of allResumes) {
    const base = titleToSlug(r.title || 'untitled');
    if (`${base}-${r.resume_id.slice(0, 6)}` === slug) return r.resume_id;
  }
  return null;
}

const CANDIDATE_TAB_TO_PATH: Record<string, string> = {
  profile: '/profile',
  'upload-cv': '/resumes',
  jobs: '/jobs',
  applications: '/applications',
  improve: '/improve',
  settings: '/settings',
};

const CANDIDATE_PATH_TO_TAB: Record<string, string> = {
  '/profile': 'profile',
  '/resumes': 'upload-cv',
  '/jobs': 'jobs',
  '/applications': 'applications',
  '/improve': 'improve',
  '/settings': 'settings',
};

const HR_TAB_TO_PATH: Record<string, string> = {
  profile: '/hr/overview',
  talent: '/hr/talent',
  job: '/hr/jobs',
  screen: '/hr/screen',
  compare: '/hr/compare',
  kanban: '/hr/board',
  history: '/hr/history',
  settings: '/hr/settings',
};

const HR_PATH_TO_TAB: Record<string, string> = {
  '/hr/overview': 'profile',
  '/hr/talent': 'talent',
  '/hr/jobs': 'job',
  '/hr/screen': 'screen',
  '/hr/compare': 'compare',
  '/hr/board': 'kanban',
  '/hr/history': 'history',
  '/hr/settings': 'settings',
};

export interface NavState {
  tab: string;
  resumeSlug?: string;
}

export function tabToPath(tab: string): string {
  return CANDIDATE_TAB_TO_PATH[tab] ?? `/${tab}`;
}

export function hrTabToPath(tab: string): string {
  return HR_TAB_TO_PATH[tab] ?? `/hr/${tab}`;
}

export function pathToNavState(pathname: string): NavState | null {
  if (pathname === '/' || pathname.startsWith('/p/')) return null;
  if (pathname.startsWith('/resumes/')) {
    const slug = pathname.replace('/resumes/', '');
    return { tab: 'upload-cv', resumeSlug: slug || undefined };
  }
  const tab = CANDIDATE_PATH_TO_TAB[pathname];
  if (tab) return { tab };
  return null;
}

export function hrPathToNavState(pathname: string): NavState | null {
  if (!pathname.startsWith('/hr/') && pathname !== '/hr') return null;
  const tab = HR_PATH_TO_TAB[pathname];
  if (tab) return { tab };
  return null;
}
