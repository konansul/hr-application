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
  const [user, setUser] = useState<{ email: string; role: string; org_id?: string; first_name?: string; last_name?: string } | null>(null);
  const [stats, setStats] = useState({ jobsCount: 0, appsCount: 0 });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const userData = await authApi.getMe();
        setUser(userData);

        const [jobs, applications] = await Promise.all([
          jobsApi.list(),
          screeningApi.getAllOrganizationApplications()
        ]);

        setStats({
          jobsCount: jobs.length,
          appsCount: applications.length
        });
      } catch (err) {
        console.error("Failed to load HR dashboard stats", err);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">HR Overview</h2>
          <p className="text-sm text-gray-500">
            System performance and recruitment funnel summary.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center shadow-lg mb-6 z-10">
              <span className="text-3xl font-bold text-white">
                {user?.first_name?.[0] || user?.email?.[0].toUpperCase() || 'H'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 truncate w-full px-4 mb-1 z-10">
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
            </h3>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-6 z-10">
              {user?.role || 'Recruiter'}
            </p>

            <div className="w-full mt-2 pt-8 border-t border-gray-50 text-left space-y-5 z-10">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Organization</p>
                <p className="text-sm font-bold text-gray-900">{user?.org_id || 'Personal Workspace'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-sm text-gray-900 font-bold">Verified Recruiter</p>
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              label="Active Vacancies"
              value={stats.jobsCount}
              color="bg-amber-50 text-amber-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            />
            <StatCard
              label="Total Applications"
              value={stats.appsCount}
              color="bg-blue-50 text-blue-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            />
          </div>

          <div className="bg-gray-900 rounded-[32px] p-10 relative overflow-hidden shadow-xl group">
            <div className="relative z-10">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 block">Pro Tip</span>
              <h4 className="text-2xl font-bold text-white mb-4">Improve AI Matching</h4>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md mb-8">
                Structured Job Descriptions lead to 30% higher accuracy. Use bullet points for specific technologies and mandatory certifications.
              </p>
              <button className="px-6 py-3 bg-white text-gray-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 transition-colors">
                Refine Jobs Now
              </button>
            </div>
            <div className="absolute right-[-40px] top-[-40px] w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-700"></div>
          </div>
        </div>
      </div>
    </div>
  );
}