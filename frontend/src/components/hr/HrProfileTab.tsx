import { useState, useEffect } from 'react';
import { authApi, jobsApi, screeningApi } from '../../api';
import { useStore } from '../../store';
import { DICT } from '../../internationalization.ts';

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

export function HrProfileTab() {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.hrProfile || DICT.en.hrProfile;

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

  const setField = (field: keyof HrProfile, value: string) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authApi.updateHrProfile(profile);
      setMessage({ text: t.success, type: 'success' });
      setIsEditingBasic(false);
      setIsEditingContact(false);
      setIsEditingWork(false);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ text: t.error, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Вспомогательные компоненты для верстки (теперь внутри основного, чтобы видеть все стили)
  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col border-b border-gray-100 dark:border-neutral-800 py-3 transition-colors">
      <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {value || <span className="text-gray-300 dark:text-neutral-600 italic">{t.notSpecified}</span>}
      </span>
    </div>
  );

  const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full px-3 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white";
  const inputDisabledCls = "w-full px-3 py-2 bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-sm text-gray-500 dark:text-neutral-500 outline-none cursor-not-allowed";

  const SectionHeader = ({ label, dot, isEditing, onEdit, onCancel }: any) => (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 min-h-[64px] transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`}></div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{label}</h3>
      </div>
      {!isEditing ? (
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all"
        >
          {t.editSection}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-50"
          >
            {isSaving ? t.saving : t.saveBtn}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto animate-in fade-in duration-300 pb-32">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{t.subtitle}</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 text-sm rounded-xl border flex items-center gap-2 transition-colors ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50'
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

          {/* Section: Basic Information */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <SectionHeader
              label={t.sections.basic}
              dot="bg-indigo-500 dark:bg-indigo-400"
              isEditing={isEditingBasic}
              onEdit={() => setIsEditingBasic(true)}
              onCancel={() => setIsEditingBasic(false)}
            />
            <div className="p-6">
              {!isEditingBasic ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label={t.fields.firstName} value={profile.first_name} />
                  <DetailRow label={t.fields.lastName} value={profile.last_name} />
                  <div className="md:col-span-2 flex flex-col border-b border-gray-100 dark:border-neutral-800 py-3 transition-colors">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{t.fields.bio}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                      {profile.bio || <span className="text-gray-300 dark:text-neutral-600 italic">{t.notSpecified}</span>}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label={t.fields.firstName}>
                    <input type="text" value={profile.first_name} onChange={e => setField('first_name', e.target.value)} className={inputCls} />
                  </FormField>
                  <FormField label={t.fields.lastName}>
                    <input type="text" value={profile.last_name} onChange={e => setField('last_name', e.target.value)} className={inputCls} />
                  </FormField>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.fields.bio}</label>
                    <textarea
                      value={profile.bio}
                      onChange={e => setField('bio', e.target.value)}
                      rows={4}
                      placeholder={t.fields.bioPlaceholder}
                      className={inputCls + " resize-none"}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Contact & Network */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <SectionHeader
              label={t.sections.contact}
              dot="bg-blue-500 dark:bg-blue-400"
              isEditing={isEditingContact}
              onEdit={() => setIsEditingContact(true)}
              onCancel={() => setIsEditingContact(false)}
            />
            <div className="p-6">
              {!isEditingContact ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label={t.fields.email} value={profile.email} />
                  <DetailRow label={t.fields.phone} value={profile.phone} />
                  <DetailRow label="LinkedIn" value={profile.linkedin_url} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label={t.fields.emailRead}>
                    <input type="email" value={profile.email} disabled className={inputDisabledCls} />
                  </FormField>
                  <FormField label={t.fields.phone}>
                    <input type="text" value={profile.phone} onChange={e => setField('phone', e.target.value)} className={inputCls} />
                  </FormField>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.fields.linkedin}</label>
                    <input type="text" value={profile.linkedin_url} onChange={e => setField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." className={inputCls} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Work & Location */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <SectionHeader
              label={t.sections.work}
              dot="bg-emerald-500 dark:bg-emerald-400"
              isEditing={isEditingWork}
              onEdit={() => setIsEditingWork(true)}
              onCancel={() => setIsEditingWork(false)}
            />
            <div className="p-6">
              {!isEditingWork ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label={t.fields.org} value={profile.company_name} />
                  <DetailRow label={t.fields.dept} value={profile.department} />
                  <DetailRow label={t.fields.role} value={profile.hr_role_title} />
                  <DetailRow label={t.fields.country} value={profile.country} />
                  <DetailRow label={t.fields.city} value={profile.city} />
                  <DetailRow label={t.fields.timezone} value={profile.timezone} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label={t.fields.org}>
                    <input type="text" value={profile.company_name} onChange={e => setField('company_name', e.target.value)} className={inputCls} />
                  </FormField>
                  <FormField label={t.fields.dept}>
                    <input type="text" value={profile.department} onChange={e => setField('department', e.target.value)} placeholder="e.g. Tech Recruitment" className={inputCls} />
                  </FormField>
                  <FormField label={t.fields.role}>
                    <select value={profile.hr_role_title} onChange={e => setField('hr_role_title', e.target.value)} className={inputCls}>
                      <option value="">Select role...</option>
                      {HR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </FormField>
                  <FormField label={t.fields.timezone}>
                    <select value={profile.timezone} onChange={e => setField('timezone', e.target.value)} className={inputCls}>
                      <option value="">Select timezone...</option>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </FormField>
                  <FormField label={t.fields.country}>
                    <input type="text" value={profile.country} onChange={e => setField('country', e.target.value)} className={inputCls} />
                  </FormField>
                  <FormField label={t.fields.city}>
                    <input type="text" value={profile.city} onChange={e => setField('city', e.target.value)} className={inputCls} />
                  </FormField>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Side Card: Profile Summary */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 flex flex-col items-center text-center relative overflow-hidden transition-colors">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-800/50 shadow-sm mb-5 z-10 transition-colors">
              <span className="text-2xl font-bold">
                {profile.first_name?.[0] || profile.email?.[0]?.toUpperCase() || 'H'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 z-10">
              {profile.first_name ? `${profile.first_name} ${profile.last_name}` : profile.email}
            </h3>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 z-10">
              {profile.hr_role_title || 'Recruiter'}
            </p>
            {profile.company_name && (
              <p className="text-sm text-gray-500 dark:text-neutral-400 mb-5 z-10">{profile.company_name}</p>
            )}

            <div className="w-full mt-2 pt-5 border-t border-gray-100 dark:border-neutral-800 text-left space-y-4 z-10 transition-colors">
              {profile.department && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{t.fields.dept}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.department}</p>
                </div>
              )}
              {profile.timezone && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{t.fields.timezone}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.timezone}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-2">{t.fields.status}</p>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-sm text-gray-700 dark:text-emerald-400 font-semibold">{t.fields.verified}</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 dark:bg-neutral-800/50 rounded-full blur-3xl -mr-16 -mt-16 transition-colors"></div>
          </div>

          {/* Side Card: Stats */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 space-y-4 transition-colors">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.stats.title}</h4>

            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-neutral-800 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-amber-100 dark:border-amber-900/50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-neutral-300">{t.stats.activeJobs}</p>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.jobsCount}</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-900/50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-neutral-300">{t.stats.totalApps}</p>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.appsCount}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}