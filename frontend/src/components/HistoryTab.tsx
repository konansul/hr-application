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
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">{label}</span>
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

  const filteredResults = results.filter(r => {
    const name = r.filename || `${r.person?.first_name} ${r.person?.last_name}`;
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           r.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Screening History</h2>
          <p className="text-sm text-gray-500">
            A complete log of all candidates screened against your organization's job descriptions.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[600px]">
        <div className="mb-6 relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by candidate name or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none transition-all"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Date</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Candidate</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Job Title</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Score</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Decision</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">Loading history...</td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">No screening records found.</td>
                </tr>
              ) : (
                filteredResults.map((res) => (
                  <tr
                    key={res.application_id}
                    onClick={() => setSelectedResult(res)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-gray-500 whitespace-nowrap">
                      {new Date(res.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-semibold text-gray-900">
                      {res.filename || `${res.person?.first_name} ${res.person?.last_name}`}
                    </td>
                    <td className="p-4 text-gray-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-xs font-semibold">
                        {res.job_title}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`font-bold ${(res.screening?.score || 0) >= 80 ? 'text-emerald-600' : (res.screening?.score || 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {res.screening?.score ?? '—'}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        res.screening?.decision === 'hire' || res.screening?.decision === 'yes' ? 'bg-emerald-100 text-emerald-800' :
                        res.screening?.decision === 'no' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {res.screening?.decision?.replace('_', ' ') || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {res.status}
                      </span>
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedResult.filename || `${selectedResult.person?.first_name} ${selectedResult.person?.last_name}`}</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Screened for: {selectedResult.job_title}</p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-white">
              <div className="flex flex-wrap gap-4 border-b border-gray-100 pb-6">
                <Pill label="Score" value={`${selectedResult.screening?.score || 0}%`} color="blue" />
                <Pill label="Status" value={selectedResult.status} color="emerald" />
                <Pill label="Decision" value={selectedResult.screening?.decision} color={selectedResult.screening?.decision === 'no' ? 'red' : 'emerald'} />
                <Pill label="Date" value={new Date(selectedResult.created_at).toLocaleDateString()} />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">AI Executive Summary</h4>
                <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {selectedResult.screening?.full_result?.summary || "No summary available."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">Matched Skills</h4>
                  <ul className="space-y-2">
                    {selectedResult.screening?.full_result?.matched_skills?.map((skill: string, i: number) => (
                      <li key={i} className="text-sm text-emerald-900 flex items-start gap-2">• {skill}</li>
                    ))}
                    {(!selectedResult.screening?.full_result?.matched_skills || selectedResult.screening?.full_result?.matched_skills.length === 0) && <li className="text-sm text-emerald-700 italic">No data</li>}
                  </ul>
                </div>
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">Missing Skills</h4>
                  <ul className="space-y-2">
                    {selectedResult.screening?.full_result?.missing_skills?.map((skill: string, i: number) => (
                      <li key={i} className="text-sm text-red-900 flex items-start gap-2">• {skill}</li>
                    ))}
                    {(!selectedResult.screening?.full_result?.missing_skills || selectedResult.screening?.full_result?.missing_skills.length === 0) && <li className="text-sm text-red-700 italic">No data</li>}
                  </ul>
                </div>
              </div>

              {selectedResult.screening?.full_result?.risks?.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-amber-800 mb-3">Identified Risks & Concerns</h4>
                  <ul className="space-y-3">
                    {selectedResult.screening.full_result.risks.map((risk: string, i: number) => (
                      <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">!</span> {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedResult.screening?.full_result?.interview_questions?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Recommended Interview Questions</h4>
                  <div className="space-y-0 border-t border-gray-100">
                    {selectedResult.screening.full_result.interview_questions.map((q: string, i: number) => (
                      <div key={i} className="flex gap-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-2 rounded-lg">
                        <span className="flex-shrink-0 text-sm font-bold text-gray-400">{i + 1}.</span>
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">{q}</p>
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