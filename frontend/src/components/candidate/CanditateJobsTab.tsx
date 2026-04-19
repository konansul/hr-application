import { useState, useEffect, useRef } from 'react';
import { jobsApi, screeningApi, authApi, documentsApi } from '../../api';
import { useStore } from '../../store';
import { DICT } from '../../internationalization.ts';

const LEVEL_KEYS = ['all', 'junior', 'middle', 'senior', 'lead'] as const;

export function JobsTab() {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.jobs || DICT.en.jobs;

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [selectedLevelKey, setSelectedLevelKey] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsData, myAppsData, userData] = await Promise.all([
          jobsApi.list(),
          screeningApi.getMyApplications(),
          authApi.getMe()
        ]);
        setJobs(jobsData);
        setApplications(myAppsData);
        setUser(userData);
      } catch (err) {
        console.error("Failed to load jobs data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleApplyClick = (job: any) => {
    const jid = job.id || job.job_id;
    setApplyingJob(job);
    setAnswers({});

    const rawData = job.screening_questions || job.screening_questions_json;
    let questionsArray: any[] = [];

    if (rawData) {
      if (typeof rawData === 'string') {
        try {
          const parsed = JSON.parse(rawData);
          questionsArray = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          questionsArray = [];
        }
      } else if (Array.isArray(rawData)) {
        questionsArray = rawData;
      }
    }

    if (questionsArray.length > 0) {
      setApplyingJob({ ...job, questions_to_render: questionsArray });
      setShowQuestionnaire(true);
      return;
    }

    proceedWithApplication(jid);
  };

  const handleQuestionnaireSubmit = () => {
    if (!applyingJob) return;
    const jid = applyingJob.id || applyingJob.job_id;
    setShowQuestionnaire(false);
    proceedWithApplication(jid, answers);
  };

  const proceedWithApplication = async (jobId: string, finalAnswers: any = null) => {
    try {
      const myDocs = await documentsApi.getMyDocuments();
      if (myDocs.length > 0) {
        await screeningApi.applyToJob(jobId, finalAnswers);
        completeApplication();
      } else {
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || t.errorMsg);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !applyingJob) return;
    const jid = applyingJob.id || applyingJob.job_id;

    try {
      await documentsApi.upload(file);
      await screeningApi.applyToJob(jid, answers);
      completeApplication();
    } catch (err) {
      alert(t.cvErrorMsg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const completeApplication = async () => {
    const updatedApps = await screeningApi.getMyApplications();
    setApplications(updatedApps);
    setApplyingJob(null);
    setAnswers({});
    alert(t.successMsg);
  };

  const getStatusNormalized = (status: string) => status?.toUpperCase().replace(/ /g, '_') || '';

  const getStatusStyles = (status: string) => {
    const s = getStatusNormalized(status);
    if (s.includes('APPL')) return 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700';
    if (s.includes('OFFER') || s.includes('HIRE') || s.includes('ACCEPT')) return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
    if (s.includes('REJECT') || s.includes('FAIL')) return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50';
    return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30';
  };

  const displayedJobs = jobs.filter(job => {
    const jobLevelKey = job.level?.toLowerCase() || '';
    const matchesLevel = selectedLevelKey === 'all' || jobLevelKey === selectedLevelKey;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl max-w-2xl mx-auto mt-10 transition-colors">
        <div className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t.loadingTitle}</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{t.loadingDesc}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-gray-100 dark:border-neutral-800 pb-6 transition-colors">
        <div className="space-y-4 w-full lg:w-auto">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">{t.title}</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 font-medium">
              {t.subtitle.replace('{name}', user?.email?.split('@')[0] || 'User')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-72">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-500"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl transition-colors">
              {LEVEL_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedLevelKey(key)}
                  className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                    selectedLevelKey === key 
                    ? 'bg-white dark:bg-neutral-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200'
                  }`}
                >
                  {t.levels[key as keyof typeof t.levels]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {displayedJobs.length === 0 ? (
           <div className="text-center py-12 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 transition-colors">
             <p className="text-gray-500 dark:text-neutral-400 font-medium">{t.noJobsFound}</p>
           </div>
        ) : (
          displayedJobs.map((job) => {
            const jid = job.id || job.job_id;
            const userApp = applications.find(a => a.job_id === jid);
            const isExpanded = expandedJobId === jid;

            const displayStages = [t.stages.applied, t.stages.inProgress, t.stages.decision];
            const normalizedStatus = userApp ? getStatusNormalized(userApp.status) : '';

            let currentStageIdx = 0;
            if (normalizedStatus.includes('OFFER') || normalizedStatus.includes('HIRE') || normalizedStatus.includes('REJECT') || normalizedStatus.includes('FAIL') || normalizedStatus.includes('ACCEPT')) {
              currentStageIdx = 2; // Decision
            } else if (normalizedStatus !== '' && !normalizedStatus.includes('APPLIED')) {
              currentStageIdx = 1; // In Progress
            }

            const isRejected = normalizedStatus.includes('REJECT') || normalizedStatus.includes('FAIL');
            const isOffer = normalizedStatus.includes('OFFER') || normalizedStatus.includes('HIRE') || normalizedStatus.includes('ACCEPT');

            return (
              <div key={jid} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      {userApp && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${getStatusStyles(userApp.status)}`}>
                          {userApp.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 text-xs font-medium text-gray-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {job.region || t.remote}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {t.fullTime}
                      </span>
                      {job.level && (
                        <span className="flex items-center px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-md font-bold uppercase tracking-widest text-[9px] transition-colors">
                          {job.level}
                        </span>
                      )}
                    </div>

                    <p className={`text-sm text-gray-600 dark:text-neutral-300 leading-relaxed max-w-3xl whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {job.description}
                    </p>

                    <button onClick={() => setExpandedJobId(isExpanded ? null : jid)} className="text-xs font-bold text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-neutral-300 transition-colors">
                      {isExpanded ? t.showLess : t.viewDetails}
                    </button>
                  </div>

                  <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
                    {userApp ? (
                      <div className="w-full text-center bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-neutral-700 transition-colors">
                        {t.appSubmittedBtn}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyClick(job)}
                        className="w-full md:w-auto px-6 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]"
                      >
                        {t.quickApplyBtn}
                      </button>
                    )}
                  </div>
                </div>

                {userApp && (
                  <div className="px-6 md:px-12 py-8 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 relative overflow-x-auto custom-scrollbar transition-colors">
                    <div className="flex justify-between items-center relative min-w-[500px] max-w-3xl mx-auto">
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-neutral-800 -translate-y-1/2 z-0 rounded-full"></div>
                      <div
                        className={`absolute top-1/2 left-0 h-1 ${isRejected ? 'bg-red-500 dark:bg-red-600' : isOffer ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-indigo-500 dark:bg-white'} -translate-y-1/2 z-0 transition-all duration-1000 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, (currentStageIdx / (displayStages.length - 1)) * 100))}%` }}
                      ></div>

                      {displayStages.map((stage: string, idx: number) => {
                        const isActive = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        let dotClass = 'bg-white dark:bg-black border-gray-300 dark:border-neutral-700';
                        let textClass = 'text-gray-400 dark:text-neutral-500';

                        if (isCurrent) {
                          dotClass = isRejected ? 'bg-white dark:bg-black border-red-500 dark:border-red-600 shadow-sm' : isOffer ? 'bg-white dark:bg-black border-emerald-500 dark:border-emerald-600 shadow-sm' : 'bg-white dark:bg-black border-indigo-500 dark:border-white shadow-sm';
                          textClass = isRejected ? 'text-red-600 dark:text-red-400' : isOffer ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-white';
                        } else if (isActive) {
                          dotClass = isRejected ? 'bg-red-500 dark:bg-red-600 border-red-500 dark:border-red-600' : isOffer ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600' : 'bg-indigo-500 dark:bg-white border-indigo-500 dark:border-white';
                          textClass = isRejected || isOffer ? 'text-white' : 'text-white dark:text-black';
                        }

                        return (
                          <div key={stage} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${dotClass}`}>
                              {isActive && !isCurrent ? (
                                <svg className={`w-4 h-4 ${textClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              ) : <span className={`text-xs font-bold ${textClass}`}>{idx + 1}</span>}
                            </div>
                            <span className={`absolute -bottom-6 text-[9px] font-bold uppercase whitespace-nowrap tracking-wider ${isCurrent ? (isRejected ? 'text-red-700 dark:text-red-400' : isOffer ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white') : 'text-gray-400 dark:text-neutral-500'}`}>
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {isRejected && (
                      <div className="absolute inset-0 bg-red-50/80 dark:bg-red-950/80 backdrop-blur-sm flex items-center justify-center z-20 transition-colors">
                        <div className="bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border border-red-500 dark:border-red-500/50 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           {t.rejectedStamp}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showQuestionnaire && applyingJob && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 flex justify-between items-center transition-colors">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.formTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium mt-1">
                  {t.formSubtitle.replace('{jobTitle}', applyingJob.title)}
                </p>
              </div>
              <button onClick={() => {setShowQuestionnaire(false); setApplyingJob(null);}} className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 bg-white dark:bg-neutral-900 transition-colors">
              {applyingJob.questions_to_render?.map((q: any, idx: number) => (
                <div key={q.id} className="bg-gray-50 dark:bg-neutral-800/30 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 transition-colors hover:border-gray-200 dark:hover:border-neutral-700 focus-within:border-gray-300 dark:focus-within:border-neutral-600 focus-within:bg-white dark:focus-within:bg-neutral-800 focus-within:shadow-sm">
                  <label className="flex items-center gap-2 mb-3">
                     <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors">{idx + 1}</span>
                     <span className="text-sm font-semibold text-gray-700 dark:text-white transition-colors">{q.label}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t.answerPlaceholder}
                    onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-600"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 shrink-0 flex gap-3 transition-colors">
              <button onClick={() => {setShowQuestionnaire(false); setApplyingJob(null);}} className="flex-1 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">
                {t.cancel}
              </button>
              <button onClick={handleQuestionnaireSubmit} className="flex-[2] py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-neutral-200 shadow-sm transition-all active:scale-[0.98]">
                {t.submitAnswers}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}