import { useState, useEffect, type FormEvent } from 'react';
import { jobsApi } from '../../../api';
import { useStore } from '../../../store';
import { DICT } from '../../../internationalization.ts';

interface ScreeningQuestion {
  id: string;
  label: string;
  placeholder: string;
}

interface JobRequirements {
  workFormat: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
  willingToRelocate: boolean;
  remoteCountryRestriction: string;
  officeDaysRequired: string;
  timeZoneMatch: string;
  openToDifferentTimeZone: boolean;
  visaSponsorship: boolean;
  validWorkPermitRequired: boolean;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  salaryExpectationRequired: boolean;
  maxNoticePeriod: string;
  immediateStartRequired: boolean;
  minExperienceYears: string;
  maxExperienceYears: string;
  requiredSeniority: string;
  mandatorySkills: string;
  mandatoryTechnologies: string;
  minEducation: string;
  degreeField: string;
  mandatoryCertifications: string;
  willingToTravel: boolean;
  drivingLicense: boolean;
  languageRequirements: string;
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
  requirements?: JobRequirements;
}

const LEVELS = ['Junior', 'Middle', 'Senior', 'Lead'];
const REGIONS = ['Global', 'US', 'EU', 'Asia'];

const DEFAULT_REQUIREMENTS: JobRequirements = {
  workFormat: 'Any',
  willingToRelocate: false,
  remoteCountryRestriction: '',
  officeDaysRequired: '',
  timeZoneMatch: '',
  openToDifferentTimeZone: false,
  visaSponsorship: false,
  validWorkPermitRequired: true,
  salaryMin: '',
  salaryMax: '',
  currency: 'USD',
  salaryExpectationRequired: false,
  maxNoticePeriod: '',
  immediateStartRequired: false,
  minExperienceYears: '',
  maxExperienceYears: '',
  requiredSeniority: 'Any',
  mandatorySkills: '',
  mandatoryTechnologies: '',
  minEducation: 'Any',
  degreeField: '',
  mandatoryCertifications: '',
  willingToTravel: false,
  drivingLicense: false,
  languageRequirements: ''
};

