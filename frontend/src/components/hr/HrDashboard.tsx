import { useCallback, useEffect } from 'react';
import { HrProfileTab } from './1. Profile/HrProfileTab';
import { TalentPoolTab } from './2. Talent Pool/TalentPoolTab';
import { JobTab } from './3. Jobs/JobTab';
import { ScreenTab } from './4. Screen/ScreenTab';
import { CompareTab } from './5. Compare/CompareTab';
import { KanbanTab } from './6. Board/KanbanTab';
import { HistoryTab } from './7. History/HistoryTab';
import { SettingsTab } from './8. Settings/SettingsTabHR';
import { useStore } from '../../store';
import { authApi } from '../../api';
import { DICT } from '../../internationalization.ts';
import { hrTabToPath, hrPathToNavState } from '../../utils/urlRouting';

export function HrDashboard() {
  const {
    activeTab,
    globalJobDescription,
    globalBatchResults,
    isSidebarOpen,
    setActiveTab,
    setGlobalJobDescription,
    setGlobalBatchResults,
    setIsSidebarOpen,
    logoutStore,
    language,
    aiQuota,
    aiUsed
  } = useStore();

  const t: Record<string, string> = DICT[language as keyof typeof DICT]?.hrNav || DICT.en.hrNav;

  // Считаем остаток
  const usesLeft = Math.max(0, aiQuota - aiUsed);
  const percentageLeft = (usesLeft / aiQuota) * 100;

  // Функция для цвета индикатора и свечения
  const getIndicatorColor = () => {
    if (usesLeft > 6) return 'bg-emerald-500';
    if (usesLeft > 3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (usesLeft > 6) return 'text-emerald-600 dark:text-emerald-400';
    if (usesLeft > 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Sync tab from URL on mount
  useEffect(() => {
    const navState = hrPathToNavState(window.location.pathname);
    if (navState?.tab) {
      setActiveTab(navState.tab as any);
    } else if (!activeTab || activeTab === 'profile') {
      // Default HR tab is 'job' (job descriptions)
      const defaultTab = 'job';
      setActiveTab(defaultTab as any);
      window.history.replaceState({}, '', hrTabToPath(defaultTab));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const navState = hrPathToNavState(window.location.pathname);
      setActiveTab((navState?.tab ?? 'job') as any);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab]);

  const navigate = useCallback((tab: string) => {
    setActiveTab(tab as any);
    const path = hrTabToPath(tab);
    if (window.location.pathname !== path) {
      window.history.pushState({ tab }, '', path);
    }
  }, [setActiveTab]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (e) {}
    localStorage.removeItem('auth_token');
    logoutStore();
  };

  const NavItem = ({ id, label, icon }: { id: string, label: string, icon: React.ReactNode }) => {
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
        <span className={`${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500 group-hover:text-gray-600 dark:group-hover:text-neutral-300'}`}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      <aside className={`${isSidebarOpen ? 'w-64 px-3' : 'w-0 px-0'} py-4 bg-gray-50 dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 flex flex-col transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden shrink-0 z-10`}>

        {/* Заголовок */}
        <div className="flex items-center px-3 mb-4 mt-2">
          <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center mr-3 shrink-0 shadow-sm">
            <svg className="w-5 h-5 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white uppercase">{t.workspace}</h1>
        </div>

        {/* === БЛОК AI LIMITS (ПЕРЕНЕСЕН НАВЕРХ И ОБНОВЛЕН ДИЗАЙН) === */}
        <div className="px-3 mb-6">
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

        {/* Навигация */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <NavItem id="profile" label={t.overview} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          } />

          <NavItem id="talent" label={t.talentPool} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          } />

          <div className="my-2 border-t border-gray-200/50 dark:border-neutral-700/50 mx-3"></div>

          <NavItem id="job" label={t.jobDescs} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          } />

          <NavItem id="screen" label={t.screenCvs} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          } />

          <NavItem id="compare" label={t.compare} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          } />

          <NavItem id="kanban" label={t.hrBoard} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          } />

          <NavItem id="history" label={t.allScreenings} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          } />

          <div className="mt-auto pt-2 border-t border-gray-200/50 dark:border-neutral-700/50 mx-3"></div>

          <NavItem id="settings" label={t.settings} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          } />
        </nav>

        {/* Logout (остался внизу) */}
        <div className="px-0 py-3 shrink-0">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-red-500 border border-transparent hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400">
            <span className="text-red-500 group-hover:text-red-600 dark:text-red-500 dark:group-hover:text-red-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </span>
            <span className="truncate">{t.logout}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black transition-colors duration-300">
        <header className="h-14 flex items-center px-4 shrink-0 border-b border-gray-100 dark:border-neutral-800">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-none mx-auto w-full transition-all duration-300">
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <HrProfileTab />
            </div>
            <div className={activeTab === 'job' ? 'block' : 'hidden'}>
              <JobTab setGlobalJobDescription={setGlobalJobDescription} />
            </div>
            <div className={activeTab === 'talent' ? 'block' : 'hidden'}>
              <TalentPoolTab />
            </div>
            <div className={activeTab === 'screen' ? 'block' : 'hidden'}>
              <ScreenTab
                jobDescription={globalJobDescription}
                globalBatchResults={globalBatchResults}
                setGlobalBatchResults={setGlobalBatchResults}
              />
            </div>
            <div className={activeTab === 'compare' ? 'block' : 'hidden'}>
              <CompareTab batchResults={globalBatchResults} />
            </div>
            <div className={activeTab === 'kanban' ? 'block' : 'hidden'}>
              <KanbanTab />
            </div>
            <div className={activeTab === 'history' ? 'block' : 'hidden'}>
              <HistoryTab />
            </div>
            <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
              <SettingsTab />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}