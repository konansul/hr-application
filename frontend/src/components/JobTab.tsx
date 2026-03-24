import { useState, useEffect, type FormEvent } from 'react';
import { jobsApi } from '../api';
import { useStore } from '../store';

interface Job {
  id: string;
  title: string;
  description: string;
}

export function JobTab({ setGlobalJobDescription }: { setGlobalJobDescription: (desc: string) => void }) {
  const token = localStorage.getItem('auth_token');
  const { setGlobalJobId, setGlobalJobTitle } = useStore();

  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [currentJob, setCurrentJob] = useState<Job | null>(() => {
    const saved = localStorage.getItem('job_workspace_current');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTitle, setActiveTitle] = useState(() => {
    return localStorage.getItem('job_workspace_title') || '';
  });

  const [activeDescription, setActiveDescription] = useState(() => {
    return localStorage.getItem('job_workspace_desc') || '';
  });

  useEffect(() => {
    if (currentJob) {
      localStorage.setItem('job_workspace_current', JSON.stringify(currentJob));
      setGlobalJobId(currentJob.id);
    } else {
      localStorage.removeItem('job_workspace_current');
      setGlobalJobId('');
    }
    localStorage.setItem('job_workspace_title', activeTitle);
    localStorage.setItem('job_workspace_desc', activeDescription);

    setGlobalJobDescription(activeDescription);
    setGlobalJobTitle(activeTitle);
  }, [currentJob, activeTitle, activeDescription, setGlobalJobDescription, setGlobalJobId, setGlobalJobTitle]);

  const fetchJobs = async () => {
    try {
      const data = await jobsApi.list();
      setJobs(data);
      if (data.length > 0 && !selectedJobId) {
        setSelectedJobId(data[0].id);
      }
    } catch (err: any) {
      console.error("Could not load jobs", err);
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

      setMessage("Draft created and loaded to workspace.");
      setDraftTitle('');
      setDraftDescription('');
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Create failed');
    }
  };

  const handleRefineWithAI = async () => {
    if (!activeTitle || !activeDescription) return;

    setIsRefining(true);
    setError(null);
    try {
      const data = await jobsApi.refine(activeTitle, activeDescription);
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

  const handleSaveChanges = async () => {
    if (!currentJob) return;

    setIsSaving(true);
    setError(null);
    try {
      const updatedJob = await jobsApi.update(currentJob.id, activeTitle, activeDescription);
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

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm min-h-[650px] flex flex-col overflow-hidden">

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
                  <span>ID: {currentJob.id.slice(0, 8)}</span>
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
    </div>
  );
}