import { JobTab } from './JobTab';
import { ScreenTab } from './ScreenTab';
import { CompareTab } from './CompareTab';
import { KanbanTab } from './KanbanTab';
import { HistoryTab } from './HistoryTab';
import { HrProfileTab } from './HrProfileTab'; // Твой новый таб с профилем
import { useStore } from '../store';
import { authApi } from '../api';

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
    logoutStore
  } = useStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    localStorage.removeItem('auth_token');
    logoutStore();
  };

  const NavItem = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
          isActive
            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
            : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 border border-transparent'
        }`}
      >
        <span className={`${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-64 px-3' : 'w-0 px-0'} py-4 bg-gray-50 border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden shrink-0 z-10`}>
        <div className="flex items-center px-3 mb-6 mt-2">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3 shrink-0 shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-gray-900">HR Workspace</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {/* НОВЫЙ ТАБ: DASHBOARD / PROFILE */}
          <NavItem id="profile" label="Overview" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          } />

          <div className="my-2 border-t border-gray-200/50 mx-3"></div>

          <NavItem id="job" label="Job Descriptions" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          } />
          <NavItem id="screen" label="Screen CVs" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          } />
          <NavItem id="compare" label="Compare" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          } />
          <NavItem id="kanban" label="HR Board" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          } />
          <NavItem id="history" label="All Screenings" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          } />
        </nav>

        <div className="mt-auto p-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 border border-red-200 hover:bg-red-50 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white transition-all duration-300">
        <header className="h-14 flex items-center px-4 shrink-0 border-b border-gray-100">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-none mx-auto w-full transition-all duration-300">
            {/* Рендеринг табов */}
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <HrProfileTab />
            </div>
            <div className={activeTab === 'job' ? 'block' : 'hidden'}>
              <JobTab setGlobalJobDescription={setGlobalJobDescription} />
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
          </div>
        </div>
      </main>
    </div>
  );
}