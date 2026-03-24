import { useState, useEffect, type ChangeEvent } from 'react';
import { screeningApi } from '../api';

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
    <div className={`px-4 py-3 border rounded-xl ${colorStyles[color]} flex flex-col items-start min-w-[120px]`}>
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">{label}</span>
      <span className="text-xl font-semibold truncate w-full">{value}</span>
    </div>
  );
};

interface ScreenTabProps {
  jobDescription: string;
  globalBatchResults: any[]; // <-- Добавлено для сохранения данных
  setGlobalBatchResults: (results: any[]) => void;
}

export function ScreenTab({ jobDescription, globalBatchResults, setGlobalBatchResults }: ScreenTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });

  // Инициализируем стейт глобальными данными, если они есть
  const [results, setResults] = useState<any[]>(globalBatchResults || []);
  const [_errors, setErrors] = useState<any[]>([]);

  // Выбираем первый файл из истории при загрузке
  const [selectedFilename, setSelectedFilename] = useState<string>(
    globalBatchResults?.length > 0 ? globalBatchResults[0].filename : ''
  );

  // Синхронизация, если данные изменились извне
  useEffect(() => {
    if (globalBatchResults && globalBatchResults.length > 0 && results.length === 0) {
      setResults(globalBatchResults);
      if (!selectedFilename) {
        setSelectedFilename(globalBatchResults[0].filename);
      }
    }
  }, [globalBatchResults]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleRunBatch = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    // Мы убрали setResults([]), чтобы старые данные не удалялись
    setErrors([]);

    // Берем текущие результаты, чтобы добавить к ним новые
    const currentResults = [...results];
    const currentErrors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, currentFile: file.name });
      try {
        const data = await screeningApi.runFile(file, jobDescription);

        // Защита от дубликатов: если файл с таким именем уже есть, обновляем его, иначе добавляем
        const existingIndex = currentResults.findIndex(r => r.filename === file.name);
        if (existingIndex >= 0) {
          currentResults[existingIndex] = { ...data, filename: file.name };
        } else {
          currentResults.push({ ...data, filename: file.name });
        }
      } catch (err: any) {
        currentErrors.push({
          filename: file.name,
          error: err.response?.data?.detail || err.message || 'Error processing file'
        });
      }
    }

    currentResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    setResults(currentResults);
    setGlobalBatchResults(currentResults); // Сохраняем в App.tsx
    setErrors(currentErrors);

    if (currentResults.length > 0) {
      setSelectedFilename(currentResults[0].filename);
    }

    setIsProcessing(false);
    setProgress({ current: 0, total: 0, currentFile: '' });
    setFiles([]); // Очищаем список файлов после успешной загрузки
  };

  const selectedCandidate = results.find(r => r.filename === selectedFilename);

  if (!jobDescription.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50 border border-amber-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-medium text-amber-900 mb-1">Missing Job Description</h3>
        <p className="text-sm text-amber-700">Please create or load an active job in the "Jobs" tab before screening CVs.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Batch Screening</h2>
        <p className="text-sm text-gray-500 mt-1">Upload candidate resumes to rank them against the active job description.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full relative">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0
                file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700
                hover:file:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200
                border border-gray-300 rounded-xl bg-white cursor-pointer transition-all
                disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleRunBatch}
            disabled={files.length === 0 || isProcessing}
            className="w-full sm:w-auto py-2.5 px-6 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
          >
            {isProcessing ? 'Processing...' : 'Run Batch'}
          </button>
        </div>
        <div className="flex gap-4 border-t border-gray-100 pt-6">
          <Pill label="Active Job Chars" value={jobDescription.length} />
          <Pill label="Files Queued" value={files.length} color={files.length > 0 ? 'blue' : 'gray'} />
        </div>

        {/* --- ПОЛОСА ЗАГРУЗКИ --- */}
        {isProcessing && progress.total > 0 && (
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-blue-600">
              <span className="truncate pr-4">Analyzing: {progress.currentFile}</span>
              <span className="shrink-0">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-6 py-4">Candidate File</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4 w-full">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedFilename(r.filename)}>
                    <td className="px-6 py-4 font-medium text-gray-900">{r.filename}</td>
                    <td className="px-6 py-4 font-semibold">{r.score}%</td>
                    <td className="px-6 py-4 uppercase text-xs font-bold">{r.decision}</td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{r.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Report</h3>
              <select
                value={selectedFilename}
                onChange={(e) => setSelectedFilename(e.target.value)}
                className="w-full sm:w-80 px-4 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none"
              >
                {results.map(r => (
                  <option key={r.filename} value={r.filename}>{r.filename}</option>
                ))}
              </select>
            </div>

            {selectedCandidate && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-8">
                <div className="flex flex-wrap gap-4 pb-6 border-b border-gray-100">
                  <Pill label="Score" value={`${selectedCandidate.score}%`} color="blue" />
                  <Pill label="Decision" value={selectedCandidate.decision} color="emerald" />
                  <Pill label="Risks Found" value={selectedCandidate.risks?.length || 0} color="amber" />
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">AI Executive Summary</h4>
                  <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {selectedCandidate.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">Matched Skills</h4>
                    <ul className="space-y-2">
                      {selectedCandidate.matched_skills?.map((skill: string, i: number) => (
                        <li key={i} className="text-sm text-emerald-900 flex items-start gap-2">• {skill}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">Missing Skills</h4>
                    <ul className="space-y-2">
                      {selectedCandidate.missing_skills?.map((skill: string, i: number) => (
                        <li key={i} className="text-sm text-red-900 flex items-start gap-2">• {skill}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-amber-800 mb-3">Identified Risks & Concerns</h4>
                  <ul className="space-y-3">
                    {selectedCandidate.risks?.map((risk: string, i: number) => (
                      <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">!</span> {risk}
                      </li>
                    ))}
                    {(!selectedCandidate.risks || selectedCandidate.risks.length === 0) && (
                      <li className="text-sm text-amber-600 italic">No significant risks identified.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Recommended Interview Questions</h4>
                  <div className="space-y-0 border-t border-gray-100">
                    {selectedCandidate.interview_questions?.map((q: string, i: number) => (
                      <div key={i} className="flex gap-4 py-5 border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/50 px-2 rounded-lg">
                        <span className="flex-shrink-0 text-sm font-bold text-gray-400">
                          {i + 1}.
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                          {q}
                        </p>
                      </div>
                    ))}
                    {(!selectedCandidate.interview_questions || selectedCandidate.interview_questions.length === 0) && (
                      <p className="text-sm text-gray-400 italic pt-4">No specific questions recommended.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}