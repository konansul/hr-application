import { useState, useEffect } from 'react';
import { screeningApi } from '../api';
import { useStore } from '../store';

const Pill = ({ label, value, color = 'gray' }: { label: string; value: string | number; color?: 'gray' | 'emerald' | 'red' | 'amber' | 'blue' }) => {
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

export function HistoryTab() {
  const { activeTab } = useStore();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'history') {
      setIsLoading(true);
      screeningApi.getAllOrganizationApplications()
        .then(setResults)
        .catch(() => setError("Failed to load screening history."))
        .finally(() => setIsLoading(false));
    }
  }, [activeTab]);

  const handleDelete = async (applicationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this screening record? This action cannot be undone.')) return;
    try {
      await screeningApi.deleteApplication(applicationId);
      setResults(prev => prev.filter(r => r.application_id !== applicationId));
      if (selectedResult?.application_id === applicationId) setSelectedResult(null);
    } catch {
      setError('Failed to delete record.');
    }
  };

  const filteredResults = results.filter(r => {
    const name = r.filename || `${r.person?.first_name} ${r.person?.last_name}`;
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           r.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // --- ВЫЧИСЛЕНИЕ СТАТИСТИКИ ---
  const totalCandidates = results.length;

  const totalOffers = results.filter(r => {
    const decision = r.screening?.decision?.toLowerCase();
    const status = r.status?.toUpperCase() || '';
    return ['hire', 'yes', 'strong_yes'].includes(decision) || status.includes('OFFER');
  }).length;

  const totalRejections = results.filter(r => {
    const decision = r.screening?.decision?.toLowerCase();
    const status = r.status?.toUpperCase() || '';
    return decision === 'no' || status.includes('REJECT');
  }).length;

  const averageScore = totalCandidates > 0
    ? Math.round(results.reduce((acc, r) => acc + (r.screening?.score || 0), 0) / totalCandidates)
    : 0;

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Screening History</h2>
          <p className="text-sm text-gray-500">
            A complete log of all candidates screened against your organization's job descriptions.
          </p>
        </div>
      </div>

      {/* --- ВИДЖЕТЫ СТАТИСТИКИ --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Candidates</span>
          <span className="text-3xl font-bold text-gray-900">{totalCandidates}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Average Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">{averageScore}</span>
            <span className="text-sm font-semibold text-blue-600/50">/ 100</span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Offers / Hired</span>
          <span className="text-3xl font-bold text-emerald-700">{totalOffers}</span>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-red-600 mb-1">Rejected</span>
          <span className="text-3xl font-bold text-red-700">{totalRejections}</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[600px]">

        <div className="mb-6 relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by candidate name or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none transition-all"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm border-b border-gray-200 z-10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Candidate</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Job Title</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Score</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Decision</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400 tracking-widest">Status</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                      <span className="text-sm font-semibold">Loading history...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500 font-medium">No screening records found.</td>
                </tr>
              ) : (
                filteredResults.map((res) => (
                  <tr
                    key={res.application_id}
                    onClick={() => setSelectedResult(res)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(res.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {res.filename || `${res.person?.first_name} ${res.person?.last_name}`}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold">
                        {res.job_title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${(res.screening?.score || 0) >= 80 ? 'text-emerald-600' : (res.screening?.score || 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {res.screening?.score ?? '—'}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        res.screening?.decision === 'hire' || res.screening?.decision === 'yes' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                        res.screening?.decision === 'no' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
                      }`}>
                        {res.screening?.decision?.replace('_', ' ') || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {res.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleDelete(res.application_id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete record"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedResult.filename || `${selectedResult.person?.first_name} ${selectedResult.person?.last_name}`}</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Screened for: {selectedResult.job_title}</p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-white">
              <div className="flex flex-wrap gap-4 border-b border-gray-100 pb-6">
                <Pill label="Score" value={`${selectedResult.screening?.score || 0}%`} color="blue" />
                <Pill label="Status" value={selectedResult.status?.replace('_', ' ')} color="emerald" />
                <Pill label="Decision" value={selectedResult.screening?.decision} color={selectedResult.screening?.decision === 'no' ? 'red' : 'emerald'} />
                <Pill label="Date" value={new Date(selectedResult.created_at).toLocaleDateString()} />
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  AI Executive Summary
                </h4>
                <p className="text-sm text-gray-800 leading-relaxed bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  {selectedResult.screening?.full_result?.summary || "No summary available."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6">
                  <h4 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Matched Skills
                  </h4>
                  <ul className="space-y-2.5">
                    {selectedResult.screening?.full_result?.matched_skills?.map((skill: string, i: number) => (
                      <li key={i} className="text-sm text-emerald-900 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        {skill}
                      </li>
                    ))}
                    {(!selectedResult.screening?.full_result?.matched_skills || selectedResult.screening?.full_result?.matched_skills.length === 0) && <li className="text-sm text-emerald-700 italic">No data</li>}
                  </ul>
                </div>
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6">
                  <h4 className="text-sm font-semibold text-red-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Missing Skills
                  </h4>
                  <ul className="space-y-2.5">
                    {selectedResult.screening?.full_result?.missing_skills?.map((skill: string, i: number) => (
                      <li key={i} className="text-sm text-red-900 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        {skill}
                      </li>
                    ))}
                    {(!selectedResult.screening?.full_result?.missing_skills || selectedResult.screening?.full_result?.missing_skills.length === 0) && <li className="text-sm text-red-700 italic">No data</li>}
                  </ul>
                </div>
              </div>

              {selectedResult.screening?.full_result?.risks?.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6">
                  <h4 className="text-sm font-semibold text-amber-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Identified Risks & Concerns
                  </h4>
                  <ul className="space-y-3">
                    {selectedResult.screening.full_result.risks.map((risk: string, i: number) => (
                      <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                        <span className="text-amber-500 font-bold shrink-0">!</span> {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedResult.screening?.full_result?.interview_questions?.length > 0 && (
                <div className="pt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Recommended Interview Questions
                  </h4>
                  <div className="space-y-3 border-t border-gray-100 pt-5">
                    {selectedResult.screening.full_result.interview_questions.map((q: string, i: number) => (
                      <div key={i} className="flex gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-gray-300 transition-colors">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 mt-0.5">
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
          </div>
        </div>
      )}
    </div>
  );
}