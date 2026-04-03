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
    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-2xl border border-gray-100">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-gray-900 truncate">
        {value === "UNKNOWN" || !value ? <span className="text-gray-300">Not Specified</span> : String(value)}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Professional Profile</h2>
          <p className="text-sm text-gray-500">AI-powered career dashboard and job matching.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center shadow-lg mb-6 z-10">
              <span className="text-3xl font-bold text-white">
                {parsedResume?.personal_info?.first_name?.[0] || user?.email?.[0].toUpperCase()}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 z-10 mb-1">
              {parsedResume?.personal_info?.first_name ? `${parsedResume.personal_info.first_name} ${parsedResume.personal_info.last_name}` : user?.email}
            </h3>
            <p className="text-sm text-blue-600 font-bold z-10 mb-6">{parsedResume?.personal_info?.city || 'Location Unknown'}</p>

            <div className="w-full space-y-3 z-10 text-left">
              <InfoTag label="Email" value={parsedResume?.personal_info?.email || user?.email} />
              <InfoTag label="Phone" value={parsedResume?.personal_info?.phone} />
              <div className="grid grid-cols-2 gap-3">
                <InfoTag label="Visa" value={parsedResume?.personal_info?.visa_status} />
                <InfoTag label="Remote" value={parsedResume?.personal_info?.open_to_remote ? "Yes" : "No"} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Quick Actions</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
            >
              Upload New CV
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">History: {uploadedDocs.length} versions</p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 min-h-[400px]">
            <h3 className="text-lg font-bold text-gray-900 mb-6">AI Profile Content</h3>

            {message && (
              <div className={`mb-6 p-4 text-sm rounded-2xl border animate-in slide-in-from-top-2 ${
                message.type === 'success' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'
              }`}>
                {message.text}
              </div>
            )}

            {!parsedResume && !isUploading ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-[32px] p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100/80 transition-all cursor-pointer h-64"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900">No data found</p>
                <p className="text-sm text-gray-400 text-center">Please upload your CV to generate your AI profile</p>
              </div>
            ) : (
              parsedResume && (
                <div className="space-y-8 animate-in fade-in duration-700">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Experience</p>
                    {parsedResume.experience?.map((exp: any, i: number) => (
                      <div key={i} className="p-5 border border-gray-100 rounded-2xl bg-gray-50/30">
                        <h4 className="font-bold text-gray-900">{exp.title} @ {exp.company}</h4>
                        <p className="text-xs text-gray-400 mb-2 font-medium">{exp.start_date} - {exp.end_date || 'Present'}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{exp.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {parsedResume.skills?.map((s: any, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm">
                          {s.name} <span className="text-blue-500 text-[9px] ml-1">{s.level}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="bg-gray-900 p-8 rounded-[32px] shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Open Jobs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeJobs.map((job) => (
                <div key={job.id} className="p-6 bg-gray-800/50 border border-gray-700 rounded-2xl hover:border-gray-500 transition-all">
                  <h4 className="font-bold text-white mb-1">{job.title}</h4>
                  <p className="text-xs text-gray-400 mb-4">{job.region || 'Remote'}</p>
                  <button className="w-full py-3 bg-white text-gray-900 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 transition-colors">Apply Now</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.txt" />

      {isUploading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-xs uppercase tracking-[0.2em] text-gray-900">AI Analysis in Progress</p>
          </div>
        </div>
      )}

      {file && !isUploading && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 p-4 pl-6 rounded-[24px] shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
               <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase text-gray-400 tracking-widest">New file selected</span>
              <span className="text-sm font-bold text-gray-900">{file.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFile(null)} className="px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleUpload} className="px-8 py-3 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all">Confirm Update</button>
          </div>
        </div>
      )}
    </div>
  );
}