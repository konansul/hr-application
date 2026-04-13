import { useState, useEffect, type DragEvent } from 'react';
import { screeningApi, jobsApi } from '../api';
import { useStore } from '../store';

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
    globalJobDescription,
    activeTab,
    globalJobStages,
    setGlobalJobStages,
    userRole
  } = useStore();

  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Стейт для модалки редактирования колонок
  const [showSettings, setShowSettings] = useState(false);
  const [editedStages, setEditedStages] = useState<string[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [isSavingStages, setIsSavingStages] = useState(false);

  // Загрузка данных
  useEffect(() => {
    if (!globalJobId || activeTab !== 'kanban') {
      if (!globalJobId) setCandidates([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Запрашиваем детали вакансии, чтобы получить актуальные этапы
        const jobData = await jobsApi.getById(globalJobId);
        if (jobData.pipeline_stages && jobData.pipeline_stages.length > 0) {
          setGlobalJobStages(jobData.pipeline_stages);
        } else {
           // Фолбэк на дефолтные, если по какой-то причине с бэка пришел пустой массив
          setGlobalJobStages(["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"]);
        }

        // Запрашиваем кандидатов
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

  // Драг-энд-дроп логика
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

  // Логика настройки колонок
  const openSettings = () => {
    setEditedStages([...globalJobStages]);
    setNewStageName('');
    setShowSettings(true);
  };

  const saveSettings = async () => {
    if (editedStages.length === 0) return;
    setIsSavingStages(true);
    try {
      await jobsApi.update(globalJobId, {
        title: globalJobTitle,
        description: globalJobDescription,
        pipeline_stages: editedStages
      });
      setGlobalJobStages(editedStages);
      setShowSettings(false);
    } catch (err) {
      console.error("Failed to update stages", err);
    } finally {
      setIsSavingStages(false);
    }
  };

  const addStage = () => {
    const formatted = newStageName.trim().toUpperCase().replace(/\s+/g, '_');
    if (formatted && !editedStages.includes(formatted)) {
      setEditedStages([...editedStages, formatted]);
      setNewStageName('');
    }
  };

  // Перемещение этапа вверх по списку
  const moveStageUp = (index: number) => {
    if (index === 0) return;
    const newStages = [...editedStages];
    const temp = newStages[index - 1];
    newStages[index - 1] = newStages[index];
    newStages[index] = temp;
    setEditedStages(newStages);
  };

  // Перемещение этапа вниз по списку
  const moveStageDown = (index: number) => {
    if (index === editedStages.length - 1) return;
    const newStages = [...editedStages];
    const temp = newStages[index + 1];
    newStages[index + 1] = newStages[index];
    newStages[index] = temp;
    setEditedStages(newStages);
  };

  // Умная раскраска динамических колонок с явно заданным цветом точки (dot)
  const getColumnAccent = (status: string, index: number) => {
    const s = status.toUpperCase();
    if (s.includes('APPL')) return { text: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200' };
    if (s.includes('REJECT') || s.includes('FAIL')) return { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' };
    if (s.includes('OFFER') || s.includes('HIRE') || s.includes('ACCEPT')) return { text: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

    // Циклическая палитра для кастомных колонок
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

  // Экраны загрузки и отсутствия вакансии
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

  if (isLoading && globalJobStages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Если у кандидата статус, которого больше нет в колонках, кидаем его в первую колонку для безопасности отображения
  const safeCandidates = candidates.map(c =>
    globalJobStages.includes(c.status) ? c : { ...c, status: globalJobStages[0] || 'APPLIED' }
  );

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 h-[calc(100vh-140px)] flex flex-col relative">

      {/* --- МОДАЛЬНОЕ ОКНО НАСТРОЙКИ КОЛОНОК --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Configure Pipeline Stages</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStage()}
                  placeholder="e.g. TEST TASK"
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  onClick={addStage}
                  disabled={!newStageName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {editedStages.map((stage, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-xl group">
                    <span className="text-xs font-bold text-gray-700 tracking-wider uppercase">{stage.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveStageUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                        title="Move Up"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        onClick={() => moveStageDown(idx)}
                        disabled={idx === editedStages.length - 1}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                        title="Move Down"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      <button
                        onClick={() => setEditedStages(editedStages.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Remove stage"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
                {editedStages.length === 0 && (
                  <p className="text-xs text-red-500 text-center py-4">Pipeline must have at least one stage.</p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={editedStages.length === 0 || isSavingStages}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                {isSavingStages ? 'Saving...' : 'Save Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ШАПКА ДОСКИ --- */}
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Recruitment Pipeline</h2>
          <p className="text-sm text-gray-500">Drag and drop candidates to update their hiring stage.</p>
        </div>

        <div className="flex items-center gap-3">
          {userRole === 'hr' && (
            <button
              onClick={openSettings}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl shadow-sm px-4 py-2.5 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Configure Stages
            </button>
          )}

          {isSyncing && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl animate-pulse">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              Updating...
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-2.5 text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-0.5">Active Job</span>
            <span className="text-sm font-bold text-gray-900 truncate max-w-[200px] block">{globalJobTitle || 'Unknown Job'}</span>
          </div>
        </div>
      </div>

      {/* --- САМА ДОСКА --- */}
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
                        {candidate.decision?.replace(/_/g, ' ')}
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