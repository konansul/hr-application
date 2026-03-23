import { useState, useEffect, type DragEvent } from 'react';
import { screeningApi } from '../api';

type Status = 'New' | 'Shortlisted' | 'Selected' | 'Rejected';
const COLUMNS: Status[] = ['New', 'Shortlisted', 'Selected', 'Rejected'];

interface KanbanTabProps {
  batchResults: any[];
}

interface CandidateCard {
  id: string;
  filename: string;
  score: number;
  status: Status;
  summary?: string;
  decision?: string;
  matched_skills?: string[];
}

export function KanbanTab({ batchResults }: KanbanTabProps) {
  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!batchResults || batchResults.length === 0) return;

    setCandidates(prev => {
      return batchResults.map(res => {
        const stableId = String(res.result_id || res.id || res.filename);
        const existing = prev.find(c => c.id === stableId);

        return {
          id: stableId,
          filename: res.filename || 'Unknown File',
          score: res.score || 0,
          status: res.status || existing?.status || 'New',
          summary: res.summary || '',
          decision: res.decision || 'maybe',
          matched_skills: res.matched_skills || []
        };
      });
    });
  }, [batchResults]);

  // --- Drag & Drop Handlers ---
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

  // --- UI Helpers ---
  const getColumnStyles = (status: Status) => {
    switch (status) {
      case 'New':
        return { text: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400', border: 'border-gray-200' };
      case 'Shortlisted':
        return { text: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-100' };
      case 'Selected':
        return { text: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', border: 'border-emerald-100' };
      case 'Rejected':
        return { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', border: 'border-red-100' };
    }
  };

  const getScoreTheme = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-100 text-emerald-700';
    if (score >= 50) return 'bg-amber-50 border-amber-100 text-amber-700';
    return 'bg-red-50 border-red-100 text-red-700';
  };

  const getDecisionTheme = (decision?: string) => {
    const d = decision?.toLowerCase();
    if (d === 'hire' || d === 'strong_yes') return 'bg-emerald-100 text-emerald-800';
    if (d === 'reject' || d === 'no') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-600';
  };

  const getColumnIcon = (status: Status) => {
    const p = { className: "w-4 h-4", stroke: "currentColor", strokeWidth: 2.5, fill: "none", viewBox: "0 0 24 24" };
    switch (status) {
      case 'New': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;
      case 'Shortlisted': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
      case 'Selected': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'Rejected': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-end shrink-0 px-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recruitment Pipeline</h2>
          <p className="text-sm text-gray-500 mt-1">Drag and drop candidates to update their hiring stage.</p>
        </div>
        {isSyncing && (
          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 animate-pulse tracking-widest uppercase bg-indigo-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            Updating...
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex gap-6 h-full min-h-0 overflow-x-auto pb-4 px-2 custom-scrollbar">
        {COLUMNS.map(columnStatus => {
          const columnCandidates = candidates.filter(c => c.status === columnStatus);
          const styles = getColumnStyles(columnStatus);

          return (
            <div
              key={columnStatus}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, columnStatus)}
              className="flex-1 min-w-[320px] max-w-[400px] bg-gray-50/50 border border-gray-100 rounded-[32px] p-6 flex flex-col h-full overflow-hidden shadow-sm"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${styles.bg} ${styles.text}`}>
                    {getColumnIcon(columnStatus)}
                  </div>
                  <h3 className={`text-xs font-black uppercase tracking-[0.15em] ${styles.text}`}>
                    {columnStatus}
                  </h3>
                </div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full border bg-white ${styles.text} ${styles.border} shadow-sm`}>
                  {columnCandidates.length}
                </span>
              </div>

              {/* Cards Scroll Area */}
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {columnCandidates.map(candidate => {
                  const scoreTheme = getScoreTheme(candidate.score);
                  const decisionTheme = getDecisionTheme(candidate.decision);

                  return (
                    <div
                      key={candidate.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, candidate.id)}
                      onDragEnd={handleDragEnd}
                      className="group bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing shrink-0 flex flex-col gap-3"
                    >
                      {/* Top Row: Score & Decision */}
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${scoreTheme}`}>
                          Match: {candidate.score}%
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${decisionTheme}`}>
                          {candidate.decision?.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Middle: Candidate Info */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {candidate.filename}
                        </h4>
                      </div>

                      {/* Summary */}
                      {candidate.summary && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {candidate.summary}
                        </p>
                      )}

                      {/* Bottom: Skills */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {candidate.matched_skills?.slice(0, 3).map(skill => (
                          <span key={skill} className="text-[9px] font-bold bg-gray-50 text-gray-400 px-2 py-1 rounded-md border border-gray-100">
                            {skill}
                          </span>
                        ))}
                        {candidate.matched_skills && candidate.matched_skills.length > 3 && (
                          <span className="text-[9px] font-bold text-gray-300 px-1 py-1">
                            +{candidate.matched_skills.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {columnCandidates.length === 0 && (
                  <div className="h-28 border-2 border-dashed border-gray-200 rounded-[24px] flex items-center justify-center text-[10px] font-black text-gray-300 uppercase tracking-widest bg-white/50">
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