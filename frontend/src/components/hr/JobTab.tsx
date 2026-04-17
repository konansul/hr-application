import { useState, useEffect, type FormEvent } from 'react';
import { jobsApi } from '../../api';
import { useStore } from '../../store';

interface ScreeningQuestion {
  id: string;
  label: string;
  placeholder: string;
}

type JobStatus = 'draft' | 'active' | 'suspended' | 'closed';

interface Job {
  id: string;
  title: string;
  description: string;
  level?: string;
  region?: string;
  status?: JobStatus;
  screening_questions?: ScreeningQuestion[];
}

const LEVELS = ['Junior', 'Middle', 'Senior', 'Lead'];
const REGIONS = ['Global', 'US', 'EU', 'Asia'];

export function JobTab({ setGlobalJobDescription }: { setGlobalJobDescription: (desc: string) => void }) {
  const token = localStorage.getItem('auth_token');
  const { setGlobalJobId, setGlobalJobTitle } = useStore();

  // --- Стейты для списка и фильтрации ---
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [filterRegion, setFilterRegion] = useState<string>('All');

  // --- Стейты для активной вакансии (Workspace) ---
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeDescription, setActiveDescription] = useState('');
  const [activeLevel, setActiveLevel] = useState('Middle');
  const [activeStatus, setActiveStatus] = useState<JobStatus>('active');
  const [activeRegion, setActiveRegion] = useState('Global');
  const [activeQuestions, setActiveQuestions] = useState<ScreeningQuestion[]>([]);

  // --- Стейты для модального окна создания ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftLevel, setDraftLevel] = useState('Middle');
  const [draftRegion, setDraftRegion] = useState('Global');

  // --- Системные стейты ---
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentJob) {
      setGlobalJobId(currentJob.id);
    } else {
      setGlobalJobId('');
    }
    setGlobalJobDescription(activeDescription);
    setGlobalJobTitle(activeTitle);
  }, [currentJob, activeTitle, activeDescription, setGlobalJobDescription, setGlobalJobId, setGlobalJobTitle]);

  const fetchJobs = async () => {
    try {
      const data = await jobsApi.list();
      setJobs(data);
      if (data.length > 0 && !selectedJobId && !currentJob) {
        handleLoadJob(data[0]);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchJobs();
  }, [token]);

  // Применяем фильтры к списку
  const filteredJobs = jobs.filter(job => {
    if (filterStatus !== 'All' && job.status !== filterStatus) return false;
    if (filterLevel !== 'All' && job.level !== filterLevel) return false;
    if (filterRegion !== 'All' && job.region !== filterRegion) return false;
    return true;
  });

  const handleLoadJob = (jobToLoad: Job) => {
    setSelectedJobId(jobToLoad.id);
    setCurrentJob(jobToLoad);
    setActiveTitle(jobToLoad.title);
    setActiveDescription(jobToLoad.description);
    setActiveLevel(jobToLoad.level || 'Middle');
    setActiveStatus(jobToLoad.status || 'draft');
    setActiveRegion(jobToLoad.region || 'Global');
    setActiveQuestions(jobToLoad.screening_questions ?? []);

    setError(null);
  };

  const handleCreateJob = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!draftTitle.trim() || !draftDescription.trim()) {
      setError("Please provide a title and a basic description.");
      return;
    }

    try {
      const newJob = await jobsApi.create(draftTitle, draftDescription, draftRegion, draftLevel);

      setCurrentJob(newJob);
      setSelectedJobId(newJob.id);
      setActiveTitle(newJob.title);
      setActiveDescription(newJob.description);
      setActiveLevel(newJob.level || 'Middle');
      setActiveRegion(newJob.region || 'Global');
      setActiveStatus('active');
      setActiveQuestions([]);

      setMessage("New active job created and loaded to workspace.");

      setDraftTitle('');
      setDraftDescription('');
      setDraftLevel('Middle');
      setDraftRegion('Global');
      setIsCreateModalOpen(false);

      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Create failed');
    }
  };

  const handleAddQuestion = () => {
    const newQ: ScreeningQuestion = {
      id: `q_${Date.now()}`,
      label: '',
      placeholder: 'e.g. Years of React?'
    };
    setActiveQuestions([...activeQuestions, newQ]);
  };

  const handleUpdateQuestion = (id: string, field: keyof ScreeningQuestion, value: string) => {
    setActiveQuestions(activeQuestions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleRemoveQuestion = (id: string) => {
    setActiveQuestions(activeQuestions.filter(q => q.id !== id));
  };

  const handleRefineWithAI = async () => {
    if (!activeTitle || !activeDescription) return;
    setIsRefining(true);
    setError(null);
    try {
      const options = { region: activeRegion };
      const data = await jobsApi.refine(activeTitle, activeDescription, options);
      if (data.improved_description) {
        setActiveDescription(data.improved_description);
        setMessage("✨ AI has polished the description. Review and save changes.");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'AI Refinement failed');
    } finally {
      setIsRefining(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!currentJob) return;
    if (!window.confirm(`Delete "${currentJob.title}"? This will also remove all applications. This action cannot be undone.`)) return;
    try {
      await jobsApi.delete(currentJob.id);
      setCurrentJob(null);
      setActiveTitle('');
      setActiveDescription('');
      setActiveQuestions([]);
      setJobs(prev => prev.filter(j => j.id !== currentJob.id));
      setSelectedJobId('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Delete failed');
    }
  };

  const handleSaveChanges = async () => {
    if (!currentJob) return;
    setIsSaving(true);
    setError(null);
    try {
      const updatedJob = await jobsApi.update(currentJob.id, {
         title: activeTitle,
         description: activeDescription,
         region: activeRegion,
         level: activeLevel,
         status: activeStatus,
         screening_questions: activeQuestions
      });
      setCurrentJob(updatedJob);
      setMessage("Changes saved successfully!");
      fetchJobs();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeStyles = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'closed': return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'suspended': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-50 text-blue-600 border-blue-200'; // draft
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 border border-gray-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Authentication Required</h3>
        <p className="text-sm text-gray-500">Please login to manage job descriptions.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 pb-20 relative">

      {/* --- ТОР БАР С ФИЛЬТРАМИ И КНОПКОЙ CREATE --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Job Manager</h2>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Filter:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none cursor-pointer"
            >
              <option value="All">All Levels</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none cursor-pointer"
            >
              <option value="All">All Locations</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create New JD
        </button>
      </div>

      {message && (
        <div className="p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {message}
        </div>
      )}
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      {/* --- ОСНОВНОЙ ЛЭЙАУТ (ЛЕВАЯ И ПРАВАЯ КОЛОНКИ ПО 800px) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК + ВОПРОСЫ (flex-col для разделения высоты) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[800px] sticky top-6">

          {/* 1. Список Вакансий (Занимает всю высоту, если нет выбранной работы, или половину, если есть) */}
          <div className={`bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col overflow-hidden transition-all ${currentJob ? 'h-[50%]' : 'h-full'}`}>
            <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0">
              <div className="flex-1">Job Name</div>
              <div className="w-16 text-center">Status</div>
              <div className="w-12 text-right">Loc</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => {
                  const isSelected = selectedJobId === job.id;
                  return (
                    <button
                      key={job.id}
                      onClick={() => handleLoadJob(job)}
                      className={`flex items-center w-full text-left px-3 py-3 rounded-xl border transition-all duration-200 group ${
                        isSelected 
                          ? 'bg-gray-900 border-gray-900 shadow-md ring-2 ring-gray-900/20' 
                          : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {job.title}
                        </h4>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                          {job.level || 'Middle'}
                        </p>
                      </div>
                      <div className="w-16 flex justify-center shrink-0">
                        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                          isSelected && job.status !== 'closed' ? 'bg-gray-800 text-gray-200 border-gray-700' : getStatusBadgeStyles(job.status || 'draft')
                        }`}>
                          {job.status || 'draft'}
                        </span>
                      </div>
                      <div className={`w-12 text-right text-[10px] font-semibold shrink-0 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                        {job.region === 'Global' ? 'GLB' : job.region}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-gray-400 italic text-center py-10 px-4">
                  No jobs found.
                </div>
              )}
            </div>
          </div>

          {/* 2. Screening Questions (Появляется под списком и занимает вторую половину высоты) */}
          {currentJob && (
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col h-[50%] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Screening Questions</h3>
                </div>
                <button onClick={handleAddQuestion} className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-sm">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/30">
                {activeQuestions.length > 0 ? (
                  activeQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-200 relative group transition-colors shadow-sm">
                      <div className="absolute top-3 left-3 w-4 h-4 bg-gray-100 rounded flex items-center justify-center text-[9px] font-bold text-gray-500">
                        {idx + 1}
                      </div>
                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="absolute top-2 right-2 p-1 bg-white border border-gray-200 rounded-md text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="pl-6 pr-4 space-y-1.5">
                        <input
                          type="text"
                          placeholder="Question..."
                          value={q.label}
                          onChange={(e) => handleUpdateQuestion(q.id, 'label', e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-gray-900 placeholder-gray-400 border-none focus:ring-0 p-0 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Candidate's hint..."
                          value={q.placeholder}
                          onChange={(e) => handleUpdateQuestion(q.id, 'placeholder', e.target.value)}
                          className="w-full bg-transparent text-[10px] text-gray-500 placeholder-gray-300 border-none focus:ring-0 p-0 outline-none"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-4">
                      <p className="text-xs text-gray-400 font-medium">No questions added. Click "Add" above.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: РЕДАКТОР (WORKSPACE) - Теперь он на всю высоту! */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col overflow-hidden h-[800px]">

            {/* Тулбар редактора */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${currentJob ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Workspace</h3>
              </div>

              {currentJob && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRefineWithAI}
                    disabled={isRefining}
                    className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isRefining ? 'AI is working...' : '✨ Rewrite with AI'}
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {currentJob ? (
              <div className="p-6 flex flex-col flex-1 gap-5 overflow-hidden">

                {/* Заголовок и настройки */}
                <div className="flex flex-col xl:flex-row xl:items-start gap-4 justify-between shrink-0">
                  <input
                    type="text"
                    value={activeTitle}
                    onChange={(e) => setActiveTitle(e.target.value)}
                    className="flex-1 text-3xl font-bold text-gray-900 border-none focus:ring-0 p-0 placeholder-gray-300 bg-transparent"
                    placeholder="Untitled Role"
                  />

                  {/* Селекторы для редактирования текущей вакансии */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                    <select
                      value={activeStatus}
                      onChange={(e) => setActiveStatus(e.target.value as JobStatus)}
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border focus:ring-2 focus:ring-gray-900 cursor-pointer outline-none transition-colors ${getStatusBadgeStyles(activeStatus)}`}
                    >
                      <option value="draft">DRAFT</option>
                      <option value="active">ACTIVE</option>
                      <option value="suspended">SUSPENDED</option>
                      <option value="closed">CLOSED</option>
                    </select>

                    <div className="w-px h-6 bg-gray-200 mx-1"></div>

                    <select
                        value={activeLevel}
                        onChange={(e) => setActiveLevel(e.target.value)}
                        className="px-2 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none cursor-pointer shadow-sm"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select
                        value={activeRegion}
                        onChange={(e) => setActiveRegion(e.target.value)}
                        className="px-2 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none cursor-pointer shadow-sm"
                      >
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="h-px bg-gray-100 w-full shrink-0"></div>

                {/* Основное текстовое поле - теперь оно растягивается на весь экран */}
                <textarea
                  value={activeDescription}
                  onChange={(e) => setActiveDescription(e.target.value)}
                  placeholder="Start writing the detailed description..."
                  className={`w-full flex-1 text-sm text-gray-700 leading-relaxed border-none focus:ring-0 p-0 resize-none transition-colors custom-scrollbar bg-transparent outline-none ${isRefining ? 'text-indigo-400' : ''}`}
                />

                {/* Footer с удалением */}
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-mono uppercase tracking-widest shrink-0">
                  <button onClick={handleDeleteJob} className="text-red-400 hover:text-red-600 transition-colors font-bold">
                    Delete Job Permanently
                  </button>
                  <div className="flex gap-4">
                    <span>ID: {currentJob.id.slice(0, 15)}</span>
                    <span>Length: {activeDescription.length}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30">
                <div className="w-20 h-20 bg-white border border-gray-100 rounded-3xl flex items-center justify-center shadow-sm mb-5">
                   <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h4 className="text-lg text-gray-900 font-bold mb-2">No Job Selected</h4>
                <p className="text-sm text-gray-500 max-w-sm">Select a job from your library on the left, or create a new job to open the workspace editor.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- МОДАЛЬНОЕ ОКНО "CREATE NEW JD" --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Create New Job Description</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Level</label>
                  <select
                    value={draftLevel}
                    onChange={(e) => setDraftLevel(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all cursor-pointer"
                  >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Location</label>
                  <select
                    value={draftRegion}
                    onChange={(e) => setDraftRegion(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all cursor-pointer"
                  >
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Initial Description</label>
                <textarea
                  placeholder="Paste raw requirements or write a brief intro here. You can refine this with AI later..."
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  className="w-full h-32 px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none resize-none transition-all custom-scrollbar"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create & Open Workspace
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
                  The job will automatically be created with an <strong className="text-emerald-500">ACTIVE</strong> status.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}