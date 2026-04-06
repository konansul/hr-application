import { useState, useRef, useEffect } from 'react';
import { documentsApi, authApi } from '../api';

export function ProfileTab() {
  const [file, setFile] = useState<File | null>(null);
  const [_uploadIntent, setUploadIntent] = useState<'profile' | 'resume' | null>(null);
  const [syncWithProfile, setSyncWithProfile] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [user, setUser] = useState<any>(null);
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);

  const [profileData, setProfileData] = useState<any>({
    personal_info: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      city: '',
      country: '',
      nationality: '',
      visa_status: 'UNKNOWN',
      work_preference: 'UNKNOWN',
      open_to_remote: false,
      open_to_relocation: false,
      linkedin_url: '',
      github_url: '',
      portfolio_url: '',
      summary: ''
    },
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: []
  });

  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [userData, docs, savedProfile] = await Promise.all([
          authApi.getMe(),
          documentsApi.getMyDocuments(),
          authApi.getProfile().catch(() => null)
        ]);

        setUser(userData);
        setResumeVersions(docs);

        if (savedProfile && savedProfile.profile_data && Object.keys(savedProfile.profile_data).length > 0) {
          setProfileData(savedProfile.profile_data);
        } else if (userData) {
          setProfileData((prev: any) => ({
            ...prev,
            personal_info: { ...prev.personal_info, email: userData.email }
          }));
        }
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
          certifications: response.parsed_data.certifications || profileData.certifications
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

  const handlePersonalInputChange = (field: string, value: any) => {
    setProfileData((prev: any) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        [field]: value
      }
    }));
  };

  const handleArrayChange = (section: 'experience' | 'education', index: number, field: string, value: any) => {
    setProfileData((prev: any) => {
      const newArray = [...prev[section]];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [section]: newArray };
    });
  };

  const addArrayItem = (section: 'experience' | 'education', template: any) => {
    setProfileData((prev: any) => ({
      ...prev,
      [section]: [...prev[section], template]
    }));
  };

  const removeArrayItem = (section: 'experience' | 'education', index: number) => {
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
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ text: 'Error saving profile to database', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex flex-col border-b border-gray-100 py-3">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || <span className="text-gray-300 italic">Not specified</span>}</span>
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto animate-in fade-in duration-300 pb-32">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Profile Dashboard</h2>
        <p className="text-sm text-gray-500">Manage your central identity and application materials.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 text-sm rounded-xl border flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : 'bg-red-50 text-red-700 border-red-100'
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

        {/* MAIN CONTENT AREA */}
        <div className="lg:col-span-8 space-y-6">

          {/* PERSONAL INFO */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Personal Information</h3>
              </div>

              {!isEditingPersonalInfo ? (
                <button
                  onClick={() => setIsEditingPersonalInfo(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all"
                >
                  Edit Section
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingPersonalInfo(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-all">Save Changes</button>
                </div>
              )}
            </div>

            <div className="p-6">
              {!isEditingPersonalInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <DetailRow label="First Name" value={profileData.personal_info.first_name} />
                  <DetailRow label="Last Name" value={profileData.personal_info.last_name} />
                  <DetailRow label="Email Address" value={profileData.personal_info.email} />
                  <DetailRow label="Phone Number" value={profileData.personal_info.phone} />
                  <DetailRow label="City" value={profileData.personal_info.city} />
                  <DetailRow label="Country" value={profileData.personal_info.country} />
                  <DetailRow label="Nationality" value={profileData.personal_info.nationality} />
                  <DetailRow label="Visa Status" value={profileData.personal_info.visa_status?.replace(/_/g, ' ')} />
                  <DetailRow label="Work Preference" value={profileData.personal_info.work_preference} />
                  <DetailRow label="LinkedIn URL" value={profileData.personal_info.linkedin_url} />

                  <div className="md:col-span-2 flex gap-6 pt-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${profileData.personal_info.open_to_remote ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs font-semibold text-gray-700">Open to Remote</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${profileData.personal_info.open_to_relocation ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs font-semibold text-gray-700">Open to Relocation</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First Name</label>
                    <input type="text" value={profileData.personal_info.first_name || ''} onChange={(e) => handlePersonalInputChange('first_name', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Name</label>
                    <input type="text" value={profileData.personal_info.last_name || ''} onChange={(e) => handlePersonalInputChange('last_name', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</label>
                    <input type="email" value={profileData.personal_info.email || ''} onChange={(e) => handlePersonalInputChange('email', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                    <input type="text" value={profileData.personal_info.phone || ''} onChange={(e) => handlePersonalInputChange('phone', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">City</label>
                    <input type="text" value={profileData.personal_info.city || ''} onChange={(e) => handlePersonalInputChange('city', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Country</label>
                    <input type="text" value={profileData.personal_info.country || ''} onChange={(e) => handlePersonalInputChange('country', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nationality</label>
                    <input type="text" value={profileData.personal_info.nationality || ''} onChange={(e) => handlePersonalInputChange('nationality', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visa Status</label>
                    <select value={profileData.personal_info.visa_status || 'UNKNOWN'} onChange={(e) => handlePersonalInputChange('visa_status', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none">
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Work Preference</label>
                    <select value={profileData.personal_info.work_preference || 'UNKNOWN'} onChange={(e) => handlePersonalInputChange('work_preference', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none">
                      <option value="ONSITE">Onsite</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="REMOTE">Remote</option>
                      <option value="FLEXIBLE">Flexible</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LinkedIn URL</label>
                    <input type="text" value={profileData.personal_info.linkedin_url || ''} onChange={(e) => handlePersonalInputChange('linkedin_url', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all outline-none" />
                  </div>

                  <div className="flex gap-6 md:col-span-2 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={profileData.personal_info.open_to_remote} onChange={(e) => handlePersonalInputChange('open_to_remote', e.target.checked)} className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900" />
                      <span className="text-sm font-semibold text-gray-900">Open to Remote</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={profileData.personal_info.open_to_relocation} onChange={(e) => handlePersonalInputChange('open_to_relocation', e.target.checked)} className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900" />
                      <span className="text-sm font-semibold text-gray-900">Open to Relocation</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* WORK EXPERIENCE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Work Experience</h3>
              </div>
              {!isEditingExperience ? (
                <button onClick={() => setIsEditingExperience(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all">
                   Edit Section
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingExperience(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-all">Save Changes</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingExperience ? (
                profileData.experience?.length > 0 ? (
                  <div className="border-l-2 border-gray-100 pl-6 space-y-8 py-2">
                    {profileData.experience.map((exp: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white" />
                        <h4 className="text-base font-bold text-gray-900">{exp.title}</h4>
                        <p className="text-xs font-semibold text-gray-500 mt-1">{exp.company} • {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</p>
                        {exp.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No experience added yet.</p>
                )
              ) : (
                <div className="space-y-4">
                  {profileData.experience.map((exp: any, i: number) => (
                    <div key={i} className="p-5 border border-gray-200 rounded-2xl relative space-y-4 bg-gray-50/30">
                      <button onClick={() => removeArrayItem('experience', i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        <input type="text" placeholder="Job Title" value={exp.title || ''} onChange={(e) => handleArrayChange('experience', i, 'title', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                        <input type="text" placeholder="Company" value={exp.company || ''} onChange={(e) => handleArrayChange('experience', i, 'company', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                        <input type="text" placeholder="Start Date (e.g. 2021-01)" value={exp.start_date || ''} onChange={(e) => handleArrayChange('experience', i, 'start_date', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                        <input type="text" placeholder="End Date or empty" value={exp.end_date || ''} onChange={(e) => handleArrayChange('experience', i, 'end_date', e.target.value)} disabled={exp.is_current} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={exp.is_current || false} onChange={(e) => handleArrayChange('experience', i, 'is_current', e.target.checked)} className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900" />
                        <span className="text-xs font-semibold text-gray-700">I currently work here</span>
                      </div>
                      <textarea placeholder="Description" value={exp.description || ''} onChange={(e) => handleArrayChange('experience', i, 'description', e.target.value)} rows={3} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none resize-none" />
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('experience', { title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' })} className="w-full py-3 border border-dashed border-gray-300 text-gray-500 text-xs font-semibold rounded-xl hover:border-gray-900 hover:text-gray-900 transition-colors">
                    + Add Experience
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* EDUCATION */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Education</h3>
              </div>
              {!isEditingEducation ? (
                <button onClick={() => setIsEditingEducation(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all">
                  Edit Section
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingEducation(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-all">Save Changes</button>
                </div>
              )}
            </div>
            <div className="p-6">
              {!isEditingEducation ? (
                profileData.education?.length > 0 ? (
                  <div className="border-l-2 border-gray-100 pl-6 space-y-8 py-2">
                    {profileData.education.map((edu: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white" />
                        <h4 className="text-base font-bold text-gray-900">{edu.institution}</h4>
                        <p className="text-xs font-semibold text-gray-500 mt-1">{edu.degree} in {edu.field_of_study} • {edu.start_date} - {edu.end_date}</p>
                        {edu.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No education added yet.</p>
                )
              ) : (
                <div className="space-y-4">
                  {profileData.education.map((edu: any, i: number) => (
                    <div key={i} className="p-5 border border-gray-200 rounded-2xl relative space-y-4 bg-gray-50/30">
                      <button onClick={() => removeArrayItem('education', i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        <input type="text" placeholder="Institution" value={edu.institution || ''} onChange={(e) => handleArrayChange('education', i, 'institution', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                        <input type="text" placeholder="Degree (e.g. Bachelor)" value={edu.degree || ''} onChange={(e) => handleArrayChange('education', i, 'degree', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                        <input type="text" placeholder="Field of Study" value={edu.field_of_study || ''} onChange={(e) => handleArrayChange('education', i, 'field_of_study', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                        <div className="flex gap-2">
                          <input type="text" placeholder="Start" value={edu.start_date || ''} onChange={(e) => handleArrayChange('education', i, 'start_date', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                          <input type="text" placeholder="End" value={edu.end_date || ''} onChange={(e) => handleArrayChange('education', i, 'end_date', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                        </div>
                      </div>
                      <textarea placeholder="Description or Achievements" value={edu.description || ''} onChange={(e) => handleArrayChange('education', i, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none resize-none" />
                    </div>
                  ))}
                  <button onClick={() => addArrayItem('education', { institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', description: '' })} className="w-full py-3 border border-dashed border-gray-300 text-gray-500 text-xs font-semibold rounded-xl hover:border-gray-900 hover:text-gray-900 transition-colors">
                    + Add Education
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SKILLS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 min-h-[64px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Skills & Expertise</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {profileData.skills?.length > 0 ? profileData.skills.map((s: any, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-gray-50 text-gray-900 border border-gray-200 rounded-lg text-xs font-semibold shadow-sm">
                    {s.name} <span className="text-gray-400 text-[10px] ml-1">{s.level}</span>
                  </span>
                )) : <span className="text-sm text-gray-400 italic">No skills added yet.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 border border-indigo-100 shadow-sm">
              <span className="text-2xl font-bold">
                {profileData.personal_info.first_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {profileData.personal_info.first_name ? `${profileData.personal_info.first_name} ${profileData.personal_info.last_name}` : 'Unknown Candidate'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">{profileData.personal_info.phone || user?.email}</p>

            <div className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
              <p className="text-xs text-gray-600 mb-3">Fill your profile to increase your chances of getting invited to interviews.</p>
              <button
                onClick={() => handleUploadClick('profile')}
                className="w-full py-2.5 bg-white border border-gray-200 hover:border-gray-900 text-gray-900 text-xs font-semibold rounded-xl transition-all shadow-sm"
              >
                Auto-fill with AI
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Resume Library</h3>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center">
                  {resumeVersions.length}
                </span>
                <button onClick={() => handleUploadClick('resume')} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>
            <div className="p-3">
              {resumeVersions.length > 0 ? (
                <div className="space-y-1">
                  {resumeVersions.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 truncate">{doc.filename || `Version_${i+1}.pdf`}</span>
                      </div>
                      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-400">No resumes uploaded.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.txt" />

      {file && !isUploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-6 animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center">
               <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Selected File</span>
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-gray-100 pl-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={syncWithProfile}
                onChange={(e) => setSyncWithProfile(e.target.checked)}
                className="w-4 h-4 text-gray-900 bg-white border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">Sync to Profile</span>
            </label>
          </div>

          <div className="flex items-center gap-2 pl-4">
            <button onClick={handleCancelUpload} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
            <button onClick={handleUploadConfirm} className="px-5 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm">Confirm Upload</button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="font-semibold text-sm text-gray-900">Processing Document...</p>
          </div>
        </div>
      )}
    </div>
  );
}