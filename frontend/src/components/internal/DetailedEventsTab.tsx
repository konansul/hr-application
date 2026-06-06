import { useState, useEffect } from 'react';
import { activityApi, type EventEntry, type EventsResponse } from '../../api/activity';
import { MODULE_LABELS, MODULE_COLORS } from './analyticsUtils';

const ROLE_COLORS: Record<string, string> = {
  hr: 'bg-violet-50 text-violet-700',
  candidate: 'bg-blue-50 text-blue-700',
};

function timeSinceShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.floor(hrs / 24);
  return `${d}d ago`;
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ModuleBadge({ mod }: { mod: string }) {
  const color = MODULE_COLORS[mod] ?? '#7A60F4';
  const label = MODULE_LABELS[mod] ?? mod;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="font-medium text-gray-700">{label}</span>
    </span>
  );
}

export function DetailedEventsTab() {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [roleFilter, setRoleFilter] = useState('all');
  const [modFilter, setModFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setApiError(null);
      activityApi.getEvents({ days, role: roleFilter, module: modFilter, page, per_page: 50 })
        .then(res => { if (!cancelled) { setData(res); setLoading(false); } })
        .catch(err => {
          if (!cancelled) {
            setApiError(err?.response?.data?.detail ?? 'Failed to load events. Make sure the backend is running.');
            setLoading(false);
          }
        });
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [days, roleFilter, modFilter, page]);

  const allModules = data?.all_modules ?? [];

  const handleDaysChange = (d: number) => { setDays(d); setPage(1); };
  const handleRoleChange = (r: string) => { setRoleFilter(r); setPage(1); };
  const handleModChange = (m: string) => { setModFilter(m); setPage(1); };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">

      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Detailed Events</h1>
        <p className="text-gray-400 dark:text-neutral-500 mt-1">Every module visit logged — who, where, when.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[7, 30, 90, 0].map(d => (
            <button
              key={d}
              onClick={() => handleDaysChange(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${days === d ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              {d === 0 ? 'All time' : `${d}d`}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(['all', 'hr', 'candidate'] as const).map(r => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${roleFilter === r ? 'bg-[#7A60F4] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {r === 'all' ? 'All roles' : r === 'hr' ? 'HR' : 'Candidates'}
            </button>
          ))}
        </div>

        <select
          value={modFilter}
          onChange={e => handleModChange(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none text-gray-600 bg-white"
        >
          <option value="all">All modules</option>
          {allModules.map(m => (
            <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>
          ))}
        </select>

        {data && (
          <span className="ml-auto text-[11px] text-gray-400">
            {data.total.toLocaleString()} events
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-300 text-sm">Loading…</div>
        ) : apiError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-8">
            <p className="text-sm font-semibold text-red-400">Error loading events</p>
            <p className="text-xs text-gray-400">{apiError}</p>
          </div>
        ) : !data || data.events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-gray-400">No events yet</p>
            <p className="text-xs text-gray-300">Navigate between app tabs to generate activity logs.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-bold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Module</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e: EventEntry) => (
                  <tr key={e.log_id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900">
                        {e.first_name || e.last_name
                          ? `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim()
                          : <span className="text-gray-400 italic">No name</span>}
                      </div>
                      <div className="text-gray-400 mt-0.5">{e.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ModuleBadge mod={e.module} />
                    </td>
                    <td className="px-4 py-3">
                      {e.role ? (
                        <span className={`px-2 py-1 rounded-full font-semibold text-[10px] ${ROLE_COLORS[e.role] ?? 'bg-gray-50 text-gray-600'}`}>
                          {e.role === 'hr' ? 'HR' : 'Candidate'}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500" title={formatFullDate(e.logged_at)}>
                      {timeSinceShort(e.logged_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
                <span className="text-[11px] text-gray-400">Page {data.page} of {data.pages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