export function JobTab({ setGlobalJobDescription }: { setGlobalJobDescription: (desc: string) => void }) {
  const token = localStorage.getItem('auth_token');
  const { setGlobalJobId, setGlobalJobTitle, language, aiQuota, aiUsed, setAiLimits } = useStore();

  const t = DICT[language as keyof typeof DICT]?.jobsHr || DICT.en.jobsHr;

  const [initialTargetId] = useState(() => {
    const match = window.location.pathname.match(/\/jobs\/([^/?#]+)/);
    return match ? match[1] : null;
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [filterRegion, setFilterRegion] = useState<string>('All');

  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeDescription, setActiveDescription] = useState('');
  const [activeLevel, setActiveLevel] = useState('Middle');
  const [activeStatus, setActiveStatus] = useState<JobStatus>('active');
  const [activeRegion, setActiveRegion] = useState('Global');
  const [activeQuestions, setActiveQuestions] = useState<ScreeningQuestion[]>([]);
  const [activeRequirements, setActiveRequirements] = useState<JobRequirements>(DEFAULT_REQUIREMENTS);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftLevel, setDraftLevel] = useState('Middle');
  const [draftRegion, setDraftRegion] = useState('Global');

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
      const data: Job[] = await jobsApi.list();
      setJobs(data);

      if (data.length > 0) {
        if (!selectedJobId && !currentJob) {
          const jobToLoad = initialTargetId ? data.find((j: Job) => j.id === initialTargetId) : null;
          if (jobToLoad) {
            handleLoadJob(jobToLoad);
          } else {
            handleLoadJob(data[0]);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchJobs();
  }, [token]);

  const filteredJobs = jobs.filter((job: Job) => {
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
    setActiveRequirements(jobToLoad.requirements ?? DEFAULT_REQUIREMENTS);
    setError(null);
    window.history.replaceState(null, '', `/hr/jobs/${jobToLoad.id}`);
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
      setActiveRequirements(DEFAULT_REQUIREMENTS);
      setMessage(t.success || "New active job created and loaded to workspace.");
      setDraftTitle('');
      setDraftDescription('');
      setDraftLevel('Middle');
      setDraftRegion('Global');
      setIsCreateModalOpen(false);
      fetchJobs();
      window.history.replaceState(null, '', `/hr/jobs/${newJob.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Create failed');
    }
  };

  const handleAddQuestion = () => {
    const newQ: ScreeningQuestion = { id: `q_${Date.now()}`, label: '', placeholder: 'e.g. Years of React?' };
    setActiveQuestions([...activeQuestions, newQ]);
  };

  const handleUpdateQuestion = (id: string, field: keyof ScreeningQuestion, value: string) => {
    setActiveQuestions(activeQuestions.map((q: ScreeningQuestion) => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleRemoveQuestion = (id: string) => {
    setActiveQuestions(activeQuestions.filter((q: ScreeningQuestion) => q.id !== id));
  };

  const handleUpdateRequirement = (field: keyof JobRequirements, value: any) => {
    setActiveRequirements(prev => ({ ...prev, [field]: value }));
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
        setMessage(t.aiSuccess);
      }
      if (data.extracted_requirements) {
         setActiveRequirements(prev => ({...prev, ...data.extracted_requirements}));
      }
      setAiLimits(aiQuota, aiUsed + 1);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError("⏳ Daily AI limit reached. Resets at midnight.");
      } else {
        setError(err.response?.data?.detail || 'AI Refinement failed');
      }
    } finally {
      setIsRefining(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!currentJob) return;
    if (!window.confirm(t.deleteConfirm.replace('{title}', currentJob.title))) return;
    try {
      await jobsApi.delete(currentJob.id);
      setCurrentJob(null);
      setActiveTitle('');
      setActiveDescription('');
      setActiveQuestions([]);
      setActiveRequirements(DEFAULT_REQUIREMENTS);
      setJobs(prev => prev.filter((j: Job) => j.id !== currentJob.id));
      setSelectedJobId('');
      window.history.replaceState(null, '', '/hr/jobs');
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
         screening_questions: activeQuestions,
         requirements: activeRequirements
      } as any);
      setCurrentJob(updatedJob);
      setMessage(t.success);
      fetchJobs();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!currentJob) return;
    const url = `${window.location.origin}/p/jobs/${currentJob.id}`;
    navigator.clipboard.writeText(url);
    setMessage("Public job link copied to clipboard!");
    setTimeout(() => setMessage(null), 3000);
  };

  const shareJob = (platform: string) => {
    if (!currentJob) return;

    const url = `${window.location.origin}/p/jobs/${currentJob.id}`;
    const salary = activeRequirements.salaryMin && activeRequirements.salaryMax
      ? `\n💰 Salary: ${activeRequirements.salaryMin}-${activeRequirements.salaryMax} ${activeRequirements.currency}`
      : '';
    const format = activeRequirements.workFormat !== 'Any'
      ? `\n📍 Format: ${activeRequirements.workFormat}`
      : '';

    const text = `We are hiring a ${activeTitle}!${format}${salary}\n\nApply here:`;

    let shareUrl = '';
    switch (platform) {
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }

    if (shareUrl) window.open(shareUrl, '_blank');
    setIsShareMenuOpen(false);
  };

  const getStatusBadgeStyles = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      case 'closed': return 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-500 border-gray-200 dark:border-neutral-700';
      case 'suspended': return 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
      default: return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl max-w-2xl mx-auto mt-10 transition-colors">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{(t as any).authRequired || "Authentication Required"}</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{(t as any).authPrompt || "Please login to manage job descriptions."}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-6 animate-in fade-in duration-300 pb-20 relative transition-colors">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-gray-100 dark:border-neutral-800 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">{t.title}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 dark:text-neutral-600 uppercase tracking-widest mr-1">{t.filters.label}</span>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer">
              <option value="All">{t.filters.allStatuses}</option>
              <option value="active">{(t as any).statusNames?.active || 'Active'}</option>
              <option value="draft">{(t as any).statusNames?.draft || 'Draft'}</option>
              <option value="suspended">{(t as any).statusNames?.suspended || 'Suspended'}</option>
              <option value="closed">{(t as any).statusNames?.closed || 'Closed'}</option>
            </select>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer">
              <option value="All">{t.filters.allLevels}</option>
              {LEVELS.map((l: string) => <option key={l} value={l}>{(t as any).levels?.[l] || l}</option>)}
            </select>
            <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer">
              <option value="All">{t.filters.allLocations}</option>
              {REGIONS.map((r: string) => <option key={r} value={r}>{(t as any).regions?.[r] || r}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-sm transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t.createBtn}
        </button>
      </div>

      {(message || error) && (
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 transition-colors animate-in slide-in-from-top-2 ${error ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={error ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
          {message || error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 flex flex-col gap-6 h-[800px] sticky top-6">
          <div className={`bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl shadow-sm flex flex-col overflow-hidden transition-all ${currentJob ? 'h-[50%]' : 'h-full'}`}>
            <div className="flex items-center px-4 py-3 bg-gray-50 dark:bg-neutral-950 border-b border-gray-100 dark:border-neutral-800 text-[10px] font-bold text-gray-500 dark:text-neutral-500 uppercase tracking-widest shrink-0">
              <div className="flex-1">{t.listHeaders.name}</div>
              <div className="w-16 text-center">{t.listHeaders.status}</div>
              <div className="w-12 text-right">{t.listHeaders.loc}</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job: Job) => {
                  const isSelected = selectedJobId === job.id;
                  return (
                    <button key={job.id} onClick={() => handleLoadJob(job)} className={`flex items-center w-full text-left px-3 py-3 rounded-xl border transition-all duration-200 group ${isSelected ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white shadow-md' : 'bg-white dark:bg-neutral-900 border-transparent hover:bg-gray-50 dark:hover:bg-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700'}`}>
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-white dark:text-black' : 'text-gray-900 dark:text-white'}`}>{job.title}</h4>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-gray-400 dark:text-neutral-500' : 'text-gray-400 dark:text-neutral-500'}`}>
                          {(t as any).levels?.[job.level || 'Middle'] || job.level || 'Middle'}
                        </p>
                      </div>
                      <div className="w-16 flex justify-center shrink-0">
                        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${isSelected && job.status !== 'closed' ? 'bg-gray-800 dark:bg-neutral-200 text-gray-200 dark:text-neutral-700 border-transparent' : getStatusBadgeStyles(job.status)}`}>
                          {(t as any).statusNames?.[job.status || 'draft'] || job.status || 'draft'}
                        </span>
                      </div>
                      <div className={`w-12 text-right text-[10px] font-semibold shrink-0 ${isSelected ? 'text-gray-300 dark:text-neutral-400' : 'text-gray-500 dark:text-neutral-500'}`}>
                        {job.region === 'Global' ? 'GLB' : job.region}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-gray-400 dark:text-neutral-600 italic text-center py-10 px-4">{t.noJobDesc}</div>
              )}
            </div>
          </div>
          {currentJob && (
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl shadow-sm flex flex-col h-[50%] overflow-hidden transition-colors">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-950 shrink-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.questions.title}</h3>
                <button onClick={handleAddQuestion} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 text-xs font-bold rounded-lg transition-colors shadow-sm">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {t.questions.addBtn}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/30 dark:bg-black/20">
                {activeQuestions.length > 0 ? (
                  activeQuestions.map((q: ScreeningQuestion, idx: number) => (
                    <div key={q.id} className="p-3 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-800 relative group transition-colors shadow-sm">
                      <div className="absolute top-3 left-3 w-4 h-4 bg-gray-100 dark:bg-neutral-800 rounded flex items-center justify-center text-[9px] font-bold text-gray-500">
                        {idx + 1}
                      </div>
                      <button onClick={() => handleRemoveQuestion(q.id)} className="absolute top-2 right-2 p-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="pl-6 pr-4 space-y-1.5">
                        <input type="text" placeholder={t.questions.placeholder} value={q.label} onChange={(e) => handleUpdateQuestion(q.id, 'label', e.target.value)} className="w-full bg-transparent text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-600 border-none focus:ring-0 p-0 outline-none" />
                        <input type="text" placeholder={t.questions.hintPlaceholder} value={q.placeholder} onChange={(e) => handleUpdateQuestion(q.id, 'placeholder', e.target.value)} className="w-full bg-transparent text-[10px] text-gray-500 dark:text-neutral-500 placeholder-gray-300 dark:placeholder-neutral-700 border-none focus:ring-0 p-0 outline-none" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-4">
                      <p className="text-xs text-gray-400 dark:text-neutral-600 font-medium">{t.questions.empty}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl shadow-sm flex flex-col overflow-hidden h-[800px] transition-colors">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${currentJob ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-neutral-700'}`}></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.workspace}</h3>
              </div>
              {currentJob && (
                <div className="flex flex-wrap gap-2">

                  <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Copy Link
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Share Job
                    </button>

                    {isShareMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsShareMenuOpen(false)}></div>
                        {/* Меню с right-0, чтобы открывалось влево и не обрезалось */}
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={() => shareJob('linkedin')} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-3 transition-colors">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                             LinkedIn
                          </button>
                          <button onClick={() => shareJob('telegram')} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-3 transition-colors border-t border-gray-50 dark:border-neutral-800/50">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a5.96 5.96 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.123-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.667 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                             Telegram
                          </button>
                          <button onClick={() => shareJob('twitter')} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white flex items-center gap-3 transition-colors border-t border-gray-50 dark:border-neutral-800/50">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                             X (Twitter)
                          </button>
                          <button onClick={() => shareJob('whatsapp')} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-3 transition-colors border-t border-gray-50 dark:border-neutral-800/50">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                             WhatsApp
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={() => setIsRequirementsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-500 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs font-bold transition-all shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    Requirements
                  </button>
                  <button onClick={handleRefineWithAI} disabled={isRefining} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                    {isRefining ? t.aiWorking : t.aiRewrite}
                  </button>
                  <button onClick={handleSaveChanges} disabled={isSaving} className="px-5 py-1.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm">
                    {isSaving ? t.saving : t.saveChanges}
                  </button>
                </div>
              )}
            </div>
            {currentJob ? (
              <div className="p-6 flex flex-col flex-1 gap-5 overflow-hidden">
                <div className="flex flex-col xl:flex-row xl:items-start gap-4 justify-between shrink-0">
                  <input type="text" value={activeTitle} onChange={(e) => setActiveTitle(e.target.value)} className="flex-1 text-3xl font-bold text-gray-900 dark:text-white border-none focus:ring-0 p-0 placeholder-gray-300 dark:placeholder-neutral-700 bg-transparent" placeholder={t.untitled} />
                  <div className="flex flex-wrap items-center gap-2 shrink-0 bg-gray-50 dark:bg-black p-1.5 rounded-2xl border border-gray-100 dark:border-neutral-800 transition-colors">
                    <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value as JobStatus)} className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer transition-colors ${getStatusBadgeStyles(activeStatus)}`}>
                      <option value="draft">{(t as any).statusNames?.draft?.toUpperCase() || 'DRAFT'}</option>
                      <option value="active">{(t as any).statusNames?.active?.toUpperCase() || 'ACTIVE'}</option>
                      <option value="suspended">{(t as any).statusNames?.suspended?.toUpperCase() || 'SUSPENDED'}</option>
                      <option value="closed">{(t as any).statusNames?.closed?.toUpperCase() || 'CLOSED'}</option>
                    </select>
                    <div className="w-px h-6 bg-gray-200 dark:bg-neutral-800 mx-1"></div>
                    <select value={activeLevel} onChange={(e) => setActiveLevel(e.target.value)} className="px-2 py-1.5 text-[10px] font-bold uppercase text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer shadow-sm">
                        {LEVELS.map((l: string) => <option key={l} value={l}>{(t as any).levels?.[l] || l}</option>)}
                    </select>
                    <select value={activeRegion} onChange={(e) => setActiveRegion(e.target.value)} className="px-2 py-1.5 text-[10px] font-bold uppercase text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer shadow-sm">
                        {REGIONS.map((r: string) => <option key={r} value={r}>{(t as any).regions?.[r] || r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="h-px bg-gray-100 dark:bg-neutral-800 w-full shrink-0"></div>
                <textarea value={activeDescription} onChange={(e) => setActiveDescription(e.target.value)} placeholder="Start writing the detailed description..." className={`w-full flex-1 text-sm text-gray-700 dark:text-neutral-300 leading-relaxed border-none focus:ring-0 p-0 resize-none transition-colors custom-scrollbar bg-transparent outline-none ${isRefining ? 'text-indigo-400 dark:text-indigo-500' : ''}`} />
                <div className="pt-4 border-t border-gray-100 dark:border-neutral-800 flex justify-between items-center text-[10px] text-gray-400 dark:text-neutral-600 font-mono uppercase tracking-widest shrink-0 transition-colors">
                  <button onClick={handleDeleteJob} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors font-bold">
                    {t.deleteBtn}
                  </button>
                  <div className="flex gap-4">
                    <span>ID: {currentJob.id.slice(0, 15)}</span>
                    <span>Length: {activeDescription.length}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30 dark:bg-black/20 transition-colors">
                <div className="w-20 h-20 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-3xl flex items-center justify-center shadow-sm mb-5 transition-colors">
                   <svg className="w-10 h-10 text-gray-300 dark:text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h4 className="text-lg text-gray-900 dark:text-white font-bold mb-2">{t.noJobSelected}</h4>
                <p className="text-sm text-gray-500 dark:text-neutral-500 max-w-sm">{t.noJobDesc}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isRequirementsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in transition-colors">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-neutral-800">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-950 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Strict Job Requirements</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">These parameters act as hard filters for the AI engine.</p>
              </div>
              <button onClick={() => setIsRequirementsModalOpen(false)} className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">1. Location & Work Setup</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Work Format</label>
                    <select value={activeRequirements.workFormat} onChange={(e) => handleUpdateRequirement('workFormat', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">
                      <option value="Any">Any</option><option value="Remote">Remote</option><option value="Hybrid">Hybrid</option><option value="On-site">On-site</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Remote Restriction (Country)</label>
                    <input type="text" placeholder="e.g. Only US or EU" value={activeRequirements.remoteCountryRestriction} onChange={(e) => handleUpdateRequirement('remoteCountryRestriction', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Office Days (If Hybrid/On-site)</label>
                    <input type="text" placeholder="e.g. 3 days office" value={activeRequirements.officeDaysRequired} onChange={(e) => handleUpdateRequirement('officeDaysRequired', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Timezone Required</label>
                    <input type="text" placeholder="e.g. CET +/- 2 hours" value={activeRequirements.timeZoneMatch} onChange={(e) => handleUpdateRequirement('timeZoneMatch', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div className="flex flex-col justify-center gap-2 mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={activeRequirements.willingToRelocate} onChange={(e) => handleUpdateRequirement('willingToRelocate', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Willing to Relocate</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={activeRequirements.openToDifferentTimeZone} onChange={(e) => handleUpdateRequirement('openToDifferentTimeZone', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Open to different timezone</span>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">2. Work Authorization</h4>
                <div className="flex flex-col sm:flex-row gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={activeRequirements.visaSponsorship} onChange={(e) => handleUpdateRequirement('visaSponsorship', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Company provides Visa Sponsorship</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={activeRequirements.validWorkPermitRequired} onChange={(e) => handleUpdateRequirement('validWorkPermitRequired', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Valid Work Permit Required</span>
                  </label>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">3. Salary & Compensation</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Min Salary</label>
                    <input type="number" placeholder="e.g. 50000" value={activeRequirements.salaryMin} onChange={(e) => handleUpdateRequirement('salaryMin', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Max Salary</label>
                    <input type="number" placeholder="e.g. 80000" value={activeRequirements.salaryMax} onChange={(e) => handleUpdateRequirement('salaryMax', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Currency</label>
                    <input type="text" placeholder="e.g. USD, EUR" value={activeRequirements.currency} onChange={(e) => handleUpdateRequirement('currency', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div className="flex items-center mt-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={activeRequirements.salaryExpectationRequired} onChange={(e) => handleUpdateRequirement('salaryExpectationRequired', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Reject if expectations missing</span>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">4. Availability</h4>
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Max Notice Period</label>
                    <input type="text" placeholder="e.g. 1 month, 2 weeks" value={activeRequirements.maxNoticePeriod} onChange={(e) => handleUpdateRequirement('maxNoticePeriod', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer w-full sm:w-1/2 mt-4 sm:mt-0">
                    <input type="checkbox" checked={activeRequirements.immediateStartRequired} onChange={(e) => handleUpdateRequirement('immediateStartRequired', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Immediate Start Required</span>
                  </label>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">5. Experience & Seniority</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Min Years Exp.</label>
                    <input type="number" min="0" placeholder="Reject if fewer" value={activeRequirements.minExperienceYears} onChange={(e) => handleUpdateRequirement('minExperienceYears', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Max Years Exp.</label>
                    <input type="number" min="0" placeholder="Overqualified filter" value={activeRequirements.maxExperienceYears} onChange={(e) => handleUpdateRequirement('maxExperienceYears', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Required Seniority</label>
                    <select value={activeRequirements.requiredSeniority} onChange={(e) => handleUpdateRequirement('requiredSeniority', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">
                      <option value="Any">Any</option><option value="Junior">Junior</option><option value="Middle">Middle</option><option value="Senior">Senior</option><option value="Lead">Lead</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">6. Skills & Keywords</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Mandatory Skills (Comma separated)</label>
                    <input type="text" placeholder="e.g. Sales, Negotiation, B2B" value={activeRequirements.mandatorySkills} onChange={(e) => handleUpdateRequirement('mandatorySkills', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Mandatory Technologies</label>
                    <input type="text" placeholder="e.g. React, Node.js, AWS" value={activeRequirements.mandatoryTechnologies} onChange={(e) => handleUpdateRequirement('mandatoryTechnologies', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">7. Education & Qualifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Min Education</label>
                    <select value={activeRequirements.minEducation} onChange={(e) => handleUpdateRequirement('minEducation', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">
                      <option value="Any">Any</option><option value="High School">High School</option><option value="Bachelor">Bachelor's Degree</option><option value="Master">Master's Degree</option><option value="PhD">PhD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Required Degree Field</label>
                    <input type="text" placeholder="e.g. Computer Science" value={activeRequirements.degreeField} onChange={(e) => handleUpdateRequirement('degreeField', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Mandatory Certifications</label>
                    <input type="text" placeholder="e.g. AWS Certified, PMP" value={activeRequirements.mandatoryCertifications} onChange={(e) => handleUpdateRequirement('mandatoryCertifications', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-neutral-800 pb-2 mb-4">8. Job Specific Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-3 justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={activeRequirements.willingToTravel} onChange={(e) => handleUpdateRequirement('willingToTravel', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Willing to travel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={activeRequirements.drivingLicense} onChange={(e) => handleUpdateRequirement('drivingLicense', e.target.checked)} className="rounded text-gray-900 focus:ring-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Driving License Required</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Language Requirements</label>
                    <input type="text" placeholder="e.g. English C1, German B2" value={activeRequirements.languageRequirements} onChange={(e) => handleUpdateRequirement('languageRequirements', e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-neutral-500" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 shrink-0 flex justify-end">
              <button onClick={() => setIsRequirementsModalOpen(false)} className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-sm hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all">
                Close & Keep Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in transition-colors">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-neutral-800">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-950 transition-colors">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.modal.title}</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t.modal.jobTitle}</label>
                <input type="text" placeholder="e.g. Senior Frontend Engineer" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-neutral-600" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t.modal.level}</label>
                  <select value={draftLevel} onChange={(e) => setDraftLevel(e.target.value)} className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all cursor-pointer dark:text-white">
                    {LEVELS.map((l: string) => <option key={l} value={l}>{(t as any).levels?.[l] || l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t.modal.location}</label>
                  <select value={draftRegion} onChange={(e) => setDraftRegion(e.target.value)} className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all cursor-pointer dark:text-white">
                    {REGIONS.map((r: string) => <option key={r} value={r}>{(t as any).regions?.[r] || r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t.modal.initDesc}</label>
                <textarea placeholder={t.modal.descPlaceholder} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} className="w-full h-32 px-4 py-3 text-sm bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none resize-none transition-all custom-scrollbar dark:text-white placeholder-gray-400 dark:placeholder-neutral-600" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {t.modal.submit}
                </button>
                <p className="text-center text-[10px] text-gray-400 dark:text-neutral-600 mt-3 font-medium">
                  {t.modal.notice}
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}