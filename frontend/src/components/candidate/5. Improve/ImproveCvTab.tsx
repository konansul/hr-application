import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { screeningApi, documentsApi } from '../../../api';
import { useStore } from '../../../store';
import { DICT } from '../../../internationalization.ts';

const Pill = ({
  label,
  value,
  color = 'gray'
}: {
  label: string;
  value: string | number;
  color?: 'gray' | 'emerald' | 'red' | 'amber' | 'blue'
}) => {
  const colorStyles = {
    gray: 'bg-gray-50 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400',
  };

  return (
    <div className={`px-4 py-3 border rounded-xl ${colorStyles[color]} flex flex-col items-start w-full transition-colors`}>
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">{label}</span>
      <span className="text-xl font-semibold truncate w-full">{value}</span>
    </div>
  );
};

interface ImproveResult {
  overall_score?: number | string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  missing_keywords?: string[];
  improvements?: string[];
  improved_summary?: string;
  rewritten_bullets?: { original: string; improved: string }[];
}

interface HistoryItem {
  improvement_id: string;
  filename: string | null;
  overall_score: number;
  created_at: string;
  full_result_json: string;
}

interface ImproveCvTabProps {
  initialJobDescription: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
  if (score >= 50) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ImproveCvTab({ initialJobDescription }: ImproveCvTabProps) {
  const { language, aiQuota, aiUsed, setAiLimits } = useStore();
  const t = DICT[language as keyof typeof DICT]?.improve || DICT.en.improve;

  const [myDocuments, setMyDocuments] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [dropdownValue, setDropdownValue] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>(initialJobDescription);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    documentsApi.getMyDocuments()
      .then((docs) => {
        setMyDocuments(docs);
        if (docs.length === 0) setDropdownValue('upload');
      })
      .catch(console.error);

    screeningApi.getImprovementHistory()
      .then((data: HistoryItem[]) => setHistory(data))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleDropdownChange = (val: string) => {
    setDropdownValue(val);
    if (val === 'upload') {
      setSelectedResumeId(null);
    } else if (val) {
      setSelectedResumeId(val);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setSelectedResumeId(null);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setSelectedResumeId(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file && !selectedResumeId) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setActiveHistoryId(null);

    try {
      let data;
      if (file) {
        data = await screeningApi.improveCvFile(file, jobDescription);
      } else if (selectedResumeId) {
        data = await (screeningApi as any).improveCvExisting(selectedResumeId, jobDescription);
      }

      setResult(data);
      setAiLimits(aiQuota, aiUsed + 1);

      // refresh history to include the new item
      screeningApi.getImprovementHistory()
        .then((data: HistoryItem[]) => setHistory(data))
        .catch(console.error);

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    } catch (err: any) {
      if (err.response?.status === 429) {
        setError((t as any).dailyLimitReached ?? "⏳ You have reached your daily AI limit. Please come back tomorrow!");
      } else {
        setError(err.response?.data?.detail || err.message || t.error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    try {
      const parsed: ImproveResult = JSON.parse(item.full_result_json);
      setResult(parsed);
      setActiveHistoryId(item.improvement_id);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      // malformed json — ignore
    }
  };

  const selectedDoc = myDocuments.find(d => d.resume_id === selectedResumeId);
  const displayFileName = file ? file.name : (selectedDoc ? selectedDoc.filename : t.none);

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{t.desc}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">

          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300">{(t as any).selectCv ?? 'Select CV to Improve'}</label>

              <select
                value={dropdownValue}
                onChange={(e) => handleDropdownChange(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">{(t as any).selectCvPlaceholder ?? 'Select a CV...'}</option>
                {myDocuments.map(doc => (
                  <option key={doc.resume_id} value={doc.resume_id}>{doc.filename}</option>
                ))}
                <option value="upload">{(t as any).uploadNewOption ?? 'Upload new file...'}</option>
              </select>

              {dropdownValue === 'upload' && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                    className="hidden"
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && !isProcessing && fileInputRef.current?.click()}
                    className={`flex items-center border border-gray-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-black overflow-hidden transition-all ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-neutral-700'}`}
                  >
                    <span className="shrink-0 py-2.5 px-4 text-sm font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors border-r border-gray-300 dark:border-neutral-700 select-none">
                      {(t as any).chooseFile ?? 'Choose File'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-neutral-400 truncate px-3">
                      {file ? file.name : ((t as any).noFileChosen ?? 'No file chosen')}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300">{t.jobDescLabel}</label>
              <textarea
                placeholder={t.jobDescPlaceholder}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isProcessing}
                className="w-full min-h-[140px] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 bg-gray-50 dark:bg-black border border-gray-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all resize-y"
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <Pill label={t.fileSelected} value={displayFileName} color={file || selectedResumeId ? 'emerald' : 'gray'} />
            <Pill label={t.jobDescLength} value={`${jobDescription.length} ${t.chars}`} color={jobDescription.length > 0 ? 'blue' : 'gray'} />

            <button
              onClick={handleAnalyze}
              disabled={(!file && !selectedResumeId) || isProcessing}
              className="w-full mt-auto py-3 px-4 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-offset-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {t.analyzing}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  {t.generate}
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* History */}
      {(historyLoading || history.length > 0) && (
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {(t as any).analysisHistory ?? 'Analysis History'}
            </h3>
            {history.length > 0 && (
              <span className="text-xs font-bold text-gray-400 dark:text-neutral-500 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>

          {historyLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-400 dark:text-neutral-500">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {(t as any).loadingHistory ?? 'Loading history...'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map(item => (
                <button
                  key={item.improvement_id}
                  onClick={() => handleLoadHistory(item)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-sm ${
                    activeHistoryId === item.improvement_id
                      ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-neutral-800'
                      : 'border-gray-100 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600 bg-white dark:bg-black'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1">
                      {item.filename || ((t as any).untitled ?? 'Untitled')}
                    </p>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(item.overall_score)}`}>
                      {item.overall_score}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-neutral-500">
                    {formatDate(item.created_at, language)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {result && (
        <div ref={resultRef} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

          {activeHistoryId && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {(t as any).viewingHistory ?? 'Viewing from history'} — {history.find(h => h.improvement_id === activeHistoryId)?.filename || ((t as any).untitled ?? 'Untitled')} · {formatDate(history.find(h => h.improvement_id === activeHistoryId)?.created_at || '', language)}
            </div>
          )}

          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start transition-colors">
            <div className="w-full md:w-48 shrink-0">
              <Pill label={t.overallScore} value={result.overall_score || '—'} color="blue" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-500 mb-2">{t.executiveSummary}</h3>
              <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed">{result.summary || t.noSummary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 transition-colors">
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {t.coreStrengths}
              </h3>
              <ul className="space-y-2.5">
                {result.strengths && result.strengths.length > 0 ? (
                  result.strengths.map((item, i) => (
                    <li key={i} className="text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-emerald-600/60 dark:text-emerald-500/60 italic">{t.noStrengths}</li>
                )}
              </ul>
            </div>

            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-6 transition-colors">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {t.areasForImprovement}
              </h3>
              <ul className="space-y-2.5">
                {result.weaknesses && result.weaknesses.length > 0 ? (
                  result.weaknesses.map((item, i) => (
                    <li key={i} className="text-sm text-red-900 dark:text-red-200 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-red-600/60 dark:text-red-500/60 italic">{t.noWeaknesses}</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-500 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                {t.missingKeywords}
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords && result.missing_keywords.length > 0 ? (
                  result.missing_keywords.map((kw, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 text-xs font-medium rounded-md border border-gray-200 dark:border-neutral-700">
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.noKeywords}</span>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-500 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t.actionableAdvice}
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-neutral-300 list-disc list-inside marker:text-gray-300 dark:marker:text-neutral-600">
                {result.improvements && result.improvements.length > 0 ? (
                  result.improvements.map((item, i) => <li key={i}>{item}</li>)
                ) : (
                  <li className="text-gray-400 dark:text-neutral-500 italic list-none">{t.noAdvice}</li>
                )}
              </ul>
            </div>
          </div>

          {result.improved_summary && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-6 relative overflow-hidden transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                {t.suggestedSummary}
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{result.improved_summary}</p>
            </div>
          )}

          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">{t.bulletRewrites}</h3>

            {result.rewritten_bullets && result.rewritten_bullets.length > 0 ? (
              <div className="space-y-4">
                {result.rewritten_bullets.map((bullet, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 border border-gray-100 dark:border-neutral-800/50 rounded-xl bg-gray-50/50 dark:bg-neutral-800/30 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="flex-1 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">{t.original}</span>
                      <p className="text-sm text-gray-500 dark:text-neutral-400 line-through decoration-gray-300 dark:decoration-neutral-600">{bullet.original}</p>
                    </div>

                    <div className="hidden md:flex items-center justify-center text-gray-300 dark:text-neutral-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>

                    <div className="flex-1 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t.improved}</span>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{bullet.improved}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-neutral-500 italic">{t.noRewrites}</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
