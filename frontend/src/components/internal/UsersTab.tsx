import { useState } from 'react';
import { type AnalyticsResponse, type UserAnalytics } from '../../api/activity';
import { MODULE_LABELS, MODULE_COLORS, formatDate, timeSince } from './analyticsUtils';

type SortKey = 'joined' | 'last_seen' | 'ai_used' | 'activity';

export function UsersTab({ data }: { data: AnalyticsResponse }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'hr' | 'candidate'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('last_seen');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const allModules = Object.keys(data.module_totals).sort((a, b) => data.module_totals[b] - data.module_totals[a]);
  const maxModuleTotal = Math.max(...Object.values(data.module_totals), 1);
  const totalActivity = (u: UserAnalytics) => Object.values(u.module_counts).reduce((s, v) => s + v, 0);

  const filtered = data.users
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.first_name ?? '').toLowerCase().includes(q) ||
        (u.last_name ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'joined') return new Date(b.joined_at ?? 0).getTime() - new Date(a.joined_at ?? 0).getTime();
      if (sortBy === 'last_seen') return new Date(b.last_seen ?? 0).getTime() - new Date(a.last_seen ?? 0).getTime();
      if (sortBy === 'ai_used') return b.ai_used - a.ai_used;
      if (sortBy === 'activity') return totalActivity(b) - totalActivity(a);
      return 0;
    });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">

      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Users</h1>
        <p className="text-1xl text-gray-400 dark:text-neutral-500 mt-1">All registered users, their activity and module usage.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: data.total_users },
          { label: 'HR Accounts', value: data.hr_count },
          { label: 'Candidates', value: data.candidate_count },
          { label: 'Active 7d', value: data.active_last_7_days },
          { label: 'Active 30d', value: data.active_last_30_days },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-black text-gray-900">{c.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Module totals */}
      {allModules.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Module Usage (all time)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3">
            {allModules.map(mod => (
              <div key={mod}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-gray-600">{MODULE_LABELS[mod] ?? mod}</span>
                  <span className="text-[11px] font-bold text-gray-400">{data.module_totals[mod]}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((data.module_totals[mod] / maxModuleTotal) * 100)}%`,
                      background: MODULE_COLORS[mod] ?? '#7A60F4',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-gray-900 mr-1">All Users</h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="flex-1 min-w-[160px] px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7A60F4]/30"
          />
          <div className="flex gap-1">
            {(['all', 'hr', 'candidate'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${roleFilter === r ? 'bg-[#7A60F4] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {r === 'all' ? 'All' : r === 'hr' ? 'HR' : 'Candidates'}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none text-gray-600"
          >
            <option value="last_seen">Sort: Last seen</option>
            <option value="joined">Sort: Joined</option>
            <option value="activity">Sort: Most active</option>
            <option value="ai_used">Sort: AI uses</option>
          </select>
          <span className="text-[11px] text-gray-400 ml-auto">{filtered.length} users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-bold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Last Seen</th>
                <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">AI Uses</th>
                <th className="text-left px-4 py-3 font-bold text-gray-400 uppercase tracking-wider">Activity</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const total = totalActivity(u);
                const topMods = Object.entries(u.module_counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
                const isExp = expandedUser === u.user_id;
                return (
                  <>
                    <tr key={u.user_id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-900">
                          {u.first_name || u.last_name
                            ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                            : <span className="text-gray-400 italic">No name</span>}
                          {u.is_teammate && (
                            <span className="ml-2 px-1.5 py-0.5 bg-[#7A60F4]/10 text-[#7A60F4] rounded font-bold text-[10px]">TEAM</span>
                          )}
                        </div>
                        <div className="text-gray-400 mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-1 rounded-full font-semibold text-[10px] ${u.role === 'hr' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                          {u.role === 'hr' ? 'HR' : 'Candidate'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">{formatDate(u.joined_at)}</td>
                      <td className="px-4 py-3.5 text-gray-500">{timeSince(u.last_seen)}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-gray-700">{u.ai_used}</span>
                        <span className="text-gray-300"> / {u.ai_quota}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {total === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">{total}</span>
                            <div className="flex gap-1">
                              {topMods.map(([mod]) => (
                                <span key={mod} title={MODULE_LABELS[mod] ?? mod} className="w-2 h-2 rounded-full" style={{ background: MODULE_COLORS[mod] ?? '#7A60F4' }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {total > 0 && (
                          <button
                            onClick={() => setExpandedUser(isExp ? null : u.user_id)}
                            className="text-[#7A60F4] hover:underline font-semibold"
                          >
                            {isExp ? 'Hide' : 'Details'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExp && (
                      <tr key={`${u.user_id}-exp`} className="bg-gray-50/80 border-b border-gray-100">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {Object.entries(u.module_counts).sort((a, b) => b[1] - a[1]).map(([mod, cnt]) => {
                              const mc = Math.max(...Object.values(u.module_counts), 1);
                              return (
                                <div key={mod} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] font-semibold text-gray-700">{MODULE_LABELS[mod] ?? mod}</span>
                                    <span className="text-[11px] font-black text-gray-900">{cnt}</span>
                                  </div>
                                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${Math.round((cnt / mc) * 100)}%`, background: MODULE_COLORS[mod] ?? '#7A60F4' }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
