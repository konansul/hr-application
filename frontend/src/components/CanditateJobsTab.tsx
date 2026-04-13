import { useState, useEffect, useRef } from 'react';
import { jobsApi, screeningApi, authApi, documentsApi } from '../api';

const LEVELS = ['All', 'Junior', 'Middle', 'Senior', 'Lead'];

export function JobsTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [selectedLevel, setSelectedLevel] = useState<string>('All');

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
      alert(err.response?.data?.detail || "Error processing application");
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
      alert("Failed to process CV.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const completeApplication = async () => {
    const updatedApps = await screeningApi.getMyApplications();
    setApplications(updatedApps);
    setApplyingJob(null);
    setAnswers({});
    alert("Application submitted successfully!");
  };

  const getStatusNormalized = (status: string) => status?.toUpperCase().replace(/ /g, '_') || '';

  const getStatusStyles = (status: string) => {
    const s = getStatusNormalized(status);
    if (s.includes('APPL')) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (s.includes('OFFER') || s.includes('HIRE')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s.includes('REJECT') || s.includes('FAIL')) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  };

  // Фильтруем вакансии по грейду (уровню)
  const displayedJobs = jobs.filter(job => {
    if (selectedLevel === 'All') return true;
    return job.level === selectedLevel;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 border border-gray-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Loading Opportunities...</h3>
        <p className="text-sm text-gray-500">Please wait while we fetch the latest jobs.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Explore Jobs </h2>
          <p className="text-sm text-gray-500">Hello, {user?.email}. Discover your next challenge.</p>
        </div>

        {/* --- ФИЛЬТРЫ ПО УРОВНЯМ (JOB LEVELING) --- */}
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                selectedLevel === level 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {displayedJobs.length === 0 ? (
           <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
             <p className="text-gray-500 font-medium">No jobs found for the selected level.</p>
           </div>
        ) : (
          displayedJobs.map((job) => {
            const jid = job.id || job.job_id;
            const userApp = applications.find(a => a.job_id === jid);
            const isExpanded = expandedJobId === jid;

            // ДИНАМИЧЕСКИЕ ЭТАПЫ (Извлекаем из вакансии, либо дефолтные)
            const jobStages = job.pipeline_stages && job.pipeline_stages.length > 0
              ? job.pipeline_stages
              : ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED'];

            const normalizedStatus = userApp ? getStatusNormalized(userApp.status) : '';
            // Находим индекс текущего статуса в массиве этапов вакансии
            const stageIndex = jobStages.indexOf(normalizedStatus);
            const currentStageIdx = stageIndex >= 0 ? stageIndex : 0;

            const isRejected = normalizedStatus.includes('REJECT') || normalizedStatus.includes('FAIL');
            const isOffer = normalizedStatus.includes('OFFER') || normalizedStatus.includes('HIRE') || normalizedStatus.includes('ACCEPT');

            // Убираем этап отказа из визуального прогресс-бара, чтобы он не рисовался как последняя "успешная" точка
            const displayStages = jobStages.filter((s: string) => !s.includes('REJECT') && !s.includes('FAIL'));

            return (
              <div key={jid} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                      {userApp && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(userApp.status)}`}>
                          {userApp.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 text-xs font-medium text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {job.region || 'Remote'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Full-time
                      </span>
                      {/* БЕЙДЖ ГРЕЙДА */}
                      {job.level && (
                        <span className="flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold uppercase tracking-widest text-[9px]">
                          {job.level}
                        </span>
                      )}
                    </div>

                    <p className={`text-sm text-gray-600 leading-relaxed max-w-3xl whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {job.description}
                    </p>

                    <button onClick={() => setExpandedJobId(isExpanded ? null : jid)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                      {isExpanded ? 'Show Less' : 'View Details'}
                    </button>
                  </div>

                  <div className="shrink-0 w-full md:w-auto">
                    {userApp ? (
                      <div className="flex flex-col items-center md:items-end gap-2">
                        <div className="bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-200">
                          Application Submitted
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyClick(job)}
                        className="w-full md:w-auto px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]"
                      >
                        Quick Apply
                      </button>
                    )}
                  </div>
                </div>

                {/* --- ДИНАМИЧЕСКИЙ ПРОГРЕСС-БАР --- */}
                {userApp && (
                  <div className="px-6 md:px-12 py-8 border-t border-gray-100 bg-gray-50/50 relative overflow-x-auto custom-scrollbar">
                    <div className="flex justify-between items-center relative min-w-[500px] max-w-3xl mx-auto">
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full"></div>
                      <div
                        className={`absolute top-1/2 left-0 h-1 ${isRejected ? 'bg-red-500' : isOffer ? 'bg-emerald-500' : 'bg-indigo-500'} -translate-y-1/2 z-0 transition-all duration-1000 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, (currentStageIdx / (displayStages.length - 1)) * 100))}%` }}
                      ></div>

                      {displayStages.map((stage: string, idx: number) => {
                        const isActive = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        let dotClass = 'bg-white border-gray-300';
                        let textClass = 'text-gray-400';

                        if (isCurrent) {
                          dotClass = isRejected ? 'bg-white border-red-500 shadow-sm' : isOffer ? 'bg-white border-emerald-500 shadow-sm' : 'bg-white border-indigo-500 shadow-sm';
                          textClass = isRejected ? 'text-red-600' : isOffer ? 'text-emerald-600' : 'text-indigo-600';
                        } else if (isActive) {
                          dotClass = isRejected ? 'bg-red-500 border-red-500' : isOffer ? 'bg-emerald-500 border-emerald-500' : 'bg-indigo-500 border-indigo-500';
                          textClass = 'text-white';
                        }

                        return (
                          <div key={stage} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${dotClass}`}>
                              {isActive && !isCurrent ? (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              ) : <span className={`text-xs font-bold ${textClass}`}>{idx + 1}</span>}
                            </div>
                            <span className={`absolute -bottom-6 text-[9px] font-bold uppercase whitespace-nowrap tracking-wider ${isCurrent ? (isRejected ? 'text-red-700' : isOffer ? 'text-emerald-700' : 'text-gray-900') : 'text-gray-400'}`}>
                              {stage.replace(/_/g, ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {isRejected && (
                      <div className="absolute inset-0 bg-red-50/80 backdrop-blur-sm flex items-center justify-center z-20">
                        <div className="bg-white text-red-600 border border-red-500 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           Application Rejected
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Application Form</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">For {applyingJob.title}</p>
              </div>
              <button
                onClick={() => {setShowQuestionnaire(false); setApplyingJob(null);}}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 bg-white">
              {applyingJob.questions_to_render?.map((q: any, idx: number) => (
                <div key={q.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 transition-colors hover:border-gray-200 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-sm">
                  <label className="flex items-center gap-2 mb-3">
                     <span className="w-5 h-5 rounded-md bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {idx + 1}
                     </span>
                     <span className="text-sm font-semibold text-gray-700">{q.label}</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Type your answer here..."
                    onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-3">
              <button
                onClick={() => {setShowQuestionnaire(false); setApplyingJob(null);}}
                className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                 Cancel
              </button>
              <button
                onClick={handleQuestionnaireSubmit}
                className="flex-[2] py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 shadow-sm transition-all active:scale-[0.98]"
              >
                 Submit Answers
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}