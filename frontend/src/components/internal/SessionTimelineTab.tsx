import { useState, useEffect } from 'react';
import { activityApi, type TimelineDay } from '../../api/activity';

export function SessionTimelineTab() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<TimelineDay[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'unique_users' | 'total_events'>('unique_users');

  useEffect(() => {
    setLoading(true);
    setData(null);
    activityApi.getTimeline(range)
      .then(r => { setData(r.days); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const maxVal = data ? Math.max(...data.map(d => d[metric]), 1) : 1;
  const totalEvents = data ? data.reduce((s, d) => s + d.total_events, 0) : 0;
  const peakDay = data ? data.reduce((best, d) => d[metric] > best[metric] ? d : best, data[0]) : null;
  const avgPerDay = data && data.length
    ? Math.round(data.reduce((s, d) => s + d[metric], 0) / data.length * 10) / 10
    : 0;

  const formatAxisDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const labelEvery = range === 7 ? 1 : range === 30 ? 5 : 10;
  const hasData = data && data.some(d => d[metric] > 0);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Session Timeline</h1>
          <p className="text-1xl text-gray-400 dark:text-neutral-500 mt-1">Unique users &amp; events per day</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['unique_users', 'total_events'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${metric === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                {m === 'unique_users' ? 'Unique Users' : 'Total Events'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([7, 30, 90] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${range === r ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: loading ? '…' : totalEvents },
          { label: 'Avg / Day', value: loading ? '…' : avgPerDay },
          { label: 'Peak Day', value: loading || !peakDay ? '…' : peakDay[metric] },
          { label: 'Peak Date', value: loading || !peakDay ? '…' : formatAxisDate(peakDay.date) },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-black text-gray-900">{c.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
        ) : !hasData ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-center">
            <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm font-semibold text-gray-400">No activity logged yet</p>
            <p className="text-xs text-gray-300 max-w-xs">Activity tracking started just now. Logs will appear here as users navigate the app.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative" style={{ height: 200 }}>
              {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                <div key={pct} className="absolute left-0 right-0 border-t border-gray-100" style={{ bottom: `${pct * 100}%` }}>
                  {pct > 0 && (
                    <span className="absolute -top-3 -left-6 text-[10px] text-gray-300 font-medium select-none">
                      {Math.round(maxVal * pct)}
                    </span>
                  )}
                </div>
              ))}
              <div className="absolute inset-0 flex items-end gap-px pl-6">
                {data!.map(day => {
                  const heightPct = maxVal > 0 ? (day[metric] / maxVal) * 100 : 0;
                  const isToday = day.date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-gray-900 text-white text-[10px] font-semibold rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                        <div>{formatAxisDate(day.date)}</div>
                        <div className="text-gray-300">Unique: {day.unique_users}</div>
                        <div className="text-gray-300">Events: {day.total_events}</div>
                        {(day.hr_users > 0 || day.candidate_users > 0) && (
                          <div className="text-gray-400">HR: {day.hr_users} · Cand: {day.candidate_users}</div>
                        )}
                      </div>
                      <div
                        className="w-full rounded-t-sm transition-all duration-300 cursor-default"
                        style={{
                          height: `${heightPct}%`,
                          minHeight: day[metric] > 0 ? 2 : 0,
                          background: isToday ? '#7A60F4' : metric === 'unique_users' ? '#9EA4FF' : '#92D8F2',
                          opacity: day[metric] === 0 ? 0.15 : 1,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-px pl-6">
              {data!.map((day, i) => (
                <div key={day.date} className="flex-1 text-center overflow-hidden">
                  {i % labelEvery === 0 && (
                    <span className="text-[9px] text-gray-300 font-medium">{formatAxisDate(day.date)}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-1 justify-end">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#7A60F4]" />
                <span className="text-[11px] text-gray-400">Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: metric === 'unique_users' ? '#9EA4FF' : '#92D8F2' }} />
                <span className="text-[11px] text-gray-400">{metric === 'unique_users' ? 'Unique Users' : 'Events'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HR vs Candidate split */}
      {hasData && data && data.some(d => d.hr_users > 0 || d.candidate_users > 0) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">HR vs Candidate activity</h3>
          <div className="relative" style={{ height: 120 }}>
            <div className="absolute inset-0 flex items-end gap-px">
              {data.map(day => {
                const total = day.hr_users + day.candidate_users;
                const maxTotal = Math.max(...data.map(d => d.hr_users + d.candidate_users), 1);
                const totalH = total > 0 ? (total / maxTotal) * 100 : 0;
                const hrH = total > 0 ? (day.hr_users / total) * 100 : 0;
                return (
                  <div key={day.date} className="flex-1 flex flex-col justify-end h-full group relative">
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow">
                      HR: {day.hr_users} · Cand: {day.candidate_users}
                    </div>
                    <div className="w-full overflow-hidden rounded-t-sm" style={{ height: `${totalH}%`, minHeight: total > 0 ? 2 : 0 }}>
                      <div className="w-full bg-[#7A60F4]" style={{ height: `${hrH}%` }} />
                      <div className="w-full bg-[#92D8F2]" style={{ height: `${100 - hrH}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 justify-end">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#7A60F4]" /><span className="text-[11px] text-gray-400">HR</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#92D8F2]" /><span className="text-[11px] text-gray-400">Candidates</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
