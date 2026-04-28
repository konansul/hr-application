import { useState, useRef, useEffect } from 'react';
import { documentsApi, authApi } from '../../api';
import { useStore } from '../../store';
import { DICT } from '../../internationalization.ts';
import { OnboardingWizard } from './OnboardingWizard';

export function ProfileTab() {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.profile || DICT.en.profile;

  const [file, setFile] = useState<File | null>(null);
  const [_uploadIntent, setUploadIntent] = useState<'profile' | 'resume' | null>(null);
  const [syncWithProfile, setSyncWithProfile] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [user, setUser] = useState<any>(null);
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);

  const [profileData, setProfileData] = useState<any>({
    personal_info: {
      first_name: '', last_name: '', email: '', phone: '', city: '', country: '', nationality: '',
      visa_status: 'UNKNOWN', work_preference: 'UNKNOWN', open_to_remote: false, open_to_relocation: false,
      linkedin_url: '', github_url: '', portfolio_url: '', summary: ''
    },
    experience: [], education: [], skills: [], languages: [], certifications: [], references: []
  });

  const [showWizard, setShowWizard] = useState(false);

  const [showLinkedInInput, setShowLinkedInInput] = useState(false);
  const [linkedinImportUrl, setLinkedinImportUrl] = useState('');
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);

  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingReferences, setIsEditingReferences] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = async (currentUser?: any) => {
    try {
      const savedProfile = await authApi.getProfile().catch(() => null);
      if (savedProfile && savedProfile.profile_data && Object.keys(savedProfile.profile_data).length > 0) {
        setProfileData({ ...savedProfile.profile_data, references: savedProfile.profile_data.references || [] });
      } else if (currentUser) {
        setProfileData((prev: any) => ({ ...prev, personal_info: { ...prev.personal_info, email: currentUser.email } }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [userData, docs] = await Promise.all([
          authApi.getMe(),
          documentsApi.getMyDocuments(),
        ]);

        setUser(userData);
        setResumeVersions(docs);

        if (userData?.user_id) {
          const key = `hrai_onboarding_${userData.user_id}`;
          if (!localStorage.getItem(key)) setShowWizard(true);
        }

        await loadProfile(userData);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleUploadClick = (intent: 'profile' | 'resume') => {
    setUploadIntent(intent);
    setSyncWithProfile(intent === 'profile');
    fileInputRef.current?.click();
  };

  const handleUploadConfirm = async () => {
    if (!file) return;
    setIsUploading(true);
    setMessage(null);
    try {
      const response = await documentsApi.upload(file);
      setResumeVersions((prev) => [response, ...prev]);

      if (syncWithProfile && response.parsed_data) {
        const updatedProfile = {
          ...profileData,
          personal_info: { ...profileData.personal_info, ...response.parsed_data.personal_info },
          skills: response.parsed_data.skills || profileData.skills,
          experience: response.parsed_data.experience || profileData.experience,
          education: response.parsed_data.education || profileData.education,
          languages: response.parsed_data.languages || profileData.languages,
          certifications: response.parsed_data.certifications || profileData.certifications,
          references: profileData.references
        };
        setProfileData(updatedProfile);
        await authApi.updateProfile(updatedProfile);
        setMessage({ text: 'Resume uploaded and Master Profile synced successfully!', type: 'success' });
      } else {
        setMessage({ text: 'New resume version uploaded securely!', type: 'success' });
      }
      setFile(null);
      setUploadIntent(null);
    } catch (err: any) {
      setMessage({ text: 'Failed to process document', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setFile(null);
    setUploadIntent(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLinkedInImport = async () => {
    if (!linkedinImportUrl.trim()) return;
    setIsImportingLinkedIn(true);
    setMessage(null);
    try {
      const result = await authApi.importFromUrl(linkedinImportUrl.trim());
      if (result.profile_data) {
        setProfileData({ ...result.profile_data, references: result.profile_data.references || [] });
      }
      setMessage({ text: 'Profile imported successfully!', type: 'success' });
      setShowLinkedInInput(false);
      setLinkedinImportUrl('');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? '';
      if (detail) {
        setMessage({ text: detail, type: 'error' });
      } else {
        setMessage({ text: 'Import failed. Please try again.', type: 'error' });
      }
    } finally {
      setIsImportingLinkedIn(false);
    }
  };

  const handlePersonalInputChange = (field: string, value: any) => {
    setProfileData((prev: any) => ({ ...prev, personal_info: { ...prev.personal_info, [field]: value } }));
  };

  const handleArrayChange = (section: 'experience' | 'education' | 'skills' | 'references', index: number, field: string, value: any) => {
    setProfileData((prev: any) => {
      const newArray = [...prev[section]];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [section]: newArray };
    });
  };

  const addArrayItem = (section: 'experience' | 'education' | 'skills' | 'references', template: any) => {
    setProfileData((prev: any) => ({ ...prev, [section]: [...(prev[section] || []), template] }));
  };

  const removeArrayItem = (section: 'experience' | 'education' | 'skills' | 'references', index: number) => {
    setProfileData((prev: any) => {
      const newArray = [...prev[section]];
      newArray.splice(index, 1);
      return { ...prev, [section]: newArray };
    });
  };

  const handleSaveProfile = async () => {
    setIsUploading(true);
    try {
      await authApi.updateProfile(profileData);
      setMessage({ text: 'Profile saved successfully!', type: 'success' });
      setIsEditingPersonalInfo(false);
      setIsEditingExperience(false);
      setIsEditingEducation(false);
      setIsEditingSkills(false);
      setIsEditingReferences(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ text: 'Error saving profile to database', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex flex-col border-b border-gray-100 dark:border-neutral-800 py-3">
      <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value || <span className="text-gray-300 dark:text-neutral-600 italic">{t.notSpecified}</span>}</span>
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto animate-in fade-in duration-300 pb-32">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{t.desc}</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 text-sm rounded-xl border flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' 
            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50'
        }`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.personal.title}</h3>
              </div>

              {!isEditingPersonalInfo ? (
                <button
                  onClick={() => setIsEditingPersonalInfo(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all"
                >
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingPersonalInfo(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>

            <div className="p-6">
              {!isEditingPersonalInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label={t.personal.firstName} value={profileData.personal_info.first_name} />
                  <DetailRow label={t.personal.lastName} value={profileData.personal_info.last_name} />
                  <DetailRow label={t.personal.email} value={profileData.personal_info.email} />
                  <DetailRow label={t.personal.phone} value={profileData.personal_info.phone} />
                  <DetailRow label={t.personal.city} value={profileData.personal_info.city} />
                  <DetailRow label={t.personal.country} value={profileData.personal_info.country} />
                  <DetailRow label={t.personal.nationality} value={profileData.personal_info.nationality} />
                  <DetailRow label={t.personal.visa} value={profileData.personal_info.visa_status?.replace(/_/g, ' ')} />
                  <DetailRow label={t.personal.workPref} value={profileData.personal_info.work_preference} />
                  <DetailRow label={t.personal.linkedin} value={profileData.personal_info.linkedin_url} />

                  <div className="md:col-span-2 flex gap-6 pt-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${profileData.personal_info.open_to_remote ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-neutral-600'}`}></div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{t.personal.openRemote}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${profileData.personal_info.open_to_relocation ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-neutral-600'}`}></div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{t.personal.openRelocation}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.firstName}</label>
                    <input type="text" value={profileData.personal_info.first_name || ''} onChange={(e) => handlePersonalInputChange('first_name', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.lastName}</label>
                    <input type="text" value={profileData.personal_info.last_name || ''} onChange={(e) => handlePersonalInputChange('last_name', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.email}</label>
                    <input type="email" value={profileData.personal_info.email || ''} onChange={(e) => handlePersonalInputChange('email', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.phone}</label>
                    <input type="text" value={profileData.personal_info.phone || ''} onChange={(e) => handlePersonalInputChange('phone', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.city}</label>
                    <input type="text" value={profileData.personal_info.city || ''} onChange={(e) => handlePersonalInputChange('city', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.country}</label>
                    <input type="text" value={profileData.personal_info.country || ''} onChange={(e) => handlePersonalInputChange('country', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.nationality}</label>
                    <input type="text" value={profileData.personal_info.nationality || ''} onChange={(e) => handlePersonalInputChange('nationality', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.visa}</label>
                    <select value={profileData.personal_info.visa_status || 'UNKNOWN'} onChange={(e) => handlePersonalInputChange('visa_status', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white">
                      <option value="CITIZEN">Citizen</option>
                      <option value="PERMANENT_RESIDENT">Permanent Resident</option>
                      <option value="WORK_PERMIT">Work Permit</option>
                      <option value="STUDENT_VISA">Student Visa</option>
                      <option value="SPONSORED_VISA">Sponsored Visa</option>
                      <option value="NO_WORK_AUTHORIZATION">No Work Authorization</option>
                      <option value="OTHER">Other</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.workPref}</label>
                    <select value={profileData.personal_info.work_preference || 'UNKNOWN'} onChange={(e) => handlePersonalInputChange('work_preference', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white">
                      <option value="ONSITE">Onsite</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="REMOTE">Remote</option>
                      <option value="FLEXIBLE">Flexible</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.linkedin}</label>
                    <input type="text" value={profileData.personal_info.linkedin_url || ''} onChange={(e) => handlePersonalInputChange('linkedin_url', e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all outline-none dark:text-white" />
                  </div>

                  <div className="flex gap-6 md:col-span-2 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={profileData.personal_info.open_to_remote} onChange={(e) => handlePersonalInputChange('open_to_remote', e.target.checked)} className="w-4 h-4 text-gray-900 dark:text-white rounded border-gray-300 dark:border-neutral-600 focus:ring-gray-900 dark:focus:ring-white bg-white dark:bg-neutral-800" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.personal.openRemote}</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={profileData.personal_info.open_to_relocation} onChange={(e) => handlePersonalInputChange('open_to_relocation', e.target.checked)} className="w-4 h-4 text-gray-900 dark:text-white rounded border-gray-300 dark:border-neutral-600 focus:ring-gray-900 dark:focus:ring-white bg-white dark:bg-neutral-800" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.personal.openRelocation}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.experience.title}</h3>
              </div>
              {!isEditingExperience ? (
                <button onClick={() => setIsEditingExperience(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingExperience(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingExperience ? (
                profileData.experience?.length > 0 ? (
                  <div className="border-l-2 border-gray-100 dark:border-neutral-800 pl-6 space-y-8 py-2">
                    {profileData.experience.map((exp: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gray-300 dark:bg-neutral-600 ring-4 ring-white dark:ring-neutral-900" />
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">{exp.title}</h4>
                        <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mt-1">{exp.company} • {exp.start_date || 'N/A'} - {exp.is_current ? t.experience.present : (exp.end_date || 'N/A')}</p>
                        {exp.description && <p className="text-sm text-gray-600 dark:text-neutral-300 mt-3 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.experience.noExp}</p>
                )
              ) : (
                <div className="space-y-4">
                  {profileData.experience.map((exp: any, i: number) => (
                    <div key={i} className="p-5 border border-gray-200 dark:border-neutral-800 rounded-xl relative space-y-4 bg-gray-50/30 dark:bg-neutral-800/30">
                      <button onClick={() => removeArrayItem('experience', i)} className="absolute top-4 right-4 text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        <input type="text" placeholder={t.experience.jobTitle} value={exp.title || ''} onChange={(e) => handleArrayChange('experience', i, 'title', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        <input type="text" placeholder={t.experience.company} value={exp.company || ''} onChange={(e) => handleArrayChange('experience', i, 'company', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />

                        <div className="relative">
                          <input type="date" placeholder={t.experience.startDate} value={exp.start_date || ''} onChange={(e) => handleArrayChange('experience', i, 'start_date', e.target.value)} className="relative w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer dark:text-white dark:[color-scheme:dark]" />
                        </div>

                        <div className="relative">
                          <input type="date" placeholder={t.experience.endDate} value={exp.end_date || ''} onChange={(e) => handleArrayChange('experience', i, 'end_date', e.target.value)} disabled={exp.is_current} className="relative w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none disabled:bg-gray-100 dark:disabled:bg-neutral-900 disabled:text-gray-400 dark:disabled:text-neutral-600 cursor-pointer disabled:cursor-not-allowed dark:text-white dark:[color-scheme:dark]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={exp.is_current || false} onChange={(e) => handleArrayChange('experience', i, 'is_current', e.target.checked)} className="w-4 h-4 text-gray-900 dark:text-white rounded border-gray-300 dark:border-neutral-600 focus:ring-gray-900 dark:focus:ring-white bg-white dark:bg-neutral-800" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{t.experience.current}</span>
                      </div>
                      <textarea placeholder={t.experience.desc} value={exp.description || ''} onChange={(e) => handleArrayChange('experience', i, 'description', e.target.value)} rows={3} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none resize-none dark:text-white" />
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('experience', { title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' })} className="w-full py-3 border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-xs font-semibold rounded-xl hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors">
                    {t.experience.addExp}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.education.title}</h3>
              </div>
              {!isEditingEducation ? (
                <button onClick={() => setIsEditingEducation(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingEducation(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingEducation ? (
                profileData.education?.length > 0 ? (
                  <div className="border-l-2 border-gray-100 dark:border-neutral-800 pl-6 space-y-8 py-2">
                    {profileData.education.map((edu: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gray-300 dark:bg-neutral-600 ring-4 ring-white dark:ring-neutral-900" />
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">{edu.institution}</h4>
                        <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mt-1">{edu.degree} in {edu.field_of_study} • {edu.start_date || 'N/A'} - {edu.end_date || 'N/A'}</p>
                        {edu.description && <p className="text-sm text-gray-600 dark:text-neutral-300 mt-3 leading-relaxed whitespace-pre-wrap">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.education.noEdu}</p>
                )
              ) : (
                <div className="space-y-4">
                  {profileData.education.map((edu: any, i: number) => (
                    <div key={i} className="p-5 border border-gray-200 dark:border-neutral-800 rounded-xl relative space-y-4 bg-gray-50/30 dark:bg-neutral-800/30">
                      <button onClick={() => removeArrayItem('education', i)} className="absolute top-4 right-4 text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        <input type="text" placeholder={t.education.institution} value={edu.institution || ''} onChange={(e) => handleArrayChange('education', i, 'institution', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        <input type="text" placeholder={t.education.degree} value={edu.degree || ''} onChange={(e) => handleArrayChange('education', i, 'degree', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        <input type="text" placeholder={t.education.field} value={edu.field_of_study || ''} onChange={(e) => handleArrayChange('education', i, 'field_of_study', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        <div className="flex gap-2">
                          <input type="date" placeholder={t.education.start} value={edu.start_date || ''} onChange={(e) => handleArrayChange('education', i, 'start_date', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer dark:text-white dark:[color-scheme:dark]" />
                          <input type="date" placeholder={t.education.end} value={edu.end_date || ''} onChange={(e) => handleArrayChange('education', i, 'end_date', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none cursor-pointer dark:text-white dark:[color-scheme:dark]" />
                        </div>
                      </div>
                      <textarea placeholder={t.education.desc} value={edu.description || ''} onChange={(e) => handleArrayChange('education', i, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none resize-none dark:text-white" />
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('education', { institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', description: '' })} className="w-full py-3 border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-xs font-semibold rounded-xl hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors">
                    {t.education.addEdu}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 dark:bg-purple-400"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.references.title}</h3>
              </div>
              {!isEditingReferences ? (
                <button onClick={() => setIsEditingReferences(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingReferences(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingReferences ? (
                profileData.references?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profileData.references.map((ref: any, i: number) => (
                      <div key={i} className="p-4 border border-gray-100 dark:border-neutral-800 rounded-xl bg-gray-50/50 dark:bg-neutral-800/30">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{ref.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-neutral-400 mt-0.5">{ref.title} at <span className="font-semibold text-gray-800 dark:text-neutral-300">{ref.company}</span></p>
                        <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-neutral-700/60 space-y-1">
                          {ref.email && <p className="text-[11px] text-gray-500 dark:text-neutral-400 flex items-center gap-2"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> {ref.email}</p>}
                          {ref.phone && <p className="text-[11px] text-gray-500 dark:text-neutral-400 flex items-center gap-2"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> {ref.phone}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.references.noRef}</p>
                )
              ) : (
                <div className="space-y-4">
                  {profileData.references?.map((ref: any, i: number) => (
                    <div key={i} className="p-5 border border-gray-200 dark:border-neutral-800 rounded-xl relative space-y-4 bg-gray-50/30 dark:bg-neutral-800/30">
                      <button onClick={() => removeArrayItem('references', i)} className="absolute top-4 right-4 text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.fullName}</label>
                          <input type="text" placeholder="e.g. Jane Doe" value={ref.name || ''} onChange={(e) => handleArrayChange('references', i, 'name', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.company}</label>
                          <input type="text" placeholder="e.g. Google" value={ref.company || ''} onChange={(e) => handleArrayChange('references', i, 'company', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.jobTitle}</label>
                          <input type="text" placeholder="e.g. Former Manager" value={ref.title || ''} onChange={(e) => handleArrayChange('references', i, 'title', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.email}</label>
                          <input type="email" placeholder="jane@example.com" value={ref.email || ''} onChange={(e) => handleArrayChange('references', i, 'email', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.phone}</label>
                          <input type="tel" placeholder="+1 234 567 8900" value={ref.phone || ''} onChange={(e) => handleArrayChange('references', i, 'phone', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('references', { name: '', title: '', company: '', email: '', phone: '' })} className="w-full py-3 border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-xs font-semibold rounded-xl hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors">
                    {t.references.addRef}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.skills.title}</h3>
              </div>
              {!isEditingSkills ? (
                <button onClick={() => setIsEditingSkills(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingSkills(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingSkills ? (
                <div className="flex flex-wrap gap-2">
                  {profileData.skills?.length > 0 ? profileData.skills.map((s: any, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-semibold shadow-sm transition-colors">
                      {s.name} {s.level && <span className="text-gray-400 dark:text-neutral-500 text-[10px] ml-1">{s.level}</span>}
                    </span>
                  )) : <span className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.skills.noSkills}</span>}
                </div>
              ) : (
                <div className="space-y-3">
                  {profileData.skills.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-neutral-800 rounded-xl bg-gray-50/30 dark:bg-neutral-800/30 relative">
                      <input type="text" placeholder={t.skills.skillName} value={s.name || ''} onChange={(e) => handleArrayChange('skills', i, 'name', e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white" />
                      <select value={s.level || ''} onChange={(e) => handleArrayChange('skills', i, 'level', e.target.value)} className="px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none dark:text-white">
                        <option value="">{t.skills.level}</option>
                        <option value="Beginner">{t.skills.beginner}</option>
                        <option value="Intermediate">{t.skills.intermediate}</option>
                        <option value="Advanced">{t.skills.advanced}</option>
                        <option value="Expert">{t.skills.expert}</option>
                      </select>
                      <button onClick={() => removeArrayItem('skills', i)} className="text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('skills', { name: '', level: '' })} className="w-full py-3 border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-xs font-semibold rounded-xl hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors">
                    {t.skills.addSkill}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="lg:col-span-4 space-y-6">

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 flex flex-col items-center text-center transition-colors">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-800/50 shadow-sm transition-colors">
              <span className="text-2xl font-bold">
                {profileData.personal_info.first_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {profileData.personal_info.first_name ? `${profileData.personal_info.first_name} ${profileData.personal_info.last_name}` : t.sidebar.unknownCandidate}
            </h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">{profileData.personal_info.phone || user?.email}</p>

            <div className="w-full p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700 mb-2 transition-colors space-y-2">
              <p className="text-xs text-gray-600 dark:text-neutral-400 mb-3">{t.sidebar.fillPrompt}</p>
              <button
                onClick={() => handleUploadClick('profile')}
                className="w-full py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 hover:border-gray-900 dark:hover:border-white text-gray-900 dark:text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {t.sidebar.autofill}
                <span className="text-[10px] font-bold bg-gray-900 dark:bg-white text-white dark:text-black rounded px-1 py-0.5 leading-none">AI</span>
              </button>

              {/* LinkedIn import */}
              <button
                onClick={() => { setShowLinkedInInput(v => !v); setLinkedinImportUrl(''); }}
                className="w-full py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-gray-900 dark:text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Import from URL
              </button>

              {showLinkedInInput && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus-within:border-indigo-400 dark:focus-within:border-indigo-600 transition-colors">
                    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <input
                      type="url"
                      placeholder="https://yourname.com or linkedin.com/in/..."
                      value={linkedinImportUrl}
                      onChange={e => setLinkedinImportUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLinkedInImport()}
                      autoFocus
                      className="flex-1 bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 outline-none min-w-0"
                    />
                  </div>
                  <button
                    onClick={handleLinkedInImport}
                    disabled={!linkedinImportUrl.trim() || isImportingLinkedIn}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isImportingLinkedIn && (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {isImportingLinkedIn ? 'Importing…' : 'Import profile'}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (user?.user_id) localStorage.removeItem(`hrai_onboarding_${user.user_id}`);
                setShowWizard(true);
              }}
              className="w-full mt-1 text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors py-1 flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Redo setup wizard
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.sidebar.resumeLibrary}</h3>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-white text-[10px] font-bold flex items-center justify-center">
                  {resumeVersions.length}
                </span>
                <button onClick={() => handleUploadClick('resume')} className="text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>
            <div className="p-3">
              {resumeVersions.length > 0 ? (
                <div className="space-y-1">
                  {resumeVersions.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-neutral-700 cursor-pointer group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 group-hover:bg-white dark:group-hover:bg-neutral-700 border border-transparent group-hover:border-gray-200 dark:group-hover:border-neutral-600 flex items-center justify-center shrink-0 transition-colors">
                          <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300 truncate">{doc.filename || `Version_${i+1}.pdf`}</span>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 dark:text-neutral-600 group-hover:text-gray-400 dark:group-hover:text-neutral-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-400 dark:text-neutral-500">{t.sidebar.noResumes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.txt" />

      {file && !isUploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 px-6 py-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-6 animate-in slide-in-from-bottom-8 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-lg flex items-center justify-center">
               <svg className="w-5 h-5 text-gray-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-widest">{t.upload.selectedFile}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">{file.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-gray-100 dark:border-neutral-800 pl-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={syncWithProfile}
                onChange={(e) => setSyncWithProfile(e.target.checked)}
                className="w-4 h-4 text-gray-900 dark:text-white bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 rounded focus:ring-gray-900 dark:focus:ring-white cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-neutral-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t.upload.syncProfile}</span>
            </label>
          </div>

          <div className="flex items-center gap-2 pl-4">
            <button onClick={handleCancelUpload} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel || 'Cancel'}</button>
            <button onClick={handleUploadConfirm} className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all shadow-sm">{t.upload.confirm}</button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="flex flex-col items-center gap-4 bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-800 transition-colors">
            <div className="w-10 h-10 border-4 border-gray-200 dark:border-neutral-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.upload.processing}</p>
          </div>
        </div>
      )}

      {showWizard && user?.user_id && (
        <OnboardingWizard userId={user.user_id} onComplete={() => { setShowWizard(false); loadProfile(user); }} />
      )}
    </div>
  );
}