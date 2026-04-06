import { useState, useEffect } from 'react';
import { authApi, jobsApi, screeningApi } from '../api';

const TIMEZONES = [
  'UTC', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6',
  'UTC-5 (EST)', 'UTC-6 (CST)', 'UTC-7 (MST)', 'UTC-8 (PST)',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Almaty', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles',
];

const HR_ROLES = [
  'HR Manager', 'HR Director', 'Recruiter', 'Senior Recruiter',
  'Talent Acquisition Lead', 'Talent Acquisition Specialist',
  'HR Business Partner', 'HR Admin', 'HR Generalist', 'HR Coordinator',
  'People Operations', 'Head of HR',
];

interface HrProfile {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  country: string;
  bio: string;
  linkedin_url: string;
  company_name: string;
  department: string;
  hr_role_title: string;
  timezone: string;
}

const EMPTY_PROFILE: HrProfile = {
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  city: '',
  country: '',
  bio: '',
  linkedin_url: '',
  company_name: '',
  department: '',
  hr_role_title: '',
  timezone: '',
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col border-b border-gray-100 py-3">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value || <span className="text-gray-300 italic">Not specified</span>}</span>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none";
const inputDisabledCls = "w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 outline-none cursor-not-allowed";

export function HrProfileTab() {
  const [profile, setProfile] = useState<HrProfile>(EMPTY_PROFILE);
  const [stats, setStats] = useState({ jobsCount: 0, appsCount: 0 });
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingWork, setIsEditingWork] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [hrData, jobs, applications] = await Promise.all([
          authApi.getHrProfile(),
          jobsApi.list(),
          screeningApi.getAllOrganizationApplications(),
        ]);
        setProfile(hrData);
        setStats({ jobsCount: jobs.length, appsCount: applications.length });
      } catch (err) {
        console.error('Failed to load HR profile', err);
      }
    };
    load();
  }, []);

  const set = (field: keyof HrProfile, value: string) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authApi.updateHrProfile(profile);
      setMessage({ text: 'Profile saved successfully!', type: 'success' });
      setIsEditingBasic(false);
      setIsEditingContact(false);
      setIsEditingWork(false);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ text: 'Error saving profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const SectionHeader = ({
    label,
    dot,
    isEditing,
    onEdit,
    onCancel,
  }: {
    label: string;
    dot: string;
    isEditing: boolean;
    onEdit: () => void;
    onCancel: () => void;
  }) => (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 min-h-[64px]">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`}></div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">{label}</h3>
      </div>
      {!isEditing ? (
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all"
        >
          Edit Section
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto animate-in fade-in duration-300 pb-32">

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">HR Profile</h2>
        <p className="text-sm text-gray-500">Manage your recruiter profile and workspace settings.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 text-sm rounded-xl border flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
            : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {message.type === 'success'
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            }
          </svg>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <div className="lg:col-span-8 space-y-6">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader
              label="Basic Information"
              dot="bg-indigo-500"
              isEditing={isEditingBasic}
              onEdit={() => setIsEditingBasic(true)}
              onCancel={() => setIsEditingBasic(false)}
            />
            <div className="p-6">
              {!isEditingBasic ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label="First Name" value={profile.first_name} />
                  <DetailRow label="Last Name" value={profile.last_name} />
                  <div className="md:col-span-2 flex flex-col border-b border-gray-100 py-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">About / Bio</span>
                    <span className="text-sm font-medium text-gray-900 leading-relaxed">
                      {profile.bio || <span className="text-gray-300 italic">Not specified</span>}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <input type="text" value={profile.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Last Name">
                    <input type="text" value={profile.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
                  </Field>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">About / Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={e => set('bio', e.target.value)}
                      rows={4}
                      placeholder="Tell candidates and colleagues a bit about yourself..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader
              label="Contact & Network"
              dot="bg-blue-500"
              isEditing={isEditingContact}
              onEdit={() => setIsEditingContact(true)}
              onCancel={() => setIsEditingContact(false)}
            />
            <div className="p-6">
              {!isEditingContact ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label="Email (Login)" value={profile.email} />
                  <DetailRow label="Phone" value={profile.phone} />
                  <DetailRow label="LinkedIn" value={profile.linkedin_url} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Email (read-only)">
                    <input type="email" value={profile.email} disabled className={inputDisabledCls} />
                  </Field>
                  <Field label="Phone">
                    <input type="text" value={profile.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
                  </Field>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LinkedIn URL</label>
                    <input type="text" value={profile.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." className={inputCls} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader
              label="Work & Location"
              dot="bg-emerald-500"
              isEditing={isEditingWork}
              onEdit={() => setIsEditingWork(true)}
              onCancel={() => setIsEditingWork(false)}
            />
            <div className="p-6">
              {!isEditingWork ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label="Organization" value={profile.company_name} />
                  <DetailRow label="Department" value={profile.department} />
                  <DetailRow label="Role" value={profile.hr_role_title} />
                  <DetailRow label="Country" value={profile.country} />
                  <DetailRow label="City" value={profile.city} />
                  <DetailRow label="Timezone" value={profile.timezone} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Organization Name">
                    <input type="text" value={profile.company_name} onChange={e => set('company_name', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Department">
                    <input type="text" value={profile.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Tech Recruitment" className={inputCls} />
                  </Field>
                  <Field label="Role in System">
                    <select value={profile.hr_role_title} onChange={e => set('hr_role_title', e.target.value)} className={inputCls}>
                      <option value="">Select role...</option>
                      {HR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Timezone">
                    <select value={profile.timezone} onChange={e => set('timezone', e.target.value)} className={inputCls}>
                      <option value="">Select timezone...</option>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </Field>
                  <Field label="Country">
                    <input type="text" value={profile.country} onChange={e => set('country', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="City">
                    <input type="text" value={profile.city} onChange={e => set('city', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm mb-5 z-10">
              <span className="text-2xl font-bold">
                {profile.first_name?.[0] || profile.email?.[0]?.toUpperCase() || 'H'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1 z-10">
              {profile.first_name ? `${profile.first_name} ${profile.last_name}` : profile.email}
            </h3>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1 z-10">
              {profile.hr_role_title || 'Recruiter'}
            </p>
            {profile.company_name && (
              <p className="text-sm text-gray-500 mb-5 z-10">{profile.company_name}</p>
            )}

            <div className="w-full mt-2 pt-5 border-t border-gray-100 text-left space-y-4 z-10">
              {profile.department && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Department</p>
                  <p className="text-sm font-semibold text-gray-900">{profile.department}</p>
                </div>
              )}
              {profile.timezone && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Timezone</p>
                  <p className="text-sm font-semibold text-gray-900">{profile.timezone}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status</p>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-sm text-gray-700 font-semibold">Verified Recruiter</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workspace Stats</h4>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Active Vacancies</p>
              </div>
              <span className="text-xl font-bold text-gray-900">{stats.jobsCount}</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Total Applications</p>
              </div>
              <span className="text-xl font-bold text-gray-900">{stats.appsCount}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
