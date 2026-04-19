import { useState, useEffect, useRef, useMemo } from 'react';
import { jobsApi, screeningApi } from '../../api';
import { useStore } from '../../store';
import { DICT } from '../../internationalization.ts';

const STAGES = [
  { value: 'Applied',        label: 'Applied' },
  { value: 'Shortlisted',    label: 'Shortlisted' },
  { value: 'HR Interview',   label: 'HR Interview' },
  { value: 'Tech Interview', label: 'Tech Interview' },
  { value: 'Offer',          label: 'Offer' },
];
const REJECTED_VALUE = 'Rejected';
const ALL_STAGE_VALUES = [...STAGES.map(s => s.value), REJECTED_VALUE];

function stageIcon(norm: string, size = 'w-4 h-4') {
  const p = { className: size, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8 } as any;
  switch (norm) {
    case 'APPLIED':        return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;
    case 'SHORTLISTED':    return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
    case 'HR_INTERVIEW':   return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>;
    case 'TECH_INTERVIEW': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
    case 'OFFER':          return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'REJECTED':       return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    default:               return null;
  }
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const LS_KEY = 'candidate_tracked_jobs';

interface TrackedJob {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

function loadTrackedJobs(): TrackedJob[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

function saveTrackedJobs(jobs: TrackedJob[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(jobs));
}

function makeId() {
  return 'local-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeStatus(s: string) {
  return s?.toUpperCase().replace(/ /g, '_') || '';
}

function getStageIndex(s: string) {
  const n = normalizeStatus(s);
  return STAGES.findIndex(st => normalizeStatus(st.value) === n);
}

export function JobApplicationTab() {
  const { activeTab, language } = useStore();
  const t: Record<string, string> = DICT[language as keyof typeof DICT]?.applications || DICT.en.applications;

  const [apiApplications, setApiApplications] = useState<any[]>([]);
  const [trackedJobs, setTrackedJobs]         = useState<TrackedJob[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [, setRefreshing]                     = useState(false);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [newJobTitle, setNewJobTitle]         = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [expandedId, setExpandedId]           = useState<string | null>(null);

  const [typeFilter, setTypeFilter]     = useState<'all' | 'hr' | 'self'>('all');
  const [stageFilter, setStageFilter]   = useState<string>('all');
  const [searchQuery, setSearchQuery]   = useState('');

  const firstLoad = useRef(true);

  const fetchApplications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [rawApps, allJobs] = await Promise.all([
        screeningApi.getMyApplications().catch(() => [] as any[]),
        jobsApi.list().catch(() => [] as any[]),
      ]);

      const appByJobId = new Map<string, any>();
      for (const app of rawApps as any[]) {
        appByJobId.set(app.job_id, app);
      }

      const merged = (allJobs as any[]).map((job: any) => {
        const jobId = job.id || job.job_id;
        const app = appByJobId.get(jobId);
        if (app) {
          return {
            ...app,
            job_title:       app.job_title  || job.title,
            job_region:      app.job_region || job.region,
            job_description: job.description ?? null,
          };
        }

        return {
          application_id: null,
          job_id: jobId,
          job_title: job.title,
          job_region: job.region,
          job_description: job.description ?? null,
          status: 'Not Applied',
          created_at: null,
          screening: null,
          _notApplied: true,
        };
      });

      setApiApplications(merged);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications(false);
    setTrackedJobs(loadTrackedJobs());
  }, []);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (activeTab === 'applications') {
      fetchApplications(true);
      setTrackedJobs(loadTrackedJobs());
    }
  }, [activeTab]);

  const handleAddTrackedJob = () => {
    if (!newJobTitle.trim()) return;
    setSubmitting(true);
    const job: TrackedJob = {
      id: makeId(),
      title: newJobTitle.trim(),
      description: newJobDescription.trim(),
      status: 'Applied',
      created_at: new Date().toISOString(),
    };
    const updated = [job, ...trackedJobs];
    saveTrackedJobs(updated);
    setTrackedJobs(updated);
    setShowAddModal(false);
    setNewJobTitle('');
    setNewJobDescription('');
    setSubmitting(false);
  };

  const handleTrackedStageUpdate = (id: string, newStatus: string) => {
    const updated = trackedJobs.map(j => j.id === id ? { ...j, status: newStatus } : j);
    saveTrackedJobs(updated);
    setTrackedJobs(updated);
  };

  const handleDeleteTracked = (id: string) => {
    const updated = trackedJobs.filter(j => j.id !== id);
    saveTrackedJobs(updated);
    setTrackedJobs(updated);
  };

  const matchesStageFilter = (jobStatus: string) => {
    if (stageFilter === 'all') return true;
    const filterNorm = normalizeStatus(stageFilter);
    const jobNorm    = normalizeStatus(jobStatus);
    if (filterNorm === 'REJECTED') return jobNorm === 'REJECTED';
    if (jobNorm    === 'REJECTED') return false;
    return getStageIndex(jobStatus) >= getStageIndex(stageFilter);
  };

  const filteredApi = useMemo(() => {
    return apiApplications.filter(app => {
      if (typeFilter === 'self') return false;
      const title = (app.job_title || app.job_id || '').toLowerCase();
      if (searchQuery && !title.includes(searchQuery.toLowerCase())) return false;
      if (stageFilter !== 'all') {
        if (app._notApplied) return false;
        if (!matchesStageFilter(app.status)) return false;
      }
      return true;
    });
  }, [apiApplications, typeFilter, searchQuery, stageFilter]);

  const filteredTracked = useMemo(() => {
    return trackedJobs.filter(job => {
      if (typeFilter === 'hr') return false;
      if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (!matchesStageFilter(job.status)) return false;
      return true;
    });
  }, [trackedJobs, typeFilter, searchQuery, stageFilter]);

  const hrCount      = apiApplications.length;
  const selfCount    = trackedJobs.length;
  const totalCount   = hrCount + selfCount;
  const visibleCount = filteredApi.length + filteredTracked.length;
  const hasResults   = visibleCount > 0;
  const isFiltering  = searchQuery || stageFilter !== 'all';

  const renderHrPipeline = (app: any) => {
    if (app._notApplied) {
      return (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-neutral-400 font-medium bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 transition-colors">
          <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          {t.notAppliedWarning}
        </div>
      );
    }

    const norm = normalizeStatus(app.status);
    const idx  = getStageIndex(app.status);
    const isRejected = norm === 'REJECTED';
    const isOffer    = norm === 'OFFER';

    if (isRejected) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500 font-medium transition-colors">
          <svg className="w-4 h-4 text-red-400 dark:text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.75L13.75 4a2 2 0 00-3.5 0L3.25 16.25A2 2 0 005.07 19z" />
          </svg>
          {t.rejectedWarning}
        </div>
      );
    }

    return (
      <div className="px-1 pt-2 pb-8 relative">
        <div className="flex justify-between items-center relative max-w-xl">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-neutral-800 -translate-y-1/2 z-0 rounded-full" />
          <div
            className={`absolute top-1/2 left-0 h-1 ${isOffer ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-indigo-500 dark:bg-white'} -translate-y-1/2 z-0 transition-all duration-700 rounded-full`}
            style={{ width: `${Math.min(100, Math.max(0, (idx / (STAGES.length - 1)) * 100))}%` }}
          />
          {STAGES.map((stage, i) => {
            const isActive  = i <= idx;
            const isCurrent = i === idx;
            let dot = 'bg-white dark:bg-black border-gray-300 dark:border-neutral-700';
            if (isCurrent) dot = isOffer ? 'bg-white dark:bg-black border-emerald-500 dark:border-emerald-600 shadow-sm' : 'bg-white dark:bg-black border-indigo-500 dark:border-white shadow-sm';
            else if (isActive) dot = isOffer ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600' : 'bg-indigo-500 dark:bg-white border-indigo-500 dark:border-white';
            return (
              <div key={stage.value} className="relative z-10 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${dot}`}>
                  {isActive && !isCurrent
                    ? <svg className="w-3.5 h-3.5 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    : <span className={`text-[10px] font-bold ${isCurrent ? (isOffer ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-white') : 'text-gray-400 dark:text-neutral-500'}`}>{i + 1}</span>
                  }
                </div>
                <span className={`absolute -bottom-6 text-[9px] font-bold uppercase whitespace-nowrap tracking-wider ${isCurrent ? (isOffer ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white') : 'text-gray-400 dark:text-neutral-500'}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSelfTrackedStages = (job: TrackedJob) => {
    const norm       = normalizeStatus(job.status);
    const currentIdx = getStageIndex(job.status);
    const isRejected = norm === 'REJECTED';

    const handleClick = (stageValue: string) => {
      handleTrackedStageUpdate(job.id, stageValue);
    };

    return (
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
          {t.clickToMark}
        </p>

        <div className="flex items-stretch gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {STAGES.map((stage, idx) => {
            const sNorm     = normalizeStatus(stage.value);
            const isCurrent = !isRejected && idx === currentIdx;
            const isPast    = !isRejected && idx < currentIdx;
            const isDone    = isCurrent || isPast;

            return (
              <button
                key={stage.value}
                onClick={() => handleClick(stage.value)}
                className={`
                  flex flex-col items-center justify-between gap-2 px-3 py-4 rounded-xl border-2
                  min-w-[96px] flex-1 transition-all duration-150 select-none cursor-pointer
                  active:scale-95
                  ${isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 text-gray-400 dark:text-neutral-500 hover:border-gray-400 dark:hover:border-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }
                  ${isCurrent ? 'ring-2 ring-offset-1 ring-emerald-400 dark:ring-offset-black shadow-sm' : ''}
                `}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                  ${isDone ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-gray-100 dark:bg-neutral-800'}`}
                >
                  {isPast ? <CheckIcon /> : stageIcon(sNorm)}
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wide text-center leading-tight whitespace-nowrap">
                  {stage.label}
                </span>

                <span className={`text-[9px] font-black uppercase tracking-widest leading-none transition-opacity
                  ${isCurrent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  ● {t.now}
                </span>
              </button>
            );
          })}

          <div className="w-px bg-gray-200 dark:bg-neutral-800 mx-0.5 self-stretch shrink-0" />

          <button
            onClick={() => {
              if (isRejected) handleTrackedStageUpdate(job.id, 'Applied');
              else handleTrackedStageUpdate(job.id, REJECTED_VALUE);
            }}
            className={`
              flex flex-col items-center justify-between gap-2 px-3 py-4 rounded-xl border-2
              min-w-[88px] transition-all duration-150 select-none cursor-pointer active:scale-95
              ${isRejected
                ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 shadow-sm ring-2 ring-offset-1 ring-red-400 dark:ring-offset-black'
                : 'bg-white dark:bg-neutral-900 border-red-200 dark:border-red-900/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400'
              }
            `}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              ${isRejected ? 'bg-red-100 dark:bg-red-900/50' : 'bg-red-50 dark:bg-red-950/20'}`}
            >
              {stageIcon('REJECTED')}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">{t.rejected}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest leading-none transition-opacity
              ${isRejected ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              ● {t.now}
            </span>
          </button>
        </div>

        {isRejected && (
          <p className="mt-2 text-xs text-gray-400 dark:text-neutral-500">
            {t.reactivateText}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl max-w-2xl mx-auto mt-10 transition-colors">
        <div className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t.loading}</h3>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-5 animate-in fade-in duration-300 pb-20">

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {hrCount === 0 && selfCount === 0
              ? t.noJobs
              : t.stats.replace('{hr}', String(hrCount)).replace('{applied}', String(apiApplications.filter((a: any) => !a._notApplied).length)).replace('{self}', String(selfCount))}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.newApp}
        </button>
      </div>

      {(typeFilter === 'self' || (typeFilter === 'all' && selfCount > 0)) && (
        <div className="flex items-start gap-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-2xl px-4 py-3 transition-colors">
          <svg className="w-4 h-4 text-violet-500 dark:text-violet-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          <p className="text-xs text-violet-700 dark:text-violet-300 font-medium leading-relaxed">
            <span className="font-bold">{t.selfTrackedNotice1}</span>{t.selfTrackedNotice2}
          </p>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100 dark:border-neutral-800 transition-colors">
        {([
          { key: 'all',  label: t.filterAll,  count: totalCount },
          { key: 'hr',   label: t.filterHr,   count: hrCount },
          { key: 'self', label: t.filterSelf, count: selfCount },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              typeFilter === f.key
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300'
            }`}
          >
            {f.label}
            <span className="text-[10px] font-bold bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-full transition-colors">
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {totalCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className={`appearance-none pl-3 pr-8 py-2 text-sm font-medium border rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none cursor-pointer transition-all ${
                stageFilter !== 'all'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white'
                  : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-white border-gray-200 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500'
              }`}
            >
              <option value="all">{t.allStages}</option>
              {ALL_STAGE_VALUES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <svg className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${stageFilter !== 'all' ? 'text-white dark:text-black' : 'text-gray-400 dark:text-neutral-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {isFiltering && (
            <button
              onClick={() => { setSearchQuery(''); setStageFilter('all'); }}
              className="text-xs font-semibold text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      )}

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl transition-colors">
          <svg className="w-12 h-12 text-gray-300 dark:text-neutral-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t.emptyTitle}</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm">
            {t.emptyDesc1}<span className="font-semibold">{t.emptyDesc2}</span>{t.emptyDesc3}
          </p>
        </div>
      ) : !hasResults ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl transition-colors">
          <svg className="w-10 h-10 text-gray-300 dark:text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t.noMatchesTitle}</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{t.noMatchesDesc}</p>
          <button
            onClick={() => { setSearchQuery(''); setStageFilter('all'); }}
            className="mt-3 text-xs font-semibold text-gray-700 dark:text-neutral-300 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t.clearFilters}
          </button>
        </div>
      ) : (

        <div className="grid grid-cols-1 gap-4">

          {filteredApi.map(app => {
            const norm = normalizeStatus(app.status);
            const isRejected = norm === 'REJECTED';
            const isOffer    = norm === 'OFFER';
            const notApplied = app._notApplied === true;
            return (
              <div
                key={app.job_id}
                className={`bg-white dark:bg-neutral-900 border rounded-2xl shadow-sm overflow-hidden transition-colors ${
                  notApplied ? 'border-gray-200 dark:border-neutral-800 opacity-80'
                  : isRejected ? 'border-red-200 dark:border-red-900/50'
                  : isOffer ? 'border-emerald-200 dark:border-emerald-900/50'
                  : 'border-gray-200 dark:border-neutral-800'
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-4 mb-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{app.job_title || app.job_id}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 shrink-0 transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {t.hrManaged}
                        </span>
                        {notApplied && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700 shrink-0 transition-colors">
                            {t.notApplied}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-neutral-500 font-medium transition-colors">
                        {app.job_region && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {app.job_region}
                          </span>
                        )}
                        {!notApplied && app.created_at && (
                          <span>{t.appliedOn} {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                        {app.screening?.score != null && (
                          <span className="text-gray-600 dark:text-neutral-400 font-semibold">{t.match}: {app.screening.score}%</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isOffer && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {t.offerReceived}
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {t.rejected}
                        </span>
                      )}
                    </div>
                  </div>
                  {app.job_description && (
                    <div className="mb-4">
                      <p className={`text-sm text-gray-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap transition-colors ${expandedId === app.job_id ? '' : 'line-clamp-2'}`}>
                        {app.job_description}
                      </p>
                      <button
                        onClick={() => setExpandedId(expandedId === app.job_id ? null : app.job_id)}
                        className="mt-1 text-xs font-bold text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-neutral-300 transition-colors"
                      >
                        {expandedId === app.job_id ? t.showLess : t.viewDetails}
                      </button>
                    </div>
                  )}
                  {renderHrPipeline(app)}
                </div>
              </div>
            );
          })}

          {filteredTracked.map(job => {
            const norm = normalizeStatus(job.status);
            const isOffer    = norm === 'OFFER';
            const isRejected = norm === 'REJECTED';
            return (
              <div
                key={job.id}
                className={`bg-white dark:bg-neutral-900 border rounded-2xl shadow-sm overflow-hidden transition-colors ${
                  isRejected ? 'border-red-200 dark:border-red-900/50' : isOffer ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-violet-100 dark:border-violet-900/30'
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-4 mb-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{job.title}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-900/50 shrink-0 transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {t.selfTracked}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-neutral-500 font-medium transition-colors">
                        {t.added} {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {job.description && (
                        <div className="mt-2">
                          <p className={`text-sm text-gray-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap transition-colors ${expandedId === job.id ? '' : 'line-clamp-2'}`}>
                            {job.description}
                          </p>
                          <button
                            onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                            className="mt-1 text-xs font-bold text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-neutral-300 transition-colors"
                          >
                            {expandedId === job.id ? t.showLess : t.viewDetails}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOffer && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 transition-colors">
                          {t.offerReceived}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteTracked(job.id)}
                        title={t.removeFromTracker}
                        className="p-1.5 text-gray-300 dark:text-neutral-600 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {renderSelfTrackedStages(job)}
                </div>
              </div>
            );
          })}

        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 flex justify-between items-center shrink-0 transition-colors">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.modalTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium mt-0.5">
                  {t.modalSubtitle}
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setNewJobTitle(''); setNewJobDescription(''); }}
                className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5">
                  {t.jobTitle} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newJobTitle.trim()) handleAddTrackedJob(); }}
                  placeholder={t.jobTitlePlaceholder}
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none transition-colors placeholder-gray-400 dark:placeholder-neutral-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5">
                  {t.notes} <span className="text-gray-400 dark:text-neutral-500 font-normal">{t.optional}</span>
                </label>
                <textarea
                  value={newJobDescription}
                  onChange={e => setNewJobDescription(e.target.value)}
                  placeholder={t.notesPlaceholder}
                  rows={4}
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none resize-none transition-colors placeholder-gray-400 dark:placeholder-neutral-600"
                />
              </div>

              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl px-3 py-2.5 transition-colors">
                <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  {t.modalNotice}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); setNewJobTitle(''); setNewJobDescription(''); }}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddTrackedJob}
                disabled={!newJobTitle.trim() || submitting}
                className="flex-1 py-2.5 text-sm font-semibold text-white dark:text-black bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.addAppBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}