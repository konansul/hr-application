import { useState, useRef, useEffect } from 'react';
import { documentsApi, authApi } from '../../../api';
import { useStore } from '../../../store';
import { DICT } from '../../../internationalization.ts';
import { OnboardingWizard } from './OnboardingWizard';
import { LoadingOverlay } from '../../shared/LoadingOverlay';

const REQUIRED_PI_FIELDS: { key: string; label: string; isEnum: boolean }[] = [
  { key: 'first_name', label: 'First Name', isEnum: false },
  { key: 'last_name', label: 'Last Name', isEnum: false },
  { key: 'email', label: 'Email', isEnum: false },
  { key: 'phone', label: 'Phone', isEnum: false },
  { key: 'city', label: 'City', isEnum: false },
  { key: 'country', label: 'Country', isEnum: false },
  { key: 'nationality', label: 'Nationality', isEnum: false },
  { key: 'visa_status', label: 'Visa Status', isEnum: true },
  { key: 'work_preference', label: 'Work Preference', isEnum: true },
];

const AI_PERSONAL_FIELDS = ['first_name','last_name','email','phone','city','country','nationality','summary','linkedin_url','github_url','portfolio_url','visa_status','work_preference'] as const;

function computeAiPersonalFields(personal: any): Set<string> {
  const result = new Set<string>();
  AI_PERSONAL_FIELDS.forEach(f => {
    const v = personal?.[f];
    if (v && v !== '' && v !== 'UNKNOWN') result.add(f);
  });
  return result;
}

function sanitizeProfileForSave(pd: any): any {
  const strip = (items: any[]) => (items || []).map(({ _ai_generated, ...rest }: any) => rest);
  return {
    ...pd,
    experience: strip(pd.experience),
    education: strip(pd.education),
    skills: strip(pd.skills),
    languages: strip(pd.languages),
    certifications: strip(pd.certifications),
    references: strip(pd.references),
  };
}

function getMissingKeys(profileData: any): string[] {
  const pi = profileData.personal_info || {};
  return REQUIRED_PI_FIELDS.filter(f => {
    const v = pi[f.key];
    if (!v || v === '' || v === 'UNKNOWN') return true;
    return false;
  }).map(f => f.key);
}

