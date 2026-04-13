import { useEffect, useMemo, useRef, useState } from 'react';
import { documentsApi, jobsApi, resumesApi } from '../api';
import { TEMPLATES, downloadResumePdf, type TemplateId } from './ResumePdfTemplates';

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

const sourceTypeLabel = (value?: string) => {
  switch (value) {
    case 'profile': return 'From Profile';
    case 'profile_extract': return 'Generated from Profile';
    case 'cv_upload': return 'CV Upload';
    case 'duplicate': return 'Duplicate';
    case 'public_application': return 'Public Application';
    case 'job_description': return 'From Job Description';
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

// ---- Shared sub-components ----

function LanguageSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
    >
      {LANGUAGE_OPTIONS.map((lang) => (
        <option key={lang.code} value={lang.code}>{lang.label} ({lang.code})</option>
      ))}
    </select>
  );
}

function SectionToggles({ removedSections, onToggle }: { removedSections: ResumeSectionKey[]; onToggle: (key: ResumeSectionKey) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Exclude sections from this version</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {REMOVABLE_SECTIONS.map((section) => {
          const removed = removedSections.includes(section.key);
          return (
            <label
              key={section.key}
              className={`rounded-2xl border px-4 py-3 text-sm cursor-pointer transition-all select-none ${removed ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <input type="checkbox" className="hidden" checked={removed} onChange={() => onToggle(section.key)} />
              {removed ? `✕ ${section.label}` : section.label}
            </label>
          );
        })}
      </div>
      {removedSections.length > 0 && (
        <p className="text-xs text-red-500 mt-2">Marked sections will be excluded from this version.</p>
      )}
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-5">{children}</div>
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
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
        Cancel
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

// ---- Modals ----

function CreateFromProfileModal({ onClose, onSubmit, isWorking }: {
  onClose: () => void;
  onSubmit: (data: { title: string; language: string; validUntil: string; removedSections: ResumeSectionKey[] }) => void;
  isWorking: boolean;
}) {
  const [title, setTitle] = useState('My Profile Resume');
  const [language, setLanguage] = useState('en');
  const [validUntil, setValidUntil] = useState('');
  const [removedSections, setRemovedSections] = useState<ResumeSectionKey[]>([]);
  const toggle = (key: ResumeSectionKey) => setRemovedSections((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);

  return (
    <ModalShell title="Create Resume from Profile" subtitle="Choose what to include in this version" onClose={onClose}>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Version Name</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" placeholder="e.g. Software Engineer Resume" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Language</label>
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Valid Until</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>
      </div>
      <SectionToggles removedSections={removedSections} onToggle={toggle} />
      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit({ title, language, validUntil, removedSections })}
        disabled={isWorking || !title.trim()}
        submitLabel={isWorking ? 'Creating…' : 'Create Version'}
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
  const [sourceId, setSourceId] = useState(resumeVersions[0]?.resume_id ?? '');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [validUntil, setValidUntil] = useState('');
  const [removedSections, setRemovedSections] = useState<ResumeSectionKey[]>([]);
  const toggle = (key: ResumeSectionKey) => setRemovedSections((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);

  const sourceResume = resumeVersions.find((r) => r.resume_id === sourceId);

  // Sync defaults when source changes
  const prevSourceIdRef = useRef('');
  if (prevSourceIdRef.current !== sourceId) {
    prevSourceIdRef.current = sourceId;
    if (sourceResume) {
      if (!title || title === resumeVersions.find((r) => r.resume_id === prevSourceIdRef.current)?.title + ' Copy') {
        // will re-render with new defaults on next cycle — just set directly
      }
    }
  }

  // Use effect to update title/language when source changes
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
    <ModalShell title="Duplicate Resume Version" subtitle="Create a new version based on an existing one" onClose={onClose}>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Source Version</label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {resumeVersions.length === 0 && (
            <p className="text-sm text-gray-400 italic">No existing versions to duplicate.</p>
          )}
          {resumeVersions.map((r, i) => {
            const isSelected = r.resume_id === sourceId;
            return (
              <button
                key={r.resume_id}
                type="button"
                onClick={() => { setSourceId(r.resume_id); setAutoTitle(true); }}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${isSelected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>Version {resumeVersions.length - i}</span>
                    <p className="text-sm font-semibold leading-tight">{r.title || 'Untitled Resume'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${isSelected ? 'border-white/20 text-white' : 'border-gray-200 text-gray-500'}`}>
                    {langLabel(r.language)}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{sourceTypeLabel(r.source_type)} · {formatDate(r.created_at)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Version Name</label>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setAutoTitle(false); }}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          placeholder="e.g. Resume for Product Roles"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Language</label>
          <LanguageSelect value={language} onChange={(v) => { setLanguage(v); setAutoTitle(false); }} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Valid Until</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>
      </div>

      <SectionToggles removedSections={removedSections} onToggle={toggle} />

      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit({ sourceResumeId: sourceId, title, language, validUntil, removedSections })}
        disabled={!canSubmit}
        submitLabel={isWorking ? 'Creating…' : 'Create Duplicate'}
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
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [validUntil, setValidUntil] = useState('');
  const [removedSections, setRemovedSections] = useState<ResumeSectionKey[]>([]);
  const [sourceResumeId, setSourceResumeId] = useState<string>(resumeVersions[0]?.resume_id ?? '');

  // Job description input mode
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
        // Auto-fill got nothing — focus the textarea so user can paste
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

  // Title can be left blank — it falls back to the fetched job title or a generic label at submit time
  const effectiveTitle = title.trim() || (fetchedTitle ? `Resume for ${fetchedTitle}` : '');
  const canSubmit = !isWorking && !isFetching && !!effectiveDescription.trim() && !!sourceResumeId;

  const langLabel = (code?: string) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label || code || 'en';

  const ModeTab = ({ id, label }: { id: JDMode; label: string }) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={`flex-1 py-2.5 text-xs font-semibold transition-all ${mode === id ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  );

  return (
    <ModalShell title="Create Resume from Job Description" subtitle="AI will adapt your existing resume to fit the role" onClose={onClose}>

      {/* Source resume picker */}
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
                  className={`w-full text-left rounded-2xl border px-4 py-2.5 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>Version {resumeVersions.length - i}</span>
                      <p className="text-sm font-semibold truncate">{r.title || 'Untitled Resume'}</p>
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

      {/* Job description source */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Job Description</label>

        {/* Mode tabs */}
        {activeJobs.length > 0 && (
          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-3">
            <ModeTab id="jobs" label="Open Jobs" />
            <ModeTab id="manual" label="Paste / URL" />
          </div>
        )}

        {mode === 'jobs' && (
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">— Select a job —</option>
            {activeJobs.map((job) => (
              <option key={job.job_id || job.id} value={job.job_id || job.id}>{job.title}</option>
            ))}
          </select>
        )}

        {mode === 'manual' && (
          <div className="space-y-3">
            {/* URL auto-fill */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  value={jobUrl}
                  onChange={(e) => { setJobUrl(e.target.value); setFetchError(''); setHasFetched(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFetchUrl(); }}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                <p className="text-[11px] text-gray-400">Works on static job pages only — for LinkedIn, Indeed, and similar sites, open the full job page first (not a listing feed), then paste the URL here.</p>
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

            {/* Textarea — paste fallback, always visible */}
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className={`w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${description ? 'border-indigo-300 bg-white' : 'border-gray-200 bg-gray-50'}`}
              placeholder="Or paste the job description here…"
              autoFocus={activeJobs.length === 0}
            />
          </div>
        )}
      </div>

      {/* Meta fields */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Version Name</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder={fetchedTitle ? `Resume for ${fetchedTitle}` : 'e.g. Resume for Product Manager at Acme'}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Output Language</label>
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Valid Until</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
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
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700 font-medium">
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

// ---- Job description accordion (reference-only, not part of CV) ----
function JobDescriptionAccordion({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 gap-3 hover:bg-indigo-100/60 transition-colors"
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
        <div className="px-5 pb-5 border-t border-indigo-100">
          <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap pt-4">{text}</p>
        </div>
      )}
    </div>
  );
}

// ---- Main component ----

export function ResumeUploadTab() {
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
  const [shareEmailTo, setShareEmailTo] = useState('');
  const [shareEmailRecipientName, setShareEmailRecipientName] = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfIncludePhoto, setPdfIncludePhoto] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const loadData = async (preferredResumeId?: string | null) => {
    const [docs, jobs, versions] = await Promise.all([
      documentsApi.getMyDocuments(),
      jobsApi.list(),
      resumesApi.list(),
    ]);
    const normalized = (versions || []).map((r: ResumeVersion) => normalizeResume(r)).filter(Boolean) as ResumeVersion[];
    setUploadedDocs(docs || []);
    setActiveJobs(jobs || []);
    setResumeVersions(normalized);

    if (preferredResumeId && normalized.some((r) => r.resume_id === preferredResumeId)) {
      setSelectedResumeId(preferredResumeId);
    } else if (!selectedResumeId && normalized[0]) {
      setSelectedResumeId(normalized[0].resume_id);
    } else if (selectedResumeId && !normalized.some((r) => r.resume_id === selectedResumeId)) {
      setSelectedResumeId(normalized[0]?.resume_id ?? null);
    }
  };

  useEffect(() => {
    loadData().catch(() => setMessage({ text: 'Failed to load resume data', type: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedResume = useMemo(
    () => resumeVersions.find((r) => r.resume_id === selectedResumeId) ?? resumeVersions[0] ?? null,
    [resumeVersions, selectedResumeId],
  );

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

  const openShareModal = () => {
    setLinkCopied(false);
    setShareEmailTo('');
    setShareEmailRecipientName('');
    setShowShareModal(true);
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
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const startEditingContent = () => {
    if (!selectedResume) return;
    setEditDraft({ ...selectedResume });
    setIsEditingContent(true);
  };

  const cancelEditingContent = () => {
    setIsEditingContent(false);
    setEditDraft(null);
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
        languages:      editDraft.languages      ?? [],
        certifications: editDraft.certifications ?? [],
      };
      await resumesApi.update(selectedResume.resume_id, {
        title: editDraft.title ?? selectedResume.title ?? undefined,
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
    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-semibold text-gray-900 truncate">
        {value === 'UNKNOWN' || value === '' || value === null || value === undefined
          ? <span className="text-gray-400 italic">Not Specified</span>
          : String(value)}
      </span>
    </div>
  );

  const langLabel = (code?: string) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label || code || 'en';
  const noModals = !showProfileModal && !showDuplicateModal && !showJobDescModal;

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-32">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Resume Versions</h2>
        <p className="text-sm text-gray-500">Create, duplicate, and manage your resume versions in multiple languages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ---- Left column ---- */}
        <div className="lg:col-span-4 space-y-6">

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 space-y-2.5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Create New Version
            </h3>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload CV
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              disabled={isWorking}
              className="w-full py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm border border-gray-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              From Profile
            </button>

            <button
              onClick={() => { if (resumeVersions.length > 0) setShowDuplicateModal(true); }}
              disabled={isWorking || resumeVersions.length === 0}
              className="w-full py-2.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl hover:bg-emerald-100 transition-all shadow-sm border border-emerald-100 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Duplicate Existing
            </button>

            <button
              onClick={() => setShowJobDescModal(true)}
              disabled={isWorking}
              className="w-full py-2.5 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-all shadow-sm border border-indigo-100 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              From Job Description
            </button>

            <p className="text-xs text-center text-gray-400 pt-1">
              {resumeVersions.length} version{resumeVersions.length !== 1 ? 's' : ''} · {uploadedDocs.length} uploaded doc{uploadedDocs.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Versions */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Versions</h3>
              <span className="text-xs font-semibold text-gray-400">Newest first</span>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {resumeVersions.map((resume, index) => {
                const isActive = resume.resume_id === selectedResume?.resume_id;
                const isPendingDelete = confirmDeleteId === resume.resume_id;
                return (
                  <div
                    key={resume.resume_id}
                    className={`rounded-2xl border transition-all ${isActive ? 'border-gray-900 bg-gray-900 text-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    {/* Selectable area */}
                    <button
                      onClick={() => { setSelectedResumeId(resume.resume_id); setConfirmDeleteId(null); }}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>Version {resumeVersions.length - index}</p>
                          <h4 className="text-sm font-semibold">{resume.title || 'Untitled Resume'}</h4>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${isActive ? 'border-white/20 text-white' : 'border-gray-200 text-gray-500'}`}>
                          {langLabel(resume.language)}
                        </span>
                      </div>
                      <p className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>{sourceTypeLabel(resume.source_type)}</p>
                      {resume.valid_until && <p className={`text-xs mt-0.5 ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>Valid until: {resume.valid_until}</p>}
                      <p className={`text-xs mt-1 ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>{formatDate(resume.created_at)}</p>
                    </button>
                    {/* Delete row */}
                    {isPendingDelete ? (
                      <div className={`flex items-center justify-between gap-2 px-4 pb-3 pt-0`}>
                        <span className={`text-xs font-medium ${isActive ? 'text-red-300' : 'text-red-500'}`}>Delete this version?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${isActive ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteResume(resume.resume_id)}
                            disabled={isDeleting}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-1"
                          >
                            {isDeleting && <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-3 pt-0 flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(resume.resume_id); }}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${isActive ? 'text-red-300 hover:bg-white/10' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                          title="Delete this version"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {resumeVersions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 text-center">
                  No resume versions yet. Upload a CV or generate one from your profile.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Right column ---- */}
        <div className="lg:col-span-8 space-y-6">
          {message && (
            <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {message.type === 'success'
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              </svg>
              {message.text}
            </div>
          )}

          {/* Selected resume detail */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Selected Resume Version</h3>
              </div>
              {selectedResume && (
                <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
                  <span className="px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 font-semibold text-gray-500">{sourceTypeLabel(selectedResume.source_type)}</span>
                  {selectedResume.valid_until && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold">Valid until {selectedResume.valid_until}</span>
                  )}
                  {isEditingContent ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEditingContent}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={handleSaveContent}
                        disabled={isSavingContent}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSavingContent && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isSavingContent ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowPdfModal(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export PDF
                      </button>
                      <button
                        onClick={openShareModal}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                      </button>
                      <button
                        onClick={startEditingContent}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                        </svg>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              {!selectedResume ? (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-gray-50/50 h-64">
                  <svg className="w-8 h-8 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-900 mb-1">No resume version selected</p>
                  <p className="text-xs text-gray-500 text-center">Upload your CV or create a version from your profile.</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Editable title */}
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Title</span>
                      {editingTitle ? (
                        <div className="flex items-center gap-1.5 -mx-0.5">
                          <input
                            ref={titleInputRef}
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') cancelEditingTitle(); }}
                            onBlur={handleSaveTitle}
                            disabled={isSavingTitle}
                            className="flex-1 min-w-0 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                            autoFocus
                          />
                          {isSavingTitle && <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin shrink-0" />}
                        </div>
                      ) : (
                        <button
                          onClick={startEditingTitle}
                          className="group flex items-center gap-1.5 text-left"
                          title="Click to rename"
                        >
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {selectedResume.title || <span className="text-gray-400 italic">Untitled Resume</span>}
                          </span>
                          <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <InfoTag label="Created" value={formatDate(selectedResume.created_at)} />

                    {/* Source resume — resolved to title + language */}
                    {(() => {
                      const src = selectedResume.source_resume_id
                        ? resumeVersions.find((r) => r.resume_id === selectedResume.source_resume_id)
                        : null;
                      return (
                        <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Source Resume</span>
                          {src ? (
                            <div>
                              <p className="text-sm font-semibold text-gray-900 truncate">{src.title || 'Untitled Resume'}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{langLabel(src.language)} · {sourceTypeLabel(src.source_type)}</p>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-gray-400 italic">
                              {selectedResume.source_resume_id ? 'Deleted version' : 'Original'}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Photo */}
                  <div className="flex items-center gap-5 py-1">
                    {(isEditingContent ? editDraft?.personal_info?.photo : selectedResume.personal_info?.photo) ? (
                      <img
                        src={isEditingContent ? editDraft?.personal_info?.photo : selectedResume.personal_info?.photo}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0">
                        <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700">Profile Photo</p>
                      <p className="text-[11px] text-gray-400">Used in PDF templates that support photos.</p>
                      {isEditingContent ? (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {editDraft?.personal_info?.photo ? 'Change Photo' : 'Upload Photo'}
                          </button>
                          {editDraft?.personal_info?.photo && (
                            <button
                              type="button"
                              onClick={() => setEditDraft(d => d ? { ...d, personal_info: { ...(d.personal_info ?? {}), photo: null } } : d)}
                              className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              Remove
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Summary</p>
                    {isEditingContent ? (
                      <textarea
                        className="w-full text-sm text-gray-700 leading-relaxed bg-white border border-gray-300 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
                        rows={4}
                        value={editDraft?.personal_info?.summary ?? ''}
                        onChange={e => setEditDraft(d => d ? { ...d, personal_info: { ...(d.personal_info ?? {}), summary: e.target.value } } : d)}
                        placeholder="Professional summary..."
                      />
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-2xl p-5">
                        {selectedResume.personal_info?.summary || 'No summary stored for this version.'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Experience
                    </p>
                    {isEditingContent ? (
                      <>
                        {(editDraft?.experience ?? []).map((exp: any, i: number) => (
                          <div key={i} className="p-4 border border-gray-200 rounded-2xl bg-white space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-gray-400">Entry {i + 1}</span>
                              <button type="button" onClick={() => removeExpEntry(i)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={exp.title ?? ''} onChange={e => updateExpField(i, 'title', e.target.value)} placeholder="Job title" className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                              <input value={exp.company ?? ''} onChange={e => updateExpField(i, 'company', e.target.value)} placeholder="Company" className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                              <input value={exp.start_date ?? ''} onChange={e => updateExpField(i, 'start_date', e.target.value)} placeholder="Start date" className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                              <input value={exp.end_date ?? ''} onChange={e => updateExpField(i, 'end_date', e.target.value)} placeholder="End date / Present" className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            </div>
                            <textarea value={exp.description ?? ''} onChange={e => updateExpField(i, 'description', e.target.value)} placeholder="Job description..." rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                          </div>
                        ))}
                        <button type="button" onClick={addExpEntry} className="w-full py-2.5 border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 rounded-2xl transition-all">+ Add Experience</button>
                      </>
                    ) : (
                      <>
                        {selectedResume.experience?.length ? selectedResume.experience.map((exp: any, i: number) => (
                          <div key={i} className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">{exp.title || 'Untitled role'}{exp.company ? ` @ ${exp.company}` : ''}</h4>
                            <p className="text-xs font-medium text-gray-500 mb-3">{exp.start_date || '—'} — {exp.end_date || 'Present'}</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{exp.description || 'No description.'}</p>
                          </div>
                        )) : <p className="text-sm text-gray-400 italic">No experience included in this version.</p>}
                      </>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Skills</p>
                    {isEditingContent ? (
                      <div className="space-y-1">
                        <textarea
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
                          rows={3}
                          value={(editDraft?.skills ?? []).map((s: any) => typeof s === 'string' ? s : s.name || '').join(', ')}
                          onChange={e => setEditDraft(d => d ? { ...d, skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } : d)}
                          placeholder="Skill 1, Skill 2, Skill 3..."
                        />
                        <p className="text-xs text-gray-400">Separate skills with commas</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedResume.skills?.length ? selectedResume.skills.map((skill: any, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 shadow-sm">
                            {typeof skill === 'string' ? skill : skill.name || 'Skill'}
                            {typeof skill === 'object' && skill.level ? <span className="text-gray-400 text-[10px] ml-1">{skill.level}</span> : null}
                          </span>
                        )) : <span className="text-sm text-gray-400 italic">No skills listed.</span>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Education</p>
                      {isEditingContent ? (
                        <div className="space-y-3">
                          {(editDraft?.education ?? []).map((edu: any, i: number) => (
                            <div key={i} className="p-3 bg-white border border-gray-200 rounded-2xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-400">Entry {i + 1}</span>
                                <button type="button" onClick={() => removeEduEntry(i)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
                              </div>
                              <input value={edu.degree ?? ''} onChange={e => updateEduField(i, 'degree', e.target.value)} placeholder="Degree / Qualification" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                              <input value={edu.institution ?? ''} onChange={e => updateEduField(i, 'institution', e.target.value)} placeholder="Institution" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            </div>
                          ))}
                          <button type="button" onClick={addEduEntry} className="w-full py-2 border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 rounded-2xl transition-all">+ Add Education</button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedResume.education?.length ? selectedResume.education.map((edu: any, i: number) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <p className="text-sm font-semibold text-gray-900">{edu.degree || 'Degree'}</p>
                              <p className="text-xs text-gray-500">{edu.institution || 'Institution'}</p>
                            </div>
                          )) : <p className="text-sm text-gray-400 italic">No education included.</p>}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Languages & Certifications</p>
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Languages</p>
                          {isEditingContent ? (
                            <textarea
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none bg-white"
                              rows={2}
                              value={(editDraft?.languages ?? []).map((l: any) => typeof l === 'string' ? l : l.name || l.language || '').join(', ')}
                              onChange={e => setEditDraft(d => d ? { ...d, languages: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } : d)}
                              placeholder="English, Spanish..."
                            />
                          ) : (
                            <p className="text-sm text-gray-700">
                              {selectedResume.languages?.length
                                ? selectedResume.languages.map((item: any) => typeof item === 'string' ? item : item.name || item.language).filter(Boolean).join(', ')
                                : 'No languages listed.'}
                            </p>
                          )}
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Certifications</p>
                          {isEditingContent ? (
                            <textarea
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none bg-white"
                              rows={2}
                              value={(editDraft?.certifications ?? []).map((c: any) => typeof c === 'string' ? c : c.name || c.title || '').join(', ')}
                              onChange={e => setEditDraft(d => d ? { ...d, certifications: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } : d)}
                              placeholder="AWS Certified, PMP..."
                            />
                          ) : (
                            <p className="text-sm text-gray-700">
                              {selectedResume.certifications?.length
                                ? selectedResume.certifications.map((item: any) => typeof item === 'string' ? item : item.name || item.title).filter(Boolean).join(', ')
                                : 'No certifications listed.'}
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

          {/* Open Jobs */}
          {activeJobs.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Open Jobs</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeJobs.map((job) => (
                    <div key={job.job_id || job.id} className="p-5 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all group">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{job.title}</h4>
                      <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {job.region || 'Remote'}
                      </p>
                      <button
                        onClick={() => setShowJobDescModal(true)}
                        className="w-full py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl group-hover:bg-indigo-100 transition-colors"
                      >
                        Create Resume for This Job
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.txt" />

      {/* Global loading overlay (only when no modal is open) */}
      {(isUploading || isWorking) && noModals && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="font-semibold text-sm text-gray-900">Working on your resume…</p>
          </div>
        </div>
      )}

      {/* Upload confirm bar */}
      {file && !isUploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-6 animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest block">File selected</span>
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px] block">{file.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
            <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
            <button onClick={handleUpload} className="px-5 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm">Create Version</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showProfileModal && (
        <CreateFromProfileModal onClose={() => setShowProfileModal(false)} onSubmit={handleCreateFromProfile} isWorking={isWorking} />
      )}
      {showDuplicateModal && (
        <DuplicateResumeModal onClose={() => setShowDuplicateModal(false)} onSubmit={handleDuplicate} isWorking={isWorking} resumeVersions={resumeVersions} />
      )}
      {showJobDescModal && (
        <CreateFromJobDescriptionModal onClose={() => setShowJobDescModal(false)} onSubmit={handleCreateFromJobDescription} isWorking={isWorking} activeJobs={activeJobs} resumeVersions={resumeVersions} />
      )}

      {/* PDF template picker modal */}
      {showPdfModal && selectedResume && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowPdfModal(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Export as PDF</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose a template for your resume</p>
                {!!selectedResume.personal_info?.photo && (
                  <button
                    type="button"
                    onClick={() => setPdfIncludePhoto(v => !v)}
                    className="mt-2 flex items-center gap-2 text-xs text-gray-600 select-none"
                  >
                    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${pdfIncludePhoto ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${pdfIncludePhoto ? 'translate-x-4' : 'translate-x-1'}`} />
                    </span>
                    Include photo
                  </button>
                )}
              </div>
              <button onClick={() => setShowPdfModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-3">
              {TEMPLATES.map(t => {
                const hasPhoto = !!selectedResume.personal_info?.photo;
                return (
                  <button
                    key={t.id}
                    disabled={isGeneratingPdf}
                    onClick={async () => {
                      setIsGeneratingPdf(true);
                      try {
                        await downloadResumePdf(
                          t.id as TemplateId,
                          selectedResume.resume_data ?? {},
                          selectedResume.title,
                          pdfIncludePhoto ? (selectedResume.personal_info?.photo ?? undefined) : undefined,
                        );
                        setShowPdfModal(false);
                      } finally {
                        setIsGeneratingPdf(false);
                      }
                    }}
                    className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-all text-left disabled:opacity-60 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-rose-700 transition-colors">{t.label}</p>
                        {hasPhoto && t.supportsPhoto && (
                          <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">photo</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                    </div>
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                      {isGeneratingPdf
                        ? <div className="w-3.5 h-3.5 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                        : <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      }
                    </div>
                  </button>
                );
              })}
              <p className="text-[11px] text-gray-400 text-center pt-1">The PDF will be downloaded to your device.</p>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && selectedResume && (() => {
        const publicUrl = `${window.location.origin}${window.location.pathname}?cv=${selectedResume.resume_id}`;
        return (
          <div
            className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setShowShareModal(false)}
            onKeyDown={e => { if (e.key === 'Escape') setShowShareModal(false); }}
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Share Resume</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{selectedResume.title || 'Untitled Resume'}</p>
                </div>
                <button onClick={() => setShowShareModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Public link */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Public Link</p>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-xs text-indigo-700 font-mono break-all">{publicUrl}</p>
                  </div>
                  <button
                    onClick={() => handleCopyLink(publicUrl)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {linkCopied ? (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy Link</>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-400">Anyone with this link can view your CV without logging in.</p>
                </div>

                {/* Email */}
                {(() => {
                  const info = selectedResume.personal_info ?? selectedResume.resume_data?.personal_info ?? {};
                  const senderName = [info.first_name, info.last_name].filter(Boolean).join(' ') || 'Your Name';
                  const recipientGreeting = shareEmailRecipientName.trim() || "Recipient's Name";
                  const emailBody = `Dear ${recipientGreeting},\n\nI hope this message finds you well.\n\nI would like to share my curriculum vitae with you for your consideration. You can access it using the link below:\n${publicUrl}\n\nPlease feel free to reach out if you require any additional information.\n\nThank you for your time and consideration.\n\nKind regards,\n${senderName}`;
                  const subject = `CV: ${selectedResume.title || 'My Resume'}`;
                  return (
                    <div className="space-y-3 border-t border-gray-100 pt-5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Share via Email</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">Recipient's name</label>
                          <input
                            type="text"
                            value={shareEmailRecipientName}
                            onChange={e => setShareEmailRecipientName(e.target.value)}
                            placeholder="e.g. John Smith"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">Recipient's email</label>
                          <input
                            type="email"
                            value={shareEmailTo}
                            onChange={e => setShareEmailTo(e.target.value)}
                            placeholder="email@example.com"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                        <p className="text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed">{emailBody}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`https://mail.google.com/mail/?view=cm${shareEmailTo ? `&to=${encodeURIComponent(shareEmailTo)}` : ''}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <path d="M22 6c0-1.1-.9-2-2-2H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 6l10 7 10-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Gmail
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const full = `Subject: ${subject}\n\n${emailBody}`;
                            navigator.clipboard.writeText(full).then(() => {
                              setLinkCopied(true);
                              setTimeout(() => setLinkCopied(false), 2000);
                            });
                          }}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                        >
                          {linkCopied ? (
                            <><svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-emerald-600">Copied!</span></>
                          ) : (
                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy email</>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">Gmail opens a compose window directly. "Copy email" copies the full text — paste it into Outlook, Yahoo, or any other client.</p>
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