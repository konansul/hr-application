import { useState, useEffect, useMemo } from 'react';
import { screeningApi, jobsApi } from '../../../api';
import { useStore } from '../../../store';
import { DICT } from '../../../internationalization.ts';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

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
    red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400',
  };

  return (
    <div className={`px-3 py-2 border rounded-xl ${colorStyles[color]} flex flex-col items-start transition-colors h-full justify-center`}>
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{label}</span>
      <span className="text-sm font-semibold truncate w-full">{value}</span>
    </div>
  );
};

const CircleChart = ({ score }: { score: number }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = "text-red-500 dark:text-red-400";
  if (score >= 75) colorClass = "text-emerald-500 dark:text-emerald-400";
  else if (score >= 50) colorClass = "text-amber-500 dark:text-amber-400";

  return (
    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} className="stroke-gray-100 dark:stroke-neutral-800" strokeWidth="6" fill="none" />
        <circle
          cx="32" cy="32" r={radius}
          className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth="6" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold text-gray-900 dark:text-white leading-none">{score}</span>
        <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mt-0.5">Score</span>
      </div>
    </div>
  );
};

interface CompareTabProps {
  batchResults?: any[];
}

export function CompareTab({ batchResults: sessionResults }: CompareTabProps) {
  const { language, globalJobId } = useStore();
  const t = DICT[language as keyof typeof DICT]?.compare || DICT.en.compare;

  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [compareJobId, setCompareJobId] = useState<string>('');

  const [dbResults, setDbResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobs = await (jobsApi as any).list();
        setAvailableJobs(jobs);
        if (jobs.length > 0) {
          setCompareJobId(jobs[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    const loadStoredData = async () => {
      if (!compareJobId) return;
      setLoading(true);
      try {
        const data = await (screeningApi as any).getStoredResults(compareJobId);
        setDbResults(data);

        setSelectedIds([]);

        if (data.length >= 2) {
          setSelectedIds([data[0].application_id, data[1].application_id]);
        } else if (data.length === 1) {
          setSelectedIds([data[0].application_id]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStoredData();
  }, [compareJobId]);

  const allResults = useMemo(() => {
    const resultMap = new Map();
    dbResults.forEach(r => resultMap.set(r.application_id, r));
    if (sessionResults && globalJobId === compareJobId) {
      sessionResults.forEach(r => resultMap.set(r.application_id, r));
    }
    return Array.from(resultMap.values());
  }, [dbResults, sessionResults, globalJobId, compareJobId]);

  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const compareItems = useMemo(() =>
    allResults.filter(item => selectedIds.includes(item.application_id)),
  [allResults, selectedIds]);

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  const chartData = useMemo(() => {
    return compareItems.map(c => ({
      name: c.filename.length > 12 ? c.filename.substring(0, 12) + '...' : c.filename,
      Score: c.score,
      Matched: Array.isArray(c.matched_skills) ? c.matched_skills.length : 0,
      Missing: Array.isArray(c.missing_skills) ? c.missing_skills.length : 0,
    }));
  }, [compareItems]);

  const radarData = useMemo(() => {
    if (compareItems.length === 0) return [];
    const dataTemplate = [
      { subject: 'Overall Score', fullMark: 100 },
      { subject: 'Skills Match', fullMark: 100 },
      { subject: 'Reliability', fullMark: 100 },
    ];
    return dataTemplate.map(point => {
      const row: any = { subject: point.subject };
      compareItems.forEach((c) => {
        const name = c.filename.substring(0, 12);
        if (point.subject === 'Overall Score') {
          row[name] = c.score;
        } else if (point.subject === 'Skills Match') {
          const matched = Array.isArray(c.matched_skills) ? c.matched_skills.length : 0;
          const missing = Array.isArray(c.missing_skills) ? c.missing_skills.length : 0;
          const total = matched + missing || 1;
          row[name] = Math.round((matched / total) * 100);
        } else if (point.subject === 'Reliability') {
          const risksCount = Array.isArray(c.risks) ? c.risks.length : 0;
          row[name] = Math.max(0, 100 - (risksCount * 15));
        }
      });
      return row;
    });
  }, [compareItems]);

  const radialData = useMemo(() => {
    return compareItems.map((c, index) => ({
      name: c.filename.substring(0, 15),
      score: c.score,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [compareItems]);

  if (loading && allResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading stored analysis...</p>
      </div>
    );
  }

  const customTooltipStyle = {
    backgroundColor: 'var(--tw-bg-opacity, #ffffff)',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#374151'
  };

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>

        <div className="w-full md:w-auto shrink-0 z-10">
          <label className="block text-[10px] font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
            Select Job to Compare
          </label>
          <select
            value={compareJobId}
            onChange={(e) => setCompareJobId(e.target.value)}
            className="w-full md:w-64 px-4 py-2.5 text-sm bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all cursor-pointer font-bold text-gray-900 dark:text-white shadow-sm"
          >
            {availableJobs.length === 0 && <option value="">Loading jobs...</option>}
            {availableJobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {allResults.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl transition-colors">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 border dark:border-blue-800/50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.emptyTitle}</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm">No screened candidates found for this job yet.</p>
        </div>
      ) : (
        <>
          <div className="p-5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm transition-colors relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-neutral-900/50 flex items-center justify-center rounded-2xl z-10">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">
              {allResults.map((result) => {
                const isSelected = selectedIds.includes(result.application_id);
                const isDisabled = !isSelected && selectedIds.length >= 3;

                return (
                  <button
                    key={result.application_id}
                    onClick={() => handleToggleSelection(result.application_id)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Overall Score Comparison
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }} barSize={35}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#525252" opacity={0.15} />
                        <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={customTooltipStyle} />
                        <Bar dataKey="Score" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.Score >= 75 ? '#10b981' : entry.Score >= 50 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                    Candidate Profile
                  </h3>
                  <div className="h-[280px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <RechartsTooltip contentStyle={customTooltipStyle} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        {compareItems.map((c, index) => (
                          <Radar
                            key={c.application_id}
                            name={c.filename.substring(0, 12)}
                            dataKey={c.filename.substring(0, 12)}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            fillOpacity={0.35}
                          />
                        ))}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Skills Breakdown
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }} barSize={35}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#525252" opacity={0.15} />
                        <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={customTooltipStyle} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />

                        <Bar dataKey="Matched" stackId="a" fill="#10b981" />
                        <Bar dataKey="Missing" stackId="a" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                    Overall Score Rings
                  </h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="100%"
                        barSize={15}
                        data={radialData}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                          background={{ fill: 'rgba(156, 163, 175, 0.1)' }}
                          dataKey="score"
                          cornerRadius={10}
                        />
                        <Legend
                          iconSize={10}
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563' }}
                        />
                        <RechartsTooltip contentStyle={customTooltipStyle} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className={`grid gap-6 items-start ${compareItems.length === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {compareItems.map((candidate) => {
                  const matchedCount = Array.isArray(candidate.matched_skills) ? candidate.matched_skills.length : 0;
                  const missingCount = Array.isArray(candidate.missing_skills) ? candidate.missing_skills.length : 0;
                  const totalSkills = matchedCount + missingCount;
                  const matchRatio = totalSkills > 0 ? (matchedCount / totalSkills) * 100 : 0;

                  return (
                    <div key={candidate.application_id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-all duration-300">
                      <div className="mb-6 border-b border-gray-100 dark:border-neutral-800 pb-5">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white break-words mb-4 leading-tight">
                          {candidate.filename}
                        </h4>

                        <div className="flex items-center gap-4">
                          <CircleChart score={candidate.score} />

                          <div className="flex-1">
                            <Pill
                              label={t.decision}
                              value={candidate.decision || '—'}
                              color={candidate.decision?.toLowerCase() === 'hire' ? 'emerald' : candidate.decision?.toLowerCase() === 'reject' ? 'red' : 'gray'}
                            />
                          </div>
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
                          <div className="flex justify-between items-end mb-2">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-500">Skills Ratio</h5>
                            <span className="text-[10px] font-bold text-gray-400">{matchedCount} Found / {missingCount} Missing</span>
                          </div>
                          <div className="w-full h-2 flex rounded-full overflow-hidden opacity-80 mb-3">
                            <div className="bg-emerald-500 h-full" style={{ width: `${matchRatio}%` }}></div>
                            <div className="bg-red-400 h-full" style={{ width: `${100 - matchRatio}%` }}></div>
                          </div>
                        </section>

                        <section>
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {t.matchedSkills}
                          </h5>
                          <p className="text-sm text-gray-800 dark:text-neutral-200 font-bold leading-relaxed">
                            {Array.isArray(candidate.matched_skills) && candidate.matched_skills.length > 0
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
                            {Array.isArray(candidate.missing_skills) && candidate.missing_skills.length > 0
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
                            {Array.isArray(candidate.risks) && candidate.risks.length > 0 ? (
                              candidate.risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)
                            ) : (
                              <li className="text-gray-400 dark:text-neutral-600 italic list-none">{t.noRisks}</li>
                            )}
                          </ul>
                        </section>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}