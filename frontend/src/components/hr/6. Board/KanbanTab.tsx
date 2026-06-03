import { useState, useEffect, type DragEvent } from 'react';
import { screeningApi, jobsApi } from '../../../api';
import { useStore } from '../../../store';
import { DICT } from '../../../internationalization.ts';
import { SearchableJobSelect } from '../../shared/SearchableJobSelect';

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
    globalJobStages,
    setGlobalJobStages,
    language
  } = useStore();

  const t = DICT[language as keyof typeof DICT]?.kanban || DICT.en.kanban;

  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [jobsList, setJobsList] = useState<{id: string, title: string}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [kanbanJobId, setKanbanJobId] = useState<string>('');

  const [filterDecision, setFilterDecision] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchJobsList = async () => {
      try {
        const jobs = await jobsApi.list();
        setJobsList(jobs.map((j: any) => ({ id: j.id, title: j.title })));
        if (jobs.length > 0) {
          setKanbanJobId(jobs[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchJobsList();
  }, []);

  useEffect(() => {
    if (!kanbanJobId) {
      setCandidates([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const jobData = await jobsApi.getById(kanbanJobId);
        if (jobData.pipeline_stages && jobData.pipeline_stages.length > 0) {
          setGlobalJobStages(jobData.pipeline_stages);
        } else {
          setGlobalJobStages(["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"]);
        }

        const results = await screeningApi.getApplicationsByJob(kanbanJobId);
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
  }, [kanbanJobId, setGlobalJobStages]);

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
    if (s.includes('REJECT') || s.includes('FAIL')) return { text: 'text-[#c05020] dark:text-[#FF906D]', dot: 'bg-[#FF906D]', badge: 'bg-[#FF906D]/10 dark:bg-[#FF906D]/10 text-[#c05020] dark:text-[#FF906D] border-[#FF906D]/30 dark:border-[#FF906D]/25' };
    if (s.includes('OFFER') || s.includes('HIRE') || s.includes('ACCEPT')) return { text: 'text-[#5B52C8] dark:text-[#9EA4FF]', dot: 'bg-[#7A60F4]', badge: 'bg-[#7A60F4]/10 dark:bg-[#7A60F4]/10 text-[#5B52C8] dark:text-[#9EA4FF] border-[#7A60F4]/30 dark:border-[#7A60F4]/25' };

    const palettes = [
      { text: 'text-slate-700 dark:text-[#92D8F2]', dot: 'bg-[#92D8F2]', badge: 'bg-[#92D8F2]/15 dark:bg-[#92D8F2]/10 text-slate-700 dark:text-[#92D8F2] border-[#92D8F2]/40 dark:border-[#92D8F2]/25' },
      { text: 'text-[#5B52C8] dark:text-[#9EA4FF]', dot: 'bg-[#9EA4FF]', badge: 'bg-[#9EA4FF]/15 dark:bg-[#9EA4FF]/10 text-[#5B52C8] dark:text-[#9EA4FF] border-[#9EA4FF]/40 dark:border-[#9EA4FF]/25' },
      { text: 'text-[#5B52C8] dark:text-[#9EA4FF]', dot: 'bg-[#7A60F4]', badge: 'bg-[#7A60F4]/10 dark:bg-[#7A60F4]/10 text-[#5B52C8] dark:text-[#9EA4FF] border-[#7A60F4]/30 dark:border-[#7A60F4]/25' },
    ];
    return palettes[index % palettes.length];
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-[#7A60F4]/10 dark:bg-[#7A60F4]/10 border-[#7A60F4]/30 dark:border-[#7A60F4]/25 text-[#5B52C8] dark:text-[#9EA4FF]';
    if (score >= 50) return 'bg-[#FF906D]/10 dark:bg-[#FF906D]/10 border-[#FF906D]/30 dark:border-[#FF906D]/25 text-[#c05020] dark:text-[#FF906D]';
    return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400';
  };

  const getDecisionBadge = (decision?: string) => {
    const d = decision?.toLowerCase();
    if (d === 'hire' || d === 'strong_yes' || d === 'yes') return 'bg-[#7A60F4]/10 dark:bg-[#7A60F4]/10 border-[#7A60F4]/30 dark:border-[#7A60F4]/25 text-[#5B52C8] dark:text-[#9EA4FF]';
    if (d === 'reject' || d === 'no') return 'bg-[#FF906D]/10 dark:bg-[#FF906D]/10 border-[#FF906D]/30 dark:border-[#FF906D]/25 text-[#c05020] dark:text-[#FF906D]';
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

  if (!kanbanJobId && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-[#FF906D]/10 dark:bg-[#FF906D]/5 border border-[#FF906D]/30 dark:border-[#FF906D]/20 rounded-2xl max-w-2xl mx-auto mt-10 transition-colors">
        <div className="w-12 h-12 bg-[#FF906D]/15 dark:bg-[#FF906D]/10 text-[#c05020] dark:text-[#FF906D] rounded-full flex items-center justify-center mb-4 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.noJobSelected}</h3>
        <p className="text-sm text-[#c05020] dark:text-[#FF906D] mb-6">{t.noJobDesc}</p>

        <SearchableJobSelect
          jobs={jobsList}
          value={kanbanJobId}
          onChange={id => setKanbanJobId(id)}
          placeholder={t.selectJob}
          className="w-full max-w-xs"
        />
      </div>
    );
  }

  if (isLoading && globalJobStages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-neutral-800 border-t-[#7A60F4] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 h-[calc(100vh-140px)] flex flex-col relative transition-colors">

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-gray-100 dark:border-neutral-800 pb-4 shrink-0 transition-colors">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">{t.title}</h2>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">{t.filterLabel}</span>

            {/* Search input — matches Compare page visual weight */}
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-[#7A60F4]/50 outline-none w-48 shadow-sm transition-all cursor-text"
            />

            {/* Decision filter — chevron on the left, same base style as Compare page */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-neutral-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
              <select
                value={filterDecision}
                onChange={e => setFilterDecision(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-[#7A60F4]/50 outline-none cursor-pointer appearance-none shadow-sm transition-all"
              >
                <option value="All">{t.decisions.all}</option>
                <option value="Yes">{t.decisions.yes}</option>
                <option value="No">{t.decisions.no}</option>
                <option value="Maybe">{t.decisions.maybe}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#5B52C8] dark:text-[#9EA4FF] bg-[#7A60F4]/10 dark:bg-[#7A60F4]/10 border border-[#7A60F4]/30 dark:border-[#7A60F4]/25 px-3 py-1.5 rounded-xl animate-pulse transition-colors">
              <span className="w-1.5 h-1.5 bg-[#7A60F4] rounded-full"></span>
              {t.updating}
            </div>
          )}

          {/* Job selector — searchable */}
          <SearchableJobSelect
            jobs={jobsList}
            value={kanbanJobId || ''}
            onChange={id => setKanbanJobId(id)}
            label={t.activeJobBoard}
            className="min-w-[220px]"
          />
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

              <div className="flex flex-col gap-3 flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
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

                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#7A60F4] dark:group-hover:text-[#9EA4FF] transition-colors">
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