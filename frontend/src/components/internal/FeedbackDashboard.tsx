import { useState, useEffect } from 'react';
import { feedbackApi, type FeedbackEntry } from '../../api/feedback';

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= count ? 'text-[#F5A623]' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function sentiment(avg: number) {
  if (avg >= 4.5) return { label: 'Great', color: 'text-green-500' };
  if (avg >= 3.5) return { label: 'Good', color: 'text-lime-500' };
  if (avg >= 2.5) return { label: 'Fair', color: 'text-yellow-500' };
  return { label: 'Poor', color: 'text-red-400' };
}

function FeedbackColumn({ title, accent, entries }: {
  title: string;
  accent: string;
  entries: FeedbackEntry[];
}) {
  const [filterStars, setFilterStars] = useState<number | null>(null);

  const total = entries.length;
  const avg = total ? Math.round((entries.reduce((s, e) => s + e.stars, 0) / total) * 10) / 10 : 0;
  const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  entries.forEach(e => { dist[String(e.stars)] = (dist[String(e.stars)] || 0) + 1; });
  const maxCount = Math.max(...Object.values(dist), 1);
  const { label: sentLabel, color: sentColor } = sentiment(avg);

  const visible = filterStars ? entries.filter(e => e.stars === filterStars) : entries;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{total} responses</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-gray-900">{total > 0 ? avg.toFixed(1) : '—'}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Avg Stars</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className={`text-3xl font-bold ${total > 0 ? sentColor : 'text-gray-300'}`}>{total > 0 ? sentLabel : '—'}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Sentiment</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Distribution</p>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = dist[String(star)] || 0;
            const pct = Math.round((count / maxCount) * 100);
            const isActive = filterStars === star;
            return (
              <button
                key={star}
                onClick={() => setFilterStars(isActive ? null : star)}
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1 transition-colors ${isActive ? 'bg-[#F5A623]/10' : 'hover:bg-gray-50'}`}
              >
                <span className="text-xs font-bold text-gray-500 w-3 text-right shrink-0">{star}</span>
                <svg className="w-3 h-3 text-[#F5A623] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${accent}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-600 w-5 text-right shrink-0">{count}</span>
              </button>
            );
          })}
        </div>
        {filterStars && (
          <button onClick={() => setFilterStars(null)} className="mt-2 text-xs text-[#7A60F4] font-bold hover:underline">
            Clear filter
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {filterStars ? `${filterStars}-star (${visible.length})` : `All (${visible.length})`}
        </p>
        {visible.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-400">No responses yet</p>
          </div>
        ) : (
          visible.map((entry) => (
            <div key={entry.feedback_id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{entry.user_email}</p>
                  {entry.comment ? (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">"{entry.comment}"</p>
                  ) : (
                    <p className="text-xs text-gray-300 mt-1 italic">No comment</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Stars count={entry.stars} />
                  {entry.updated_at && (
                    <p className="text-[10px] text-gray-400">
                      {new Date(entry.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FeedbackDashboard() {
  const [allEntries, setAllEntries] = useState<FeedbackEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    feedbackApi.getAll()
      .then((data) => setAllEntries(data.entries))
      .catch(() => setError('Access denied. Your account is not on the internal access list.'))
      .finally(() => setLoading(false));
  }, []);

  const candidateEntries = allEntries?.filter(e => e.user_role === 'candidate') ?? [];
  const hrEntries = allEntries?.filter(e => e.user_role === 'hr') ?? [];

  return (
    <div className="min-h-full font-sans">
      <div className="max-w-6xl mx-auto px-8 py-8">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Feedback Analytics</h1>
          <p className="text-1xl text-gray-400 dark:text-neutral-500 mt-1">Feedback from all users, split by portal.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        {allEntries && (
          <div className="grid grid-cols-2 gap-8">
            <FeedbackColumn
              title="Candidate Portal"
              accent="bg-[#7A60F4]"
              entries={candidateEntries}
            />
            <div className="pl-8">
              <FeedbackColumn
                title="HR Portal"
                accent="bg-[#F5A623]"
                entries={hrEntries}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
