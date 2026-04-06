import { useState, useRef, useEffect } from 'react';
import { documentsApi, authApi, jobsApi } from '../api';

export function ResumeUploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [parsedResume, setParsedResume] = useState<any>(null);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [userData, docs, jobs, latestResume] = await Promise.all([
          authApi.getMe(),
          documentsApi.getMyDocuments(),
          jobsApi.list(),
          documentsApi.getLatestResume()
        ]);

        setUser(userData);
        setUploadedDocs(docs);
        setActiveJobs(jobs);

        if (latestResume) {
          setParsedResume(latestResume);
        }
      } catch (err) {
        console.error("Initialization failed", err);
      }
    };
    init();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setMessage(null);
    try {
      const response = await documentsApi.upload(file);
      setUploadedDocs((prev) => [response, ...prev]);
      if (response.parsed_data) {
        setParsedResume(response.parsed_data);
      }
      setMessage({ text: 'CV successfully updated!', type: 'success' });
      setFile(null);
    } catch (err: any) {
      setMessage({ text: 'Upload failed', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const InfoTag = ({ label, value }: { label: string; value: any }) => (
    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-semibold text-gray-900 truncate">
        {value === "UNKNOWN" || !value ? <span className="text-gray-400 italic">Not Specified</span> : String(value)}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-32">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Professional Profile</h2>
          <p className="text-sm text-gray-500">AI-powered career dashboard and job matching.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm mb-5 z-10">
              <span className="text-2xl font-bold">
                {parsedResume?.personal_info?.first_name?.[0] || user?.email?.[0].toUpperCase() || '?'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 z-10 mb-1">
              {parsedResume?.personal_info?.first_name ? `${parsedResume.personal_info.first_name} ${parsedResume.personal_info.last_name}` : user?.email}
            </h3>
            <p className="text-sm text-gray-500 font-medium z-10 mb-6">{parsedResume?.personal_info?.city || 'Location Unknown'}</p>

            <div className="w-full space-y-3 z-10 text-left">
              <InfoTag label="Email" value={parsedResume?.personal_info?.email || user?.email} />
              <InfoTag label="Phone" value={parsedResume?.personal_info?.phone} />
              <div className="grid grid-cols-2 gap-3">
                <InfoTag label="Visa" value={parsedResume?.personal_info?.visa_status?.replace(/_/g, ' ')} />
                <InfoTag label="Remote" value={parsedResume?.personal_info?.open_to_remote ? "Yes" : "No"} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Quick Actions
            </h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm"
            >
              Upload New CV
            </button>
            <p className="text-xs text-center text-gray-500 mt-4">History: {uploadedDocs.length} versions</p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">

          <div className="bg-white shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounde2d-full bg-indigo-500"></div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">AI Profile Content</h3>
            </div>

            <div className="p-6">
              {message && (
                <div className={`mb-6 p-4 text-sm rounded-xl border flex items-center gap-2 animate-in slide-in-from-top-2 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {message.type === 'success'
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    }
                  </svg>
                  {message.text}
                </div>
              )}

              {!parsedResume && !isUploading ? (
                <div
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer h-64"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">No data found</p>
                  <p className="text-xs text-gray-500 text-center">Please upload your CV to generate your AI profile</p>
                </div>
              ) : (
                parsedResume && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Experience
                      </p>
                      {parsedResume.experience?.map((exp: any, i: number) => (
                        <div key={i} className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">{exp.title} @ {exp.company}</h4>
                          <p className="text-xs font-medium text-gray-500 mb-3">{exp.start_date} - {exp.end_date || 'Present'}</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{exp.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 border-t border-gray-100 pt-6">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {parsedResume.skills?.map((s: any, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 shadow-sm">
                            {s.name} <span className="text-gray-400 text-[10px] ml-1">{s.level}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Open Jobs</h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeJobs.map((job) => (
                  <div key={job.id} className="p-5 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all group">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{job.title}</h4>
                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                       <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       {job.region || 'Remote'}
                    </p>
                    <button className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-900 text-xs font-semibold rounded-xl group-hover:bg-gray-100 transition-colors">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
              {activeJobs.length === 0 && (
                 <p className="text-sm text-gray-400 text-center py-4">No open jobs available at the moment.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.txt" />

      {isUploading && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="font-semibold text-sm text-gray-900">AI Analysis in Progress...</p>
          </div>
        </div>
      )}

      {file && !isUploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-6 animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center">
               <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">New file selected</span>
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
            <button onClick={() => setFile(null)} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
            <button onClick={handleUpload} className="px-5 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm">Confirm Update</button>
          </div>
        </div>
      )}
    </div>
  );
}