import { useEffect, useMemo, useRef, useState } from 'react';
import { authApi, documentsApi, jobsApi, resumesApi } from '../../api';
import { DICT } from '../../internationalization.ts';
import { useStore } from '../../store';
import { resumeToSlug, slugToResumeId } from '../../utils/urlRouting';
import { TEMPLATES, downloadResumePdf, generateResumePdfBlob, type TemplateId } from './ResumePdfTemplates';

type ResumeSectionKey = 'personal_info' | 'experience' | 'education' | 'skills' | 'languages' | 'certifications';

type ResumeVersion = {
  resume_id: string;
  person_id?: string;
  language?: string;
  title?: string | null;
  source_type?: string;
  source_document_id?: string | null;
  generated_document_id?: string | null;
  source_resume_id?: string | null;
  generation_status?: string;
  profile_snapshot?: any;
  resume_data?: any;
  personal_info?: any;
  experience?: any[];
  education?: any[];
  skills?: any[];
  languages?: any[];
  certifications?: any[];
  valid_until?: string | null;
  job_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Russian' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
];

const REMOVABLE_SECTIONS: { key: ResumeSectionKey; label: string }[] = [
  { key: 'personal_info', label: 'Personal Info' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'languages', label: 'Languages' },
  { key: 'certifications', label: 'Certifications' },
];

const sourceTypeLabel = (value?: string, t?: { sourceTypes?: { profile?: string; profileExtract?: string; cvUpload?: string; duplicate?: string; publicApp?: string; fromJob?: string } }) => {
  const st = t?.sourceTypes;
  switch (value) {
    case 'profile': return st?.profile || 'From Profile';
    case 'profile_extract': return st?.profileExtract || 'Generated from Profile';
    case 'cv_upload': return st?.cvUpload || 'CV Upload';
    case 'duplicate': return st?.duplicate || 'From existing CV';
    case 'public_application': return st?.publicApp || 'Public Application';
    case 'job_description': return st?.fromJob || 'From Job Description';
    default: return value || 'Unknown';
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const normalizeResume = (resume: ResumeVersion | null): ResumeVersion | null => {
  if (!resume) return null;
  const resumeData = resume.resume_data ?? {
    personal_info: resume.personal_info ?? {},
    experience: resume.experience ?? [],
    education: resume.education ?? [],
    skills: resume.skills ?? [],
    languages: resume.languages ?? [],
    certifications: resume.certifications ?? [],
  };
  return {
    ...resume,
    resume_data: resumeData,
    personal_info: resumeData.personal_info ?? {},
    experience: resumeData.experience ?? [],
    education: resumeData.education ?? [],
    skills: resumeData.skills ?? [],
    languages: resumeData.languages ?? [],
    certifications: resumeData.certifications ?? [],
  };
};

function LanguageSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10"
    >
      {LANGUAGE_OPTIONS.map((lang) => (
        <option key={lang.code} value={lang.code}>{lang.label} ({lang.code})</option>
      ))}
    </select>
  );
}

function SectionToggles({ removedSections, onToggle }: { removedSections: ResumeSectionKey[]; onToggle: (key: ResumeSectionKey) => void }) {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.resumes || DICT.en.resumes;
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t.modal.excludeSections}</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {REMOVABLE_SECTIONS.map((section) => {
          const removed = removedSections.includes(section.key);
          return (
            <label
              key={section.key}
              className={`rounded-2xl border px-4 py-3 text-sm cursor-pointer transition-all select-none ${removed ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600'}`}
            >
              <input type="checkbox" className="hidden" checked={removed} onChange={() => onToggle(section.key)} />
              {removed ? `✕ ${section.label}` : section.label}
            </label>
          );
        })}
      </div>
      {removedSections.length > 0 && (
        <p className="text-xs text-red-500 mt-2">{t.modal.excludedHint}</p>
      )}
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-700 w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-5 dark:bg-neutral-900">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSubmit, disabled, submitLabel, submitClass }: {
  onClose: () => void;
  onSubmit: () => void;
  disabled: boolean;
  submitLabel: string;
  submitClass?: string;
}) {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.resumes || DICT.en.resumes;
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-neutral-700 text-sm font-semibold text-gray-600 dark:text-neutral-400 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all">
        {t.modal.cancel}
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className={`flex-1 py-3 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 ${submitClass ?? 'bg-gray-900 hover:bg-gray-800'}`}
      >
        {submitLabel}
      </button>
    </div>
  );
}

function CreateFromProfileModal({ onClose, onSubmit, isWorking }: {
  onClose: () => void;
  onSubmit: (data: { title: string; language: string; validUntil: string; removedSections: ResumeSectionKey[] }) => void;
  isWorking: boolean;
}) {
  const { language: appLanguage } = useStore();
  const t = DICT[appLanguage as keyof typeof DICT]?.resumes || DICT.en.resumes;
  const [title, setTitle] = useState('My Profile Resume');
  const [language, setLanguage] = useState('en');
  const [validUntil, setValidUntil] = useState('');
  const [removedSections, setRemovedSections] = useState<ResumeSectionKey[]>([]);
  const toggle = (key: ResumeSectionKey) => setRemovedSections((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);

  return (
    <ModalShell title={t.modal.fromProfileTitle} subtitle={t.modal.fromProfileSubtitle} onClose={onClose}>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.versionName}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" placeholder="e.g. Software Engineer Resume" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.language}</label>
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.validUntil}</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
        </div>
      </div>
      <SectionToggles removedSections={removedSections} onToggle={toggle} />
      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit({ title, language, validUntil, removedSections })}
        disabled={isWorking || !title.trim()}
        submitLabel={isWorking ? t.modal.creating : t.modal.createVersion}
      />
    </ModalShell>
  );
}

