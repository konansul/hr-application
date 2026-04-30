import { useState, useEffect } from 'react';
import { authApi } from '../../../api';
import { useStore } from '../../../store';
import { DICT } from '../../../internationalization.ts';

interface CandidateBasic {
  user_id: string;
  person_id: string;
  first_name: string;
  last_name: string;
  email: string;
  city: string;
  country: string;
  top_skills: string[];
  work_preference: string;
}

const Pill = ({ label, value, color = 'gray' }: { label: string; value: string | number; color?: 'gray' | 'emerald' | 'blue' | 'purple' }) => {
  const colorStyles = {
    gray: 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400',
  };

  return (
    <div className={`px-4 py-3 border rounded-xl ${colorStyles[color]} flex flex-col items-start min-w-[120px] transition-colors`}>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{label}</span>
      <span className="text-xl font-semibold truncate w-full">{value}</span>
    </div>
  );
};

export function TalentPoolTab() {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.talent || DICT.en.talent;

  const [candidates, setCandidates] = useState<CandidateBasic[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateBasic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setIsLoading(true);
        const data = await authApi.listCandidates();
        setCandidates(data);
        setFilteredCandidates(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load candidates');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCandidates(candidates);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = candidates.filter(c => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const skills = (c.top_skills || []).join(' ').toLowerCase();
      return fullName.includes(query) || skills.includes(query) || c.email.toLowerCase().includes(query);
    });
    setFilteredCandidates(filtered);
  }, [searchQuery, candidates]);

  useEffect(() => {
    if (!selectedCandidateId) {
      setSelectedProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsProfileLoading(true);
        const data = await authApi.getCandidateProfile(selectedCandidateId);
        setSelectedProfile(data.profile_data);
      } catch (err: any) {
        console.error("Failed to load profile details", err);
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchProfile();
  }, [selectedCandidateId]);

  const closeModal = () => setSelectedCandidateId(null);

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl shadow-sm flex flex-col overflow-hidden transition-colors">

        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 transition-colors">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-black border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all shadow-sm dark:text-white placeholder-gray-400 dark:placeholder-neutral-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-neutral-600">
               <div className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
               <span className="text-sm font-semibold">{t.loadingCandidates}</span>
            </div>
          ) : filteredCandidates.length > 0 ? (
            filteredCandidates.map(c => (
              <button
                key={c.person_id}
                onClick={() => setSelectedCandidateId(c.person_id)}
                className="w-full text-left p-5 rounded-2xl transition-all duration-200 border bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md flex items-center gap-6 group"
              >
                <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shrink-0 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  {c.first_name?.[0] || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 truncate">
                    {c.first_name || c.last_name ? `${c.first_name} ${c.last_name}` : t.unknownCandidate}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-neutral-500">
                    <span className="truncate">{c.email}</span>
                    {c.city && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-700"></span>
                        <span className="truncate">{c.city}, {c.country}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="hidden md:flex flex-wrap gap-2 justify-end w-1/3 shrink-0">
                  {c.top_skills?.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 text-xs font-semibold tracking-wide border border-gray-200 dark:border-neutral-700 transition-colors">
                      {skill}
                    </span>
                  ))}
                  {(!c.top_skills || c.top_skills.length === 0) && (
                    <span className="text-xs italic text-gray-400 dark:text-neutral-600">{t.noSkills}</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400 dark:text-neutral-600 text-sm italic font-medium">{t.noCandidates}</div>
          )}
        </div>
      </div>

      {selectedCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-neutral-800"
            onClick={e => e.stopPropagation()}
          >

            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-900 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold shadow-sm transition-colors">
                   {selectedProfile?.personal_info?.first_name?.[0] || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedProfile ? `${selectedProfile.personal_info?.first_name} ${selectedProfile.personal_info?.last_name}` : '...'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium mt-0.5">{t.masterProfile}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-black space-y-8">
              {isProfileLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 dark:text-neutral-700">
                   <div className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
                   <span className="text-sm font-semibold">{t.loadingProfile}</span>
                </div>
              ) : selectedProfile ? (
                <>
                  <div className="flex flex-wrap gap-4 border-b border-gray-100 dark:border-neutral-800 pb-6 transition-colors">
                    {selectedProfile.personal_info?.email && <Pill label={t.email} value={selectedProfile.personal_info.email} color="gray" />}
                    {selectedProfile.personal_info?.phone && <Pill label={t.phone} value={selectedProfile.personal_info.phone} color="gray" />}
                    {selectedProfile.personal_info?.city && <Pill label={t.location} value={`${selectedProfile.personal_info.city}, ${selectedProfile.personal_info.country}`} color="blue" />}
                    {selectedProfile.personal_info?.work_preference && <Pill label={t.preference} value={selectedProfile.personal_info.work_preference} color="emerald" />}
                  </div>

                  {selectedProfile.personal_info?.summary && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         {t.summary}
                      </h4>
                      <p className="text-sm text-gray-800 dark:text-neutral-300 leading-relaxed bg-gray-50 dark:bg-neutral-900/50 p-5 rounded-2xl border border-gray-100 dark:border-neutral-800 transition-colors">
                        {selectedProfile.personal_info.summary}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedProfile.experience?.length > 0 && (
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {t.experience}
                        </h4>
                        <div className="border-l-2 border-gray-100 dark:border-neutral-800 pl-4 space-y-5">
                          {selectedProfile.experience.map((exp: any, i: number) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gray-300 dark:bg-neutral-600 ring-4 ring-white dark:ring-black" />
                              <h5 className="text-sm font-bold text-gray-900 dark:text-white">{exp.title}</h5>
                              <p className="text-xs font-semibold text-gray-500 dark:text-neutral-500 mt-0.5">{exp.company} • {exp.start_date || 'N/A'} - {exp.is_current ? t.present : (exp.end_date || 'N/A')}</p>
                              {exp.description && <p className="text-xs text-gray-600 dark:text-neutral-400 mt-1.5 line-clamp-3 leading-relaxed">{exp.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProfile.skills?.length > 0 && (
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm transition-colors">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          {t.skillsTitle}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.skills.map((s: any, i: number) => (
                            <span key={i} className="px-2.5 py-1.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-neutral-300 transition-colors">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedProfile.references?.length > 0 && (
                    <div className="bg-purple-50/50 dark:bg-purple-950/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-900/50 transition-colors">
                      <h4 className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {t.references}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedProfile.references.map((ref: any, i: number) => (
                          <div key={i} className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 shadow-sm transition-colors">
                            <h5 className="font-bold text-gray-900 dark:text-white text-sm">{ref.name}</h5>
                            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-0.5">{ref.title} at <span className="font-semibold text-gray-700 dark:text-neutral-300">{ref.company}</span></p>
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 space-y-2">
                              {ref.email && (
                                <a href={`mailto:${ref.email}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 font-medium">
                                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  {ref.email}
                                </a>
                              )}
                              {ref.phone && (
                                <div className="text-xs text-gray-600 dark:text-neutral-400 flex items-center gap-2 font-medium">
                                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                  {ref.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-gray-400 dark:text-neutral-600">{t.loadFailed}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}