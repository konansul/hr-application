import {useState, useEffect} from 'react';
import {documentsApi, screeningApi} from '../../../api';
import {useStore} from '../../../store';
import {DICT} from '../../../internationalization.ts';

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
        emerald: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400',
        red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400',
        amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400',
        blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400',
    };

    return (
        <div className={`px-4 py-3 border rounded-xl ${colorStyles[color]} flex flex-col items-start min-w-[120px] transition-colors`}>
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
    const {globalJobId, language, aiQuota, aiUsed, setAiLimits} = useStore();
    const t = DICT[language as keyof typeof DICT]?.screening || DICT.en.screening;

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
    }, [globalBatchResults, selectedFilename]);

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
            setAiLimits(aiQuota, aiUsed + 1);
        } catch (err: any) {
            if (err.response?.status === 429) {
                setError("⏳ Daily AI limit reached. Resets at midnight.");
            } else {
                setError(err.response?.data?.detail || "Screening failed to start.");
            }
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
                className="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl max-w-2xl mx-auto mt-10">
                <div
                    className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-amber-900 dark:text-amber-100 mb-1">{t.missingJdTitle}</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400">{t.missingJdDesc}</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20 transition-colors">

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                        {t.subtitle}
                    </p>
                </div>
                <button
                    onClick={handleRunBatch}
                    disabled={isProcessing || selectedDocs.length === 0}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
                        isProcessing || selectedDocs.length === 0
                            ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-600 cursor-not-allowed'
                            : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-[0.98]'
                    }`}
                >
                    {isProcessing ? (
                        <span>{t.processing}</span>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <span>{t.runBtn} ({selectedDocs.length})</span>
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div
                    className="mb-6 p-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6 transition-colors">
                <div className="border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50/90 dark:bg-neutral-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-neutral-800 z-10">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 dark:border-neutral-700 text-gray-900 focus:ring-gray-900 dark:focus:ring-white bg-white dark:bg-black cursor-pointer"
                                    checked={selectedDocs.length > 0 && selectedDocs.length === documents.length}
                                    onChange={toggleAll}
                                />
                            </th>
                            <th className="p-4 text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-widest">
                                {t.table.doc}
                            </th>
                            <th className="p-4 text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-widest">{t.table.source}</th>
                            <th className="p-4 w-12"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {documents.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-neutral-600 text-sm italic">
                                    {t.table.empty}
                                </td>
                            </tr>
                        ) : (
                            documents.map((doc) => (
                                <tr
                                    key={doc.document_id}
                                    className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                                    onClick={() => openDocModal(doc)}
                                >
                                    <td
                                        className="p-4 text-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 dark:border-neutral-700 text-gray-900 focus:ring-gray-900 dark:focus:ring-white bg-white dark:bg-black cursor-pointer"
                                            checked={selectedDocs.includes(doc.document_id)}
                                            onChange={() => toggleDoc(doc.document_id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center shrink-0 border border-gray-200 dark:border-neutral-700 group-hover:bg-white dark:group-hover:bg-black transition-colors">
                                                <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24"
                                                     stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {doc.candidate_name || doc.filename}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-0.5">{doc.filename}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                      <span
                                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700 transition-colors">
                                        {doc.source_type}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => handleDeleteDocument(doc, e)}
                                            className="p-1.5 text-gray-400 dark:text-neutral-600 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
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
                    <Pill label={t.pills.chars} value={jobDescription.length}/>
                    <Pill label={t.pills.available} value={documents.length}/>
                    <Pill label={t.pills.selected} value={selectedDocs.length}
                          color={selectedDocs.length > 0 ? 'blue' : 'gray'}/>
                </div>
            </div>

            {viewingDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-neutral-800 transition-colors">
                        <div
                            className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-950 shrink-0 transition-colors">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{viewingDoc.filename}</h3>
                                <p className="text-xs text-gray-500 dark:text-neutral-500 font-medium mt-1">{t.modal.source}: {viewingDoc.source_type}</p>
                            </div>
                            <button
                                onClick={closeDocModal}
                                className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-black transition-colors">
                            {pdfLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 dark:text-neutral-600">
                                    <div
                                        className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
                                    <span className="text-sm font-semibold">{t.modal.loadingPdf}</span>
                                </div>
                            ) : pdfBlobUrl ? (
                                <iframe
                                    src={pdfBlobUrl}
                                    className="w-full h-full border-0 dark:invert-[0.9] dark:hue-rotate-180"
                                    title={viewingDoc.filename}
                                />
                            ) : (
                                <div className="p-6 overflow-y-auto h-full custom-scrollbar">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-4">{t.modal.textTitle}</h4>
                                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 transition-colors">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-neutral-200 leading-relaxed">
                      {viewingDoc.raw_text || t.modal.noText}
                    </pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        {globalJobId && (
                            <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 shrink-0 transition-colors">
                                <button
                                    onClick={() => handleCheckAnswers(viewingDoc)}
                                    className="w-full py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]"
                                >
                                    {t.modal.checkAnswers}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAnswers && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/90 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-neutral-800 transition-colors">
                        <div
                            className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-950 shrink-0 transition-colors">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.answers.title}</h3>
                            <button
                                onClick={() => setShowAnswers(false)}
                                className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar dark:bg-black">
                            {answersLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500 dark:text-neutral-600">
                                    <div
                                        className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
                                    <span className="text-sm font-semibold">{t.answers.loading}</span>
                                </div>
                            ) : !answers || Object.keys(answers).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center transition-colors">
                                    <div
                                        className="w-12 h-12 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-gray-400 dark:text-neutral-600" fill="none" viewBox="0 0 24 24"
                                             stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.answers.noAnswers}</p>
                                    <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">{t.answers.noAnswersDesc}</p>
                                </div>
                            ) : (
                                <div className="space-y-4 transition-colors">
                                    {answers.map((item, idx) => (
                                        <div key={idx} className="p-5 bg-gray-50 dark:bg-neutral-900/50 rounded-2xl border border-gray-100 dark:border-neutral-800 transition-colors">
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-2">{t.answers.question} {idx + 1}</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{item.label}</p>
                                            <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed bg-white dark:bg-black p-3 rounded-xl border border-gray-200 dark:border-neutral-800 transition-colors shadow-sm">
                                                {item.answer ||
                                                    <span className="italic text-gray-400 dark:text-neutral-600">No answer provided</span>}
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
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 transition-colors">
                    <div
                        className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto custom-scrollbar transition-colors">
                        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                            <thead className="bg-gray-50 dark:bg-neutral-950 border-b border-gray-200 dark:border-neutral-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-widest">{t.results.file}</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-widest">{t.results.score}</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-widest">{t.results.status}</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-widest w-full">{t.results.summary}</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 text-gray-700 dark:text-neutral-300">
                            {results.map((r, idx) => (
                                <tr
                                    key={idx}
                                    className={`transition-colors cursor-pointer ${selectedFilename === r.filename ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-neutral-800/30'}`}
                                    onClick={() => setSelectedFilename(r.filename)}
                                >
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                        {selectedFilename === r.filename &&
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 transition-colors"></div>}
                                        {r.filename}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{r.score || 0}%</td>
                                    <td className="px-6 py-4">
                      <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                              r.status === 'APPLIED' || r.decision === 'Pending'
                                  ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'
                                  : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                          }`}>
                         {r.decision || r.status}
                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-neutral-500 truncate max-w-xs">{r.summary}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.results.reportTitle}</h3>
                            <select
                                value={selectedFilename}
                                onChange={(e) => setSelectedFilename(e.target.value)}
                                className="w-full sm:w-80 px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all cursor-pointer"
                            >
                                {results.map(r => (
                                    <option key={r.filename} value={r.filename}>{r.filename}</option>
                                ))}
                            </select>
                        </div>

                        {selectedCandidate && (
                            <div className="border border-gray-100 dark:border-neutral-800 rounded-2xl p-6 bg-gray-50/30 dark:bg-black/20 space-y-8 transition-colors">
                                <div className="flex flex-wrap gap-4 pb-6 border-b border-gray-100 dark:border-neutral-800">
                                    <Pill label={t.results.score} value={`${selectedCandidate.score || 0}%`} color="blue"/>
                                    <Pill label={t.results.status} value={selectedCandidate.decision || selectedCandidate.status}
                                          color={selectedCandidate.decision === 'Pending' ? 'amber' : 'emerald'}/>
                                    <Pill label={t.results.risks} value={selectedCandidate.risks?.length || 0}
                                          color="amber"/>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        {t.results.aiSummary}
                                    </h4>
                                    <p className="text-sm text-gray-800 dark:text-neutral-300 leading-relaxed bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm transition-colors">
                                        {selectedCandidate.summary || "Waiting for AI analysis..."}
                                    </p>
                                </div>

                                {(selectedCandidate.matched_skills?.length > 0 || selectedCandidate.missing_skills?.length > 0) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 transition-colors">
                                            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-emerald-500" fill="none"
                                                     viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M5 13l4 4L19 7"/>
                                                </svg>
                                                {t.results.matched}
                                            </h4>
                                            <ul className="space-y-2.5">
                                                {selectedCandidate.matched_skills?.map((skill: string, i: number) => (
                                                    <li key={i}
                                                        className="text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                                                        <span className="text-emerald-500 mt-0.5">•</span>
                                                        {skill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-6 transition-colors">
                                            <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24"
                                                     stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                                </svg>
                                                {t.results.missing}
                                            </h4>
                                            <ul className="space-y-2.5">
                                                {selectedCandidate.missing_skills?.map((skill: string, i: number) => (
                                                    <li key={i} className="text-sm text-red-900 dark:text-red-200 flex items-start gap-2">
                                                        <span className="text-red-500 mt-0.5">•</span>
                                                        {skill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {selectedCandidate.risks?.length > 0 && (
                                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 transition-colors">
                                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24"
                                                 stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                            </svg>
                                            {t.results.risksTitle}
                                        </h4>
                                        <ul className="space-y-3">
                                            {selectedCandidate.risks?.map((risk: string, i: number) => (
                                                <li key={i} className="text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
                                                    <span className="text-amber-500 font-bold shrink-0">!</span> {risk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedCandidate.interview_questions?.length > 0 && (
                                    <div className="pt-4 transition-colors">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                                 stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                            </svg>
                                            {t.results.interviewQ}
                                        </h4>
                                        <div className="space-y-3 border-t border-gray-100 dark:border-neutral-800 pt-5 transition-colors">
                                            {selectedCandidate.interview_questions?.map((q: string, i: number) => (
                                                <div key={i}
                                                     className="flex gap-4 p-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:border-gray-300 dark:hover:border-neutral-700 transition-all group">
                          <span
                              className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-neutral-400 mt-0.5 transition-colors">
                            {i + 1}
                          </span>
                                                    <p className="text-sm text-gray-800 dark:text-neutral-200 leading-relaxed font-bold pt-0.5 transition-colors">
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