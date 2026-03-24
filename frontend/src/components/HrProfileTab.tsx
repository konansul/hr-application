import { useState, useEffect } from 'react';
import { authApi, jobsApi, screeningApi } from '../api';

const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:border-gray-200">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export function HrProfileTab() {
  const [user, setUser] = useState<{ email: string; role: string; org_id?: string } | null>(null);
  const [stats, setStats] = useState({ jobsCount: 0, screeningsCount: 0 });

  useEffect(() => {
    authApi.getMe().then(setUser).catch(() => {});

    Promise.all([
      jobsApi.list(),
      screeningApi.getAllOrganizationResults()
    ]).then(([jobs, results]) => {
      setStats({
        jobsCount: jobs.length,
        screeningsCount: results.length
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">HR Overview</h2>
          <p className="text-sm text-gray-500">
            Welcome back! Here is a summary of your recruitment activity and account details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-gray-900 to-gray-700 rounded-full flex items-center justify-center shadow-lg mb-6">
              <span className="text-3xl font-bold text-white">
                {user?.email ? user.email.charAt(0).toUpperCase() : 'H'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 truncate w-full px-4 mb-2">
              {user?.email || 'Loading...'}
            </h3>
            <span className="px-4 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl">
              {user?.role || 'Recruiter'}
            </span>

            <div className="w-full mt-8 pt-8 border-t border-gray-50 text-left space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Organization ID</p>
                <p className="text-sm font-mono text-gray-600">{user?.org_id || 'Personal Workspace'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Account Type</p>
                <p className="text-sm text-gray-900 font-semibold">Enterprise AI Recruiter</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              label="Active Job Roles"
              value={stats.jobsCount}
              color="bg-amber-50 text-amber-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            />
            <StatCard
              label="Processed Candidates"
              value={stats.screeningsCount}
              color="bg-emerald-50 text-emerald-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>

          <div className="bg-white border border-gray-100 rounded-[32px] p-8 relative overflow-hidden shadow-sm">
            <div className="relative z-10">
              <h4 className="text-xl font-bold text-gray-900 mb-2">AI Performance Tips</h4>
              <p className="text-gray-500 text-sm leading-relaxed max-w-md">
                For better screening results, ensure your Job Descriptions have clear "Requirements" and "Responsibilities" sections. The AI performs 24% better with structured text.
              </p>
            </div>
            <svg className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-gray-100 opacity-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}