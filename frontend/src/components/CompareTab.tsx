import { useState, useEffect } from 'react';

// Обновленный мини-компонент плашки с поддержкой цветовых тем
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
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`px-3 py-2 border rounded-xl ${colorStyles[color]} flex flex-col items-start`}>
      <span className="text-[11px] font-medium uppercase tracking-wider opacity-70 mb-0.5">{label}</span>
      <span className="text-sm font-semibold truncate w-full">{value}</span>
    </div>
  );
};

// Пропсы
interface CompareTabProps {
  batchResults: any[];
}

export function CompareTab({ batchResults }: CompareTabProps) {
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);

  // При первой загрузке автоматически выбираем первых двух кандидатов
  useEffect(() => {
    if (batchResults && batchResults.length >= 2 && selectedFilenames.length === 0) {
      setSelectedFilenames([batchResults[0].filename, batchResults[1].filename]);
    }
  }, [batchResults, selectedFilenames.length]);

  // Обработчик выбора (максимум 3)
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

  // Состояние: нет данных
  if (!batchResults || batchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 border border-gray-100 rounded-2xl">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No candidates to compare</h3>
        <p className="text-sm text-gray-500 max-w-sm">First, run a batch screening in the "Screen CVs" tab to generate results.</p>
      </div>
    );
  }

  const compareItems = batchResults.filter(item => selectedFilenames.includes(item.filename));

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Compare Candidates</h2>
        <p className="text-sm text-gray-500 mt-1">Select up to 3 candidates for a side-by-side evaluation.</p>
      </div>

      {/* Секция выбора кандидатов (Chips вместо Checkboxes) */}
      <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
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
                  flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200
                  ${isSelected 
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed hover:border-gray-200 hover:bg-white' : 'cursor-pointer'}
                `}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-white border-white text-gray-900' : 'border-gray-300 bg-white'}
                `}>
                  {isSelected && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
                <span className="truncate max-w-[200px]">{result.filename}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-xs ${isSelected ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                  {result.score}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Предупреждение, если выбрано меньше 2 */}
      {compareItems.length < 2 ? (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-800">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span className="text-sm font-medium">Please select at least 2 candidates to view the comparison.</span>
        </div>
      ) : (
        <div className="space-y-6 pt-4 border-t border-gray-100">

          {/* Side-by-side Grid */}
          <div className={`grid gap-6 items-start ${compareItems.length === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
            {compareItems.map((candidate, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow duration-200">

                {/* Карточка: Заголовок */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 break-words mb-4 pb-4 border-b border-gray-100">
                    {candidate.filename}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Pill label="Score" value={candidate.score || '—'} color="blue" />
                    <Pill
                      label="Decision"
                      value={candidate.decision || '—'}
                      color={candidate.decision?.toLowerCase() === 'hire' ? 'emerald' : candidate.decision?.toLowerCase() === 'reject' ? 'red' : 'gray'}
                    />
                  </div>
                </div>

                {/* Карточка: Контент */}
                <div className="flex flex-col gap-6 flex-1">

                  <section>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Summary</h5>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {candidate.summary || 'No summary available.'}
                    </p>
                  </section>

                  <section>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Matched Skills
                    </h5>
                    <p className="text-sm text-gray-700 font-medium">
                      {candidate.matched_skills && candidate.matched_skills.length > 0
                        ? candidate.matched_skills.join(", ")
                        : <span className="text-gray-400 italic font-normal">None identified</span>}
                    </p>
                  </section>

                  <section>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Missing Skills
                    </h5>
                    <p className="text-sm text-gray-700 font-medium">
                      {candidate.missing_skills && candidate.missing_skills.length > 0
                        ? candidate.missing_skills.join(", ")
                        : <span className="text-gray-400 italic font-normal">None identified</span>}
                    </p>
                  </section>

                  <section className="mt-auto pt-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Risks / Notes
                    </h5>
                    <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside marker:text-amber-400">
                      {candidate.risks && candidate.risks.length > 0 ? (
                        candidate.risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)
                      ) : (
                        <li className="text-gray-400 italic list-none">No risks identified</li>
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