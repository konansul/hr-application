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

// Always embed the resume_id in the slug so deep links are stable regardless of
// title language or renames. Format: "<title-slug>--<resume_id>" or just
// "<resume_id>" when the title produces no ASCII characters.
export function resumeToSlug(resume: ResumeStub, _allResumes?: ResumeStub[]): string {
  const base = titleToSlug(resume.title || '');
  const id = resume.resume_id;
  // If the title yields meaningful ASCII text use it as a readable prefix
  if (base && base !== 'untitled') return `${base}--${id}`;
  return id;
}

export function slugToResumeId(slug: string, allResumes: ResumeStub[]): string | null {
  // New format: "<title>--<resume_id>"
  const doubleHyphen = slug.lastIndexOf('--');
  if (doubleHyphen !== -1) {
    const id = slug.slice(doubleHyphen + 2);
    const match = allResumes.find((r) => r.resume_id === id);
    if (match) return match.resume_id;
  }

  // Legacy: bare resume_id (non-ASCII titles that couldn't generate a slug)
  const directMatch = allResumes.find((r) => r.resume_id === slug);
  if (directMatch) return directMatch.resume_id;

  // Legacy: old title-only slugs (backward compat for existing bookmarks)
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
