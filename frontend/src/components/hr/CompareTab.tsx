import { useState, useEffect } from 'react';
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
    gray: 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400',
  };

  return (
    <div className={`px-3 py-2 border rounded-xl ${colorStyles[color]} flex flex-col items-start transition-colors`}>
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{label}</span>
      <span className="text-sm font-semibold truncate w-full">{value}</span>
    </div>
  );
};

interface CompareTabProps {
  batchResults: any[];
}

export function CompareTab({ batchResults }: CompareTabProps) {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.compare || DICT.en.compare;

  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);

  useEffect(() => {
    if (batchResults && batchResults.length >= 2 && selectedFilenames.length === 0) {
      setSelectedFilenames([batchResults[0].filename, batchResults[1].filename]);
    }
  }, [batchResults, selectedFilenames.length]);

  const handleCheckboxChange = (filename: string) => {
    setSelectedFilenames((prev) => {
      if (prev.includes(filename)) {
        return prev.filter(f => f !== filename);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, filename];
      }
    });
  };

  if (!batchResults || batchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl transition-colors">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 border dark:border-blue-800/50">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.emptyTitle}</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm">{t.emptyDesc}</p>
      </div>
    );
  }

  const compareItems = batchResults.filter(item => selectedFilenames.includes(item.filename));

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>
      </div>

      <div className="p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm transition-colors">
        <div className="flex flex-wrap gap-2.5">
          {batchResults.map((result, idx) => {
            const isSelected = selectedFilenames.includes(result.filename);
            const isDisabled = !isSelected && selectedFilenames.length >= 3;

            return (
              <button
                key={idx}
                onClick={() => handleCheckboxChange(result.filename)}
                disabled={isDisabled}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all duration-200
                  ${isSelected 
                    ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-black shadow-sm' 
                    : 'bg-white dark:bg-black border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-500'}
                  ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-white dark:bg-black border-white dark:border-black text-gray-900 dark:text-white' : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-black'}
                `}>
                  {isSelected && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
                <span className="truncate max-w-[200px]">{result.filename}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isSelected ? 'bg-gray-800 dark:bg-neutral-200 text-gray-300 dark:text-neutral-700' : 'bg-gray-100 dark:bg-neutral-800 text-gray-500'}`}>
                  {result.score}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {compareItems.length < 2 ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-400 transition-colors">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span className="text-sm font-bold">{t.selectWarning}</span>
        </div>
      ) : (
        <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-neutral-800">

          <div className={`grid gap-6 items-start ${compareItems.length === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
            {compareItems.map((candidate, idx) => (
              <div key={idx} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white break-words mb-4 pb-4 border-b border-gray-100 dark:border-neutral-800">
                    {candidate.filename}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Pill label={t.score} value={`${candidate.score}%` || '—'} color="blue" />
                    <Pill
                      label={t.decision}
                      value={candidate.decision || '—'}
                      color={candidate.decision?.toLowerCase() === 'hire' ? 'emerald' : candidate.decision?.toLowerCase() === 'reject' ? 'red' : 'gray'}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-6 flex-1">

                  <section>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-500 mb-2">{t.summary}</h5>
                    <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800 transition-colors">
                      {candidate.summary || t.noSummary}
                    </p>
                  </section>

                  <section>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {t.matchedSkills}
                    </h5>
                    <p className="text-sm text-gray-800 dark:text-neutral-200 font-bold leading-relaxed">
                      {candidate.matched_skills && candidate.matched_skills.length > 0
                        ? candidate.matched_skills.join(", ")
                        : <span className="text-gray-400 dark:text-neutral-600 italic font-normal">{t.none}</span>}
                    </p>
                  </section>

                  <section>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      {t.missingSkills}
                    </h5>
                    <p className="text-sm text-gray-800 dark:text-neutral-200 font-bold leading-relaxed">
                      {candidate.missing_skills && candidate.missing_skills.length > 0
                        ? candidate.missing_skills.join(", ")
                        : <span className="text-gray-400 dark:text-neutral-600 italic font-normal">{t.none}</span>}
                    </p>
                  </section>

                  <section className="mt-auto pt-4 border-t border-gray-50 dark:border-neutral-800/50">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {t.risks}
                    </h5>
                    <ul className="text-sm text-gray-700 dark:text-neutral-300 space-y-1.5 list-disc list-inside marker:text-amber-400 transition-colors">
                      {candidate.risks && candidate.risks.length > 0 ? (
                        candidate.risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)
                      ) : (
                        <li className="text-gray-400 dark:text-neutral-600 italic list-none">{t.noRisks}</li>
                      )}
                    </ul>
                  </section>

                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}