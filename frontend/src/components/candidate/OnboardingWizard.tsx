import { useState, useRef, useEffect } from 'react';
import { documentsApi, authApi } from '../../api';

interface Props {
  userId: string;
  onComplete: () => void;
}

const PROFILE_SECTIONS = [
  { label: 'Personal Info',  icon: '👤', desc: 'Name, contact, location' },
  { label: 'Experience',     icon: '💼', desc: 'Work history & roles' },
  { label: 'Education',      icon: '🎓', desc: 'Degrees & institutions' },
  { label: 'Skills',         icon: '⚡', desc: 'Technical & soft skills' },
];

export function OnboardingWizard({ userId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [error, setError] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') complete(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const complete = () => {
    localStorage.setItem(`hrai_onboarding_${userId}`, 'done');
    onComplete();
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setIsImportingUrl(true);
    setError('');
    try {
      await authApi.importFromUrl(importUrl.trim());
      setUploadDone(true);
      setTimeout(complete, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Import failed. Please try again.');
    } finally {
      setIsImportingUrl(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const response = await documentsApi.upload(file);
      if (response?.parsed_data && Object.keys(response.parsed_data).length > 0) {
        await authApi.updateProfile(response.parsed_data);
      }
      setUploadDone(true);
      setTimeout(complete, 1200);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={complete}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-neutral-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="flex gap-1.5 px-7 pt-6">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                step >= s ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="p-7">
            <div className="mb-6">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
                Welcome! Let's build your profile
              </h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Your profile is your digital resume. Complete it once and apply to any job in seconds.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {PROFILE_SECTIONS.map(s => (
                <div
                  key={s.label}
                  className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700"
                >
                  <span className="text-lg mt-0.5">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100">{s.label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-neutral-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl px-4 py-3 mb-6 flex items-start gap-3">
              <span className="text-base mt-0.5">💡</span>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                Upload your CV on the next step and we'll fill everything in automatically using AI.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-semibold rounded-2xl hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.98]"
            >
              Get Started →
            </button>
            <button
              onClick={complete}
              className="w-full mt-2 text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 py-1.5 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 2: Upload CV ── */}
        {step === 2 && (
          <div className="p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
                Upload your CV
              </h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Upload your CV or paste a URL — we'll extract your experience, education, and skills automatically.
              </p>
            </div>

            {/* Upload area */}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <button
              onClick={() => !uploadDone && fileRef.current?.click()}
              disabled={uploading || uploadDone}
              className={`w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-2xl transition-all text-center
                ${uploadDone
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 cursor-default'
                  : 'border-gray-300 dark:border-neutral-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer'
                } disabled:cursor-not-allowed`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                uploadDone
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-indigo-100 dark:bg-indigo-950/50'
              }`}>
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                ) : uploadDone ? (
                  <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>

              {uploadDone ? (
                <>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">CV uploaded successfully!</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">Your profile is being filled in…</p>
                </>
              ) : uploading ? (
                <>
                  <p className="text-sm font-semibold text-gray-700 dark:text-neutral-200">Uploading…</p>
                  <p className="text-xs text-gray-400 dark:text-neutral-500">Please wait</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-700 dark:text-neutral-200">Click to choose your CV</p>
                  <p className="text-xs text-gray-400 dark:text-neutral-500">PDF, DOCX or TXT supported</p>
                </>
              )}
            </button>

            {error && (
              <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
              <span className="text-xs text-gray-400 dark:text-neutral-500">or import from URL</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                placeholder="Paste your resume/portfolio URL"
                disabled={isImportingUrl || uploadDone}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-800 text-gray-800 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleUrlImport}
                disabled={!importUrl.trim() || isImportingUrl || uploadDone}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-2xl transition-all shrink-0"
              >
                {isImportingUrl ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : 'Import'}
              </button>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
              <span className="text-xs text-gray-400 dark:text-neutral-500">or</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
            </div>

            <button
              onClick={complete}
              className="w-full mt-4 py-2.5 border border-gray-200 dark:border-neutral-700 text-sm font-medium text-gray-600 dark:text-neutral-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all"
            >
              I'll fill in my profile manually
            </button>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={complete}
                className="text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
