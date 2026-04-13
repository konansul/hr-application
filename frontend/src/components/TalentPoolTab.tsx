import { useState, useEffect } from 'react';
import { authApi } from '../api';

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

// Компонент Pill (как в HistoryTab) для красивых плашек в модалке
const Pill = ({ label, value, color = 'gray' }: { label: string; value: string | number; color?: 'gray' | 'emerald' | 'blue' | 'purple' }) => {
  const colorStyles = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`px-4 py-3 border rounded-xl ${colorStyles[color]} flex flex-col items-start min-w-[120px]`}>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{label}</span>
      <span className="text-xl font-semibold truncate w-full">{value}</span>
    </div>
  );
};

export function TalentPoolTab() {
  const [candidates, setCandidates] = useState<CandidateBasic[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateBasic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Загрузка списка кандидатов
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

  // 2. Логика поиска
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

  // 3. Загрузка детального профиля для модального окна
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

  // Закрытие модалки
  const closeModal = () => setSelectedCandidateId(null);

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      {/* Шапка */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Talent Pool Explorer</h2>
          <p className="text-sm text-gray-500">
            Search and review candidate profiles, skills, and references from your organization's database.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {/* Основной контейнер со списком */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">

        {/* Поиск */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, skill, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Список кандидатов */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-gray-400">
               <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
               <span className="text-sm font-semibold">Loading candidates...</span>
            </div>
          ) : filteredCandidates.length > 0 ? (
            filteredCandidates.map(c => (
              <button
                key={c.person_id}
                onClick={() => setSelectedCandidateId(c.person_id)}
                className="w-full text-left p-5 rounded-2xl transition-all duration-200 border bg-white border-gray-200 hover:border-gray-400 hover:shadow-md flex items-center gap-6 group"
              >
                {/* Аватарка (инициалы) */}
                <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {c.first_name?.[0] || '?'}
                </div>

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
                    {c.first_name || c.last_name ? `${c.first_name} ${c.last_name}` : 'Unknown Candidate'}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="truncate">{c.email}</span>
                    {c.city && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="truncate">{c.city}, {c.country}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Скиллы */}
                <div className="hidden md:flex flex-wrap gap-2 justify-end w-1/3 shrink-0">
                  {c.top_skills?.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold tracking-wide border border-gray-200">
                      {skill}
                    </span>
                  ))}
                  {(!c.top_skills || c.top_skills.length === 0) && (
                    <span className="text-xs italic text-gray-400">No skills listed</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400 text-sm italic font-medium">No candidates found matching your criteria.</div>
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПРОФИЛЯ */}
      {selectedCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()} // Предотвращаем закрытие при клике внутри модалки
          >

            {/* Header модалки */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold shadow-sm">
                   {selectedProfile?.personal_info?.first_name?.[0] || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedProfile ? `${selectedProfile.personal_info?.first_name} ${selectedProfile.personal_info?.last_name}` : 'Loading...'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Candidate Master Profile</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Тело модалки */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-8">
              {isProfileLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                   <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                   <span className="text-sm font-semibold">Loading profile data...</span>
                </div>
              ) : selectedProfile ? (
                <>
                  {/* Плашки с контактами */}
                  <div className="flex flex-wrap gap-4 border-b border-gray-100 pb-6">
                    {selectedProfile.personal_info?.email && <Pill label="Email" value={selectedProfile.personal_info.email} color="gray" />}
                    {selectedProfile.personal_info?.phone && <Pill label="Phone" value={selectedProfile.personal_info.phone} color="gray" />}
                    {selectedProfile.personal_info?.city && <Pill label="Location" value={`${selectedProfile.personal_info.city}, ${selectedProfile.personal_info.country}`} color="blue" />}
                    {selectedProfile.personal_info?.work_preference && <Pill label="Preference" value={selectedProfile.personal_info.work_preference} color="emerald" />}
                  </div>

                  {/* Summary */}
                  {selectedProfile.personal_info?.summary && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         Professional Summary
                      </h4>
                      <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        {selectedProfile.personal_info.summary}
                      </p>
                    </div>
                  )}

                  {/* Секция Experience и Skills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Experience */}
                    {selectedProfile.experience?.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Work Experience
                        </h4>
                        <div className="border-l-2 border-gray-100 pl-4 space-y-5">
                          {selectedProfile.experience.map((exp: any, i: number) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-gray-300 ring-4 ring-white" />
                              <h5 className="text-sm font-bold text-gray-900">{exp.title}</h5>
                              <p className="text-xs font-semibold text-gray-500 mt-0.5">{exp.company} • {exp.start_date || 'N/A'} - {exp.is_current ? 'Present' : (exp.end_date || 'N/A')}</p>
                              {exp.description && <p className="text-xs text-gray-600 mt-1.5 line-clamp-3">{exp.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {selectedProfile.skills?.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Skills & Expertise
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.skills.map((s: any, i: number) => (
                            <span key={i} className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* WORK REFERENCES (Рекомендации) */}
                  {selectedProfile.references?.length > 0 && (
                    <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                      <h4 className="text-[11px] font-bold text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Verified Work References
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedProfile.references.map((ref: any, i: number) => (
                          <div key={i} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                            <h5 className="font-bold text-gray-900 text-sm">{ref.name}</h5>
                            <p className="text-xs text-gray-500 mt-0.5">{ref.title} at <span className="font-semibold text-gray-700">{ref.company}</span></p>
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                              {ref.email && (
                                <a href={`mailto:${ref.email}`} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-2 font-medium">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  {ref.email}
                                </a>
                              )}
                              {ref.phone && (
                                <a href={`tel:${ref.phone}`} className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                  {ref.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-gray-400">Failed to load profile data.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}