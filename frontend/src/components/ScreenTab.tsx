import { useState, useEffect } from 'react';
import { documentsApi, screeningApi } from '../api';
import { useStore } from '../store';

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
  const [message, setMessage] = useState<string | null>(null);

  const [results, setResults] = useState<any[]>(globalBatchResults || []);
  const [selectedFilename, setSelectedFilename] = useState<string>(
    globalBatchResults?.length > 0 ? globalBatchResults[0].filename : ''
  );

  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [answers, setAnswers] = useState<{ label: string; answer: string }[] | null>(null);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    documentsApi.getOrganizationDocuments()
      .then(setDocuments)
      .catch(() => setError("Failed to load organization documents."));
  }, []);

  useEffect(() => {
    if (globalBatchResults && globalBatchResults.length > 0) {
      setResults(globalBatchResults);
      if (!selectedFilename) setSelectedFilename(globalBatchResults[0].filename);
    }
  }, [globalBatchResults]);

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedDocs(selectedDocs.length === documents.length ? [] : documents.map(d => d.document_id));
  };

  const handleRunBatch = async () => {
    if (selectedDocs.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const newResults = await screeningApi.runBulk(selectedDocs, jobDescription, globalJobId);
      const combined = [...results];
      newResults.forEach((r: any) => {
        const idx = combined.findIndex(x => x.filename === r.filename);
        if (idx >= 0) combined[idx] = r; else combined.push(r);
      });
      combined.sort((a, b) => (b.score || 0) - (a.score || 0));
      setResults(combined);
      setGlobalBatchResults(combined);
      setSelectedDocs([]);
      if (combined.length > 0) setSelectedFilename(combined[0].filename);
      setMessage(`Screened ${newResults.length} candidate(s) successfully.`);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Screening failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${doc.filename}"? This action cannot be undone.`)) return;
    try {
      await documentsApi.deleteDocument(doc.document_id);
      setDocuments(prev => prev.filter(d => d.document_id !== doc.document_id));
      setSelectedDocs(prev => prev.filter(id => id !== doc.document_id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete document');
    }
  };

  const openDocModal = async (doc: any) => {
    setViewingDoc(doc);
    setPdfBlobUrl(null);
    if ((doc.filename || '').toLowerCase().endsWith('.pdf')) {
      setPdfLoading(true);
      try {
        const url = await documentsApi.getDocumentFileUrl(doc.document_id);
        setPdfBlobUrl(url);
      } catch { /* fallback to raw text */ }
      finally { setPdfLoading(false); }
    }
  };

  const closeDocModal = () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
    setViewingDoc(null);
  };

  const handleCheckAnswers = async (doc: any) => {
    if (!globalJobId) return;
    setShowAnswers(true);
    setAnswers(null);
    setAnswersLoading(true);
    try {
      const data = await (screeningApi as any).getCandidateAnswers(doc.owner_user_id, globalJobId);
      if (data.answers && data.questions) {
        const qMap: Record<string, string> = {};
        data.questions.forEach((q: { id: string; label: string }) => { qMap[q.id] = q.label; });
        setAnswers(Object.entries(data.answers as Record<string, string>).map(([id, answer]) => ({
          label: qMap[id] || id,
          answer,
        })));
      } else {
        setAnswers(null);
      }
    } catch { setAnswers(null); }
    finally { setAnswersLoading(false); }
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

      {/* ── Header ── */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Candidate Screener</h2>
          <p className="text-sm text-gray-500">Select candidates and run AI screening against the active job description.</p>
        </div>
      </div>

      {/* ── Banners ── */}
      {message && (
        <div className="p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {message}
        </div>
      )}
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      {/* ── Results Table — full width ── */}
      {results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">All Screening Results</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{results.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Decision</th>
                  <th className="px-5 py-3 w-full">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {results.map((r, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${r.filename === selectedFilename ? 'bg-blue-50/40' : ''}`}
                    onClick={() => setSelectedFilename(r.filename)}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{r.filename}</td>
                    <td className="px-5 py-3 font-semibold">{r.score || 0}%</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.decision === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.decision || r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 truncate max-w-xs">{r.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── Left sidebar ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Candidate Pool */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Candidate Pool
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                        checked={selectedDocs.length > 0 && selectedDocs.length === documents.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="p-3 text-xs font-bold uppercase text-gray-500 tracking-wider">Candidate</th>
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-gray-400 text-xs italic">
                        No candidates found yet.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr
                        key={doc.document_id}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        onClick={() => openDocModal(doc)}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                            checked={selectedDocs.includes(doc.document_id)}
                            onChange={() => toggleDoc(doc.document_id)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-red-50 rounded flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{doc.candidate_name || doc.filename}</p>
                              <p className="text-[10px] text-gray-400 truncate">{doc.filename}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDeleteDocument(doc, e)}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Session Stats
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Total Candidates', value: documents.length },
                { label: 'Selected', value: selectedDocs.length },
                { label: 'Screened', value: results.length },
                { label: 'Job Desc Length', value: `${jobDescription.length} chars` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500 font-medium">{label}</span>
                  <span className="text-xs font-bold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Workspace ── */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm min-h-[730px] flex flex-col overflow-hidden">

            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${results.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">AI Report</h3>
              </div>
              <div className="flex items-center gap-2">
                {results.length > 0 && (
                  <select
                    value={selectedFilename}
                    onChange={(e) => setSelectedFilename(e.target.value)}
                    className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none"
                  >
                    {results.map(r => (
                      <option key={r.filename} value={r.filename}>{r.filename}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleRunBatch}
                  disabled={isProcessing || selectedDocs.length === 0}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isProcessing || selectedDocs.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 hover:bg-gray-800 text-white active:scale-[0.98]'
                  }`}
                >
                  {isProcessing ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Run AI ({selectedDocs.length})
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            {selectedCandidate ? (
              <div className="p-6 flex flex-col flex-1 gap-6 overflow-y-auto">

                {/* Score pills */}
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Score', value: `${selectedCandidate.score || 0}%` },
                    { label: 'Decision', value: selectedCandidate.decision || selectedCandidate.status },
                    { label: 'Risks', value: selectedCandidate.risks?.length || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-start min-w-[100px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</span>
                      <span className="text-lg font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-gray-100 w-full"></div>

                {/* Summary */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">AI Executive Summary</h4>
                  <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {selectedCandidate.summary || "Waiting for AI analysis..."}
                  </p>
                </div>

                {/* Skills */}
                {(selectedCandidate.matched_skills?.length > 0 || selectedCandidate.missing_skills?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">Matched Skills</h4>
                      <ul className="space-y-1.5">
                        {selectedCandidate.matched_skills?.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-emerald-900 flex items-start gap-2">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-3">Missing Skills</h4>
                      <ul className="space-y-1.5">
                        {selectedCandidate.missing_skills?.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-red-900 flex items-start gap-2">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Risks */}
                {selectedCandidate.risks?.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">Identified Risks</h4>
                    <ul className="space-y-2">
                      {selectedCandidate.risks?.map((r: string, i: number) => (
                        <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                          <span className="text-amber-500 font-bold shrink-0">!</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Interview questions */}
                {selectedCandidate.interview_questions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Recommended Interview Questions</h4>
                    <div className="border-t border-gray-100">
                      {selectedCandidate.interview_questions?.map((q: string, i: number) => (
                        <div key={i} className="flex gap-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                          <span className="shrink-0 text-sm font-bold text-gray-400">{i + 1}.</span>
                          <p className="text-sm text-gray-700 leading-relaxed font-medium">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-gray-400 font-mono flex justify-end gap-4 uppercase tracking-widest mt-auto">
                  <span>File: {selectedCandidate.filename}</span>
                  <span>Score: {selectedCandidate.score || 0}%</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30">
                <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <h4 className="text-gray-900 font-semibold mb-1">No report yet</h4>
                <p className="text-sm text-gray-400 max-w-xs">Select candidates from the pool and click "Run AI" to generate screening reports.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: Resume Viewer ── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{viewingDoc.candidate_name || viewingDoc.filename}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{viewingDoc.filename} · {viewingDoc.source_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {globalJobId && (
                  <button
                    onClick={() => handleCheckAnswers(viewingDoc)}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                  >
                    Check Answers
                  </button>
                )}
                <button onClick={closeDocModal} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-50">
              {pdfLoading ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-400 font-medium animate-pulse">Loading PDF...</div>
              ) : pdfBlobUrl ? (
                <iframe src={pdfBlobUrl} className="w-full h-full border-0" title={viewingDoc.filename} />
              ) : (
                <div className="p-6 overflow-y-auto h-full">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Document Text</h4>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">{viewingDoc.raw_text || "No text available."}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Screening Answers ── */}
      {showAnswers && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Screening Answers</h3>
              </div>
              <button onClick={() => setShowAnswers(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {answersLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm font-medium animate-pulse">Loading answers...</div>
              ) : !answers || answers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">No answers submitted</p>
                  <p className="text-xs text-gray-400 mt-1">This candidate did not answer screening questions for this job.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {answers.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Question {idx + 1}</p>
                      <p className="text-sm font-semibold text-gray-700 mb-1">{item.label}</p>
                      <p className="text-sm text-gray-900 leading-relaxed">{item.answer || <span className="italic text-gray-400">No answer provided</span>}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
