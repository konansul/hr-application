import { useState, useEffect, useMemo, useRef } from 'react';
import { screeningApi, jobsApi } from '../api';
import { useStore } from '../store';

const STAGES = [
  { value: 'Applied',        label: 'Applied' },
  { value: 'Shortlisted',    label: 'Shortlisted' },
  { value: 'HR Interview',   label: 'HR Interview' },
  { value: 'Tech Interview', label: 'Tech Interview' },
  { value: 'Offer',          label: 'Offer' },
];
const REJECTED_VALUE = 'Rejected';
const ALL_STAGE_VALUES = [...STAGES.map(s => s.value), REJECTED_VALUE];

// Matches the colour palette from the HR Kanban board
const STAGE_ACCENT: Record<string, { bg: string; border: string; text: string; iconBg: string; bar: string }> = {
  APPLIED:        { bg: 'bg-gray-100',    border: 'border-gray-300',   text: 'text-gray-600',    iconBg: 'bg-gray-200',    bar: 'bg-gray-400' },
  SHORTLISTED:    { bg: 'bg-blue-50',     border: 'border-blue-300',   text: 'text-blue-700',    iconBg: 'bg-blue-100',    bar: 'bg-blue-500' },
  HR_INTERVIEW:   { bg: 'bg-purple-50',   border: 'border-purple-300', text: 'text-purple-700',  iconBg: 'bg-purple-100',  bar: 'bg-purple-500' },
  TECH_INTERVIEW: { bg: 'bg-indigo-50',   border: 'border-indigo-300', text: 'text-indigo-700',  iconBg: 'bg-indigo-100',  bar: 'bg-indigo-500' },
  OFFER:          { bg: 'bg-emerald-50',  border: 'border-emerald-300',text: 'text-emerald-700', iconBg: 'bg-emerald-100', bar: 'bg-emerald-500' },
  REJECTED:       { bg: 'bg-red-50',      border: 'border-red-300',    text: 'text-red-600',     iconBg: 'bg-red-100',     bar: 'bg-red-500' },
};

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
  const { activeTab } = useStore();

  const [apiApplications, setApiApplications] = useState<any[]>([]);
  const [trackedJobs, setTrackedJobs]         = useState<TrackedJob[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [, setRefreshing]                     = useState(false);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [newJobTitle, setNewJobTitle]         = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [submitting, setSubmitting]           = useState(false);

  // filters
  const [typeFilter, setTypeFilter]     = useState<'all' | 'hr' | 'self'>('all');
  const [stageFilter, setStageFilter]   = useState<string>('all');
  const [searchQuery, setSearchQuery]   = useState('');

  const firstLoad = useRef(true);

  const fetchApplications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Fetch all HR-published jobs and the user's applications in parallel
      const [rawApps, allJobs] = await Promise.all([
        screeningApi.getMyApplications().catch(() => [] as any[]),
        jobsApi.list().catch(() => [] as any[]),
      ]);

      // Build a map of job_id → application record
      const appByJobId = new Map<string, any>();
      for (const app of rawApps as any[]) {
        appByJobId.set(app.job_id, app);
      }

      // Every HR job shows up in this tab; enrich with application status if it exists
      const merged = (allJobs as any[]).map((job: any) => {
        const jobId = job.id || job.job_id;
        const app = appByJobId.get(jobId);
        if (app) {
          return {
            ...app,
            job_title:  app.job_title  || job.title,
            job_region: app.job_region || job.region,
          };
        }
        // No application record yet — show as "Not Applied"
        return {
          application_id: null,
          job_id: jobId,
          job_title: job.title,
          job_region: job.region,
          status: 'Not Applied',
          created_at: null,
          screening: null,
          _notApplied: true,
        };
      });

      setApiApplications(merged);
    } catch {
      // keep whatever was loaded before on a refresh failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchApplications(false);
    setTrackedJobs(loadTrackedJobs());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch every time the user navigates to this tab (skips the very first mount)
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (activeTab === 'applications') {
      fetchApplications(true);
      setTrackedJobs(loadTrackedJobs());
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Self-tracked handlers ─────────────────────────────────────────────────

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

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredApi = useMemo(() => {
    return apiApplications.filter(app => {
      if (typeFilter === 'self') return false;
      const title = (app.job_title || app.job_id || '').toLowerCase();
      if (searchQuery && !title.includes(searchQuery.toLowerCase())) return false;
      // 'Not Applied' jobs only show when no specific stage filter is active
      if (stageFilter !== 'all') {
        if (app._notApplied) return false;
        if (normalizeStatus(app.status) !== normalizeStatus(stageFilter)) return false;
      }
      return true;
    });
  }, [apiApplications, typeFilter, searchQuery, stageFilter]);

  const filteredTracked = useMemo(() => {
    return trackedJobs.filter(job => {
      if (typeFilter === 'hr') return false;
      if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (stageFilter !== 'all' && normalizeStatus(job.status) !== normalizeStatus(stageFilter)) return false;
      return true;
    });
  }, [trackedJobs, typeFilter, searchQuery, stageFilter]);

  const hrCount      = apiApplications.length;
  const selfCount    = trackedJobs.length;
  const totalCount   = hrCount + selfCount;
  const visibleCount = filteredApi.length + filteredTracked.length;
  const hasResults   = visibleCount > 0;
  const isFiltering  = searchQuery || stageFilter !== 'all';

  // ── Pipeline render (HR — read-only) ─────────────────────────────────────

  const renderHrPipeline = (app: any) => {
    if (app._notApplied) {
      return (
        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          You haven't applied to this position yet — go to <span className="font-bold text-gray-700 mx-1">Explore Jobs</span> to apply.
        </div>
      );
    }

    const norm = normalizeStatus(app.status);
    const idx  = getStageIndex(app.status);
    const isRejected = norm === 'REJECTED';
    const isOffer    = norm === 'OFFER';

    if (isRejected) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.75L13.75 4a2 2 0 00-3.5 0L3.25 16.25A2 2 0 005.07 19z" />
          </svg>
          Not moved forward this time — keep applying!
        </div>
      );
    }

    return (
      <div className="px-1 pt-2 pb-8 relative">
        <div className="flex justify-between items-center relative max-w-xl">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full" />
          <div
            className={`absolute top-1/2 left-0 h-1 ${isOffer ? 'bg-emerald-500' : 'bg-indigo-500'} -translate-y-1/2 z-0 transition-all duration-700 rounded-full`}
            style={{ width: `${Math.min(100, Math.max(0, (idx / (STAGES.length - 1)) * 100))}%` }}
          />
          {STAGES.map((stage, i) => {
            const isActive  = i <= idx;
            const isCurrent = i === idx;
            let dot = 'bg-white border-gray-300';
            if (isCurrent) dot = isOffer ? 'bg-white border-emerald-500 shadow-sm' : 'bg-white border-indigo-500 shadow-sm';
            else if (isActive) dot = isOffer ? 'bg-emerald-500 border-emerald-500' : 'bg-indigo-500 border-indigo-500';
            return (
              <div key={stage.value} className="relative z-10 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${dot}`}>
                  {isActive && !isCurrent
                    ? <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    : <span className={`text-[10px] font-bold ${isCurrent ? (isOffer ? 'text-emerald-600' : 'text-indigo-600') : 'text-gray-400'}`}>{i + 1}</span>
                  }
                </div>
                <span className={`absolute -bottom-6 text-[9px] font-bold uppercase whitespace-nowrap tracking-wider ${isCurrent ? (isOffer ? 'text-emerald-700' : 'text-gray-900') : 'text-gray-400'}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Kanban-style interactive pipeline (self-tracked) ─────────────────────

  const renderSelfTrackedStages = (job: TrackedJob) => {
    const norm       = normalizeStatus(job.status);
    const currentIdx = getStageIndex(job.status);
    const isRejected = norm === 'REJECTED';

    const handleClick = (idx: number, stageValue: string) => {
      const isCurrent = !isRejected && idx === currentIdx;
      if (isCurrent) {
        if (idx < STAGES.length - 1) {
          handleTrackedStageUpdate(job.id, STAGES[idx + 1].value);
        }
      } else {
        handleTrackedStageUpdate(job.id, stageValue);
      }
    };

    return (
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          Click a stage to update your progress
        </p>

        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {STAGES.map((stage, idx) => {
            const sNorm     = normalizeStatus(stage.value);
            const accent    = STAGE_ACCENT[sNorm];
            const isCurrent = !isRejected && idx === currentIdx;
            const isPast    = !isRejected && idx < currentIdx;

            return (
              <button
                key={stage.value}
                onClick={() => handleClick(idx, stage.value)}
                title={isCurrent ? `Current stage — click to advance to ${STAGES[idx + 1]?.label ?? 'Offer'}` : `Move to ${stage.label}`}
                className={`
                  flex flex-col items-center justify-between gap-2 px-3 py-4 rounded-xl border-2
                  min-w-[96px] flex-1 transition-all duration-150 select-none cursor-pointer
                  active:scale-95
                  ${isCurrent
                    ? `${accent.bg} ${accent.border} ${accent.text} shadow-sm ring-2 ring-offset-1 ring-current`
                    : isPast
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                  ${isCurrent ? accent.iconBg : isPast ? 'bg-emerald-100' : 'bg-gray-100'}`}
                >
                  {isPast ? <CheckIcon /> : stageIcon(sNorm)}
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wide text-center leading-tight whitespace-nowrap">
                  {stage.label}
                </span>

                <span className={`text-[9px] font-black uppercase tracking-widest leading-none transition-opacity
                  ${isCurrent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  ● Now
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px bg-gray-200 mx-0.5 self-stretch shrink-0" />

          {/* Rejected tile */}
          <button
            onClick={() => {
              if (isRejected) {
                handleTrackedStageUpdate(job.id, 'Applied');
              } else {
                handleTrackedStageUpdate(job.id, REJECTED_VALUE);
              }
            }}
            title={isRejected ? 'Click to re-activate at Applied' : 'Mark as Rejected'}
            className={`
              flex flex-col items-center justify-between gap-2 px-3 py-4 rounded-xl border-2
              min-w-[88px] transition-all duration-150 select-none cursor-pointer active:scale-95
              ${isRejected
                ? 'bg-red-50 border-red-300 text-red-600 shadow-sm ring-2 ring-offset-1 ring-red-400'
                : 'bg-white border-red-200 text-red-400 hover:bg-red-50 hover:border-red-400 hover:text-red-600'
              }
            `}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              ${isRejected ? 'bg-red-100' : 'bg-red-50'}`}
            >
              {stageIcon('REJECTED')}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">Rejected</span>
            <span className={`text-[9px] font-black uppercase tracking-widest leading-none transition-opacity
              ${isRejected ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              ● Now
            </span>
          </button>
        </div>

        {isRejected && (
          <p className="mt-2 text-xs text-gray-400">
            Click "Rejected" again to re-activate at Applied, or click any other stage.
          </p>
        )}
      </div>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 border border-gray-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Loading Applications...</h3>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-none mx-auto space-y-5 animate-in fade-in duration-300 pb-20">

      {/* ── Header ── */}
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Job Applications</h2>
          <p className="text-sm text-gray-500">
            {hrCount === 0 && selfCount === 0
              ? 'No jobs found. Explore Jobs to see what\'s available.'
              : `${hrCount} HR job${hrCount !== 1 ? 's' : ''} · ${apiApplications.filter((a: any) => !a._notApplied).length} applied · ${selfCount} self-tracked.`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Application
        </button>
      </div>

      {/* ── Self-tracked explainer ── */}
      {(typeFilter === 'self' || (typeFilter === 'all' && selfCount > 0)) && (
        <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
          <svg className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          <p className="text-xs text-violet-700 font-medium leading-relaxed">
            <span className="font-bold">Self-tracked applications</span> are jobs you added yourself (e.g. external openings).
            Click any stage button on a card to update your progress — only you control these stages.
          </p>
        </div>
      )}

      {/* ── Type filter tabs ── */}
      <div className="flex gap-1 border-b border-gray-100">
        {([
          { key: 'all',  label: 'All',          count: totalCount },
          { key: 'hr',   label: 'HR-Managed',   count: hrCount },
          { key: 'self', label: 'Self-Tracked',  count: selfCount },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              typeFilter === f.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {f.label}
            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search + Stage filter bar ── */}
      {totalCount > 0 && (
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by job title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
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
              className={`appearance-none pl-3 pr-8 py-2 text-sm font-medium border rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none cursor-pointer transition-all ${
                stageFilter !== 'all'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              <option value="all">All Stages</option>
              {ALL_STAGE_VALUES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <svg className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${stageFilter !== 'all' ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {isFiltering && (
            <button
              onClick={() => { setSearchQuery(''); setStageFilter('all'); }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Empty states ── */}
      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 border border-gray-100 rounded-2xl">
          <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No applications yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Apply to a job from the "Explore Jobs" tab, or click <span className="font-semibold">New Application</span> to track an external opportunity yourself.
          </p>
        </div>
      ) : !hasResults ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 border border-gray-100 rounded-2xl">
          <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <h3 className="text-base font-medium text-gray-900 mb-1">No matches found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or stage filter.</p>
          <button
            onClick={() => { setSearchQuery(''); setStageFilter('all'); }}
            className="mt-3 text-xs font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            Clear filters
          </button>
        </div>
      ) : (

        <div className="grid grid-cols-1 gap-4">

          {/* ── HR-Managed cards ── */}
          {filteredApi.map(app => {
            const norm = normalizeStatus(app.status);
            const isRejected = norm === 'REJECTED';
            const isOffer    = norm === 'OFFER';
            const notApplied = app._notApplied === true;
            return (
              <div
                key={app.job_id}
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${
                  notApplied ? 'border-gray-200 opacity-80'
                  : isRejected ? 'border-red-200'
                  : isOffer ? 'border-emerald-200'
                  : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-4 mb-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{app.job_title || app.job_id}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          HR-Managed
                        </span>
                        {notApplied && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
                            Not Applied
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-medium">
                        {app.job_region && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {app.job_region}
                          </span>
                        )}
                        {!notApplied && app.created_at && (
                          <span>Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                        {app.screening?.score != null && (
                          <span className="text-gray-600 font-semibold">Match: {app.screening.score}%</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isOffer && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Offer Received!
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                  {renderHrPipeline(app)}
                </div>
              </div>
            );
          })}

          {/* ── Self-Tracked cards ── */}
          {filteredTracked.map(job => {
            const norm = normalizeStatus(job.status);
            const isOffer    = norm === 'OFFER';
            const isRejected = norm === 'REJECTED';
            return (
              <div
                key={job.id}
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${
                  isRejected ? 'border-red-200' : isOffer ? 'border-emerald-200' : 'border-violet-100'
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-4 mb-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{job.title}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Self-Tracked
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-medium">
                        Added {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOffer && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Offer!</span>
                      )}
                      <button
                        onClick={() => handleDeleteTracked(job.id)}
                        title="Remove from tracker"
                        className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* ── New Application Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">New Application</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Add an external job you're applying to — you control the stages.
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setNewJobTitle(''); setNewJobDescription(''); }}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newJobTitle.trim()) handleAddTrackedJob(); }}
                  placeholder="e.g. Senior Product Manager at Acme"
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newJobDescription}
                  onChange={e => setNewJobDescription(e.target.value)}
                  placeholder="Paste the job description or add notes..."
                  rows={4}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
                </svg>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Self-tracked jobs are saved locally in your browser. You control all stage updates — HR cannot see these entries.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); setNewJobTitle(''); setNewJobDescription(''); }}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTrackedJob}
                disabled={!newJobTitle.trim() || submitting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Application
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
