import { useState, useRef, useEffect } from 'react';
import { documentsApi, authApi } from '../api';

export function ResumeUploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authApi.getMe()
      .then((data) => setUser(data))
      .catch(() => {});

    documentsApi.getMyDocuments()
      .then((docs) => setUploadedDocs(docs))
      .catch(() => {});
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
      setUploadedDocs((prev) => [...prev, response]);
      setMessage({ text: 'CV successfully uploaded to your profile.', type: 'success' });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      if (err.response?.status === 409) {
        setMessage({ text: 'This document has already been uploaded.', type: 'error' });
      } else {
        setMessage({ text: err.response?.data?.detail || 'Upload failed', type: 'error' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header — приведен к общему дизайну */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">My Resume</h2>
          <p className="text-sm text-gray-500">
            Upload your main CV document. You will be able to improve it or use it to apply for jobs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Profile Card (Left Column) */}
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-gray-900 to-gray-700 rounded-full flex items-center justify-center shadow-lg mb-6">
              <span className="text-3xl font-bold text-white">
                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 truncate w-full px-4 mb-2">
              {user?.email || 'Loading...'}
            </h3>
            <span className="px-4 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl">
              {user?.role || 'Candidate'}
            </span>

            <div className="w-full mt-8 pt-8 border-t border-gray-50 text-left">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">Account Stats</p>
              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-gray-600">Stored Resumes</span>
                <span className="text-sm font-bold text-gray-900">{uploadedDocs.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload & List Area (Right Column) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">

            {message && (
              <div className={`mb-6 p-4 text-sm rounded-2xl flex items-start gap-3 border animate-in slide-in-from-top-2 ${
                message.type === 'success' 
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                  : 'text-red-700 bg-red-50 border-red-100'
              }`}>
                <span className="font-bold">{message.type === 'success' ? '✓' : '✕'}</span>
                <span>{message.text}</span>
              </div>
            )}

            <div
              className="border-2 border-dashed border-gray-200 rounded-[32px] p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100/80 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-1">
                {file ? file.name : "Select your CV document"}
              </p>
              <p className="text-sm text-gray-500">
                {file ? "Click to pick a different file" : "Supported: PDF, DOCX or TXT"}
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`w-full mt-8 py-4 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                !file || isUploading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-gray-900 hover:bg-gray-800 text-white shadow-gray-200 active:scale-[0.99]'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Uploading...
                </>
              ) : (
                'Upload for AI Screening'
              )}
            </button>

            {uploadedDocs.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-50">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Document Library</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploadedDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 transition-colors shadow-sm">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0 mr-4">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{doc.filename}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Resume</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}