function DuplicateResumeModal({ onClose, onSubmit, isWorking, resumeVersions }: {
  onClose: () => void;
  onSubmit: (data: { sourceResumeId: string; title: string; language: string; validUntil: string; removedSections: ResumeSectionKey[] }) => void;
  isWorking: boolean;
  resumeVersions: ResumeVersion[];
}) {
  const { language: appLanguage } = useStore();
  const t = DICT[appLanguage as keyof typeof DICT]?.resumes || DICT.en.resumes;
  const [sourceId, setSourceId] = useState(resumeVersions[0]?.resume_id ?? '');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [validUntil, setValidUntil] = useState('');
  const [removedSections, setRemovedSections] = useState<ResumeSectionKey[]>([]);
  const toggle = (key: ResumeSectionKey) => setRemovedSections((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);

  const sourceResume = resumeVersions.find((r) => r.resume_id === sourceId);

  const prevSourceIdRef = useRef('');
  if (prevSourceIdRef.current !== sourceId) {
    prevSourceIdRef.current = sourceId;
  }

  const [autoTitle, setAutoTitle] = useState(true);
  useEffect(() => {
    if (sourceResume && autoTitle) {
      setTitle(`${sourceResume.title || 'Resume'} Copy`);
      setLanguage(sourceResume.language || 'en');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  const canSubmit = !isWorking && !!sourceId && title.trim();

  const langLabel = (code?: string) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label || code || 'en';

  return (
    <ModalShell title={t.modal.duplicateTitle} subtitle={t.modal.duplicateSubtitle} onClose={onClose}>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.sourceVersion}</label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {resumeVersions.length === 0 && (
            <p className="text-sm text-gray-400 italic">{t.modal.noVersionsToDuplicate}</p>
          )}
          {resumeVersions.map((r, i) => {
            const isSelected = r.resume_id === sourceId;
            return (
              <button
                key={r.resume_id}
                type="button"
                onClick={() => { setSourceId(r.resume_id); setAutoTitle(true); }}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${isSelected ? 'border-gray-900 bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>Version {resumeVersions.length - i}</span>
                    <p className="text-sm font-semibold leading-tight">{r.title || t.untitled}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${isSelected ? 'border-white/20 text-white' : 'border-gray-200 text-gray-500'}`}>
                    {langLabel(r.language)}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{sourceTypeLabel(r.source_type, t)} · {formatDate(r.created_at)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.newVersionName}</label>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setAutoTitle(false); }}
          className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10"
          placeholder="e.g. Resume for Product Roles"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.language}</label>
          <LanguageSelect value={language} onChange={(v) => { setLanguage(v); setAutoTitle(false); }} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.validUntil}</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
        </div>
      </div>

      <SectionToggles removedSections={removedSections} onToggle={toggle} />

      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit({ sourceResumeId: sourceId, title, language, validUntil, removedSections })}
        disabled={!canSubmit}
        submitLabel={isWorking ? t.modal.creating : t.modal.createDuplicate}
        submitClass="bg-emerald-600 hover:bg-emerald-700"
      />
    </ModalShell>
  );
}

function CreateFromJobDescriptionModal({ onClose, onSubmit, isWorking, activeJobs, resumeVersions }: {
  onClose: () => void;
  onSubmit: (data: { title: string; language: string; validUntil: string; removedSections: ResumeSectionKey[]; jobDescription: string; jobId: string | null; sourceResumeId: string | null }) => void;
  isWorking: boolean;
  activeJobs: any[];
  resumeVersions: ResumeVersion[];
}) {
  const { language: appLanguage } = useStore();
  const t = DICT[appLanguage as keyof typeof DICT]?.resumes || DICT.en.resumes;
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [validUntil, setValidUntil] = useState('');
  const [removedSections, setRemovedSections] = useState<ResumeSectionKey[]>([]);
  const [sourceResumeId, setSourceResumeId] = useState<string>(resumeVersions[0]?.resume_id ?? '');

  type JDMode = 'jobs' | 'manual';
  const [mode, setMode] = useState<JDMode>(activeJobs.length > 0 ? 'jobs' : 'manual');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [description, setDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchedTitle, setFetchedTitle] = useState('');
  const [hasFetched, setHasFetched] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const toggle = (key: ResumeSectionKey) => setRemovedSections((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);

  const handleFetchUrl = async () => {
    if (!jobUrl.trim()) return;
    setIsFetching(true);
    setFetchError('');
    setFetchedTitle('');
    setHasFetched(false);
    try {
      const result = await resumesApi.fetchJobUrl(jobUrl.trim());
      setFetchedTitle(result.job_title || '');
      if (result.job_description) {
        setDescription(result.job_description);
        if (result.job_title && !title) setTitle(`Resume for ${result.job_title}`);
      } else {
        setTimeout(() => descriptionRef.current?.focus(), 50);
      }
    } catch (e: any) {
      setFetchError(e?.response?.data?.detail || 'Could not fetch the URL.');
      setTimeout(() => descriptionRef.current?.focus(), 50);
    } finally {
      setIsFetching(false);
      setHasFetched(true);
    }
  };

  const selectedJob = activeJobs.find((j) => (j.job_id || j.id) === selectedJobId);

  const effectiveDescription = mode === 'jobs' ? (selectedJob?.description ?? '') : description;
  const effectiveJobId = mode === 'jobs' ? (selectedJobId || null) : null;

  const effectiveTitle = title.trim() || (fetchedTitle ? `Resume for ${fetchedTitle}` : '');
  const canSubmit = !isWorking && !isFetching && !!effectiveDescription.trim() && !!sourceResumeId;

  const langLabel = (code?: string) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label || code || 'en';

  const ModeTab = ({ id, label }: { id: JDMode; label: string }) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={`flex-1 py-2.5 text-xs font-semibold transition-all ${mode === id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
    >
      {label}
    </button>
  );

  return (
    <ModalShell title={t.modal.fromJobTitle} subtitle={t.modal.fromJobSubtitle} onClose={onClose}>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Base Resume to Adapt</label>
        {resumeVersions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No existing resume versions. Create one first from your profile or by uploading a CV.</p>
        ) : (
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {resumeVersions.map((r, i) => {
              const isSelected = r.resume_id === sourceResumeId;
              return (
                <button
                  key={r.resume_id}
                  type="button"
                  onClick={() => setSourceResumeId(r.resume_id)}
                  className={`w-full text-left rounded-2xl border px-4 py-2.5 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>Version {resumeVersions.length - i}</span>
                      <p className="text-sm font-semibold truncate">{r.title || t.untitled}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap shrink-0 ${isSelected ? 'border-white/20 text-white' : 'border-gray-200 text-gray-500'}`}>
                      {langLabel(r.language)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.jobDescription}</label>

        {activeJobs.length > 0 && (
          <div className="flex rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden mb-3">
            <ModeTab id="jobs" label="Open Jobs" />
            <ModeTab id="manual" label="Paste / URL" />
          </div>
        )}

        {mode === 'jobs' && (
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20">
            <option value="">— Select a job —</option>
            {activeJobs.map((job) => (
              <option key={job.job_id || job.id} value={job.job_id || job.id}>{job.title}</option>
            ))}
          </select>
        )}

        {mode === 'manual' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  value={jobUrl}
                  onChange={(e) => { setJobUrl(e.target.value); setFetchError(''); setHasFetched(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFetchUrl(); }}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-2.5 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="https://company.com/jobs/12345"
                />
                <button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={isFetching || !jobUrl.trim()}
                  className="px-4 py-2.5 bg-gray-800 text-white text-xs font-semibold rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {isFetching
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Loading…</>
                    : 'Auto-fill'}
                </button>
              </div>
              {!fetchError && !hasFetched && (
                <p className="text-[11px] text-gray-400 dark:text-neutral-500">Works on static job pages only — for LinkedIn, Indeed, and similar sites, open the full job page first (not a listing feed), then paste the URL here.</p>
              )}
              {fetchError && <p className="text-xs text-red-500">{fetchError} — paste the description below instead.</p>}
              {hasFetched && !description && !fetchError && (
                <p className="text-xs text-amber-600">This site requires JavaScript (e.g. LinkedIn, Indeed) and can't be fetched automatically. Copy the job description from the page and paste it below.</p>
              )}
              {hasFetched && fetchedTitle && description && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-xs text-emerald-600 font-semibold">Filled from: {fetchedTitle}</span>
                </div>
              )}
            </div>

            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className={`w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${description ? 'border-indigo-300 dark:border-indigo-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white'}`}
              placeholder="Or paste the job description here…"
              autoFocus={activeJobs.length === 0}
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.versionName}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20"
          placeholder={fetchedTitle ? `Resume for ${fetchedTitle}` : 'e.g. Resume for Product Manager at Acme'}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.language}</label>
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t.modal.validUntil}</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20" />
        </div>
      </div>

      <SectionToggles removedSections={removedSections} onToggle={toggle} />

      {!sourceResumeId && (
        <p className="text-xs text-amber-600 font-medium">Select a base resume version above to continue.</p>
      )}
      {sourceResumeId && !effectiveDescription.trim() && (
        <p className="text-xs text-amber-600 font-medium">Add a job description to continue.</p>
      )}
      {canSubmit && (
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 px-4 py-3 text-xs text-indigo-700 dark:text-indigo-400 font-medium">
          AI will adapt the selected resume to match the job requirements and write it in {LANGUAGE_OPTIONS.find((l) => l.code === language)?.label ?? language}.
        </div>
      )}

      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit({ title: effectiveTitle || 'Job Resume', language, validUntil, removedSections, jobDescription: effectiveDescription, jobId: effectiveJobId, sourceResumeId: sourceResumeId || null })}
        disabled={!canSubmit}
        submitLabel={isWorking ? 'Generating…' : 'Generate Tailored Resume'}
        submitClass="bg-indigo-600 hover:bg-indigo-700"
      />
    </ModalShell>
  );
}

function JobDescriptionAccordion({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 gap-3 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest shrink-0">Job Description</span>
          {!expanded && (
            <span className="text-xs text-indigo-600/70 truncate">{text.slice(0, 80)}{text.length > 80 ? '…' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-indigo-300 font-medium hidden sm:block">reference only</span>
          <svg
            className={`w-4 h-4 text-indigo-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-indigo-100 dark:border-indigo-800/50">
          <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed whitespace-pre-wrap pt-4">{text}</p>
        </div>
      )}
    </div>
  );
}

export function ResumeUploadTab() {
  const { language, activeTab } = useStore();
  const t = DICT[language as keyof typeof DICT]?.resumes || DICT.en.resumes;

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showJobDescModal, setShowJobDescModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editDraft, setEditDraft] = useState<ResumeVersion | null>(null);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sharePublicLinkCopied, setSharePublicLinkCopied] = useState(false);
  const [shareEmailTo, setShareEmailTo] = useState('');
  const [shareEmailRecipientName, setShareEmailRecipientName] = useState('');
  const [sendEmailTo, setSendEmailTo] = useState('');
  const [sendEmailRecipientName, setSendEmailRecipientName] = useState('');
  const [sendEmailSubject, setSendEmailSubject] = useState('');
  const [sendEmailMessage, setSendEmailMessage] = useState('');
  const [sendEmailAttachment, setSendEmailAttachment] = useState<{ base64: string; filename: string } | null>(null);
  const [sendEmailPreviewUrl, setSendEmailPreviewUrl] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [isAttachingPdf, setIsAttachingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailStatus, setSendEmailStatus] = useState<'idle' | 'success' | 'error' | 'not_configured'>('idle');
  const [sendEmailError, setSendEmailError] = useState('');
  const [shareAttachment, setShareAttachment] = useState<{ base64: string; filename: string } | null>(null);
  const [shareAttachmentPreviewUrl, setShareAttachmentPreviewUrl] = useState<string | null>(null);
  const [isAttachingSharePdf, setIsAttachingSharePdf] = useState(false);
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [shareEmailStatus, setShareEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfIncludePhoto, setPdfIncludePhoto] = useState(true);
  const [showSavePdfModal, setShowSavePdfModal] = useState(false);
  const [savingPdfTemplateId, setSavingPdfTemplateId] = useState<string | null>(null);
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  // Slug from URL on first load — consumed once when resumes arrive
  const initialUrlSlugRef = useRef((() => {
    const pathSlug = window.location.pathname.startsWith('/resumes/')
      ? window.location.pathname.replace('/resumes/', '') || undefined
      : undefined;
    if (pathSlug) return pathSlug;
    const querySlug = new URLSearchParams(window.location.search).get('cv') || undefined;
    return querySlug;
  })());
  // Tracks previous selectedResumeId to distinguish push vs replace for URL updates
  const prevSelectedResumeIdRef = useRef<string | null>(null);
  const selectedResumeIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedResumeIdRef.current = selectedResumeId;
  }, [selectedResumeId]);

  const loadData = async (preferredResumeId?: string | null, initialSlug?: string) => {
    const [docs, jobs, versions] = await Promise.all([
      documentsApi.getMyDocuments(),
      jobsApi.list(),
      resumesApi.list(),
    ]);
    const normalized = (versions || []).map((r: ResumeVersion) => normalizeResume(r)).filter(Boolean) as ResumeVersion[];
    const currentSelectedResumeId = selectedResumeIdRef.current;
    const resumeIdFromSlug = initialSlug ? slugToResumeId(initialSlug, normalized) : null;
    const nextSelectedResumeId =
      preferredResumeId && normalized.some((r) => r.resume_id === preferredResumeId)
        ? preferredResumeId
        : resumeIdFromSlug && normalized.some((r) => r.resume_id === resumeIdFromSlug)
          ? resumeIdFromSlug
          : currentSelectedResumeId && normalized.some((r) => r.resume_id === currentSelectedResumeId)
            ? currentSelectedResumeId
            : normalized[0]?.resume_id ?? null;

    setUploadedDocs(docs || []);
    setActiveJobs(jobs || []);
    setResumeVersions(normalized);
    setSelectedResumeId(nextSelectedResumeId ?? null);
  };

  useEffect(() => {
    loadData(undefined, initialUrlSlugRef.current).catch(() => setMessage({ text: 'Failed to load resume data', type: 'error' }));
    initialUrlSlugRef.current = undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with the selected resume
  useEffect(() => {
    if (activeTab !== 'upload-cv' || !selectedResumeId || !resumeVersions.length) return;
    const resume = resumeVersions.find((r) => r.resume_id === selectedResumeId);
    if (!resume) return;
    const slug = resumeToSlug(resume, resumeVersions);
    const newPath = `/resumes/${slug}`;
    if (window.location.pathname === newPath) {
      prevSelectedResumeIdRef.current = selectedResumeId;
      return;
    }
    // Use pushState when user explicitly switches resume; replaceState for tab arrival / data reload
    const isExplicitSwitch =
      prevSelectedResumeIdRef.current !== null &&
      prevSelectedResumeIdRef.current !== selectedResumeId;
    prevSelectedResumeIdRef.current = selectedResumeId;
    if (isExplicitSwitch) {
      window.history.pushState({}, '', newPath);
    } else {
      window.history.replaceState({}, '', newPath);
    }
  }, [activeTab, selectedResumeId, resumeVersions]);

  // Handle browser back/forward within the resumes section
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (!path.startsWith('/resumes')) return;
      if (path.startsWith('/resumes/')) {
        const slug = path.replace('/resumes/', '');
        const id = slugToResumeId(slug, resumeVersions);
        if (id) setSelectedResumeId(id);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resumeVersions]);

  const selectedResume = useMemo(() => {
    if (!resumeVersions.length) return null;
    if (!selectedResumeId) return resumeVersions[0] ?? null;
    return resumeVersions.find((r) => r.resume_id === selectedResumeId) ?? null;
  }, [resumeVersions, selectedResumeId]);

  // Auto-populate email message template when resume or recipient name changes
  useEffect(() => {
    if (!selectedResume) return;
    const info = selectedResume.personal_info ?? selectedResume.resume_data?.personal_info ?? {};
    const firstName = (info.first_name ?? '').trim();
    const lastName = (info.last_name ?? '').trim();
    const senderName = [firstName, lastName].filter(Boolean).join(' ') || 'Me';
    // const slug = resumeToSlug(selectedResume, resumeVersions);
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const cvBase = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://orange-forest-05793170f.7.azurestaticapps.net';
    const cvLink = `${cvBase}/?cv=${selectedResume.resume_id}`;
    const eb = t.emailBody;
    const greeting = sendEmailRecipientName.trim()
      ? eb.greeting.replace('{name}', sendEmailRecipientName.trim())
      : eb.hiringManager;
    setSendEmailMessage(
      `${greeting}\n\n${eb.line1}\n\n${eb.line2attach}\n\n${eb.line3}\n${cvLink}\n\n${eb.line4}\n\n${eb.line5}\n\n${eb.regards}\n${senderName}`
    );
  }, [selectedResume, sendEmailRecipientName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setFile(e.target.files[0]); setMessage(null); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true); setMessage(null);
    try {
      const res = await documentsApi.upload(file);
      await loadData(res.resume_id || null);
      setMessage({ text: 'CV uploaded and a new resume version was created.', type: 'success' });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch { setMessage({ text: 'Upload failed', type: 'error' }); }
    finally { setIsUploading(false); }
  };

  const handleCreateFromProfile = async (data: { title: string; language: string; validUntil: string; removedSections: ResumeSectionKey[] }) => {
    setIsWorking(true); setMessage(null);
    try {
      const created = await resumesApi.createFromProfile({ language: data.language, title: data.title, generate_from_profile_if_empty: true, valid_until: data.validUntil || null, removed_sections: data.removedSections });
      await loadData(created.resume_id);
      setMessage({ text: 'A new resume version was created from your profile.', type: 'success' });
      setShowProfileModal(false);
    } catch { setMessage({ text: 'Could not create a resume from profile.', type: 'error' }); }
    finally { setIsWorking(false); }
  };

  const handleDuplicate = async (data: { sourceResumeId: string; title: string; language: string; validUntil: string; removedSections: ResumeSectionKey[] }) => {
    setIsWorking(true); setMessage(null);
    try {
      const created = await resumesApi.duplicate(data.sourceResumeId, { title: data.title, language: data.language, removed_sections: data.removedSections, valid_until: data.validUntil || null });
      await loadData(created.resume_id);
      setMessage({ text: 'Resume duplicated as a new version.', type: 'success' });
      setShowDuplicateModal(false);
    } catch { setMessage({ text: 'Could not duplicate this resume version.', type: 'error' }); }
    finally { setIsWorking(false); }
  };

  const handleCreateFromJobDescription = async (data: { title: string; language: string; validUntil: string; removedSections: ResumeSectionKey[]; jobDescription: string; jobId: string | null; sourceResumeId: string | null }) => {
    setIsWorking(true); setMessage(null);
    try {
      const created = await resumesApi.createFromJobDescription({ job_description: data.jobDescription, language: data.language, title: data.title, valid_until: data.validUntil || null, removed_sections: data.removedSections, job_id: data.jobId, source_resume_id: data.sourceResumeId });
      await loadData(created.resume_id);
      setMessage({ text: 'A tailored resume version was generated for this job.', type: 'success' });
      setShowJobDescModal(false);
    } catch { setMessage({ text: 'Could not generate the tailored resume.', type: 'error' }); }
    finally { setIsWorking(false); }
  };

  const startEditingTitle = () => {
    if (!selectedResume) return;
    setTitleDraft(selectedResume.title || '');
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const cancelEditingTitle = () => {
    setEditingTitle(false);
    setTitleDraft('');
  };

  const handleSaveTitle = async () => {
    if (!selectedResume || !titleDraft.trim()) { cancelEditingTitle(); return; }
    if (titleDraft.trim() === (selectedResume.title || '')) { cancelEditingTitle(); return; }
    setIsSavingTitle(true);
    try {
      await resumesApi.update(selectedResume.resume_id, {
        title: titleDraft.trim(),
        resume_data: selectedResume.resume_data ?? {},
      });
      setResumeVersions((prev) =>
        prev.map((r) => r.resume_id === selectedResume.resume_id ? { ...r, title: titleDraft.trim() } : r)
      );
      setEditingTitle(false);
    } catch { setMessage({ text: 'Could not save title.', type: 'error' }); }
    finally { setIsSavingTitle(false); }
  };

  const handleDeleteResume = async (resumeId: string) => {
    setIsDeleting(true);
    try {
      await resumesApi.delete(resumeId);
      setConfirmDeleteId(null);
      if (selectedResumeId === resumeId) setSelectedResumeId(null);
      await loadData();
      setMessage({ text: 'Resume version deleted.', type: 'success' });
    } catch { setMessage({ text: 'Could not delete this version.', type: 'error' }); }
    finally { setIsDeleting(false); }
  };

  const closePdfModals = () => {
    setShowPdfModal(false);
    setShowSavePdfModal(false);
    if (previewBlobUrl) { URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); }
    setPreviewingTemplateId(null);
  };

  const handlePreviewTemplate = async (templateId: string, resumeData: any, title?: string | null, photo?: string) => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewingTemplateId(templateId);
    setPreviewBlobUrl(null);
    try {
      const blob = await generateResumePdfBlob(templateId as TemplateId, resumeData, title, photo);
      setPreviewBlobUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewingTemplateId(null);
    }
  };

  const openShareModal = () => {
    setLinkCopied(false);
    setSharePublicLinkCopied(false);
    setShareEmailTo('');
    setShareEmailRecipientName('');
    setShowShareModal(true);
  };

  const fetchPdfAttachment = async (documentId: string, filename: string) => {
    const blobUrl = await documentsApi.getDocumentFileUrl(documentId);
    const res = await fetch(blobUrl);
    const arrayBuffer = await res.arrayBuffer();
    URL.revokeObjectURL(blobUrl);
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    const previewBlob = new Blob([bytes], { type: 'application/pdf' });
    const previewUrl = URL.createObjectURL(previewBlob);
    return { base64, filename, previewUrl };
  };

  const handleAttachCv = async () => {
    if (!selectedResume?.generated_document_id) return;
    setIsAttachingPdf(true);
    try {
      if (sendEmailPreviewUrl) URL.revokeObjectURL(sendEmailPreviewUrl);
      const filename = `${selectedResume.title || 'resume'}.pdf`.replace(/\s+/g, '_');
      const { base64, previewUrl } = await fetchPdfAttachment(selectedResume.generated_document_id, filename);
      setSendEmailAttachment({ base64, filename });
      setSendEmailPreviewUrl(previewUrl);
    } catch {
      // ignore — user can retry
    } finally {
      setIsAttachingPdf(false);
    }
  };

  const handleAttachShareCv = async () => {
    if (!selectedResume?.generated_document_id) return;
    setIsAttachingSharePdf(true);
    try {
      if (shareAttachmentPreviewUrl) URL.revokeObjectURL(shareAttachmentPreviewUrl);
      const filename = `${selectedResume.title || 'resume'}.pdf`.replace(/\s+/g, '_');
      const { base64, previewUrl } = await fetchPdfAttachment(selectedResume.generated_document_id, filename);
      setShareAttachment({ base64, filename });
      setShareAttachmentPreviewUrl(previewUrl);
    } catch {
      // ignore — user can retry
    } finally {
      setIsAttachingSharePdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedResume || !sendEmailTo.trim() || !sendEmailAttachment) return;
    setIsSendingEmail(true);
    setSendEmailStatus('idle');
    setSendEmailError('');
    try {
      const subject = sendEmailSubject.trim() || `CV: ${selectedResume.title || 'My Resume'}`;
      await resumesApi.sendEmail({ to: sendEmailTo.trim(), subject, message: sendEmailMessage, pdf_base64: sendEmailAttachment.base64, filename: sendEmailAttachment.filename });
      setSendEmailStatus('success');
      setSendEmailTo('');
      setSendEmailSubject('');
      setSendEmailMessage('');
      setSendEmailAttachment(null);
      if (sendEmailPreviewUrl) { URL.revokeObjectURL(sendEmailPreviewUrl); setSendEmailPreviewUrl(null); setShowEmailPreview(false); }
    } catch (err: any) {
      console.error('Send CV error:', err, err?.response?.data);
      const detail = err?.response?.data?.detail;
      if (detail === 'Email service not configured') {
        setSendEmailStatus('not_configured');
      } else {
        setSendEmailStatus('error');
        const msg = typeof detail === 'string' ? detail
          : Array.isArray(detail) ? JSON.stringify(detail)
          : err?.message || 'Failed to send. Please try again.';
        setSendEmailError(msg);
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendShare = async (to: string, subject: string, message: string) => {
    if (!shareAttachment || !to.trim()) return;
    setIsSendingShare(true);
    setShareEmailStatus('idle');
    try {
      await resumesApi.sendEmail({ to: to.trim(), subject, message, pdf_base64: shareAttachment.base64, filename: shareAttachment.filename });
      setShareEmailStatus('success');
      setShareAttachment(null);
      if (shareAttachmentPreviewUrl) { URL.revokeObjectURL(shareAttachmentPreviewUrl); setShareAttachmentPreviewUrl(null); }
    } catch {
      setShareEmailStatus('error');
    } finally {
      setIsSendingShare(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setEditDraft(d => d ? { ...d, personal_info: { ...(d.personal_info ?? {}), photo: base64 } } : d);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleCopyPublicLink = () => {
    if (!selectedResume) return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://orange-forest-05793170f.7.azurestaticapps.net';
    handleCopyLink(`${base}/?cv=${selectedResume.resume_id}`);
  };

  const startEditingContent = () => {
    if (!selectedResume) return;
    setEditDraft({ ...selectedResume });
    setTitleDraft(selectedResume.title || '');
    setIsEditingContent(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const cancelEditingContent = () => {
    setIsEditingContent(false);
    setEditDraft(null);
    setTitleDraft('');
  };

  const handleSaveContent = async () => {
    if (!editDraft || !selectedResume) return;
    setIsSavingContent(true);
    try {
      const resume_data = {
        personal_info: { ...(editDraft.personal_info ?? {}), summary: editDraft.personal_info?.summary ?? '' },
        experience:     editDraft.experience     ?? [],
        education:      editDraft.education      ?? [],
        skills:         editDraft.skills         ?? [],
        languages:      (editDraft.languages      ?? []).map((s: any) => (typeof s === 'string' ? s : s.name || s.language || '').trim()).filter(Boolean),
        certifications: (editDraft.certifications ?? []).map((s: any) => (typeof s === 'string' ? s : s.name || s.title  || '').trim()).filter(Boolean),
      };
      await resumesApi.update(selectedResume.resume_id, {
        title: titleDraft.trim() || editDraft.title || selectedResume.title || undefined,
        language: editDraft.language ?? selectedResume.language ?? undefined,
        resume_data,
      });
      await loadData(selectedResume.resume_id);
      setIsEditingContent(false);
      setEditDraft(null);
      setMessage({ text: 'Resume saved successfully.', type: 'success' });
    } catch { setMessage({ text: 'Could not save changes.', type: 'error' }); }
    finally { setIsSavingContent(false); }
  };

  const updateExpField = (i: number, field: string, value: string) =>
    setEditDraft(d => { if (!d) return d; const a = [...(d.experience ?? [])]; a[i] = { ...a[i], [field]: value }; return { ...d, experience: a }; });
  const addExpEntry = () => setEditDraft(d => d ? { ...d, experience: [...(d.experience ?? []), { title: '', company: '', start_date: '', end_date: '', description: '' }] } : d);
  const removeExpEntry = (i: number) => setEditDraft(d => d ? { ...d, experience: (d.experience ?? []).filter((_: any, j: number) => j !== i) } : d);

  const updateEduField = (i: number, field: string, value: string) =>
    setEditDraft(d => { if (!d) return d; const a = [...(d.education ?? [])]; a[i] = { ...a[i], [field]: value }; return { ...d, education: a }; });
  const addEduEntry = () => setEditDraft(d => d ? { ...d, education: [...(d.education ?? []), { degree: '', institution: '' }] } : d);
  const removeEduEntry = (i: number) => setEditDraft(d => d ? { ...d, education: (d.education ?? []).filter((_: any, j: number) => j !== i) } : d);

  const InfoTag = ({ label, value }: { label: string; value: any }) => (
    <div className="flex flex-col gap-1 p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
      <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {value === 'UNKNOWN' || value === '' || value === null || value === undefined
          ? <span className="text-gray-400 italic">{t.metadata.notSpecified}</span>
          : String(value)}
      </span>
    </div>
  );

  const langLabel = (code?: string) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label || code || 'en';
  const noModals = !showProfileModal && !showDuplicateModal && !showJobDescModal;

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 pb-32">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-0.5">{t.subtitle}</p>
          <p className="text-xs text-gray-400 dark:text-neutral-500">
            {t.stats.replace('{vCount}', String(resumeVersions.length)).replace('{dCount}', String(uploadedDocs.length))}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            {t.uploadCv}
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            disabled={isWorking}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-900 dark:text-white text-sm font-semibold rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 transition-all disabled:opacity-60"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {t.fromProfile}
          </button>
          <button
            onClick={() => { if (resumeVersions.length > 0) setShowDuplicateModal(true); }}
            disabled={isWorking || resumeVersions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-800/50 transition-all disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            {t.duplicate}
          </button>
          <button
            onClick={() => setShowJobDescModal(true)}
            disabled={isWorking}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-semibold rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/50 transition-all disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {t.fromJob}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">

        <div className="space-y-2">
          {resumeVersions.length > 0 ? (
            resumeVersions.map((resume) => {
              const isActive = resume.resume_id === selectedResume?.resume_id;
              const isPendingDelete = confirmDeleteId === resume.resume_id;
              return (
                <div
                  key={resume.resume_id}
                  className={`rounded-2xl border transition-all ${isActive ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600 hover:shadow-sm'}`}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => { setSelectedResumeId(resume.resume_id); setConfirmDeleteId(null); setMessage(null); }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="grid grid-cols-3 items-center w-full gap-2">
                          <h4 className="text-sm font-semibold leading-snug truncate">{resume.title || 'Untitled Resume'}</h4>
                          <span className={`text-sm text-center whitespace-nowrap ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                            {resume.created_at ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(resume.created_at)) : '—'}
                          </span>
                          <span className={`text-sm font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap text-center justify-self-end ${isActive ? 'border-white/20 text-white' : 'border-gray-200 text-gray-600'}`}>
                            {langLabel(resume.language)}
                          </span>
                        </div>
                      </button>
                      {!isPendingDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(resume.resume_id); }}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${isActive ? 'text-red-300 hover:bg-white/10' : 'text-gray-300 dark:text-neutral-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                          title="Delete this version"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {isPendingDelete && (
                      <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-white/10">
                        <span className={`text-[10px] font-medium ${isActive ? 'text-red-300' : 'text-red-500'}`}>{t.deleteConfirm}</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${isActive ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
                          >{t.no}</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteResume(resume.resume_id); }}
                            disabled={isDeleting}
                            className="text-[10px] px-2 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-1"
                          >
                            {isDeleting && <div className="w-2 h-2 border border-white/30 border-t-white rounded-full animate-spin" />}
                            {t.yes}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-neutral-700 p-6 text-sm text-gray-500 dark:text-neutral-400 text-center bg-gray-50/50 dark:bg-neutral-800/50">
              {t.noVersions}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {message && (
            <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/50'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {message.type === 'success'
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              </svg>
              {message.text}
            </div>
          )}

          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></div>
                {isEditingContent ? (
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') cancelEditingTitle(); }}
                    disabled={isSavingTitle}
                    className="flex-1 min-w-0 text-lg font-extrabold text-gray-900 dark:text-white bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white truncate">{selectedResume?.title || t.untitled}</h3>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-xs font-semibold text-gray-500 dark:text-neutral-400 whitespace-nowrap">
                  {selectedResume ? sourceTypeLabel(selectedResume.source_type, t) : '—'}
                </span>
                <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${selectedResume?.valid_until ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400' : 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-400 dark:text-neutral-500'}`}>
                  {selectedResume?.valid_until ? t.metadata.validUntil.replace('{date}', selectedResume.valid_until) : t.metadata.noExpiry}
                </span>
                {selectedResume && (
                  isEditingContent ? (
                    <>
                      <button
                        onClick={cancelEditingContent}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap"
                      >
                        {t.actions.cancel}
                      </button>
                      <button
                        onClick={handleSaveContent}
                        disabled={isSavingContent}
                        className="px-3 py-1.5 text-xs font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {isSavingContent && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isSavingContent ? t.actions.saving : t.actions.save}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowPdfModal(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t.actions.exportPdf}
                      </button>
                      <button
                        onClick={handleCopyPublicLink}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {linkCopied ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                        {linkCopied ? t.actions.linkCopied : t.actions.copyLink}
                      </button>
                      <button
                        onClick={openShareModal}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {t.actions.sendByEmail}
                      </button>
                      <button
                        onClick={startEditingContent}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-neutral-300 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                        </svg>
                        {t.actions.edit}
                      </button>
                    </>
                  )
                )}
              </div>
            </div>

            <div className="p-6">
              {!selectedResume ? (
                <div className="border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-2xl p-12 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-neutral-800/50 h-64">
                  <svg className="w-8 h-8 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t.noSelected}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 text-center">{t.noSelectedHint}</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.metadata.titleLabel}</span>
                      {editingTitle ? (
                        <div className="flex items-center gap-1.5 -mx-0.5">
                          <input
                            ref={titleInputRef}
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') cancelEditingTitle(); }}
                            onBlur={handleSaveTitle}
                            disabled={isSavingTitle}
                            className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10"
                            autoFocus
                          />
                          {isSavingTitle && <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-neutral-600 border-t-gray-600 dark:border-t-neutral-300 rounded-full animate-spin shrink-0" />}
                        </div>
                      ) : (
                        <button
                          onClick={startEditingTitle}
                          className="group flex items-center gap-1.5 text-left"
                          title="Click to rename"
                        >
                          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {selectedResume.title || <span className="text-gray-400 italic">{t.untitled}</span>}
                          </span>
                          <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <InfoTag label={t.metadata.created} value={formatDate(selectedResume.created_at)} />

                    {(() => {
                      const src = selectedResume.source_resume_id
                        ? resumeVersions.find((r) => r.resume_id === selectedResume.source_resume_id)
                        : null;
                      return (
                        <div className="flex flex-col gap-1 p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.metadata.source}</span>
                          {src ? (
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{src.title || t.untitled}</p>
                              <p className="text-[11px] text-gray-400 dark:text-neutral-500 dark:text-neutral-500 mt-0.5">{langLabel(src.language)} · {sourceTypeLabel(src.source_type, t)}</p>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-gray-400 italic">
                              {selectedResume.source_resume_id ? t.metadata.deleted : t.metadata.original}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-5 py-1">
                    {(isEditingContent ? editDraft?.personal_info?.photo : selectedResume.personal_info?.photo) ? (
                      <img
                        src={isEditingContent ? editDraft?.personal_info?.photo : selectedResume.personal_info?.photo}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-neutral-800 border-2 border-dashed border-gray-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                        <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{t.photo.label}</p>
                      <p className="text-[11px] text-gray-400 dark:text-neutral-500">{t.photo.hint}</p>
                      {isEditingContent ? (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-neutral-300 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                          >
                            {editDraft?.personal_info?.photo ? t.photo.change : t.photo.upload}
                          </button>
                          {editDraft?.personal_info?.photo && (
                            <button
                              type="button"
                              onClick={() => setEditDraft(d => d ? { ...d, personal_info: { ...(d.personal_info ?? {}), photo: null } } : d)}
                              className="px-3 py-1.5 text-xs font-semibold text-red-500 dark:text-red-400 bg-white dark:bg-neutral-800 border border-red-100 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              {t.photo.remove}
                            </button>
                          )}
                          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {selectedResume.job_description && (
                    <JobDescriptionAccordion text={selectedResume.job_description} />
                  )}

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.sections.summary}</p>
                    {isEditingContent ? (
                      <textarea
                        className="w-full text-sm text-gray-700 dark:text-neutral-300 leading-relaxed bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 resize-none"
                        rows={4}
                        value={editDraft?.personal_info?.summary ?? ''}
                        onChange={e => setEditDraft(d => d ? { ...d, personal_info: { ...(d.personal_info ?? {}), summary: e.target.value } } : d)}
                        placeholder="Professional summary..."
                      />
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-2xl p-5">
                        {selectedResume.personal_info?.summary || t.placeholders.noSummary}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      {t.sections.experience}
                    </p>
                    {isEditingContent ? (
                      <>
                        {(editDraft?.experience ?? []).map((exp: any, i: number) => (
                          <div key={i} className="p-4 border border-gray-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-800 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-gray-400 dark:text-neutral-500">{t.edit.entry} {i + 1}</span>
                              <button type="button" onClick={() => removeExpEntry(i)} className="text-xs text-red-400 dark:text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{t.edit.remove}</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={exp.title ?? ''} onChange={e => updateExpField(i, 'title', e.target.value)} placeholder="Job title" className="rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
                              <input value={exp.company ?? ''} onChange={e => updateExpField(i, 'company', e.target.value)} placeholder="Company" className="rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
                              <input value={exp.start_date ?? ''} onChange={e => updateExpField(i, 'start_date', e.target.value)} placeholder="Start date" className="rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
                              <input value={exp.end_date ?? ''} onChange={e => updateExpField(i, 'end_date', e.target.value)} placeholder="End date / Present" className="rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
                            </div>
                            <textarea value={exp.description ?? ''} onChange={e => updateExpField(i, 'description', e.target.value)} placeholder="Job description..." rows={3} className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm resize-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
                          </div>
                        ))}
                        <button type="button" onClick={addExpEntry} className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-neutral-700 text-sm text-gray-500 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 rounded-2xl transition-all">{t.edit.addExp}</button>
                      </>
                    ) : (
                      <>
                        {selectedResume.experience?.length ? selectedResume.experience.map((exp: any, i: number) => (
                          <div key={i} className="p-5 border border-gray-100 dark:border-neutral-700 rounded-2xl bg-gray-50/50 dark:bg-neutral-800">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{exp.title || t.placeholders.untitledRole}{exp.company ? ` @ ${exp.company}` : ''}</h4>
                            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 mb-3">{exp.start_date || '—'} — {exp.end_date || t.placeholders.present}</p>
                            <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed">{exp.description || t.placeholders.noDesc}</p>
                          </div>
                        )) : <p className="text-sm text-gray-400 italic">{t.placeholders.noExp}</p>}
                      </>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-gray-100 dark:border-neutral-800 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.sections.skills}</p>
                    {isEditingContent ? (
                      <div className="space-y-1">
                        <textarea
                          className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 resize-none"
                          rows={3}
                          value={(editDraft?.skills ?? []).map((s: any) => typeof s === 'string' ? s : s.name || '').join(', ')}
                          onChange={e => setEditDraft(d => d ? { ...d, skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } : d)}
                          placeholder="Skill 1, Skill 2, Skill 3..."
                        />
                        <p className="text-xs text-gray-400 dark:text-neutral-500">{t.placeholders.skillHint}</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedResume.skills?.length ? selectedResume.skills.map((skill: any, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-semibold text-gray-900 dark:text-white shadow-sm">
                            {typeof skill === 'string' ? skill : skill.name || 'Skill'}
                            {typeof skill === 'object' && skill.level ? <span className="text-gray-400 text-[10px] ml-1">{skill.level}</span> : null}
                          </span>
                        )) : <span className="text-sm text-gray-400 italic">{t.placeholders.noSkills}</span>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 dark:border-neutral-800 pt-6">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-3">{t.sections.education}</p>
                      {isEditingContent ? (
                        <div className="space-y-3">
                          {(editDraft?.education ?? []).map((edu: any, i: number) => (
                            <div key={i} className="p-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-400 dark:text-neutral-500">{t.edit.entry} {i + 1}</span>
                                <button type="button" onClick={() => removeEduEntry(i)} className="text-xs text-red-400 dark:text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{t.edit.remove}</button>
                              </div>
                              <input value={edu.degree ?? ''} onChange={e => updateEduField(i, 'degree', e.target.value)} placeholder="Degree / Qualification" className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
                              <input value={edu.institution ?? ''} onChange={e => updateEduField(i, 'institution', e.target.value)} placeholder="Institution" className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10" />
                            </div>
                          ))}
                          <button type="button" onClick={addEduEntry} className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-neutral-700 text-sm text-gray-500 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 rounded-2xl transition-all">{t.edit.addEdu}</button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedResume.education?.length ? selectedResume.education.map((edu: any, i: number) => (
                            <div key={i} className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{edu.degree || 'Degree'}</p>
                              <p className="text-xs text-gray-500 dark:text-neutral-400">{edu.institution || 'Institution'}</p>
                            </div>
                          )) : <p className="text-sm text-gray-400 italic">{t.placeholders.noEdu}</p>}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-3">{t.sections.langCert}</p>
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t.sections.languages}</p>
                          {isEditingContent ? (
                            <textarea
                              className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 resize-none bg-white"
                              rows={2}
                              value={(editDraft?.languages ?? []).map((l: any) => typeof l === 'string' ? l : l.name || l.language || '').join('\n')}
                              onChange={e => setEditDraft(d => d ? { ...d, languages: e.target.value.split('\n') } : d)}
                              placeholder={"English\nSpanish\nFrench..."}
                            />
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-neutral-300">
                              {selectedResume.languages?.length
                                ? selectedResume.languages.map((item: any) => typeof item === 'string' ? item : item.name || item.language).filter(Boolean).join(', ')
                                : t.placeholders.noLang}
                            </p>
                          )}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t.sections.certifications}</p>
                          {isEditingContent ? (
                            <textarea
                              className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 resize-none bg-white"
                              rows={2}
                              value={(editDraft?.certifications ?? []).map((c: any) => typeof c === 'string' ? c : c.name || c.title || '').join('\n')}
                              onChange={e => setEditDraft(d => d ? { ...d, certifications: e.target.value.split('\n') } : d)}
                              placeholder={"AWS Certified\nPMP\nGoogle Analytics..."}
                            />
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-neutral-300">
                              {selectedResume.certifications?.length
                                ? selectedResume.certifications.map((item: any) => typeof item === 'string' ? item : item.name || item.title).filter(Boolean).join(', ')
                                : t.placeholders.noCert}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedResume && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-widest">{t.pdfCard.title}</h3>
                </div>
                {selectedResume.generated_document_id && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full">{t.pdfCard.saved}</span>
                )}
              </div>
              <div className="p-6 space-y-4">
                {selectedResume.generated_document_id ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">{t.pdfCard.desc}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={async () => {
                          try {
                            const url = await documentsApi.getDocumentFileUrl(selectedResume.generated_document_id!);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedResume.title || 'resume'}.pdf`;
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 10_000);
                          } catch { setMessage({ text: 'Could not download the saved PDF.', type: 'error' }); }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold rounded-xl border border-rose-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {t.pdfCard.downloadBtn}
                      </button>
                      <button
                        onClick={() => setShowSavePdfModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-300 text-sm font-semibold rounded-xl border border-gray-200 dark:border-neutral-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {t.pdfCard.regenerateBtn}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">{t.pdfCard.notSavedDesc}</p>
                    <button
                      onClick={() => setShowSavePdfModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                      {t.pdfCard.saveBtn}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeJobs.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-widest">{t.openJobs}</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeJobs.map((job) => (
                    <div key={job.job_id || job.id} className="p-5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl hover:border-gray-300 dark:hover:border-neutral-600 hover:shadow-sm transition-all group">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{job.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {job.region || 'Remote'}
                      </p>
                      <button
                        onClick={() => setShowJobDescModal(true)}
                        className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors"
                      >
                        {t.createForJob}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0"></div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-widest">{t.sendEmail.title}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-neutral-500 uppercase tracking-widest mb-2">{t.sendEmail.recipientName}</label>
                  <input
                    type="text"
                    value={sendEmailRecipientName}
                    onChange={e => setSendEmailRecipientName(e.target.value)}
                    placeholder={t.sendEmail.namePlaceholder}
                    className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:focus:ring-sky-400/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-neutral-500 uppercase tracking-widest mb-2">{t.sendEmail.recipientEmail}</label>
                  <input
                    type="email"
                    value={sendEmailTo}
                    onChange={e => setSendEmailTo(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:focus:ring-sky-400/20"
                  />
                </div>
              </div>

              {sendEmailStatus === 'success' ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {t.sendEmail.sentTo.replace('{email}', sendEmailTo || 'recipient')}
                  </div>
                  <button
                    onClick={() => { setSendEmailStatus('idle'); setSendEmailTo(''); setSendEmailSubject(''); setSendEmailRecipientName(''); setSendEmailMessage(''); }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:no-underline"
                  >
                    {t.sendEmail.sendAnother}
                  </button>
                </div>
              ) : (<>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-neutral-500 uppercase tracking-widest mb-2">{t.sendEmail.subject}</label>
                <input
                  type="text"
                  value={sendEmailSubject}
                  onChange={e => setSendEmailSubject(e.target.value)}
                  placeholder={selectedResume ? `CV: ${selectedResume.title || 'My Resume'}` : 'CV submission'}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:focus:ring-sky-400/20"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAttachCv}
                  disabled={!selectedResume?.generated_document_id || isAttachingPdf}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAttachingPdf ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  )}
                  {isAttachingPdf ? t.sendEmail.attaching : t.sendEmail.attachBtn}
                </button>
                {sendEmailAttachment ? (
                  <button
                    onClick={() => setShowEmailPreview(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                    title="Click to preview"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {sendEmailAttachment.filename}
                    <svg className="w-3 h-3 ml-0.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-neutral-500">
                    {selectedResume?.generated_document_id ? t.sendEmail.noAttachment : t.sendEmail.savePdfFirst}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-neutral-500 uppercase tracking-widest mb-2">{t.sendEmail.message}</label>
                <textarea
                  value={sendEmailMessage}
                  onChange={e => setSendEmailMessage(e.target.value)}
                  rows={14}
                  placeholder="Write a short message to accompany your CV…"
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:focus:ring-sky-400/20 resize-y"
                />
              </div>
              {sendEmailStatus === 'error' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  {sendEmailError || t.sendEmail.errorMsg}
                </div>
              )}
              {sendEmailStatus === 'not_configured' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" /></svg>
                  {t.sendEmail.notConfigured}
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-400 dark:text-neutral-500">
                  {selectedResume
                    ? <>{t.sendEmail.sendingLabel} <span className="font-semibold text-gray-600 dark:text-neutral-300">{selectedResume.title || t.untitled}</span></>
                    : t.sendEmail.selectFirst}
                </p>
                <button
                  onClick={handleSendEmail}
                  disabled={!sendEmailTo.trim() || !sendEmailAttachment || isSendingEmail}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {isSendingEmail ? t.sendEmail.sending : t.sendEmail.sendBtn}
                </button>
              </div>
              </>)}
            </div>
          </div>
        </div>

      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.txt" />

      {(isUploading || isWorking) && noModals && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="flex flex-col items-center gap-4 bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-neutral-800">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.working}</p>
          </div>
        </div>
      )}

      {file && !isUploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 px-6 py-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-6 animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest block">{t.fileSelected}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px] block">{file.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
            <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">{t.actions.cancel}</button>
            <button onClick={handleUpload} className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm">{t.createVersion}</button>
          </div>
        </div>
      )}

      {showProfileModal && (
        <CreateFromProfileModal onClose={() => setShowProfileModal(false)} onSubmit={handleCreateFromProfile} isWorking={isWorking} />
      )}
      {showDuplicateModal && (
        <DuplicateResumeModal onClose={() => setShowDuplicateModal(false)} onSubmit={handleDuplicate} isWorking={isWorking} resumeVersions={resumeVersions} />
      )}
      {showJobDescModal && (
        <CreateFromJobDescriptionModal onClose={() => setShowJobDescModal(false)} onSubmit={handleCreateFromJobDescription} isWorking={isWorking} activeJobs={activeJobs} resumeVersions={resumeVersions} />
      )}

      {showPdfModal && selectedResume && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={closePdfModals}>
          <div className={`bg-white rounded-3xl shadow-2xl border border-gray-200 w-full overflow-hidden flex transition-all duration-300 ${previewBlobUrl ? 'max-w-5xl' : 'max-w-lg'}`} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col w-full max-w-sm shrink-0 bg-white dark:bg-neutral-900">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Export as PDF</h3>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-0.5">Preview a template, then download</p>
                  {!!selectedResume.personal_info?.photo && (
                    <button type="button" onClick={() => setPdfIncludePhoto(v => !v)} className="mt-2 flex items-center gap-2 text-xs text-gray-600 select-none">
                      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${pdfIncludePhoto ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${pdfIncludePhoto ? 'translate-x-4' : 'translate-x-1'}`} />
                      </span>
                      Include photo
                    </button>
                  )}
                </div>
                <button onClick={closePdfModals} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 space-y-2 overflow-y-auto">
                {TEMPLATES.map(t => {
                  const hasPhoto = !!selectedResume.personal_info?.photo;
                  const isActive = previewingTemplateId === t.id;
                  return (
                    <div key={t.id} className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${isActive ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{t.label}</p>
                          {hasPhoto && t.supportsPhoto && <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">photo</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-0.5 truncate">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePreviewTemplate(t.id, selectedResume.resume_data ?? {}, selectedResume.title, pdfIncludePhoto ? (selectedResume.personal_info?.photo ?? undefined) : undefined)}
                          disabled={previewingTemplateId === t.id && !previewBlobUrl}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                          {previewingTemplateId === t.id && !previewBlobUrl
                            ? <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin inline-block" />Loading</span>
                            : isActive ? 'Previewing' : 'Preview'}
                        </button>
                        <button
                          disabled={isGeneratingPdf}
                          onClick={async () => {
                            setIsGeneratingPdf(true);
                            try {
                              await downloadResumePdf(t.id as TemplateId, selectedResume.resume_data ?? {}, selectedResume.title, pdfIncludePhoto ? (selectedResume.personal_info?.photo ?? undefined) : undefined);
                              closePdfModals();
                            } finally { setIsGeneratingPdf(false); }
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60 flex items-center gap-1"
                        >
                          {isGeneratingPdf ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                          Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {previewBlobUrl && (
              <div className="flex-1 border-l border-gray-100 dark:border-neutral-800 flex flex-col min-w-0 bg-white dark:bg-neutral-900">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-900">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Preview — {TEMPLATES.find(t => t.id === previewingTemplateId)?.label}</p>
                  <button onClick={() => { URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); setPreviewingTemplateId(null); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-400 dark:text-neutral-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <iframe src={previewBlobUrl} className="flex-1 w-full" style={{ minHeight: '560px' }} title="PDF Preview" />
              </div>
            )}
          </div>
        </div>
      )}

      {showSavePdfModal && selectedResume && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={closePdfModals}>
          <div className={`bg-white rounded-3xl shadow-2xl border border-gray-200 w-full overflow-hidden flex transition-all duration-300 ${previewBlobUrl ? 'max-w-5xl' : 'max-w-lg'}`} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col w-full max-w-sm shrink-0 bg-white dark:bg-neutral-900">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Save PDF to Database</h3>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-0.5">Preview a template, then save</p>
                  {!!selectedResume.personal_info?.photo && (
                    <button type="button" onClick={() => setPdfIncludePhoto(v => !v)} className="mt-2 flex items-center gap-2 text-xs text-gray-600 select-none">
                      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${pdfIncludePhoto ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${pdfIncludePhoto ? 'translate-x-4' : 'translate-x-1'}`} />
                      </span>
                      Include photo
                    </button>
                  )}
                </div>
                <button onClick={closePdfModals} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 space-y-2 overflow-y-auto">
                {TEMPLATES.map(t => {
                  const hasPhoto = !!selectedResume.personal_info?.photo;
                  const isActive = previewingTemplateId === t.id;
                  return (
                    <div key={t.id} className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${isActive ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{t.label}</p>
                          {hasPhoto && t.supportsPhoto && <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">photo</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-0.5 truncate">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePreviewTemplate(t.id, selectedResume.resume_data ?? {}, selectedResume.title, pdfIncludePhoto ? (selectedResume.personal_info?.photo ?? undefined) : undefined)}
                          disabled={previewingTemplateId === t.id && !previewBlobUrl}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                          {previewingTemplateId === t.id && !previewBlobUrl
                            ? <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin inline-block" />Loading</span>
                            : isActive ? 'Previewing' : 'Preview'}
                        </button>
                        <button
                          disabled={savingPdfTemplateId !== null}
                          onClick={async () => {
                            setSavingPdfTemplateId(t.id);
                            try {
                              const photo = pdfIncludePhoto ? (selectedResume.personal_info?.photo ?? undefined) : undefined;
                              const blob = await generateResumePdfBlob(t.id as TemplateId, selectedResume.resume_data ?? {}, selectedResume.title, photo);
                              const file = new File([blob], `${selectedResume.title || 'resume'}.pdf`, { type: 'application/pdf' });
                              const uploaded = await documentsApi.upload(file);
                              await resumesApi.update(selectedResume.resume_id, { resume_data: selectedResume.resume_data ?? {}, generated_document_id: uploaded.document_id });
                              setResumeVersions(prev => prev.map(r => r.resume_id === selectedResume.resume_id ? { ...r, generated_document_id: uploaded.document_id } : r));
                              closePdfModals();
                              setMessage({ text: 'PDF saved to database successfully.', type: 'success' });
                            } catch {
                              setMessage({ text: 'Could not save the PDF. Please try again.', type: 'error' });
                            } finally { setSavingPdfTemplateId(null); }
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60 flex items-center gap-1"
                        >
                          {savingPdfTemplateId === t.id ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                          Save
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {previewBlobUrl && (
              <div className="flex-1 border-l border-gray-100 dark:border-neutral-800 flex flex-col min-w-0 bg-white dark:bg-neutral-900">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-900">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Preview — {TEMPLATES.find(t => t.id === previewingTemplateId)?.label}</p>
                  <button onClick={() => { URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); setPreviewingTemplateId(null); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-400 dark:text-neutral-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <iframe src={previewBlobUrl} className="flex-1 w-full" style={{ minHeight: '560px' }} title="PDF Preview" />
              </div>
            )}
          </div>
        </div>
      )}

      {showEmailPreview && sendEmailPreviewUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col animate-in fade-in">
          <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-white/10">
            <span className="text-sm font-semibold text-white">{sendEmailAttachment?.filename || 'CV Preview'}</span>
            <button onClick={() => setShowEmailPreview(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <iframe src={sendEmailPreviewUrl} className="flex-1 w-full" title="CV Fullscreen Preview" />
        </div>
      )}

      {showShareModal && selectedResume && (() => {
        const info = selectedResume.personal_info ?? selectedResume.resume_data?.personal_info ?? {};
        const firstName = (info.first_name ?? '').trim();
        const lastName = (info.last_name ?? '').trim();
        const slug = resumeToSlug(selectedResume, resumeVersions);
        // Register slug with backend (best-effort, non-blocking)
        if (firstName && lastName) {
          authApi.updatePrivacy({ public_url_slug: slug }).catch(() => {});
        }
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const BASE = isLocal ? `${window.location.protocol}//${window.location.host}` : 'https://orange-forest-05793170f.7.azurestaticapps.net';
        return (
          <div
            className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setShowShareModal(false)}
            onKeyDown={e => { if (e.key === 'Escape') setShowShareModal(false); }}
          >
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-700 w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.share.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 truncate max-w-[280px]">{selectedResume.title || t.untitled}</p>
                </div>
                <button onClick={() => setShowShareModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 space-y-5 dark:bg-neutral-900 overflow-y-auto max-h-[75vh]">
                {/* Public link */}
                {(() => {
                  const cvPublicUrl = `${BASE}/?cv=${selectedResume.resume_id}`;
                  const copyPubLink = () => {
                    navigator.clipboard.writeText(cvPublicUrl).then(() => {
                      setSharePublicLinkCopied(true);
                      setTimeout(() => setSharePublicLinkCopied(false), 2000);
                    });
                  };
                  return (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{t.share.publicLink}</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs text-gray-600 dark:text-neutral-300 truncate font-mono">
                          {cvPublicUrl}
                        </div>
                        <button
                          onClick={copyPubLink}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${sharePublicLinkCopied ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700'}`}
                        >
                          {sharePublicLinkCopied
                            ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          }
                          {sharePublicLinkCopied ? t.share.copied : t.share.copyBtn}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-neutral-500">{t.share.linkHint}</p>
                    </div>
                  );
                })()}

                <div className="border-t border-gray-100 dark:border-neutral-800" />

                {/* Email */}
                {(() => {
                  const info = selectedResume.personal_info ?? selectedResume.resume_data?.personal_info ?? {};
                  const senderName = [info.first_name, info.last_name].filter(Boolean).join(' ') || 'Your Name';
                  const eb = t.emailBody;
                  const recipientGreeting = shareEmailRecipientName.trim()
                    ? eb.greeting.replace('{name}', shareEmailRecipientName.trim())
                    : eb.hiringManager;
                  const cvPublicUrl = `${BASE}/?cv=${selectedResume.resume_id}`;
                  const emailBody = `${recipientGreeting}\n\n${eb.line1}\n\n${eb.line2link}\n${cvPublicUrl}\n\n${eb.line4}\n\n${eb.line5}\n\n${eb.regards}\n${senderName}`;
                  const subject = `CV: ${selectedResume.title || 'My Resume'}`;
                  return (
                    <div className="space-y-3">
                      {shareEmailStatus === 'success' ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {t.share.sentTo.replace('{email}', shareEmailTo)}
                          </div>
                          <button onClick={() => { setShareEmailStatus('idle'); setShareEmailTo(''); setShareEmailRecipientName(''); }} className="text-xs text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:no-underline">
                            {t.share.sendAnother}
                          </button>
                        </div>
                      ) : (<>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">{t.share.recipientName}</label>
                          <input
                            type="text"
                            value={shareEmailRecipientName}
                            onChange={e => setShareEmailRecipientName(e.target.value)}
                            placeholder={t.share.namePlaceholder}
                            className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">{t.share.recipientEmail}</label>
                          <input
                            type="email"
                            value={shareEmailTo}
                            onChange={e => setShareEmailTo(e.target.value)}
                            placeholder={t.share.emailPlaceholder}
                            className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl">
                        <p className="text-[11px] text-gray-500 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">{emailBody}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleAttachShareCv}
                          disabled={!selectedResume?.generated_document_id || isAttachingSharePdf}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isAttachingSharePdf ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          )}
                          {isAttachingSharePdf ? t.sendEmail.attaching : t.sendEmail.attachBtn}
                        </button>
                        {shareAttachment ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {shareAttachment.filename}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-neutral-500">
                            {selectedResume?.generated_document_id ? t.share.noAttachment : t.share.savePdfFirst}
                          </span>
                        )}
                      </div>
                      {shareAttachmentPreviewUrl && (
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700">
                          <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{t.share.pdfPreview}</span>
                            <button onClick={() => { URL.revokeObjectURL(shareAttachmentPreviewUrl); setShareAttachmentPreviewUrl(null); setShareAttachment(null); }} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-400 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <iframe src={shareAttachmentPreviewUrl} className="w-full" style={{ height: '320px' }} title="CV Preview" />
                        </div>
                      )}
                      {/*{shareEmailStatus === 'success' && (*/}
                      {/*  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">*/}
                      {/*    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>*/}
                      {/*    CV sent successfully!*/}
                      {/*  </div>*/}
                      {/*)}*/}
                      {shareEmailStatus === 'error' && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          {t.share.errorMsg}
                        </div>
                      )}
                      <button
                        onClick={() => handleSendShare(shareEmailTo, subject, emailBody)}
                        disabled={!shareEmailTo.trim() || !shareAttachment || isSendingShare}
                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {isSendingShare ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        )}
                        {isSendingShare ? t.share.sending : t.share.sendBtn}
                      </button>
                    </>)}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}