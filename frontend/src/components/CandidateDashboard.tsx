import { useEffect } from 'react';
import { ProfileTab } from './ProfileTab';
import { ResumeUploadTab } from './ResumeUploadTab';
import { ImproveCvTab } from './ImproveCvTab';
import { JobsTab } from './CanditateJobsTab';
import { useStore } from '../store';
import { authApi } from '../api';

export function CandidateDashboard() {
  const {
    activeTab,
    globalJobDescription,
    isSidebarOpen,
    setActiveTab,
    setIsSidebarOpen,
    logoutStore
  } = useStore();

  useEffect(() => {
    setActiveTab('profile');
  }, [setActiveTab]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    localStorage.removeItem('auth_token');
    logoutStore();
  };

  const NavItem = ({ id, label, icon }: { id: any, label: string, icon: React.ReactNode }) => {
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
      <aside className={`${isSidebarOpen ? 'w-64 px-3' : 'w-0 px-0'} py-4 bg-gray-50 border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden shrink-0 z-10`}>
        <div className="flex items-center px-3 mb-6 mt-2">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3 shrink-0 shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-gray-900">Candidate Portal</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          <NavItem id="profile" label="My Profile" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          } />

          <NavItem id="upload-cv" label="My Resumes" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          } />

          <NavItem id="jobs" label="Explore Jobs" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          } />

          <NavItem id="improve" label="Improve CV" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          } />
        </nav>

        <div className="mt-auto p-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

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
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <ProfileTab />
            </div>
            <div className={activeTab === 'upload-cv' ? 'block' : 'hidden'}>
              <ResumeUploadTab />
            </div>
            <div className={activeTab === 'jobs' ? 'block' : 'hidden'}>
              <JobsTab />
            </div>
            <div className={activeTab === 'improve' ? 'block' : 'hidden'}>
              <ImproveCvTab initialJobDescription={globalJobDescription} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}