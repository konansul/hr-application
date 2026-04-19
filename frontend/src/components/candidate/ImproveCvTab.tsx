import { useState, type ChangeEvent } from 'react';
import { screeningApi } from '../../api';
import { useStore } from '../../store';
import { DICT } from '../../internationalization.ts';

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
  cv_text_preview?: string;
}

interface ImproveCvTabProps {
  initialJobDescription: string;
}

export function ImproveCvTab({ initialJobDescription }: ImproveCvTabProps) {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.improve || DICT.en.improve;

  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>(initialJobDescription);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const data = await screeningApi.improveCvFile(file, jobDescription);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || t.error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {t.desc}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">

          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300">{t.uploadLabel}</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="block w-full text-sm text-gray-500 dark:text-neutral-400
                  file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0
                  file:text-sm file:font-semibold file:bg-gray-100 dark:file:bg-neutral-800 file:text-gray-700 dark:file:text-white
                  hover:file:bg-gray-200 dark:hover:file:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-neutral-700
                  border border-gray-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-black cursor-pointer transition-all
                  disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300">{t.jobDescLabel}</label>
              <textarea
                placeholder={t.jobDescPlaceholder}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isProcessing}
                className="w-full min-h-[140px] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 bg-white dark:bg-black border border-gray-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all resize-y"
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <Pill label={t.fileSelected} value={file ? file.name : t.none} color={file ? 'emerald' : 'gray'} />
            <Pill label={t.jobDescLength} value={`${jobDescription.length} ${t.chars}`} color={jobDescription.length > 0 ? 'blue' : 'gray'} />

            <button
              onClick={handleAnalyze}
              disabled={!file || isProcessing}
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

      {result && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

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

          {result.cv_text_preview && (
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-500 mb-3">{t.parsedText}</h3>
              <textarea
                value={result.cv_text_preview}
                disabled
                className="w-full min-h-[200px] p-4 text-xs text-gray-500 dark:text-neutral-400 font-mono bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-xl resize-none outline-none"
              />
            </div>
          )}

        </div>
      )}
    </div>
  );
}