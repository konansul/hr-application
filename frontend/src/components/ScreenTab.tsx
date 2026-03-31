import { useState, useEffect } from 'react';
import { documentsApi, screeningApi } from '../api';
import { useStore } from '../store';

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
  globalBatchResults: any[];
  setGlobalBatchResults: (results: any[]) => void;
}

export function ScreenTab({ jobDescription, globalBatchResults, setGlobalBatchResults }: ScreenTabProps) {
  const { globalJobId } = useStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<any[]>(globalBatchResults || []);
  const [selectedFilename, setSelectedFilename] = useState<string>(
    globalBatchResults?.length > 0 ? globalBatchResults[0].filename : ''
  );

  // --- НОВОЕ СОСТОЯНИЕ ДЛЯ МОДАЛКИ С РЕЗЮМЕ ---
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);

  useEffect(() => {
    documentsApi.getOrganizationDocuments()
      .then(setDocuments)
      .catch(() => setError("Failed to load organization documents."));
  }, []);

  useEffect(() => {
    if (globalBatchResults && globalBatchResults.length > 0) {
      setResults(globalBatchResults);
      if (!selectedFilename) {
        setSelectedFilename(globalBatchResults[0].filename);
      }
    }
  }, [globalBatchResults]);

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev =>
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.document_id));
    }
  };

  const handleRunBatch = async () => {
    if (selectedDocs.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const newResults = await screeningApi.runBulk(selectedDocs, jobDescription, globalJobId);

      const combinedResults = [...results];
      newResults.forEach((newRes: any) => {
        const existingIndex = combinedResults.findIndex(r => r.filename === newRes.filename);
        if (existingIndex >= 0) {
          combinedResults[existingIndex] = newRes;
        } else {
          combinedResults.push(newRes);
        }
      });

      combinedResults.sort((a, b) => (b.score || 0) - (a.score || 0));

      setResults(combinedResults);
      setGlobalBatchResults(combinedResults);
      setSelectedDocs([]);

      if (combinedResults.length > 0) {
        setSelectedFilename(combinedResults[0].filename);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Screening failed to start.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCandidate = results.find(r => r.filename === selectedFilename);

  if (!jobDescription.trim() || !globalJobId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50 border border-amber-100 rounded-2xl max-w-2xl mx-auto mt-10">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-medium text-amber-900 mb-1">Missing Job Description</h3>
        <p className="text-sm text-amber-700">Please create or select an active job in the "Job Descriptions" tab before screening CVs.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Candidate Pool</h2>
          <p className="text-sm text-gray-500">
            Select candidates from your organization's database to screen against the current job description.
          </p>
        </div>
        <button
          onClick={handleRunBatch}
          disabled={isProcessing || selectedDocs.length === 0}
          className={`px-6 py-3 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 ${
            isProcessing || selectedDocs.length === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              : 'bg-gray-900 hover:bg-gray-800 text-white shadow-gray-200 active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
            <span>Processing...</span>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Run AI Screening ({selectedDocs.length})</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
          <span>✕ {error}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                    checked={selectedDocs.length > 0 && selectedDocs.length === documents.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Candidate Document</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500 text-sm">
                    No candidates found in your organization yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr
                    key={doc.document_id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    onClick={() => setViewingDoc(doc)} // Клик по строке открывает резюме
                  >
                    <td
                      className="p-4 text-center"
                      onClick={(e) => e.stopPropagation()} // Блокируем открытие модалки, если кликнули именно по чекбоксу
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                        checked={selectedDocs.includes(doc.document_id)}
                        onChange={() => toggleDoc(doc.document_id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.filename}</p>
                          <p className="text-xs text-gray-500">ID: {doc.document_id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {doc.source_type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 border-t border-gray-100 pt-6">
          <Pill label="Active Job Chars" value={jobDescription.length} />
          <Pill label="Docs Available" value={documents.length} />
          <Pill label="Selected" value={selectedDocs.length} color={selectedDocs.length > 0 ? 'blue' : 'gray'} />
        </div>
      </div>

      {/* --- МОДАЛЬНОЕ ОКНО ДЛЯ ПРОСМОТРА РЕЗЮМЕ --- */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{viewingDoc.filename}</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Source: {viewingDoc.source_type}</p>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Candidate Document Content</h4>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                  {viewingDoc.raw_text || "Текст резюме недоступен. Пожалуйста, обновите бэкенд, чтобы он возвращал raw_text."}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Блок с результатами ИИ (оставлен без изменений) */}
      {results.length > 0 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-6 py-4">Candidate File</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Status / Decision</th>
                  <th className="px-6 py-4 w-full">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedFilename(r.filename)}>
                    <td className="px-6 py-4 font-medium text-gray-900">{r.filename}</td>
                    <td className="px-6 py-4 font-semibold">{r.score || 0}%</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                         r.status === 'New' || r.decision === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                         {r.decision || r.status}
                      </span>
                    </td>
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
                  <Pill label="Score" value={`${selectedCandidate.score || 0}%`} color="blue" />
                  <Pill label="Status" value={selectedCandidate.decision || selectedCandidate.status} color={selectedCandidate.decision === 'Pending' ? 'amber' : 'emerald'} />
                  <Pill label="Risks Found" value={selectedCandidate.risks?.length || 0} color="amber" />
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">AI Executive Summary</h4>
                  <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {selectedCandidate.summary || "Waiting for AI analysis..."}
                  </p>
                </div>

                {(selectedCandidate.matched_skills?.length > 0 || selectedCandidate.missing_skills?.length > 0) && (
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
                )}

                {selectedCandidate.risks?.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-amber-800 mb-3">Identified Risks & Concerns</h4>
                    <ul className="space-y-3">
                      {selectedCandidate.risks?.map((risk: string, i: number) => (
                        <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                          <span className="text-amber-500 font-bold">!</span> {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedCandidate.interview_questions?.length > 0 && (
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
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}