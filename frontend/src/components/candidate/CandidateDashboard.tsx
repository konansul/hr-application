import { useCallback, useEffect, useState } from 'react';
import { ProfileTab } from './ProfileTab';
import { ResumeUploadTab } from './ResumeUploadTab';
import { ImproveCvTab } from './ImproveCvTab';
import { JobsTab } from './CanditateJobsTab';
import { JobApplicationTab } from './JobApplicationTab';
import { CandidateSettingsTab } from './CandidateSettingsTab';
import { useStore } from '../../store';
import { authApi } from '../../api';
import { DICT } from '../../internationalization.ts';
import { tabToPath, pathToNavState } from '../../utils/urlRouting';

const NAV_ITEMS = [
  {
    id: 'profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'upload-cv',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    ),
  },
  {
    id: 'jobs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'applications',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'improve',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
] as const;

export function CandidateDashboard() {
  const {
    activeTab,
    globalJobDescription,
    isSidebarOpen,
    setActiveTab,
    setIsSidebarOpen,
    logoutStore,
    language,
    aiQuota, // ДОСТАЛИ ИЗ СТОРА
    aiUsed   // ДОСТАЛИ ИЗ СТОРА
  } = useStore();

  const t = DICT[language as keyof typeof DICT]?.nav || DICT.en.nav;

  // === ЛОГИКА ДЛЯ СЧЕТЧИКА ЛИМИТОВ ===
  const usesLeft = Math.max(0, aiQuota - aiUsed);
  const percentageLeft = (usesLeft / aiQuota) * 100;

  const getIndicatorColor = () => {
    if (usesLeft > 3) return 'bg-emerald-500';
    if (usesLeft > 1) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (usesLeft > 3) return 'text-emerald-600 dark:text-emerald-400';
    if (usesLeft > 1) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Sync tab from URL on mount
  useEffect(() => {
    const navState = pathToNavState(window.location.pathname);
    if (navState?.tab) {
      setActiveTab(navState.tab as any);
    } else if (!activeTab) {
      setActiveTab('profile');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const navState = pathToNavState(window.location.pathname);
      setActiveTab((navState?.tab ?? 'profile') as any);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab]);

  const navigate = useCallback((tab: string) => {
    setActiveTab(tab as any);
    const path = tabToPath(tab);
    // Only push if we're not already on this tab's path tree
    if (!window.location.pathname.startsWith(path)) {
      window.history.pushState({ tab }, '', path);
    }
  }, [setActiveTab]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (e) {}
    localStorage.removeItem('auth_token');
    logoutStore();
  };

  const SideNavItem = ({ id, label, icon }: { id: any; label: string; icon: React.ReactNode }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => navigate(id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
          isActive
            ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-neutral-700'
            : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-200/50 dark:hover:bg-neutral-800/50 hover:text-gray-900 dark:hover:text-white border border-transparent'
        }`}
      >
        <span className={`${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500 group-hover:text-gray-600 dark:group-hover:text-neutral-300'}`}>{icon}</span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">

      <aside className={`
        hidden md:flex flex-col
        ${isSidebarOpen ? 'w-64 px-3' : 'w-0 px-0'}
        py-4 bg-gray-50 dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800
        transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden shrink-0 z-10
      `}>
        {/* Заголовок */}
        <div className="flex items-center px-3 mb-4 mt-2 shrink-0">
          <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center mr-3 shrink-0 shadow-sm">
            <svg className="w-5 h-5 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">{t.portal}</h1>
        </div>

        {/* === БЛОК AI LIMITS (КАНДИДАТ) === */}
        <div className="px-3 mb-6 shrink-0">
          <div className="relative p-3.5 bg-white dark:bg-neutral-950/50 rounded-2xl border border-gray-200/80 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col gap-3">
            {/* Фоновое легкое свечение в зависимости от статуса */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none transition-colors duration-500 ${getIndicatorColor()}`}></div>

            <div className="flex justify-between items-center z-10">
              <span className="text-[11px] font-bold text-gray-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Limit
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-sm font-extrabold ${getTextColor()}`}>
                  {usesLeft}
                </span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-neutral-500">
                  / {aiQuota}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-1.5 z-10">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 shadow-sm ${getIndicatorColor()}`}
                style={{ width: `${percentageLeft}%` }}
              ></div>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto font-medium custom-scrollbar pr-1 relative z-10">
          {NAV_ITEMS.map(item => (
            <SideNavItem
              key={item.id}
              id={item.id}
              label={t[item.id as keyof typeof t]}
              icon={item.icon}
            />
          ))}
        </nav>

        <div className="mt-auto px-0 py-3 space-y-1 shrink-0">
          <SideNavItem
            id="settings"
            label={t.settings}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300"
          >
            <span className="text-red-500 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </span>
            <span className="truncate">{t.logout}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors duration-300">

        <header className="hidden md:flex h-14 items-center px-4 shrink-0 border-b border-gray-100 dark:border-neutral-800">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        </header>

        <header className="md:hidden h-14 flex items-center justify-between px-4 shrink-0 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              {activeTab === 'settings' ? t.settings : (t[activeTab as keyof typeof t] ?? t.portal)}
            </span>
          </div>
          <button onClick={handleLogout} className="p-2 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          <div className="max-w-none mx-auto w-full transition-all duration-300">
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <ProfileTab />
            </div>
            <div className={activeTab === 'upload-cv' ? 'block' : 'hidden'}>
              <ResumeUploadTab />
            </div>
            <div className={activeTab === 'jobs' ? 'block' : 'hidden'}>
              <JobsTab />
            </div>
            <div className={activeTab === 'applications' ? 'block' : 'hidden'}>
              <JobApplicationTab />
            </div>
            <div className={activeTab === 'improve' ? 'block' : 'hidden'}>
              <ImproveCvTab initialJobDescription={globalJobDescription} />
            </div>
            <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
              <CandidateSettingsTab />
            </div>
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 z-50 safe-area-inset-bottom transition-colors">
        <div className="flex items-stretch justify-around">
          {[...NAV_ITEMS, { id: 'settings', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          ) }].map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors relative ${
                  isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300'
                }`}
              >
                <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500'}`}>
                  {t[item.id as keyof typeof t]}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}