import { useState, useEffect } from 'react';
import { activityApi, type AnalyticsResponse } from '../../api/activity';
import { HraiLogo } from '../shared/HraiLogo';

import { UsersTab } from './UsersTab';
import { FeedbackDashboard } from './FeedbackDashboard';
import { SessionTimelineTab } from './SessionTimelineTab';
import { DetailedEventsTab } from './DetailedEventsTab';
import { OnboardingFunnelTab } from './OnboardingFunnelTab';
import { RetentionTab } from './RetentionTab';
import { AIUsageTab } from './AIUsageTab';
import { NewUsersTab } from './NewUsersTab';

// ─── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Session Timeline',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'events',
    label: 'Detailed Events',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'funnel',
    label: 'Onboarding Funnel',
    soon: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
  {
    id: 'retention',
    label: 'Retention',
    soon: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI Usage',
    soon: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'newusers',
    label: 'New Users',
    soon: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main layout ───────────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);

  useEffect(() => {
    activityApi.getAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalyticsError(true));
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen w-full hrai-app-bg text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">

      {/* Left sidebar — same structure as CandidateDashboard */}
      <aside className="hidden md:flex flex-col w-64 px-3 py-4 hrai-sidebar border-r border-white/40 dark:border-neutral-800 shrink-0 z-10">

        <div className="flex items-center px-3 mb-1 mt-2 shrink-0">
          <HraiLogo height={84} />
        </div>
        <div className="px-3 mb-4 shrink-0">
          <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">Internal Analytics</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto font-medium custom-scrollbar relative z-10 mt-2 px-2 py-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const isSoon = 'soon' in tab && tab.soon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#7A60F4] text-white shadow-sm border border-[#6B52E8]'
                    : 'text-gray-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-800/50 hover:text-gray-900 dark:hover:text-white border border-transparent'
                } ${isSoon && !isActive ? 'opacity-60' : ''}`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-400 dark:text-neutral-500 group-hover:text-gray-600 dark:group-hover:text-neutral-300'}>
                  {tab.icon}
                </span>
                <span className="flex-1 truncate">{tab.label}</span>
                {isSoon && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-400'}`}>
                    SOON
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-2 py-3 space-y-1 shrink-0">
          <button
            onClick={handleBack}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 text-gray-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-800/50 hover:text-gray-900 dark:hover:text-white border border-transparent"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="truncate">Back</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 group text-[#c05020] dark:text-[#FF906D] border border-[#FF906D]/30 dark:border-[#FF906D]/20 hover:bg-[#FF906D]/10 dark:hover:bg-[#FF906D]/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            <span className="truncate">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto hrai-main transition-colors duration-300">
        {activeTab === 'users' && (
          analyticsError
            ? <div className="p-8 text-sm text-gray-400">Access denied or server error.</div>
            : !analytics
            ? <div className="p-8 text-sm text-gray-400">Loading…</div>
            : <UsersTab data={analytics} />
        )}
        {activeTab === 'feedback' && <FeedbackDashboard />}
        {activeTab === 'timeline' && <SessionTimelineTab />}
        {activeTab === 'events' && <DetailedEventsTab />}
        {activeTab === 'funnel' && <OnboardingFunnelTab />}
        {activeTab === 'retention' && <RetentionTab />}
        {activeTab === 'ai' && <AIUsageTab />}
        {activeTab === 'newusers' && <NewUsersTab />}
      </main>
    </div>
  );
}
