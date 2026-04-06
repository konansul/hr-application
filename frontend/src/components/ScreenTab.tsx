import {useState, useEffect} from 'react';
import {documentsApi, screeningApi} from '../api';
import {useStore} from '../store';

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
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{label}</span>
            <span className="text-xl font-semibold truncate w-full">{value}</span>
        </div>
    );
};

interface ScreenTabProps {
    jobDescription: string;
    globalBatchResults: any[];
    setGlobalBatchResults: (results: any[]) => void;
}

export function ScreenTab({jobDescription, globalBatchResults, setGlobalBatchResults}: ScreenTabProps) {
    const {globalJobId} = useStore();
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        const isPdf = (doc.filename || '').toLowerCase().endsWith('.pdf');
        if (isPdf) {
            setPdfLoading(true);
            try {
                const url = await documentsApi.getDocumentFileUrl(doc.document_id);
                setPdfBlobUrl(url);
            } catch {
            } finally {
                setPdfLoading(false);
            }
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
                const questionsMap: Record<string, string> = {};
                data.questions.forEach((q: { id: string; label: string }) => {
                    questionsMap[q.id] = q.label;
                });
                const mapped = Object.entries(data.answers as Record<string, string>).map(([id, answer]) => ({
                    label: questionsMap[id] || id,
                    answer,
                }));
                setAnswers(mapped);
            } else {
                setAnswers(null);
            }
        } catch {
            setAnswers(null);
        } finally {
            setAnswersLoading(false);
        }
    };

    const selectedCandidate = results.find(r => r.filename === selectedFilename);

    if (!jobDescription.trim() || !globalJobId) {
        return (
            <div
                className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50 border border-amber-100 rounded-2xl max-w-2xl mx-auto mt-10">
                <div
                    className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-amber-900 mb-1">Missing Job Description</h3>
                <p className="text-sm text-amber-700">Please create or select an active job in the "Job Descriptions"
                    tab before screening CVs.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Candidate Pool</h2>
                    <p className="text-sm text-gray-500">
                        Select candidates from your organization's database to screen against the current job
                        description.
                    </p>
                </div>
                <button
                    onClick={handleRunBatch}
                    disabled={isProcessing || selectedDocs.length === 0}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
                        isProcessing || selectedDocs.length === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm active:scale-[0.98]'
                    }`}
                >
                    {isProcessing ? (
                        <span>Processing...</span>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <span>Run AI Screening ({selectedDocs.length})</span>
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div
                    className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm border-b border-gray-200 z-10">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                                    checked={selectedDocs.length > 0 && selectedDocs.length === documents.length}
                                    onChange={toggleAll}
                                />
                            </th>
                            <th className="p-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Candidate
                                Document
                            </th>
                            <th className="p-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Source</th>
                            <th className="p-4 w-12"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {documents.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500 text-sm">
                                    No candidates found in your organization yet.
                                </td>
                            </tr>
                        ) : (
                            documents.map((doc) => (
                                <tr
                                    key={doc.document_id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                    onClick={() => openDocModal(doc)}
                                >
                                    <td
                                        className="p-4 text-center"
                                        onClick={(e) => e.stopPropagation()}
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
                                            <div
                                                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 border border-gray-200 group-hover:bg-white transition-colors">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24"
                                                     stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {doc.candidate_name || doc.filename}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">{doc.filename}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                      <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                        {doc.source_type}
                      </span>
                                    </td>
                                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => handleDeleteDocument(doc, e)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete document"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                                 stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                    <Pill label="Active Job Chars" value={jobDescription.length}/>
                    <Pill label="Docs Available" value={documents.length}/>
                    <Pill label="Selected" value={selectedDocs.length}
                          color={selectedDocs.length > 0 ? 'blue' : 'gray'}/>
                </div>
            </div>

            {viewingDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div
                            className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{viewingDoc.filename}</h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">Source: {viewingDoc.source_type}</p>
                            </div>
                            <button
                                onClick={closeDocModal}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden bg-gray-50">
                            {pdfLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                                    <div
                                        className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                                    <span className="text-sm font-semibold">Loading PDF...</span>
                                </div>
                            ) : pdfBlobUrl ? (
                                <iframe
                                    src={pdfBlobUrl}
                                    className="w-full h-full border-0"
                                    title={viewingDoc.filename}
                                />
                            ) : (
                                <div className="p-6 overflow-y-auto h-full">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Document
                                        Text</h4>
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                      {viewingDoc.raw_text || "No text available."}
                    </pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        {globalJobId && (
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                                <button
                                    onClick={() => handleCheckAnswers(viewingDoc)}
                                    className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
                                >
                                    Check Candidate Answers
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAnswers && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div
                            className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">Screening Answers</h3>
                            <button
                                onClick={() => setShowAnswers(false)}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {answersLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
                                    <div
                                        className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                                    <span className="text-sm font-semibold">Loading answers...</span>
                                </div>
                            ) : !answers || Object.keys(answers).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div
                                        className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24"
                                             stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">No answers submitted</p>
                                    <p className="text-xs text-gray-500 mt-1">This candidate did not answer screening
                                        questions for this job.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {answers.map((item, idx) => (
                                        <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Question {idx + 1}</p>
                                            <p className="text-sm font-semibold text-gray-900 mb-2">{item.label}</p>
                                            <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-200">
                                                {item.answer ||
                                                    <span className="italic text-gray-400">No answer provided</span>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Candidate
                                    File
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Score</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Status
                                    / Decision
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest w-full">Summary</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                            {results.map((r, idx) => (
                                <tr
                                    key={idx}
                                    className={`transition-colors cursor-pointer ${selectedFilename === r.filename ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}
                                    onClick={() => setSelectedFilename(r.filename)}
                                >
                                    <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                                        {selectedFilename === r.filename &&
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                                        {r.filename}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-indigo-600">{r.score || 0}%</td>
                                    <td className="px-6 py-4">
                      <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              r.status === 'APPLIED' || r.decision === 'Pending'
                                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
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

                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-gray-900">Detailed Report</h3>
                            <select
                                value={selectedFilename}
                                onChange={(e) => setSelectedFilename(e.target.value)}
                                className="w-full sm:w-80 px-4 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all cursor-pointer"
                            >
                                {results.map(r => (
                                    <option key={r.filename} value={r.filename}>{r.filename}</option>
                                ))}
                            </select>
                        </div>

                        {selectedCandidate && (
                            <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50/30 space-y-8">
                                <div className="flex flex-wrap gap-4 pb-6 border-b border-gray-100">
                                    <Pill label="Score" value={`${selectedCandidate.score || 0}%`} color="blue"/>
                                    <Pill label="Status" value={selectedCandidate.decision || selectedCandidate.status}
                                          color={selectedCandidate.decision === 'Pending' ? 'amber' : 'emerald'}/>
                                    <Pill label="Risks Found" value={selectedCandidate.risks?.length || 0}
                                          color="amber"/>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        AI Executive Summary
                                    </h4>
                                    <p className="text-sm text-gray-800 leading-relaxed bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                        {selectedCandidate.summary || "Waiting for AI analysis..."}
                                    </p>
                                </div>

                                {(selectedCandidate.matched_skills?.length > 0 || selectedCandidate.missing_skills?.length > 0) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6">
                                            <h4 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-emerald-500" fill="none"
                                                     viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M5 13l4 4L19 7"/>
                                                </svg>
                                                Matched Skills
                                            </h4>
                                            <ul className="space-y-2.5">
                                                {selectedCandidate.matched_skills?.map((skill: string, i: number) => (
                                                    <li key={i}
                                                        className="text-sm text-emerald-900 flex items-start gap-2">
                                                        <span className="text-emerald-500 mt-0.5">•</span>
                                                        {skill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6">
                                            <h4 className="text-sm font-semibold text-red-800 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24"
                                                     stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                                </svg>
                                                Missing Skills
                                            </h4>
                                            <ul className="space-y-2.5">
                                                {selectedCandidate.missing_skills?.map((skill: string, i: number) => (
                                                    <li key={i} className="text-sm text-red-900 flex items-start gap-2">
                                                        <span className="text-red-500 mt-0.5">•</span>
                                                        {skill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {selectedCandidate.risks?.length > 0 && (
                                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6">
                                        <h4 className="text-sm font-semibold text-amber-800 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24"
                                                 stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                            </svg>
                                            Identified Risks & Concerns
                                        </h4>
                                        <ul className="space-y-3">
                                            {selectedCandidate.risks?.map((risk: string, i: number) => (
                                                <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                                                    <span className="text-amber-500 font-bold shrink-0">!</span> {risk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedCandidate.interview_questions?.length > 0 && (
                                    <div className="pt-4">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                                 stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                            </svg>
                                            Recommended Interview Questions
                                        </h4>
                                        <div className="space-y-3 border-t border-gray-100 pt-5">
                                            {selectedCandidate.interview_questions?.map((q: string, i: number) => (
                                                <div key={i}
                                                     className="flex gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-gray-300 transition-colors">
                          <span
                              className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 mt-0.5">
                            {i + 1}
                          </span>
                                                    <p className="text-sm text-gray-800 leading-relaxed font-medium pt-0.5">
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