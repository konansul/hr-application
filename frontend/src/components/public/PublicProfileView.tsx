import { useEffect, useState } from 'react';
import { publicApi } from '../../api';

interface PublicCvViewProps {
  slug: string;
}

export function PublicProfileView({ slug }: PublicCvViewProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await publicApi.getProfile(slug);
        setProfileData(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError("Profile not found or link is invalid.");
        } else if (err.response?.status === 403) {
          setError("This profile is private.");
        } else {
          setError("Something went wrong loading the profile.");
        }
      }
    };

    fetchProfile();
  }, [slug]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-950 px-4 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
           <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-neutral-400 max-w-md">{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-sm transition-all hover:bg-gray-800 dark:hover:bg-neutral-200">Go to Homepage</button>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const { first_name, last_name, profile_data } = profileData;
  const pInfo = profile_data?.personal_info || {};
  const experience = profile_data?.experience || [];
  const education = profile_data?.education || [];
  const skills = profile_data?.skills || [];
  const references = profile_data?.references || [];

  const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (!value || value === 'UNKNOWN') return null;
    return (
      <div className="flex flex-col border-b border-gray-100 dark:border-neutral-800 py-3">
        <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{label}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto animate-in fade-in duration-500">

        <div className="mb-8 text-center lg:text-left">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Candidate Profile</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Public overview of {first_name}'s professional background</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          <div className="lg:col-span-8 space-y-6">

            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
              <div className="flex items-center px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">Personal Info</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label="First Name" value={first_name || pInfo.first_name} />
                  <DetailRow label="Last Name" value={last_name || pInfo.last_name} />
                  <DetailRow label="Email" value={pInfo.email} />
                  <DetailRow label="Phone" value={pInfo.phone} />
                  <DetailRow label="City" value={pInfo.city} />
                  <DetailRow label="Country" value={pInfo.country} />
                  <DetailRow label="Nationality" value={pInfo.nationality} />
                  <DetailRow label="Visa Status" value={pInfo.visa_status?.replace(/_/g, ' ')} />
                  <DetailRow label="Work Preference" value={pInfo.work_preference} />
                  <DetailRow label="LinkedIn" value={pInfo.linkedin_url} />

                  {(pInfo.open_to_remote || pInfo.open_to_relocation) && (
                    <div className="md:col-span-2 flex gap-6 pt-4">
                      {pInfo.open_to_remote && (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">Open to Remote</span>
                        </div>
                      )}
                      {pInfo.open_to_relocation && (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">Open to Relocation</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {experience.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="flex items-center px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">Experience</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="border-l-2 border-gray-100 dark:border-neutral-800 pl-6 space-y-8 py-2">
                    {experience.map((exp: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gray-300 dark:bg-neutral-600 ring-4 ring-white dark:ring-neutral-900" />
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">{exp.title}</h4>
                        <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mt-1">{exp.company} • {exp.start_date || 'N/A'} - {exp.is_current ? 'Present' : (exp.end_date || 'N/A')}</p>
                        {exp.description && <p className="text-sm text-gray-600 dark:text-neutral-300 mt-3 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {education.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="flex items-center px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">Education</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="border-l-2 border-gray-100 dark:border-neutral-800 pl-6 space-y-8 py-2">
                    {education.map((edu: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gray-300 dark:bg-neutral-600 ring-4 ring-white dark:ring-neutral-900" />
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">{edu.institution}</h4>
                        <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mt-1">{edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`} • {edu.start_date || 'N/A'} - {edu.end_date || 'N/A'}</p>
                        {edu.description && <p className="text-sm text-gray-600 dark:text-neutral-300 mt-3 leading-relaxed whitespace-pre-wrap">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {references.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="flex items-center px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 dark:bg-purple-400"></div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">References</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {references.map((ref: any, i: number) => (
                      <div key={i} className="p-4 border border-gray-100 dark:border-neutral-800 rounded-xl bg-gray-50/50 dark:bg-neutral-800/30">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{ref.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-neutral-400 mt-0.5">{ref.title} {ref.company && `at `}<span className="font-semibold text-gray-800 dark:text-neutral-300">{ref.company}</span></p>
                        <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-neutral-700/60 space-y-1">
                          {ref.email && <p className="text-[11px] text-gray-500 dark:text-neutral-400 flex items-center gap-2"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> {ref.email}</p>}
                          {ref.phone && <p className="text-[11px] text-gray-500 dark:text-neutral-400 flex items-center gap-2"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> {ref.phone}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {skills.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="flex items-center px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400"></div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">Skills</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s: any, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-semibold shadow-sm transition-colors">
                        {s.name} {s.level && <span className="text-gray-400 dark:text-neutral-500 text-[10px] ml-1">{s.level}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 p-8 flex flex-col items-center text-center transition-colors">
              <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-5 border border-indigo-100 dark:border-indigo-800/50 shadow-sm transition-colors">
                <span className="text-3xl font-bold">
                  {first_name?.[0] || 'C'}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {first_name || ''} {last_name || ''}
              </h3>

              {pInfo.title && (
                 <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 mb-6">{pInfo.title}</p>
              )}

              {pInfo.summary && (
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6 leading-relaxed">
                  {pInfo.summary}
                </p>
              )}

              <div className="w-full space-y-3 mt-2">
                {pInfo.email && (
                  <a href={`mailto:${pInfo.email}`} className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all shadow-sm flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Contact via Email
                  </a>
                )}
                {pInfo.linkedin_url && (
                   <a href={pInfo.linkedin_url.startsWith('http') ? pInfo.linkedin_url : `https://${pInfo.linkedin_url}`} target="_blank" rel="noreferrer" className="w-full py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 hover:border-gray-900 dark:hover:border-white text-gray-900 dark:text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                     LinkedIn Profile
                   </a>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}