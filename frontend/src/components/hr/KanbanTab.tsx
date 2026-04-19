import { useState, useEffect, type DragEvent } from 'react';
import { screeningApi, jobsApi } from '../../api';
import { useStore } from '../../store';
import { DICT } from '../../internationalization.ts';

interface CandidateCard {
  id: string;
  filename: string;
  score: number;
  status: string;
  summary?: string;
  decision?: string;
  matched_skills?: string[];
}

export function KanbanTab() {
  const {
    globalJobId,
    activeTab,
    globalJobStages,
    setGlobalJobStages,
    setGlobalJobId,
    setGlobalJobTitle,
    language
  } = useStore();

  const t = DICT[language as keyof typeof DICT]?.kanban || DICT.en.kanban;

  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [jobsList, setJobsList] = useState<{id: string, title: string}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [filterDecision, setFilterDecision] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (activeTab !== 'kanban') return;
    const fetchJobsList = async () => {
      try {
        const jobs = await jobsApi.list();
        setJobsList(jobs.map((j: any) => ({ id: j.id, title: j.title })));
      } catch (err) {
        console.error("Failed to load jobs list", err);
      }
    };
    fetchJobsList();
  }, [activeTab]);

  useEffect(() => {
    if (!globalJobId || activeTab !== 'kanban') {
      if (!globalJobId) setCandidates([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const jobData = await jobsApi.getById(globalJobId);
        if (jobData.pipeline_stages && jobData.pipeline_stages.length > 0) {
          setGlobalJobStages(jobData.pipeline_stages);
        } else {
          setGlobalJobStages(["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"]);
        }

        const results = await screeningApi.getApplicationsByJob(globalJobId);
        const mapped = results.map((res: any) => {
          const rawStatus = (res.status || 'APPLIED').toUpperCase().replace(/\s+/g, '_');
          return {
            id: String(res.application_id || res.result_id),
            filename: res.person ? `${res.person.first_name} ${res.person.last_name}` : (res.filename || 'Unknown Candidate'),
            score: res.screening?.score || res.score || 0,
            status: rawStatus,
            summary: res.screening?.full_result?.summary || res.summary || '',
            decision: res.screening?.decision || res.decision || 'maybe',
            matched_skills: res.screening?.full_result?.matched_skills || res.matched_skills || []
          };
        });
        setCandidates(mapped);
      } catch (error) {
        setCandidates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [globalJobId, activeTab, setGlobalJobStages]);

  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedJob = jobsList.find(j => j.id === selectedId);
    if (selectedJob) {
      setGlobalJobId(selectedId);
      setGlobalJobTitle(selectedJob.title);
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLDivElement;
    setTimeout(() => target.classList.add('opacity-40', 'scale-95'), 0);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-40', 'scale-95');
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;

    const candidate = candidates.find(c => c.id === draggedId);
    if (!candidate || candidate.status === targetStatus) return;

    const originalStatus = candidate.status;
    setCandidates(prev =>
      prev.map(c => (c.id === draggedId ? { ...c, status: targetStatus } : c))
    );

    try {
      setIsSyncing(true);
      await screeningApi.updateStatus(draggedId, targetStatus);
    } catch (err) {
      setCandidates(prev =>
        prev.map(c => (c.id === draggedId ? { ...c, status: originalStatus } : c))
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const getColumnAccent = (status: string, index: number) => {
    const s = status.toUpperCase();
    if (s.includes('APPL')) return { text: 'text-gray-500', dot: 'bg-gray-400', badge: 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 border-gray-200 dark:border-neutral-700' };
    if (s.includes('REJECT') || s.includes('FAIL')) return { text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', badge: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50' };
    if (s.includes('OFFER') || s.includes('HIRE') || s.includes('ACCEPT')) return { text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' };

    const palettes = [
      { text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', badge: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50' },
      { text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500', badge: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50' },
      { text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500', badge: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50' },
    ];
    return palettes[index % palettes.length];
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400';
    if (score >= 50) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400';
    return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400';
  };

  const getDecisionBadge = (decision?: string) => {
    const d = decision?.toLowerCase();
    if (d === 'hire' || d === 'strong_yes' || d === 'yes') return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400';
    if (d === 'reject' || d === 'no') return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400';
    return 'bg-gray-100 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-400';
  };

  const filteredCandidates = candidates.filter(c => {
    if (filterDecision !== 'All') {
      const isYes = c.decision?.toLowerCase() === 'hire' || c.decision?.toLowerCase() === 'yes' || c.decision?.toLowerCase() === 'strong_yes';
      const isNo = c.decision?.toLowerCase() === 'reject' || c.decision?.toLowerCase() === 'no';
      if (filterDecision === 'Yes' && !isYes) return false;
      if (filterDecision === 'No' && !isNo) return false;
      if (filterDecision === 'Maybe' && (isYes || isNo)) return false;
    }
    if (searchQuery && !c.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const safeCandidates = filteredCandidates.map(c =>
    globalJobStages.includes(c.status) ? c : { ...c, status: globalJobStages[0] || 'APPLIED' }
  );

  if (!globalJobId && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl max-w-2xl mx-auto mt-10 transition-colors">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-1">{t.noJobSelected}</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-6">{t.noJobDesc}</p>

        <select
          onChange={handleJobChange}
          value={globalJobId || ''}
          className="w-full max-w-xs px-4 py-2.5 text-sm bg-white dark:bg-black border border-amber-200 dark:border-neutral-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm cursor-pointer transition-colors"
        >
          <option value="" disabled>{t.selectJob}</option>
          {jobsList.map(job => (
             <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
      </div>
    );
  }

  if (isLoading && globalJobStages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-neutral-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 h-[calc(100vh-140px)] flex flex-col relative transition-colors">

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-gray-100 dark:border-neutral-800 pb-4 shrink-0 transition-colors">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">{t.title}</h2>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mr-1">{t.filterLabel}</span>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-white bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none w-48 transition-colors"
            />

            <select
              value={filterDecision}
              onChange={e => setFilterDecision(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-white bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer transition-colors"
            >
              <option value="All">{t.decisions.all}</option>
              <option value="Yes">{t.decisions.yes}</option>
              <option value="No">{t.decisions.no}</option>
              <option value="Maybe">{t.decisions.maybe}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-900/50 px-3 py-1.5 rounded-xl animate-pulse transition-colors">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              {t.updating}
            </div>
          )}

          <div className="flex items-center bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-500 rounded-xl shadow-sm px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-gray-900 dark:focus-within:ring-white">
             <div className="flex flex-col mr-2">
                 <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-0.5">{t.activeJobBoard}</span>
                 <select
                   value={globalJobId || ''}
                   onChange={handleJobChange}
                   className="text-sm font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none cursor-pointer appearance-none p-0 min-w-[200px] focus:ring-0"
                 >
                   {jobsList.map(job => (
                     <option key={job.id} value={job.id}>{job.title}</option>
                   ))}
                 </select>
             </div>
             <div className="pointer-events-none text-gray-400 dark:text-neutral-500 pl-2 border-l border-gray-100 dark:border-neutral-800 transition-colors">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
             </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 h-full min-h-0 overflow-x-auto pb-4 custom-scrollbar items-start transition-colors">
        {globalJobStages.map((columnStatus, index) => {
          const columnCandidates = safeCandidates.filter(c => c.status === columnStatus);
          const accent = getColumnAccent(columnStatus, index);

          return (
            <div
              key={columnStatus}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, columnStatus)}
              className="flex-shrink-0 w-[300px] bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-900 rounded-2xl p-4 flex flex-col h-full overflow-hidden shadow-sm transition-all"
            >
              <div className="flex justify-between items-center mb-4 shrink-0 transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${accent.dot}`}></div>
                  <h3 className={`text-[11px] font-bold uppercase tracking-widest ${accent.text}`}>
                    {columnStatus.replace(/_/g, ' ')}
                  </h3>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${accent.badge}`}>
                  {columnCandidates.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {columnCandidates.map(candidate => (
                  <div
                    key={candidate.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, candidate.id)}
                    onDragEnd={handleDragEnd}
                    className="group bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 hover:shadow-md hover:border-gray-300 dark:hover:border-neutral-700 transition-all cursor-grab active:cursor-grabbing shrink-0 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center gap-2 transition-colors">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${getScoreBadge(candidate.score)}`}>
                        {candidate.score}% {t.match}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${getDecisionBadge(candidate.decision)}`}>
                        {candidate.decision?.replace(/_/g, ' ') || 'MAYBE'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {candidate.filename}
                    </h4>

                    {candidate.summary && (
                      <p className="text-xs text-gray-500 dark:text-neutral-400 line-clamp-3 leading-relaxed transition-colors">
                        {candidate.summary}
                      </p>
                    )}

                    {candidate.matched_skills && candidate.matched_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 transition-colors">
                        {candidate.matched_skills.slice(0, 3).map(skill => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700 transition-colors"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.matched_skills.length > 3 && (
                          <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-600 px-1 py-1">
                            +{candidate.matched_skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {columnCandidates.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center text-[10px] font-bold text-gray-400 dark:text-neutral-600 uppercase tracking-widest bg-white/50 dark:bg-black/20 transition-all">
                    {t.dropHere}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}