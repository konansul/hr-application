import { useState, useEffect, useRef } from 'react';
import { jobsApi, screeningApi, authApi, documentsApi } from '../api';

const HIRING_STAGES = [
  'APPLIED',
  'SHORTLISTED',
  'HR_INTERVIEW',
  'TECH_INTERVIEW',
  'OFFER',
  'REJECTED'
];

export function JobsTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Реф для скрытого инпута загрузки файла
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsData, myAppsData, userData] = await Promise.all([
          jobsApi.list(),
          screeningApi.getMyApplications(), // Твой новый эндпоинт для статусов
          authApi.getMe()
        ]);
        setJobs(jobsData);
        setApplications(myAppsData);
        setUser(userData);
      } catch (err) {
        console.error("Failed to load career data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleApplyClick = async (jobId: string) => {
    setApplyingId(jobId);

    try {
      // Проверяем, есть ли уже загруженные документы
      const myDocs = await documentsApi.getMyDocuments();

      if (myDocs.length > 0) {
        // Если резюме уже есть, просто подаем заявку
        await screeningApi.applyToJob(jobId);
        completeApplication();
      } else {
        // Если документов нет, открываем окно выбора файла
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error checking profile");
      setApplyingId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !applyingId) return;

    try {
      // 1. Загружаем и парсим CV (это создаст Document, Person и Resume на бэкенде)
      await documentsApi.upload(file);

      // 2. Теперь, когда профиль создан, подаем заявку на выбранную вакансию
      await screeningApi.applyToJob(applyingId);

      completeApplication();
    } catch (err) {
      alert("Failed to process CV. Please try again.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const completeApplication = async () => {
    alert("Success! Your CV has been processed and sent to HR.");
    const updatedApps = await screeningApi.getMyApplications();
    setApplications(updatedApps);
    setApplyingId(null);
  };

  const getStatusIndex = (status: string) => {
    const s = status?.toUpperCase();
    return HIRING_STAGES.indexOf(s);
  };

  const getStatusStyles = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'APPLIED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'SHORTLISTED': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'HR_INTERVIEW': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'TECH_INTERVIEW': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      case 'OFFER': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'REJECTED': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest text-gray-300 animate-pulse">Loading Opportunities...</div>;

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4">
      {/* Скрытый инпут для мгновенной загрузки при подаче */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.docx,.txt"
        onChange={handleFileUpload}
      />

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Career Hub</h2>
          <p className="text-sm text-gray-500 font-medium italic">Hello, {user?.email}. Track your status below.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {jobs.map((job) => {
          // Важно: сравниваем ID вакансии из списка и из заявок
          const userApp = applications.find(a => a.job_id === (job.id || job.job_id));
          const isExpanded = expandedJobId === (job.id || job.job_id);
          const currentStageIdx = userApp ? getStatusIndex(userApp.status) : -1;
          const isRejected = userApp?.status?.toUpperCase() === 'REJECTED';

          return (
            <div key={job.id || job.job_id} className="bg-white rounded-[45px] border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
              <div className="p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <h3 className="text-3xl font-black text-gray-900 leading-none">{job.title}</h3>
                    {userApp && (
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(userApp.status)}`}>
                        {userApp.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    <span>📍 {job.region || 'Remote'}</span>
                    <span>⏱️ Full-time</span>
                  </div>
                  <p className={`text-sm text-gray-500 leading-relaxed max-w-3xl ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {job.description}
                  </p>
                  <button onClick={() => setExpandedJobId(isExpanded ? null : (job.id || job.job_id))} className="text-[10px] font-black uppercase text-blue-600">
                    {isExpanded ? '↑ Less' : '↓ Details'}
                  </button>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  {userApp ? (
                    <div className="flex flex-col items-center md:items-end gap-3">
                      <div className="bg-emerald-50 text-emerald-600 px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest border border-emerald-100">
                        Applied
                      </div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                        Match Score: {userApp.screening?.score || '0'}%
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApplyClick(job.id || job.job_id)}
                      disabled={applyingId === (job.id || job.job_id)}
                      className="px-12 py-5 bg-gray-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[24px] shadow-2xl transition-all active:scale-95 w-full md:w-auto"
                    >
                      {applyingId === (job.id || job.job_id) ? "Processing..." : "Quick Apply"}
                    </button>
                  )}
                </div>
              </div>

              {/* ROADMAP / STEPPER */}
              {userApp && (
                <div className="px-10 pb-12 pt-6 border-t border-gray-50 bg-gray-50/30 relative">
                  <div className="flex justify-between items-center relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
                    {!isRejected && (
                      <div
                        className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-1000"
                        style={{ width: `${(currentStageIdx / (HIRING_STAGES.length - 2)) * 100}%` }}
                      ></div>
                    )}

                    {HIRING_STAGES.filter(s => s !== 'REJECTED').map((stage, idx) => {
                      const isActive = idx <= currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <div key={stage} className="relative z-10 flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${
                            isCurrent ? 'bg-blue-600 border-white scale-125 shadow-xl' : 
                            isActive ? 'bg-blue-500 border-white' : 'bg-white border-gray-200'
                          }`}>
                            {isActive ? (
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : <span className="text-[10px] font-bold text-gray-400">{idx + 1}</span>}
                          </div>
                          <span className={`absolute -bottom-8 text-[9px] font-black uppercase whitespace-nowrap ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>
                            {stage.replace('_', ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {isRejected && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
                      <div className="bg-red-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl">
                        Application Rejected
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}