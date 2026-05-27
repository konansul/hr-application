import { useState, useEffect, useRef, useMemo, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { screeningApi, documentsApi, resumesApi } from '../../../api';
import { useStore } from '../../../store';
import { DICT } from '../../../internationalization.ts';

const Pill = ({
  label,
  value,
  color = 'gray'
}: {
  label: string;
  value: string | number;
  color?: 'gray' | 'violet' | 'red' | 'amber' | 'blue'
}) => {
  const colorStyles = {
    gray: 'bg-gray-50 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300',
    violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-400',
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
  if (score >= 70) return 'bg-[#7A60F4]/15 dark:bg-[#7A60F4]/10 text-[#5B52C8] dark:text-[#9EA4FF]';
  if (score >= 50) return 'bg-[#FF906D]/15 dark:bg-[#FF906D]/10 text-[#c05020] dark:text-[#FF906D]';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ImproveCvTab({ initialJobDescription }: ImproveCvTabProps) {
  const { language, aiQuota, aiUsed, setAiLimits, setActiveTab } = useStore();
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

  const [acceptedSummary, setAcceptedSummary] = useState(false);
  const [acceptedKeywords, setAcceptedKeywords] = useState<Set<number>>(new Set());
  const [acceptedImprovements, setAcceptedImprovements] = useState<Set<number>>(new Set());
  const [acceptedBullets, setAcceptedBullets] = useState<Set<number>>(new Set());
  const [isGeneratingVersion, setIsGeneratingVersion] = useState(false);
  const [versionCreated, setVersionCreated] = useState(false);
  const [_generatedResumeId, setGeneratedResumeId] = useState<string | null>(null);
  const [resumesList, setResumesList] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    documentsApi.getMyDocuments()
      .then((docs) => setMyDocuments(docs))
      .catch(console.error);

    resumesApi.list()
      .then((data: any[]) => setResumesList(data))
      .catch(console.error);

    screeningApi.getImprovementHistory()
      .then((data: HistoryItem[]) => setHistory(data))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleDropdownChange = (val: string) => {
    setDropdownValue(val);
    if (val) {
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
      setDropdownValue('');
    }
  };

  const resetAcceptance = () => {
    setAcceptedSummary(false);
    setAcceptedKeywords(new Set());
    setAcceptedImprovements(new Set());
    setAcceptedBullets(new Set());
    setVersionCreated(false);
    setGeneratedResumeId(null);
  };

  const handleAnalyze = async () => {
    if (!file && !selectedResumeId) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setActiveHistoryId(null);
    resetAcceptance();

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
      resetAcceptance();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      // malformed json — ignore
    }
  };

  const handleGenerateVersion = async () => {
    if (!selectedResumeId || !result) return;
    setIsGeneratingVersion(true);
    setVersionCreated(false);
    setGeneratedResumeId(null);
    setError(null);
    try {
      const res = await (screeningApi as any).generateImprovedVersion({
        resume_id: selectedResumeId,
        accepted_summary: acceptedSummary ? (result.improved_summary ?? null) : null,
        accepted_keywords: Array.from(acceptedKeywords).map(i => result.missing_keywords?.[i]).filter((v): v is string => !!v),
        accepted_improvements: Array.from(acceptedImprovements).map(i => result.improvements?.[i]).filter((v): v is string => !!v),
        accepted_bullets: Array.from(acceptedBullets).map(i => result.rewritten_bullets?.[i]).filter((v): v is { original: string; improved: string } => !!v),
      });
      setVersionCreated(true);
      setGeneratedResumeId(res?.resume_id ?? null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || t.error);
    } finally {
      setIsGeneratingVersion(false);
    }
  };

  const totalSelected = (acceptedSummary ? 1 : 0) + acceptedKeywords.size + acceptedImprovements.size + acceptedBullets.size;

  const previewPayload = useMemo(() => {
    if (!result) return null;
    const base = selectedResumeId ? resumesList.find((r: any) => r.resume_id === selectedResumeId) : null;
    const c: any = base ? JSON.parse(JSON.stringify(base)) : { _changesOnly: true };
    if (acceptedSummary && result.improved_summary) {
      c.personal_info = c.personal_info ?? {};
      c.personal_info.summary = result.improved_summary;
      c._summaryNew = true;
    }
    if (acceptedBullets.size > 0 && result.rewritten_bullets) {
      c._acceptedBullets = Array.from(acceptedBullets)
        .map(i => result.rewritten_bullets![i])
        .filter(Boolean);
    }
    if (acceptedKeywords.size > 0 && result.missing_keywords) {
      const newKws = Array.from(acceptedKeywords)
        .map(i => result.missing_keywords![i])
        .filter(Boolean);
      c._newKeywords = newKws;
      c.skills = [...(c.skills ?? []), ...newKws.map((kw: string) => ({ name: kw, _new: true }))];
    }
    return c;
  }, [result, selectedResumeId, resumesList, acceptedSummary, acceptedBullets, acceptedKeywords]);

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
                className="w-full px-4 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-neutral-700 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">{(t as any).selectCvPlaceholder ?? 'Select a CV...'}</option>
                {myDocuments.map(doc => (
                  <option key={doc.resume_id} value={doc.resume_id}>{doc.filename}</option>
                ))}
              </select>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 border-t border-gray-200 dark:border-neutral-700" />
                <span className="text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest select-none">
                  {(t as any).orUploadNew ?? 'OR UPLOAD NEW'}
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-neutral-700" />
              </div>

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
                className={`flex items-center border border-gray-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-black overflow-hidden transition-all ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="shrink-0 py-2.5 px-4 text-sm font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors border-r border-gray-300 dark:border-neutral-700 select-none">
                  {(t as any).chooseFile ?? 'Choose File'}
                </span>
                <span className="text-sm text-gray-500 dark:text-neutral-400 truncate px-3">
                  {file ? file.name : ((t as any).noFileChosen ?? 'No file chosen')}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300">{t.jobDescLabel}</label>
              <textarea
                placeholder={t.jobDescPlaceholder}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isProcessing}
                className="w-full min-h-[140px] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 bg-gray-50 dark:bg-black border border-gray-300 dark:border-neutral-700 rounded-xl transition-all resize-y"
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <Pill label={t.fileSelected} value={displayFileName} color={file || selectedResumeId ? 'violet' : 'gray'} />
            <button
              onClick={handleAnalyze}
              disabled={(!file && !selectedResumeId) || isProcessing}
              className="w-full mt-auto py-3 px-4 bg-[#7A60F4] hover:bg-[#6B52E8] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-2xl p-6 transition-colors">
              <h3 className="text-sm font-semibold text-violet-800 dark:text-violet-400 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {t.coreStrengths}
              </h3>
              <ul className="space-y-2.5">
                {result.strengths && result.strengths.length > 0 ? (
                  result.strengths.map((item, i) => (
                    <li key={i} className="text-sm text-violet-900 dark:text-violet-200 flex items-start gap-2">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-violet-600/60 dark:text-violet-500/60 italic">{t.noStrengths}</li>
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
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                  {t.missingKeywords}
                  {result.missing_keywords && result.missing_keywords.length > 0 && (
                    <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                      {acceptedKeywords.size}/{result.missing_keywords.length}
                    </span>
                  )}
                </h3>
                {result.missing_keywords && result.missing_keywords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (acceptedKeywords.size === result.missing_keywords!.length) {
                        setAcceptedKeywords(new Set());
                      } else {
                        setAcceptedKeywords(new Set(result.missing_keywords!.map((_, i) => i)));
                      }
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    {acceptedKeywords.size === result.missing_keywords.length ? 'Clear all' : 'Add all'}
                  </button>
                )}
              </div>
              {result.missing_keywords && result.missing_keywords.length > 0 && (
                <p className="text-[11px] text-gray-400 dark:text-neutral-500 mb-3">Click a keyword to add it to your CV</p>
              )}
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords && result.missing_keywords.length > 0 ? (
                  result.missing_keywords.map((kw, i) => (
                    <button key={i} type="button"
                      onClick={() => setAcceptedKeywords(prev => {
  const n = new Set(prev);
  if (n.has(i)) {
    n.delete(i);
  } else {
    n.add(i);
  }
  return n;
})}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all flex items-center gap-1.5 ${acceptedKeywords.has(i) ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-dashed border-gray-300 dark:border-neutral-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                    >
                      {acceptedKeywords.has(i)
                        ? <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      }
                      {kw}
                    </button>
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
              <ul className="space-y-1.5">
                {result.improvements && result.improvements.length > 0 ? (
                  result.improvements.map((item, i) => (
                    <li key={i}
                      onClick={() => setAcceptedImprovements(prev => {
  const n = new Set(prev);
  if (n.has(i)) {
    n.delete(i);
  } else {
    n.add(i);
  }
  return n;
})}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-sm select-none ${acceptedImprovements.has(i) ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200' : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
                    >
                      <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${acceptedImprovements.has(i) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-neutral-600'}`}>
                        {acceptedImprovements.has(i) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.noAdvice}</li>
                )}
              </ul>
            </div>
          </div>

          {result.improved_summary && (
            <div
              onClick={() => setAcceptedSummary(p => !p)}
              className={`flex items-start gap-3 border rounded-2xl p-6 relative overflow-hidden transition-all cursor-pointer select-none ${acceptedSummary ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60' : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800'}`}
            >
              <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${acceptedSummary ? 'bg-indigo-500' : 'bg-blue-500'}`}></div>
              <span className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${acceptedSummary ? 'bg-indigo-500 border-indigo-500' : 'border-blue-300 dark:border-blue-700'}`}>
                {acceptedSummary && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </span>
              <div className="flex-1">
                <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${acceptedSummary ? 'text-indigo-900 dark:text-indigo-300' : 'text-blue-900 dark:text-blue-400'}`}>
                  <svg className={`w-5 h-5 ${acceptedSummary ? 'text-indigo-500' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                  {t.suggestedSummary}
                </h3>
                <p className={`text-sm leading-relaxed ${acceptedSummary ? 'text-indigo-800 dark:text-indigo-200' : 'text-blue-800 dark:text-blue-200'}`}>{result.improved_summary}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">{t.bulletRewrites}</h3>

            {result.rewritten_bullets && result.rewritten_bullets.length > 0 ? (
              <div className="space-y-4">
                {result.rewritten_bullets.map((bullet, idx) => (
                  <div key={idx}
                    onClick={() => setAcceptedBullets(prev => {
  const n = new Set(prev);
  if (n.has(idx)) {
    n.delete(idx);
  } else {
    n.add(idx);
  }
  return n;
})}
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all select-none ${acceptedBullets.has(idx) ? 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-gray-100 dark:border-neutral-800/50 bg-gray-50/50 dark:bg-neutral-800/30 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
                  >
                    <span className={`mt-1 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${acceptedBullets.has(idx) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-neutral-600'}`}>
                      {acceptedBullets.has(idx) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <div className="flex-1 flex flex-col md:flex-row gap-4">
                      <div className="flex-1 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">{t.original}</span>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 line-through decoration-gray-300 dark:decoration-neutral-600">{bullet.original}</p>
                      </div>
                      <div className="hidden md:flex items-center justify-center text-gray-300 dark:text-neutral-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </div>
                      <div className="flex-1 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">{t.improved}</span>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{bullet.improved}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-neutral-500 italic">{t.noRewrites}</p>
            )}
          </div>

        {/* ── Generate from selected action bar ── */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {(t as any).generateFromSelected ?? 'Generate Resume from Selected'}
              </p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                {totalSelected > 0
                  ? `${totalSelected} ${(t as any).selectedCount ?? 'selected'}`
                  : ((t as any).noneSelected ?? 'Select at least one suggestion to generate a version.')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!selectedResumeId && (
                <p className="text-xs text-amber-600 dark:text-amber-400 max-w-xs">
                  {(t as any).requiresSavedCv ?? 'To generate a version, select a saved CV from the dropdown above.'}
                </p>
              )}
              {versionCreated && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                    ✓ {(t as any).versionCreated ?? 'New resume version created!'}
                  </p>
                  <button
                    onClick={() => setActiveTab('upload-cv')}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors whitespace-nowrap"
                  >
                    {(t as any).viewInResumes ?? 'View in Resumes →'}
                  </button>
                </div>
              )}
              {result && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="px-5 py-2.5 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-neutral-800 text-sm font-semibold rounded-xl focus:outline-none transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.057 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {(t as any).previewBtn ?? 'Preview'}
                </button>
              )}
              <div className="relative group">
                <button
                  onClick={handleGenerateVersion}
                  disabled={!selectedResumeId || totalSelected === 0 || isGeneratingVersion}
                  className="px-5 py-2.5 bg-[#7A60F4] hover:bg-[#6B52E8] text-white text-sm font-bold rounded-xl focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                {isGeneratingVersion ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {(t as any).generatingVersion ?? 'Generating…'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {(t as any).generateFromSelected ?? 'Generate Resume from Selected'}
                  </>
                )}
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 bg-gray-900 dark:bg-neutral-700 text-white text-[11px] leading-snug rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-center z-10">
                  The generated resume will appear in the <span className="font-semibold">Resumes</span> tab.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-neutral-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      )}

      {showPreview && result && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}
        >
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.057 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {(t as any).previewTitle ?? 'CV Preview with Changes'}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Full CV header if structured data is available */}
              {(() => {
                const info = previewPayload?.personal_info ?? {};
                const fullName = [info.first_name, info.last_name].filter(Boolean).join(' ');
                const contacts = [info.email, info.phone, info.location, info.linkedin].filter(Boolean);
                return (fullName || contacts.length > 0) ? (
                  <div className="text-center border-b border-gray-100 dark:border-neutral-800 pb-4">
                    {fullName && <h2 className="text-xl font-bold text-gray-900 dark:text-white">{fullName}</h2>}
                    {contacts.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5">
                        {contacts.map((c, i) => <span key={i}>{c as string}</span>)}
                      </p>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Suggested Summary */}
              {result.improved_summary && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-2 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    {t.suggestedSummary}
                  </h4>
                  <p className={`text-sm leading-relaxed rounded-lg px-3 py-2.5 border transition-colors ${acceptedSummary ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/50' : 'bg-gray-50 dark:bg-neutral-800/40 text-gray-600 dark:text-neutral-400 border-gray-200 dark:border-neutral-700'}`}>
                    {acceptedSummary && (
                      <span className="inline-block mr-2 text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider align-middle">
                        {(t as any).newBadge ?? 'New'}
                      </span>
                    )}
                    {result.improved_summary}
                  </p>
                </div>
              )}

              {/* Bullet Rewrites */}
              {result.rewritten_bullets && result.rewritten_bullets.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-2 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    {t.bulletRewrites}
                    <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                      {acceptedBullets.size}/{result.rewritten_bullets.length} {(t as any).selectedCount ?? 'selected'}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {result.rewritten_bullets.map((b, i) => {
                      const accepted = acceptedBullets.has(i);
                      return (
                        <div key={i} className={`rounded-lg overflow-hidden border transition-colors ${accepted ? 'border-indigo-200 dark:border-indigo-800/50' : 'border-gray-200 dark:border-neutral-700 opacity-50'}`}>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-800/50 text-xs text-gray-500 dark:text-neutral-400 line-through">
                            {b.original}
                          </div>
                          <div className={`px-3 py-2 text-xs font-medium flex items-start gap-1.5 ${accepted ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400'}`}>
                            {accepted && (
                              <span className="text-[9px] font-bold bg-indigo-500 text-white px-1 py-0.5 rounded uppercase tracking-wider shrink-0 mt-0.5">
                                {(t as any).newBadge ?? 'New'}
                              </span>
                            )}
                            {b.improved}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {result.missing_keywords && result.missing_keywords.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-2 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                    {t.missingKeywords}
                    <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                      {acceptedKeywords.size}/{result.missing_keywords.length} {(t as any).selectedCount ?? 'selected'}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing_keywords.map((kw, i) => {
                      const accepted = acceptedKeywords.has(i);
                      return (
                        <span key={i} className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-all ${accepted ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 border-gray-200 dark:border-neutral-700 opacity-50'}`}>
                          {accepted && <span className="mr-1">+</span>}
                          {kw}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actionable Improvements */}
              {result.improvements && result.improvements.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-2 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {t.actionableAdvice}
                    <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                      {acceptedImprovements.size}/{result.improvements.length} {(t as any).selectedCount ?? 'selected'}
                    </span>
                  </h4>
                  <ul className="space-y-1.5">
                    {result.improvements.map((item, i) => {
                      const accepted = acceptedImprovements.has(i);
                      return (
                        <li key={i} className={`flex items-start gap-2.5 p-2 rounded-lg text-sm transition-colors ${accepted ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200' : 'text-gray-400 dark:text-neutral-500 opacity-60'}`}>
                          <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${accepted ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-neutral-600'}`}>
                            {accepted && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </span>
                          <span>{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Empty state */}
              {!result.improved_summary && !result.rewritten_bullets?.length && !result.missing_keywords?.length && !result.improvements?.length && (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-neutral-500">
                  No suggestions available in this analysis.
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 shrink-0 flex justify-between items-center">
              <span className="text-xs text-gray-400 dark:text-neutral-500">
                {totalSelected} {(t as any).selectedCount ?? 'selected'}
              </span>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {(t as any).close ?? 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
