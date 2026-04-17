import { useState, useEffect, type DragEvent } from 'react';
import { screeningApi, jobsApi } from '../../api';
import { useStore } from '../../store';

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
    globalJobTitle,
    activeTab,
    globalJobStages,
    setGlobalJobStages,
    setGlobalJobId,
    setGlobalJobTitle, // <-- нужно для смены вакансии
  } = useStore();

  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [jobsList, setJobsList] = useState<{id: string, title: string}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Стейты фильтрации (пока UI заглушки, но можно привязать к массиву)
  const [filterDecision, setFilterDecision] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Загрузка списка всех вакансий для выпадающего списка в шапке
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

  // 2. Оригинальная логика загрузки карточек для активной вакансии
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
        console.error("Failed to fetch Kanban data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [globalJobId, activeTab, setGlobalJobStages]);

  // 3. Обработчик смены вакансии из селектора
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

  // ОРИГИНАЛЬНЫЙ ДИЗАЙН КОЛОНОК
  const getColumnAccent = (status: string, index: number) => {
    const s = status.toUpperCase();
    if (s.includes('APPL')) return { text: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200' };
    if (s.includes('REJECT') || s.includes('FAIL')) return { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' };
    if (s.includes('OFFER') || s.includes('HIRE') || s.includes('ACCEPT')) return { text: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

    const palettes = [
      { text: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
      { text: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
      { text: 'text-indigo-600', bg: 'bg-indigo-50', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      { text: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
      { text: 'text-cyan-600', bg: 'bg-cyan-50', dot: 'bg-cyan-500', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      { text: 'text-pink-600', bg: 'bg-pink-50', dot: 'bg-pink-500', badge: 'bg-pink-50 text-pink-700 border-pink-200' },
    ];
    return palettes[index % palettes.length];
  };

  // ОРИГИНАЛЬНЫЙ ДИЗАЙН БЕЙДЖЕЙ
  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (score >= 50) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-red-50 border-red-200 text-red-700';
  };

  const getDecisionBadge = (decision?: string) => {
    const d = decision?.toLowerCase();
    if (d === 'hire' || d === 'strong_yes' || d === 'yes') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (d === 'reject' || d === 'no') return 'bg-red-50 border-red-200 text-red-700';
    return 'bg-gray-100 border-gray-200 text-gray-600';
  };

  // Простая фильтрация (чтобы UI элементы работали)
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

  // Состояние, если ни одна работа не выбрана (но теперь с селектором, чтобы ее выбрать прямо тут!)
  if (!globalJobId && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50 border border-amber-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-medium text-amber-900 mb-1">No Job Selected</h3>
        <p className="text-sm text-amber-700 mb-6">Select a job from the dropdown below to view its Kanban board.</p>

        <select
          onChange={handleJobChange}
          value={globalJobId || ''}
          className="w-full max-w-xs px-4 py-2.5 text-sm bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm cursor-pointer"
        >
          <option value="" disabled>-- Select a Job --</option>
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
        <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 h-[calc(100vh-140px)] flex flex-col relative">

      {/* --- НОВАЯ ВЕРХНЯЯ ЧАСТЬ: ЗАГОЛОВОК, ФИЛЬТРЫ, СЕЛЕКТОР ВАКАНСИИ --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-gray-100 pb-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Recruitment Pipeline</h2>

          {/* НОВЫЕ ФИЛЬТРЫ ИЗ ТВОЕГО ТРЕБОВАНИЯ */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Filter Candidates:</span>

            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none w-48"
            />

            <select
              value={filterDecision}
              onChange={e => setFilterDecision(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none cursor-pointer"
            >
              <option value="All">All Decisions</option>
              <option value="Yes">Hire / Yes</option>
              <option value="No">Reject / No</option>
              <option value="Maybe">Maybe</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl animate-pulse">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              Updating...
            </div>
          )}

          {/* НОВЫЙ СЕЛЕКТОР АКТИВНОЙ ВАКАНСИИ (Явный вид кнопки/селектора) */}
          <div className="flex items-center bg-white border border-gray-200 hover:border-gray-300 rounded-xl shadow-sm px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-gray-900">
             <div className="flex flex-col mr-2">
                 <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Active Job Board</span>
                 <select
                   value={globalJobId || ''}
                   onChange={handleJobChange}
                   className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-none p-0 min-w-[200px] focus:ring-0"
                 >
                   {jobsList.map(job => (
                     <option key={job.id} value={job.id}>{job.title}</option>
                   ))}
                 </select>
             </div>
             {/* Иконка шеврона (стрелочки вниз), чтобы было понятно, что это выпадающий список */}
             <div className="pointer-events-none text-gray-400 pl-2 border-l border-gray-100">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
               </svg>
             </div>
          </div>
        </div>
      </div>

      {/* --- ОРИГИНАЛЬНЫЙ ДИЗАЙН ДОСКИ (Не тронут) --- */}
      <div className="flex gap-4 h-full min-h-0 overflow-x-auto pb-4 custom-scrollbar items-start">
        {globalJobStages.map((columnStatus, index) => {
          const columnCandidates = safeCandidates.filter(c => c.status === columnStatus);
          const accent = getColumnAccent(columnStatus, index);

          return (
            <div
              key={columnStatus}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, columnStatus)}
              className="flex-shrink-0 w-[300px] bg-white border border-gray-200 rounded-2xl p-4 flex flex-col h-full overflow-hidden shadow-sm transition-all"
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${accent.dot}`}></div>
                  <h3 className={`text-[11px] font-bold uppercase tracking-widest ${accent.text}`}>
                    {columnStatus.replace(/_/g, ' ')}
                  </h3>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${accent.badge}`}>
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
                    className="group bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing shrink-0 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getScoreBadge(candidate.score)}`}>
                        {candidate.score}% match
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getDecisionBadge(candidate.decision)}`}>
                        {candidate.decision?.replace(/_/g, ' ') || 'MAYBE'}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {candidate.filename}
                    </h4>

                    {candidate.summary && (
                      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                        {candidate.summary}
                      </p>
                    )}

                    {candidate.matched_skills && candidate.matched_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.matched_skills.slice(0, 3).map(skill => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.matched_skills.length > 3 && (
                          <span className="text-[10px] font-semibold text-gray-400 px-1 py-1">
                            +{candidate.matched_skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {columnCandidates.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                    Drop here
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