export function ProfileTab() {
  const { language, activeTab } = useStore();
  const t = DICT[language as keyof typeof DICT]?.profile || DICT.en.profile;

  const getFieldLabel = (key: string): string => {
    const map: Record<string, string> = {
      first_name: t.personal.firstName,
      last_name: t.personal.lastName,
      email: t.personal.email,
      phone: t.personal.phone,
      city: t.personal.city,
      country: t.personal.country,
      nationality: t.personal.nationality,
      visa_status: t.personal.visa,
      work_preference: t.personal.workPref,
    };
    return map[key] ?? key;
  };

  const [file, setFile] = useState<File | null>(null);
  const [_uploadIntent, setUploadIntent] = useState<'profile' | 'resume' | null>(null);
  const [syncWithProfile, setSyncWithProfile] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
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

  const [showUrlImportInput, setShowUrlImportInput] = useState(false);
  const [urlImportValue, setUrlImportValue] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);

  const [_aiParsedSections, setAiParsedSections] = useState<Set<string>>(new Set());

  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingLanguages, setIsEditingLanguages] = useState(false);
  const [isEditingCertifications, setIsEditingCertifications] = useState(false);
  const [isEditingReferences, setIsEditingReferences] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [aiPersonalFields, setAiPersonalFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
    if (message?.type === 'error' && getMissingKeys(profileData).length === 0) {
      setMessage(null);
      setValidationErrors(new Set());
    }
  }, [profileData, message]);

  useEffect(() => {
    if (activeTab !== 'profile') {
      setMessage(null);
      setValidationErrors(new Set());
    }
  }, [activeTab]);

  useEffect(() => {
    setMessage(null);
    setValidationErrors(new Set());
  }, [language]);

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
          const onboardKey = `hrai_onboarding_${userData.user_id}`;
          if (!localStorage.getItem(onboardKey)) setShowWizard(true);
          try {
            const stored = localStorage.getItem(`hrai_ai_sections_${userData.user_id}`);
            if (stored) setAiParsedSections(new Set(JSON.parse(stored)));
            const storedPf = localStorage.getItem(`hrai_ai_personal_fields_${userData.user_id}`);
            if (storedPf) setAiPersonalFields(new Set(JSON.parse(storedPf)));
          } catch { /* empty */ }
        }

        await loadProfile(userData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
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
        const pd = response.parsed_data;
        const prev = profileData;
        const markAi = (items: any[]) => (items || []).map((item: any) => ({ ...item, _ai_generated: true }));
        const updatedProfile = {
          ...prev,
          personal_info: { ...prev.personal_info, ...pd.personal_info },
          skills: pd.skills?.length ? markAi(pd.skills) : prev.skills,
          experience: pd.experience?.length ? markAi(pd.experience) : prev.experience,
          education: pd.education?.length ? markAi(pd.education) : prev.education,
          languages: pd.languages?.length ? markAi(pd.languages) : prev.languages,
          certifications: pd.certifications?.length ? markAi(pd.certifications) : prev.certifications,
          references: prev.references
        };
        setProfileData(updatedProfile);
        await authApi.updateProfile(sanitizeProfileForSave(updatedProfile));
        const sections = new Set<string>();
        if (pd.experience?.length) sections.add('experience');
        if (pd.education?.length) sections.add('education');
        if (pd.skills?.length) sections.add('skills');
        if (pd.languages?.length) sections.add('languages');
        if (pd.certifications?.length) sections.add('certifications');
        const newPersonal = pd.personal_info || {};
        const personalFields = ['first_name','last_name','phone','city','country','nationality','summary'] as const;
        if (personalFields.some(f => newPersonal[f])) sections.add('personal');
        setAiParsedSections(sections);
        const newAiPf = computeAiPersonalFields(newPersonal);
        setAiPersonalFields(newAiPf);
        if (user?.user_id) {
          localStorage.setItem(`hrai_ai_sections_${user.user_id}`, JSON.stringify([...sections]));
          localStorage.setItem(`hrai_ai_personal_fields_${user.user_id}`, JSON.stringify([...newAiPf]));
        }
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

  const handleUrlImport = async () => {
    if (!urlImportValue.trim()) return;
    setIsImportingUrl(true);
    setMessage(null);
    try {
      const result = await authApi.importFromUrl(urlImportValue.trim());
      if (result.profile_data) {
        const pd = result.profile_data;
        const markAi = (items: any[]) => (items || []).map((item: any) => ({ ...item, _ai_generated: true }));
        const next = {
          ...pd,
          experience: markAi(pd.experience),
          education: markAi(pd.education),
          skills: markAi(pd.skills),
          languages: markAi(pd.languages),
          certifications: markAi(pd.certifications),
          references: pd.references || [],
        };
        setProfileData(next);
        const sections = new Set<string>();
        if (pd.experience?.length) sections.add('experience');
        if (pd.education?.length) sections.add('education');
        if (pd.skills?.length) sections.add('skills');
        if (pd.languages?.length) sections.add('languages');
        if (pd.certifications?.length) sections.add('certifications');
        const newPersonal = pd.personal_info || {};
        const personalFields = ['first_name','last_name','phone','city','country','nationality','summary'] as const;
        if (personalFields.some(f => newPersonal[f])) sections.add('personal');
        setAiParsedSections(sections);
        const newAiPf = computeAiPersonalFields(newPersonal);
        setAiPersonalFields(newAiPf);
        if (user?.user_id) {
          localStorage.setItem(`hrai_ai_sections_${user.user_id}`, JSON.stringify([...sections]));
          localStorage.setItem(`hrai_ai_personal_fields_${user.user_id}`, JSON.stringify([...newAiPf]));
        }
      }
      setMessage({ text: 'Profile imported successfully!', type: 'success' });
      setShowUrlImportInput(false);
      setUrlImportValue('');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? '';
      if (detail) {
        setMessage({ text: detail, type: 'error' });
      } else {
        setMessage({ text: 'Import failed. Please try again.', type: 'error' });
      }
    } finally {
      setIsImportingUrl(false);
    }
  };

  const handlePersonalInputChange = (field: string, value: any) => {
    setProfileData((prev: any) => ({ ...prev, personal_info: { ...prev.personal_info, [field]: value } }));
    if (validationErrors.has(field)) {
      const next = new Set(validationErrors);
      next.delete(field);
      setValidationErrors(next);
      if (next.size === 0) setMessage(null);
    }
    if (aiPersonalFields.has(field)) {
      const next = new Set(aiPersonalFields);
      next.delete(field);
      setAiPersonalFields(next);
      if (user?.user_id) localStorage.setItem(`hrai_ai_personal_fields_${user.user_id}`, JSON.stringify([...next]));
    }
  };

  const handleArrayChange = (section: 'experience' | 'education' | 'skills' | 'languages' | 'certifications' | 'references', index: number, field: string, value: any) => {
    setProfileData((prev: any) => {
      const newArray = [...prev[section]];
      newArray[index] = { ...newArray[index], [field]: value, _ai_generated: false };
      return { ...prev, [section]: newArray };
    });
  };

  const addArrayItem = (section: 'experience' | 'education' | 'skills' | 'languages' | 'certifications' | 'references', template: any) => {
    setProfileData((prev: any) => ({ ...prev, [section]: [...(prev[section] || []), template] }));
  };

  const removeArrayItem = (section: 'experience' | 'education' | 'skills' | 'languages' | 'certifications' | 'references', index: number) => {
    setProfileData((prev: any) => {
      const newArray = [...prev[section]];
      newArray.splice(index, 1);
      return { ...prev, [section]: newArray };
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const updated = { ...profileData, personal_info: { ...profileData.personal_info, photo: dataUrl } };
      setProfileData(updated);
      try { await authApi.updateProfile(updated); } catch (_) { /* empty */ }
    };
    reader.readAsDataURL(f);
  };

  const handleSaveProfile = async () => {
    const missing = getMissingKeys(profileData);
    if (missing.length > 0) {
      setValidationErrors(new Set(missing));
      setIsEditingPersonalInfo(true);
      const labels = missing.map(k => getFieldLabel(k)).join(', ');
      const requiredMsg = (t as any).requiredFields ?? 'Please complete required fields';
      setMessage({ text: `${requiredMsg}: ${labels}`, type: 'error' });
      document.getElementById('personal-info-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setValidationErrors(new Set());
    setIsUploading(true);
    try {
      await authApi.updateProfile(sanitizeProfileForSave(profileData));
      setAiParsedSections(new Set());
      setAiPersonalFields(new Set());
      if (user?.user_id) {
        localStorage.removeItem(`hrai_ai_sections_${user.user_id}`);
        localStorage.removeItem(`hrai_ai_personal_fields_${user.user_id}`);
      }
      setMessage({ text: 'Profile saved successfully!', type: 'success' });
      setIsEditingPersonalInfo(false);
      setIsEditingExperience(false);
      setIsEditingEducation(false);
      setIsEditingSkills(false);
      setIsEditingLanguages(false);
      setIsEditingCertifications(false);
      setIsEditingReferences(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ text: 'Error saving profile to database', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const AiInfoBadge = () => (
    <div className="relative group inline-flex items-center">
      <svg className="w-3.5 h-3.5 text-[#7A60F4] dark:text-[#9EA4FF] cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="pointer-events-none absolute left-full ml-1.5 top-1/2 -translate-y-1/2 w-56 px-2.5 py-1.5 bg-[#7A60F4] text-white text-[10px] font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 leading-snug">
        {t.aiParsedTooltip}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-blue-600" />
      </div>
    </div>
  );

  const ExpandableText = ({ text, limit = 280 }: { text: string; limit?: number }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return null;
    if (text.length <= limit) return <p className="text-sm text-gray-600 dark:text-neutral-300 mt-3 leading-relaxed whitespace-pre-wrap">{text}</p>;
    return (
      <div className="mt-3">
        <p className="text-sm text-gray-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
          {expanded ? text : `${text.slice(0, limit).trimEnd()}…`}
        </p>
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-1.5 text-xs font-semibold text-[#7A60F4] dark:text-[#9EA4FF] hover:underline focus:outline-none"
        >
          {expanded ? ((t as any).showLess ?? 'Show less') : ((t as any).showMore ?? 'Show more')}
        </button>
      </div>
    );
  };

  const DetailRow = ({ label, value, isAi }: { label: string; value: any; isAi?: boolean }) => (
    <div className="flex flex-col border-b border-gray-100 dark:border-neutral-800 py-3">
      <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1">
        {label}
        {isAi && <AiInfoBadge />}
      </span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{(value && value !== 'UNKNOWN') ? value : <span className="text-gray-300 dark:text-neutral-600 italic">{t.notSpecified}</span>}</span>
    </div>
  );

  const RequiredDetailRow = ({ label, value, fieldKey, isAi }: { label: string; value: any; fieldKey: string; isAi?: boolean }) => {
    const isMissing = getMissingKeys(profileData).includes(fieldKey);
    return (
      <div className="flex flex-col border-b border-gray-100 dark:border-neutral-800 py-3">
        <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1">
          {label}
          <span className="text-red-400 dark:text-red-500 text-[10px] ml-0.5">*</span>
          {isAi && <AiInfoBadge />}
        </span>
        {isMissing ? (
          <button
            onClick={() => { setIsEditingPersonalInfo(true); document.getElementById('personal-info-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            className="text-left text-xs font-semibold text-[#FF906D] flex items-center gap-1.5 hover:text-[#c05020] dark:hover:text-[#FF906D] transition-colors"
          >
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {(t as any).notCompleted ?? 'Not completed — click to fill in'}
          </button>
        ) : (
          <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
        )}
      </div>
    );
  };

  const inputClass = (fieldKey: string, extra = '') =>
    `w-full px-3 py-2 rounded-xl text-sm transition-all outline-none dark:text-white ${extra} ${
      validationErrors.has(fieldKey)
        ? 'bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500'
        : 'bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50'
    }`;

  const selectClass = (fieldKey: string) =>
    `w-full px-3 py-2 rounded-xl text-sm transition-all outline-none dark:text-white ${
      validationErrors.has(fieldKey)
        ? 'bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500'
        : 'bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50'
    }`;

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

          <div id="personal-info-section" className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#7A60F4]"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.personal.title}</h3>
                {aiPersonalFields.size > 0 && <AiInfoBadge />}
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
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#7A60F4] text-white text-xs font-semibold rounded-lg hover:bg-[#6B52E8] transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>

            <div className="p-6">
              {!isEditingPersonalInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <RequiredDetailRow label={t.personal.firstName} fieldKey="first_name" value={profileData.personal_info.first_name} isAi={aiPersonalFields.has('first_name')} />
                  <RequiredDetailRow label={t.personal.lastName} fieldKey="last_name" value={profileData.personal_info.last_name} isAi={aiPersonalFields.has('last_name')} />
                  <RequiredDetailRow label={t.personal.email} fieldKey="email" value={profileData.personal_info.email} isAi={aiPersonalFields.has('email')} />
                  <RequiredDetailRow label={t.personal.phone} fieldKey="phone" value={profileData.personal_info.phone} isAi={aiPersonalFields.has('phone')} />
                  <RequiredDetailRow label={t.personal.city} fieldKey="city" value={profileData.personal_info.city} isAi={aiPersonalFields.has('city')} />
                  <RequiredDetailRow label={t.personal.country} fieldKey="country" value={profileData.personal_info.country} isAi={aiPersonalFields.has('country')} />
                  <RequiredDetailRow label={t.personal.nationality} fieldKey="nationality" value={profileData.personal_info.nationality} isAi={aiPersonalFields.has('nationality')} />
                  <RequiredDetailRow label={t.personal.visa} fieldKey="visa_status" value={profileData.personal_info.visa_status === 'UNKNOWN' ? '' : profileData.personal_info.visa_status?.replace(/_/g, ' ')} isAi={aiPersonalFields.has('visa_status')} />
                  <RequiredDetailRow label={t.personal.workPref} fieldKey="work_preference" value={profileData.personal_info.work_preference === 'UNKNOWN' ? '' : profileData.personal_info.work_preference} isAi={aiPersonalFields.has('work_preference')} />
                  <DetailRow label={t.personal.linkedin} value={profileData.personal_info.linkedin_url} isAi={aiPersonalFields.has('linkedin_url')} />
                  <DetailRow label={t.personal.github} value={profileData.personal_info.github_url} isAi={aiPersonalFields.has('github_url')} />
                  <DetailRow label={t.personal.portfolio} value={profileData.personal_info.portfolio_url} isAi={aiPersonalFields.has('portfolio_url')} />

                  <div className="md:col-span-2 flex gap-6 pt-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${profileData.personal_info.open_to_remote ? 'bg-[#7A60F4]' : 'bg-gray-300 dark:bg-neutral-600'}`}></div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{t.personal.openRemote}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${profileData.personal_info.open_to_relocation ? 'bg-[#7A60F4]' : 'bg-gray-300 dark:bg-neutral-600'}`}></div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{t.personal.openRelocation}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.firstName}<span className="text-red-400">*</span></label>
                    <input type="text" value={profileData.personal_info.first_name || ''} onChange={(e) => handlePersonalInputChange('first_name', e.target.value)} className={inputClass('first_name')} />
                    {validationErrors.has('first_name') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).required ?? 'Required'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.lastName}<span className="text-red-400">*</span></label>
                    <input type="text" value={profileData.personal_info.last_name || ''} onChange={(e) => handlePersonalInputChange('last_name', e.target.value)} className={inputClass('last_name')} />
                    {validationErrors.has('last_name') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).required ?? 'Required'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.email}<span className="text-red-400">*</span></label>
                    <input type="email" value={profileData.personal_info.email || ''} onChange={(e) => handlePersonalInputChange('email', e.target.value)} className={inputClass('email')} />
                    {validationErrors.has('email') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).required ?? 'Required'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.phone}<span className="text-red-400">*</span></label>
                    <input type="text" value={profileData.personal_info.phone || ''} onChange={(e) => handlePersonalInputChange('phone', e.target.value)} className={inputClass('phone')} />
                    {validationErrors.has('phone') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).required ?? 'Required'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.city}<span className="text-red-400">*</span></label>
                    <input type="text" value={profileData.personal_info.city || ''} onChange={(e) => handlePersonalInputChange('city', e.target.value)} className={inputClass('city')} />
                    {validationErrors.has('city') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).required ?? 'Required'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.country}<span className="text-red-400">*</span></label>
                    <input type="text" value={profileData.personal_info.country || ''} onChange={(e) => handlePersonalInputChange('country', e.target.value)} className={inputClass('country')} />
                    {validationErrors.has('country') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).required ?? 'Required'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.nationality}<span className="text-red-400">*</span></label>
                    <input type="text" value={profileData.personal_info.nationality || ''} onChange={(e) => handlePersonalInputChange('nationality', e.target.value)} className={inputClass('nationality')} />
                    {validationErrors.has('nationality') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).required ?? 'Required'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.visa}<span className="text-red-400">*</span></label>
                    <select value={profileData.personal_info.visa_status || 'UNKNOWN'} onChange={(e) => handlePersonalInputChange('visa_status', e.target.value)} className={selectClass('visa_status')}>
                      <option value="UNKNOWN" disabled>— Select visa status —</option>
                      <option value="CITIZEN">Citizen</option>
                      <option value="PERMANENT_RESIDENT">Permanent Resident</option>
                      <option value="WORK_PERMIT">Work Permit</option>
                      <option value="STUDENT_VISA">Student Visa</option>
                      <option value="SPONSORED_VISA">Sponsored Visa</option>
                      <option value="NO_WORK_AUTHORIZATION">No Work Authorization</option>
                      <option value="OTHER">Other</option>
                    </select>
                    {validationErrors.has('visa_status') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).selectVisaStatus ?? 'Please select a visa status'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1">{t.personal.workPref}<span className="text-red-400">*</span></label>
                    <select value={profileData.personal_info.work_preference || 'UNKNOWN'} onChange={(e) => handlePersonalInputChange('work_preference', e.target.value)} className={selectClass('work_preference')}>
                      <option value="UNKNOWN" disabled>— Select preference —</option>
                      <option value="ONSITE">Onsite</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="REMOTE">Remote</option>
                      <option value="FLEXIBLE">Flexible</option>
                    </select>
                    {validationErrors.has('work_preference') && <p className="text-[10px] text-red-500 font-semibold mt-1">{(t as any).selectWorkPreference ?? 'Please select a work preference'}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.linkedin}</label>
                    <input type="text" value={profileData.personal_info.linkedin_url || ''} onChange={(e) => handlePersonalInputChange('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.github}</label>
                    <input type="text" value={profileData.personal_info.github_url || ''} onChange={(e) => handlePersonalInputChange('github_url', e.target.value)} placeholder="https://github.com/..." className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 transition-all outline-none dark:text-white" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.personal.portfolio}</label>
                    <input type="text" value={profileData.personal_info.portfolio_url || ''} onChange={(e) => handlePersonalInputChange('portfolio_url', e.target.value)} placeholder="https://yourname.com" className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 transition-all outline-none dark:text-white" />
                  </div>

                  <div className="flex gap-6 md:col-span-2 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={profileData.personal_info.open_to_remote} onChange={(e) => handlePersonalInputChange('open_to_remote', e.target.checked)} className="w-4 h-4 text-gray-900 dark:text-white rounded border-gray-300 dark:border-neutral-600 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 bg-white dark:bg-neutral-800" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.personal.openRemote}</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={profileData.personal_info.open_to_relocation} onChange={(e) => handlePersonalInputChange('open_to_relocation', e.target.checked)} className="w-4 h-4 text-gray-900 dark:text-white rounded border-gray-300 dark:border-neutral-600 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 bg-white dark:bg-neutral-800" />
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
                <div className="w-2.5 h-2.5 rounded-full bg-[#92D8F2]"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.experience.title}</h3>
                {profileData.experience?.some((e: any) => e._ai_generated) && <AiInfoBadge />}
              </div>
              {!isEditingExperience ? (
                <button onClick={() => setIsEditingExperience(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingExperience(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#7A60F4] text-white text-xs font-semibold rounded-lg hover:bg-[#6B52E8] transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingExperience ? (
                profileData.experience?.length > 0 ? (
                  <div className="space-y-0 divide-y divide-gray-100 dark:divide-neutral-800">
                    {profileData.experience.map((exp: any, i: number) => (
                      <div key={i} className="py-4 first:pt-0 last:pb-0">
                        <div className="grid grid-cols-3 gap-4 w-full">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">{exp.title}{exp._ai_generated && <AiInfoBadge />}</h4>
                          <p className="text-sm font-semibold text-gray-500 dark:text-neutral-400">{exp.company}</p>
                          <p className="text-sm font-semibold text-gray-400 dark:text-neutral-500 text-right">{exp.start_date || 'N/A'} – {exp.is_current ? t.experience.present : (exp.end_date || 'N/A')}</p>
                        </div>
                        {exp.description && <div className="mt-2 col-span-3"><ExpandableText text={exp.description} /></div>}
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
                        <input type="text" placeholder={t.experience.jobTitle} value={exp.title || ''} onChange={(e) => handleArrayChange('experience', i, 'title', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        <input type="text" placeholder={t.experience.company} value={exp.company || ''} onChange={(e) => handleArrayChange('experience', i, 'company', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />

                        <div className="relative">
                          <input type="date" placeholder={t.experience.startDate} value={exp.start_date || ''} onChange={(e) => handleArrayChange('experience', i, 'start_date', e.target.value)} className="relative w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none cursor-pointer dark:text-white dark:[color-scheme:dark]" />
                        </div>

                        <div className="relative">
                          <input type="date" placeholder={t.experience.endDate} value={exp.end_date || ''} onChange={(e) => handleArrayChange('experience', i, 'end_date', e.target.value)} disabled={exp.is_current} className="relative w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none disabled:bg-gray-100 dark:disabled:bg-neutral-900 disabled:text-gray-400 dark:disabled:text-neutral-600 cursor-pointer disabled:cursor-not-allowed dark:text-white dark:[color-scheme:dark]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={exp.is_current || false} onChange={(e) => handleArrayChange('experience', i, 'is_current', e.target.checked)} className="w-4 h-4 text-gray-900 dark:text-white rounded border-gray-300 dark:border-neutral-600 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 bg-white dark:bg-neutral-800" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{t.experience.current}</span>
                      </div>
                      <textarea placeholder={t.experience.desc} value={exp.description || ''} onChange={(e) => handleArrayChange('experience', i, 'description', e.target.value)} rows={3} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none resize-none dark:text-white" />
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
                <div className="w-2.5 h-2.5 rounded-full bg-[#9EA4FF]"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.education.title}</h3>
                {profileData.education?.some((e: any) => e._ai_generated) && <AiInfoBadge />}
              </div>
              {!isEditingEducation ? (
                <button onClick={() => setIsEditingEducation(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingEducation(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#7A60F4] text-white text-xs font-semibold rounded-lg hover:bg-[#6B52E8] transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingEducation ? (
                profileData.education?.length > 0 ? (
                  <div className="space-y-0 divide-y divide-gray-100 dark:divide-neutral-800">
                    {profileData.education.map((edu: any, i: number) => (
                      <div key={i} className="py-4 first:pt-0 last:pb-0">
                        <div className="grid grid-cols-3 gap-4 w-full">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">{edu.institution}{edu._ai_generated && <AiInfoBadge />}</h4>
                          <p className="text-sm font-semibold text-gray-500 dark:text-neutral-400">
                            {[edu.degree, edu.field_of_study].filter(v => v && v !== 'UNKNOWN').join(' in ')}
                          </p>
                          <p className="text-sm font-semibold text-gray-400 dark:text-neutral-500 text-right">{edu.start_date?.slice(0, 7) || 'N/A'} – {edu.end_date?.slice(0, 7) || 'N/A'}</p>
                        </div>
                        {edu.description && <div className="mt-2"><p className="text-sm text-gray-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{edu.description}</p></div>}
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
                        <input type="text" placeholder={t.education.institution} value={edu.institution || ''} onChange={(e) => handleArrayChange('education', i, 'institution', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        <input type="text" placeholder={t.education.degree} value={edu.degree || ''} onChange={(e) => handleArrayChange('education', i, 'degree', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        <input type="text" placeholder={t.education.field} value={edu.field_of_study || ''} onChange={(e) => handleArrayChange('education', i, 'field_of_study', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        <div className="flex gap-2">
                          <input type="date" placeholder={t.education.start} value={edu.start_date ? (edu.start_date.length === 7 ? edu.start_date + '-01' : edu.start_date) : ''} onChange={(e) => handleArrayChange('education', i, 'start_date', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none cursor-pointer dark:text-white dark:[color-scheme:dark]" />
                          <input type="date" placeholder={t.education.end} value={edu.end_date ? (edu.end_date.length === 7 ? edu.end_date + '-01' : edu.end_date) : ''} onChange={(e) => handleArrayChange('education', i, 'end_date', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none cursor-pointer dark:text-white dark:[color-scheme:dark]" />
                        </div>
                      </div>
                      <textarea placeholder={t.education.desc} value={edu.description || ''} onChange={(e) => handleArrayChange('education', i, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none resize-none dark:text-white" />
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
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF906D]"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.skills.title}</h3>
                {profileData.skills?.some((e: any) => e._ai_generated) && <AiInfoBadge />}
              </div>
              {!isEditingSkills ? (
                <button onClick={() => setIsEditingSkills(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingSkills(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#7A60F4] text-white text-xs font-semibold rounded-lg hover:bg-[#6B52E8] transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingSkills ? (
                <div className="flex flex-wrap gap-2">
                  {profileData.skills?.length > 0 ? profileData.skills.map((s: any, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-semibold shadow-sm transition-colors inline-flex items-center gap-1.5">
                      {s.name} {s.level && <span className="text-gray-400 dark:text-neutral-500 text-[10px] ml-1">{s.level}</span>}{s._ai_generated && <AiInfoBadge />}
                    </span>
                  )) : <span className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.skills.noSkills}</span>}
                </div>
              ) : (
                <div className="space-y-3">
                  {profileData.skills.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-neutral-800 rounded-xl bg-gray-50/30 dark:bg-neutral-800/30 relative">
                      <input type="text" placeholder={t.skills.skillName} value={s.name || ''} onChange={(e) => handleArrayChange('skills', i, 'name', e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                      <select value={s.level || ''} onChange={(e) => handleArrayChange('skills', i, 'level', e.target.value)} className="px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white">
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

          {/* Languages */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#92D8F2]"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{(t as any).languages?.title ?? 'Languages'}</h3>
                {profileData.languages?.some((e: any) => e._ai_generated) && <AiInfoBadge />}
              </div>
              {!isEditingLanguages ? (
                <button onClick={() => setIsEditingLanguages(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingLanguages(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#7A60F4] text-white text-xs font-semibold rounded-lg hover:bg-[#6B52E8] transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingLanguages ? (
                <div className="flex flex-wrap gap-2">
                  {profileData.languages?.length > 0 ? profileData.languages.map((lang: any, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-[#92D8F2]/15 dark:bg-[#92D8F2]/10 text-slate-700 dark:text-[#92D8F2] border border-[#92D8F2]/40 dark:border-[#92D8F2]/25 rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1.5">
                      {lang.name}
                      {lang.level && lang.level !== 'UNKNOWN' && <span className="text-slate-500 dark:text-[#92D8F2]/70 text-[10px] ml-1">{lang.level}</span>}
                      {lang._ai_generated && <AiInfoBadge />}
                    </span>
                  )) : <span className="text-sm text-gray-400 dark:text-neutral-500 italic">{(t as any).languages?.noLang ?? 'No languages added yet'}</span>}
                </div>
              ) : (
                <div className="space-y-3">
                  {(profileData.languages || []).map((lang: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-neutral-800 rounded-xl bg-gray-50/30 dark:bg-neutral-800/30 relative">
                      <input type="text" placeholder="Language (e.g. English)" value={lang.name || ''} onChange={(e) => handleArrayChange('languages', i, 'name', e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                      <select value={lang.level || 'UNKNOWN'} onChange={(e) => handleArrayChange('languages', i, 'level', e.target.value)} className="px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white">
                        <option value="UNKNOWN">Level</option>
                        <option value="BASIC">Basic</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                        <option value="FLUENT">Fluent</option>
                        <option value="NATIVE">Native</option>
                      </select>
                      <button onClick={() => removeArrayItem('languages', i)} className="text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('languages', { name: '', level: 'UNKNOWN' })} className="w-full py-3 border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-xs font-semibold rounded-xl hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors">
                    {(t as any).languages?.addLang ?? '+ Add Language'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF906D]"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.certifications.title}</h3>
                {profileData.certifications?.some((e: any) => e._ai_generated) && <AiInfoBadge />}
              </div>
              {!isEditingCertifications ? (
                <button onClick={() => setIsEditingCertifications(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingCertifications(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#7A60F4] text-white text-xs font-semibold rounded-lg hover:bg-[#6B52E8] transition-all">{t.saveChanges}</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingCertifications ? (
                profileData.certifications?.length > 0 ? (
                  <div className="space-y-3">
                    {profileData.certifications.map((cert: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-4 border border-gray-100 dark:border-neutral-800 rounded-xl bg-gray-50/50 dark:bg-neutral-800/30">
                        <div className="w-8 h-8 rounded-lg bg-[#FF906D]/15 dark:bg-[#FF906D]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-[#c05020] dark:text-[#FF906D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">{cert.name}{cert._ai_generated && <AiInfoBadge />}</p>
                          {cert.issuer && cert.issuer.toLowerCase() !== 'unknown' && <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{cert.issuer}</p>}
                          {(cert.issue_date || cert.expiration_date) && (
                            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
                              {cert.issue_date || ''}
                              {cert.issue_date && cert.expiration_date ? ' – ' : ''}
                              {cert.expiration_date || ''}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-neutral-500 italic">{t.certifications.noCert}</p>
                )
              ) : (
                <div className="space-y-4">
                  {(profileData.certifications || []).map((cert: any, i: number) => (
                    <div key={i} className="p-5 border border-gray-200 dark:border-neutral-800 rounded-xl relative space-y-3 bg-gray-50/30 dark:bg-neutral-800/30">
                      <button onClick={() => removeArrayItem('certifications', i)} className="absolute top-4 right-4 text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.certifications.name}</label>
                          <input type="text" placeholder="e.g. AWS Solutions Architect" value={cert.name || ''} onChange={(e) => handleArrayChange('certifications', i, 'name', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.certifications.issuer}</label>
                          <input type="text" placeholder="e.g. Amazon Web Services" value={cert.issuer || ''} onChange={(e) => handleArrayChange('certifications', i, 'issuer', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.certifications.issueDate}</label>
                          <input type="text" placeholder="e.g. 2023-06" value={cert.issue_date || ''} onChange={(e) => handleArrayChange('certifications', i, 'issue_date', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.certifications.expirationDate}</label>
                          <input type="text" placeholder="e.g. 2026-06" value={cert.expiration_date || ''} onChange={(e) => handleArrayChange('certifications', i, 'expiration_date', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('certifications', { name: '', issuer: '', issue_date: '', expiration_date: '' })} className="w-full py-3 border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-xs font-semibold rounded-xl hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors">
                    {t.certifications.addCert}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#7A60F4]"></div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-widest">{t.references.title}</h3>
              </div>
              {!isEditingReferences ? (
                <button onClick={() => setIsEditingReferences(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all">
                  {t.editSection}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingReferences(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel}</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#7A60F4] text-white text-xs font-semibold rounded-lg hover:bg-[#6B52E8] transition-all">{t.saveChanges}</button>
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
                          <input type="text" placeholder="e.g. Jane Doe" value={ref.name || ''} onChange={(e) => handleArrayChange('references', i, 'name', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.company}</label>
                          <input type="text" placeholder="e.g. Google" value={ref.company || ''} onChange={(e) => handleArrayChange('references', i, 'company', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.jobTitle}</label>
                          <input type="text" placeholder="e.g. Former Manager" value={ref.title || ''} onChange={(e) => handleArrayChange('references', i, 'title', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.email}</label>
                          <input type="email" placeholder="jane@example.com" value={ref.email || ''} onChange={(e) => handleArrayChange('references', i, 'email', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{t.references.phone}</label>
                          <input type="tel" placeholder="+1 234 567 8900" value={ref.phone || ''} onChange={(e) => handleArrayChange('references', i, 'phone', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 outline-none dark:text-white" />
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

        </div>

        <div className="lg:col-span-4 space-y-6">

          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 p-6 flex flex-col items-center text-center transition-colors">
            <div className="relative mb-4 group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
              {profileData.personal_info.photo ? (
                <img src={profileData.personal_info.photo} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-[#7A60F4]/20 shadow-sm" />
              ) : (
                <div className="w-20 h-20 bg-[#7A60F4]/10 dark:bg-[#7A60F4]/15 text-[#7A60F4] rounded-full flex items-center justify-center border border-[#7A60F4]/25 shadow-sm transition-colors">
                  <span className="text-2xl font-bold">
                    {profileData.personal_info.first_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
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
                <span className="text-[10px] font-bold bg-[#7A60F4] text-white rounded px-1 py-0.5 leading-none">AI</span>
              </button>

              {/* Import from URL */}
              <button
                onClick={() => { setShowUrlImportInput(v => !v); setUrlImportValue(''); }}
                className="w-full py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 hover:border-[#7A60F4]/50 dark:hover:border-[#7A60F4]/50 text-gray-900 dark:text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-[#7A60F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {(t as any).sidebar?.importFromUrl ?? 'Import from URL'}
              </button>

              {showUrlImportInput && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl focus-within:border-[#7A60F4]/60 transition-colors">
                    <svg className="w-3.5 h-3.5 text-[#7A60F4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <input
                      type="url"
                      placeholder="https://yourname.com or github.com/..."
                      value={urlImportValue}
                      onChange={e => setUrlImportValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                      autoFocus
                      className="flex-1 bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 outline-none min-w-0"
                    />
                  </div>
                  <button
                    onClick={handleUrlImport}
                    disabled={!urlImportValue.trim() || isImportingUrl}
                    className="w-full py-2 bg-[#7A60F4] hover:bg-[#6B52E8] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isImportingUrl && (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {isImportingUrl ? ((t as any).sidebar?.importing ?? 'Importing…') : ((t as any).sidebar?.importProfile ?? 'Import profile')}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (user?.user_id) localStorage.removeItem(`hrai_onboarding_${user.user_id}`);
                setShowWizard(true);
              }}
              className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {(t as any).sidebar?.redoWizard ?? 'Redo setup wizard'}
            </button>
          </div>

          {(() => {
            const missing = getMissingKeys(profileData);
            const completed = REQUIRED_PI_FIELDS.length - missing.length;
            const total = REQUIRED_PI_FIELDS.length;
            const pct = Math.round((completed / total) * 100);
            const isComplete = missing.length === 0;
            return (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border overflow-hidden transition-colors border-[#92D8F2]/50 dark:border-[#92D8F2]/30">
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-gray-700 dark:text-white uppercase tracking-widest">{(t as any).sidebar?.profileCompleteness ?? 'Profile Completeness'}</span>
                    <span className="text-xs font-bold text-[#0e7490] dark:text-[#92D8F2]">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[#92D8F2]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isComplete ? (
                    <p className="text-xs text-[#0e7490] dark:text-[#92D8F2] font-semibold flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {(t as any).sidebar?.allComplete ?? 'All required fields complete'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[#0e7490] dark:text-[#92D8F2] font-semibold">{(t as any).sidebar?.missingFields ?? 'Missing required fields:'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {missing.map(key => {
                          const label = getFieldLabel(key);
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                setIsEditingPersonalInfo(true);
                                document.getElementById('personal-info-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className="px-2 py-1 bg-[#92D8F2]/10 dark:bg-[#92D8F2]/10 text-[#0e7490] dark:text-[#92D8F2] border border-[#92D8F2]/40 dark:border-[#92D8F2]/25 rounded-lg text-[10px] font-bold hover:bg-[#92D8F2]/20 dark:hover:bg-[#92D8F2]/20 transition-colors flex items-center gap-1"
                            >
                              <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {profileData.skills?.length === 0 && profileData.experience?.length === 0 && (
                        <p className="text-[10px] text-gray-400 dark:text-neutral-500 pt-1">{(t as any).sidebar?.addExpSkills ?? 'Also consider adding experience and skills.'}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
      <input type="file" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />

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
                className="w-4 h-4 text-gray-900 dark:text-white bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 rounded focus:ring-[#7A60F4]/50 dark:focus:ring-[#7A60F4]/50 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-neutral-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t.upload.syncProfile}</span>
            </label>
          </div>

          <div className="flex items-center gap-2 pl-4">
            <button onClick={handleCancelUpload} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t.cancel || 'Cancel'}</button>
            <button onClick={handleUploadConfirm} className="px-5 py-2 bg-[#7A60F4] text-white text-xs font-semibold rounded-xl hover:bg-[#6B52E8] transition-all shadow-sm">{t.upload.confirm}</button>
          </div>
        </div>
      )}

      {isLoading && <LoadingOverlay />}
      {isUploading && <LoadingOverlay message={t.upload.processing} />}

      {showWizard && user?.user_id && (
        <OnboardingWizard userId={user.user_id} onComplete={() => { setShowWizard(false); loadProfile(user); }} />
      )}
    </div>
  );
}