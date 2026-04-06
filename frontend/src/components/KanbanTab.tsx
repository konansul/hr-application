import { useState, useEffect, type DragEvent } from 'react';
import { screeningApi } from '../api';
import { useStore } from '../store';

type Status = 'APPLIED' | 'SHORTLISTED' | 'HR_INTERVIEW' | 'TECH_INTERVIEW' | 'OFFER' | 'REJECTED';
const COLUMNS: Status[] = ['APPLIED', 'SHORTLISTED', 'HR_INTERVIEW', 'TECH_INTERVIEW', 'OFFER', 'REJECTED'];

interface CandidateCard {
  id: string;
  filename: string;
  score: number;
  status: Status;
  summary?: string;
  decision?: string;
  matched_skills?: string[];
}

export function KanbanTab() {
  const { globalJobId, globalJobTitle, activeTab } = useStore();
  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!globalJobId) {
      setCandidates([]);
      return;
    }

    if (activeTab === 'kanban') {
      const fetchResults = async () => {
        setIsLoading(true);
        try {
          const results = await screeningApi.getApplicationsByJob(globalJobId);
          const mapped = results.map((res: any) => {
            // ФИКС: Заменяем пробелы на _, чтобы "HR Interview" стало "HR_INTERVIEW"
            const rawStatus = (res.status || 'APPLIED').toUpperCase().replace(/\s+/g, '_') as Status;

            return {
              id: String(res.application_id || res.result_id),
              filename: res.person ? `${res.person.first_name} ${res.person.last_name}` : (res.filename || 'Unknown Candidate'),
              score: res.screening?.score || res.score || 0,
              status: COLUMNS.includes(rawStatus) ? rawStatus : 'APPLIED', // Защита от неизвестных статусов
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

      fetchResults();
    }
  }, [globalJobId, activeTab]);

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

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetStatus: Status) => {
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

  const getColumnAccent = (status: Status) => {
    switch (status) {
      case 'APPLIED':      return { text: 'text-gray-500',   bg: 'bg-gray-100',    dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600 border-gray-200' };
      case 'SHORTLISTED':  return { text: 'text-blue-600',   bg: 'bg-blue-50',     dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'HR_INTERVIEW': return { text: 'text-purple-600', bg: 'bg-purple-50',   dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'TECH_INTERVIEW':return { text: 'text-indigo-600',bg: 'bg-indigo-50',   dot: 'bg-indigo-500',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'OFFER':        return { text: 'text-emerald-600',bg: 'bg-emerald-50',  dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'REJECTED':     return { text: 'text-red-600',    bg: 'bg-red-50',      dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200' };
      default:             return { text: 'text-gray-500',   bg: 'bg-gray-100',    dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
  };

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

  const getColumnIcon = (status: Status) => {
    const p = { className: "w-4 h-4", stroke: "currentColor", strokeWidth: 2, fill: "none", viewBox: "0 0 24 24" };
    switch (status) {
      case 'APPLIED':       return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;
      case 'SHORTLISTED':   return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
      case 'HR_INTERVIEW':  return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>;
      case 'TECH_INTERVIEW':return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
      case 'OFFER':         return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'REJECTED':      return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  if (!globalJobId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50 border border-amber-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-medium text-amber-900 mb-1">No Job Selected</h3>
        <p className="text-sm text-amber-700">Please select an active Job Description in the "Job Descriptions" tab to view the Kanban board.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 h-[calc(100vh-140px)] flex flex-col">

      {/* HEADER */}
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Recruitment Pipeline</h2>
          <p className="text-sm text-gray-500">Drag and drop candidates to update their hiring stage.</p>
        </div>

        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl animate-pulse">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              Updating...
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-2.5 text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-0.5">Active Job</span>
            <span className="text-sm font-bold text-gray-900">{globalJobTitle || 'Unknown Job'}</span>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex gap-4 h-full min-h-0 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map(columnStatus => {
          const columnCandidates = candidates.filter(c => c.status === columnStatus);
          const accent = getColumnAccent(columnStatus);

          return (
            <div
              key={columnStatus}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, columnStatus)}
              className="flex-1 min-w-[280px] bg-white border border-gray-200 rounded-2xl p-5 flex flex-col h-full overflow-hidden shadow-sm transition-all"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center mb-5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent.bg} ${accent.text}`}>
                    {getColumnIcon(columnStatus)}
                  </div>
                  <h3 className={`text-[11px] font-bold uppercase tracking-widest ${accent.text}`}>
                    {columnStatus.replace(/_/g, ' ')}
                  </h3>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${accent.badge}`}>
                  {columnCandidates.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {columnCandidates.map(candidate => (
                  <div
                    key={candidate.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, candidate.id)}
                    onDragEnd={handleDragEnd}
                    className="group bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing shrink-0 flex flex-col gap-3"
                  >
                    {/* Score + Decision row */}
                    <div className="flex justify-between items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getScoreBadge(candidate.score)}`}>
                        {candidate.score}% match
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getDecisionBadge(candidate.decision)}`}>
                        {candidate.decision?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Name */}
                    <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {candidate.filename}
                    </h4>

                    {/* Summary */}
                    {candidate.summary && (
                      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                        {candidate.summary}
                      </p>
                    )}

                    {/* Skills */}
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
                    Drop candidate here
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
