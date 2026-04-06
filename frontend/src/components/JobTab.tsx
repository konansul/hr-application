import { useState, useEffect, type FormEvent } from 'react';
import { jobsApi } from '../api';
import { useStore } from '../store';

interface ScreeningQuestion {
  id: string;
  label: string;
  placeholder: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  screening_questions?: ScreeningQuestion[];
}

export function JobTab({ setGlobalJobDescription }: { setGlobalJobDescription: (desc: string) => void }) {
  const token = localStorage.getItem('auth_token');
  const { setGlobalJobId, setGlobalJobTitle } = useStore();

  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeDescription, setActiveDescription] = useState('');
  const [activeQuestions, setActiveQuestions] = useState<ScreeningQuestion[]>([]);

  const [region, setRegion] = useState('Global');
  const [clauses, setClauses] = useState({
    di: false,
    antiScam: false,
    eeo: false,
    payTransparency: false,
    gdpr: false,
    euSalary: false,
    visaSponsorship: false,
  });

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
        setSelectedJobId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchJobs();
  }, [token]);

  const handleLoadJob = () => {
    const jobToLoad = jobs.find(j => String(j.id) === String(selectedJobId));
    if (jobToLoad) {
      setCurrentJob(jobToLoad);
      setActiveTitle(jobToLoad.title);
      setActiveDescription(jobToLoad.description);

      setActiveQuestions(jobToLoad.screening_questions ?? []);

      setMessage("Job loaded to workspace.");
      setTimeout(() => setMessage(null), 3000);
    }
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
      const newJob = await jobsApi.create(draftTitle, draftDescription);
      setCurrentJob(newJob);
      setActiveTitle(newJob.title);
      setActiveDescription(newJob.description);
      setActiveQuestions([]);

      setMessage("Draft created and loaded to workspace.");
      setDraftTitle('');
      setDraftDescription('');
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Create failed');
    }
  };

  const handleAddQuestion = () => {
    const newQ: ScreeningQuestion = {
      id: `q_${Date.now()}`,
      label: '',
      placeholder: 'e.g. Do you have 3+ years of experience with React?'
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
      const options = {
        region,
        include_di_clause: clauses.di,
        include_anti_scam: clauses.antiScam,
        include_eeo_statement: clauses.eeo,
        include_pay_transparency: clauses.payTransparency,
        include_gdpr_notice: clauses.gdpr,
        include_eu_salary_law: clauses.euSalary,
        include_visa_sponsorship: clauses.visaSponsorship
      };

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
         region: region,
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

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 border border-gray-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Authentication Required</h3>
        <p className="text-sm text-gray-500">Please login to manage job descriptions.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Job Manager</h2>
          <p className="text-sm text-gray-500">Draft, refine with AI, and maintain your job requirements.</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              Library
            </h3>
            {jobs.length > 0 ? (
              <div className="space-y-3">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none transition-all"
                >
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
                <button
                  onClick={handleLoadJob}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Load to Workspace
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic text-center py-2">No jobs saved yet.</div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Draft
            </h3>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <input
                type="text"
                placeholder="Job Title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none transition-all"
              />
              <textarea
                placeholder="Briefly describe the role..."
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none resize-none transition-all"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
              >
                Create & Edit
              </button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Legal & AI Templates
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Target Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="Global">Global / Remote</option>
                  <option value="US">United States (US)</option>
                  <option value="EU">Europe (EU)</option>
                  <option value="Asia">Asia Pacific (APAC)</option>
                </select>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={clauses.di} onChange={e => setClauses(c => ({...c, di: e.target.checked}))} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                  <span className="text-sm text-gray-700 font-medium">Diversity & Inclusion</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={clauses.antiScam} onChange={e => setClauses(c => ({...c, antiScam: e.target.checked}))} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                  <span className="text-sm text-gray-700 font-medium">Anti-Scam Warning</span>
                </label>

                {region === 'US' && (
                  <div className="pl-1 pt-2 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={clauses.eeo} onChange={e => setClauses(c => ({...c, eeo: e.target.checked}))} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                      <span className="text-sm text-gray-700 font-medium">EEO Statement</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={clauses.payTransparency} onChange={e => setClauses(c => ({...c, payTransparency: e.target.checked}))} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                      <span className="text-sm text-gray-700 font-medium">Pay Transparency</span>
                    </label>
                  </div>
                )}

                {region === 'EU' && (
                  <div className="pl-1 pt-2 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={clauses.gdpr} onChange={e => setClauses(c => ({...c, gdpr: e.target.checked}))} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                      <span className="text-sm text-gray-700 font-medium">GDPR Privacy Notice</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={clauses.euSalary} onChange={e => setClauses(c => ({...c, euSalary: e.target.checked}))} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                      <span className="text-sm text-gray-700 font-medium">Mandatory Salary Info</span>
                    </label>
                  </div>
                )}

                {region === 'Asia' && (
                  <div className="pl-1 pt-2 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={clauses.visaSponsorship} onChange={e => setClauses(c => ({...c, visaSponsorship: e.target.checked}))} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                      <span className="text-sm text-gray-700 font-medium">Visa Sponsorship Info</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm min-h-[730px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
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
                    className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleDeleteJob}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete job"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>

            {currentJob ? (
              <div className="p-6 flex flex-col flex-1 gap-4">
                <input
                  type="text"
                  value={activeTitle}
                  onChange={(e) => setActiveTitle(e.target.value)}
                  className="w-full text-2xl font-bold text-gray-900 border-none focus:ring-0 p-0 placeholder-gray-300"
                  placeholder="Untitled Role"
                />
                <div className="h-px bg-gray-100 w-full"></div>
                <textarea
                  value={activeDescription}
                  onChange={(e) => setActiveDescription(e.target.value)}
                  placeholder="Start writing the detailed description..."
                  className={`w-full flex-1 text-sm text-gray-700 leading-relaxed border-none focus:ring-0 p-0 resize-none transition-colors ${isRefining ? 'text-indigo-400' : ''}`}
                />
                <div className="text-[10px] text-gray-400 font-mono mt-2 flex justify-end gap-4 uppercase tracking-widest">
                  <span>ID: {currentJob.id.slice(0, 20)}</span>
                  <span>Length: {activeDescription.length} chars</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30">
                <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                   <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <h4 className="text-gray-900 font-semibold mb-1">Editor is empty</h4>
                <p className="text-sm text-gray-400 max-w-xs">Select a job from your library or create a new draft to start refining your requirements.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* SCREENING QUESTIONS — full width below the grid */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Screening Questions
              </h3>
              {currentJob && (
                <button onClick={handleAddQuestion} className="p-1 hover:bg-gray-100 rounded-lg text-gray-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
            </div>

            {currentJob ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeQuestions.length > 0 ? (
                  activeQuestions.map((q) => (
                    <div key={q.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 relative group">
                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <input
                        type="text"
                        placeholder="Label (e.g. Years of Python)"
                        value={q.label}
                        onChange={(e) => handleUpdateQuestion(q.id, 'label', e.target.value)}
                        className="w-full bg-transparent text-[11px] font-bold text-gray-900 placeholder-gray-400 border-none focus:ring-0 p-0 mb-1 uppercase tracking-wider"
                      />
                      <input
                        type="text"
                        placeholder="Placeholder for candidate"
                        value={q.placeholder}
                        onChange={(e) => handleUpdateQuestion(q.id, 'placeholder', e.target.value)}
                        className="w-full bg-transparent text-xs text-gray-500 placeholder-gray-300 border-none focus:ring-0 p-0 italic"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 py-2 col-span-full">No screening questions. Click + to add.</p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 text-center py-2 italic">Load a job to manage questions.</p>
            )}
      </div>
    </div>
  );
}