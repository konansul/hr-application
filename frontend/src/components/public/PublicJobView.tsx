import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { publicApi } from '../../api';
import { HtmlContent } from '../shared/HtmlContent';

interface PublicJobViewProps {
  jobId: string;
}

export function PublicJobView({ jobId }: PublicJobViewProps) {
  const [jobData, setJobData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [motivation, setMotivation] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openModal = () => {
    setIsModalOpen(true);
    setIsSuccess(false);
    setSubmitError(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setIsSuccess(false);
    setSubmitError(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setMotivation('');
    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCvFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await publicApi.submitPublicApplication({
        name: fullName,
        email: email,
        phone: phone || "",
        motivation: motivation || "",
        job_id: jobId,
        file: cvFile,
        position: jobData.title || "Applicant",
        salary_expectation: "Negotiable",
        education: "See CV",
        skills: "See CV",
        experience_years: "See CV"
      });

      setIsSuccess(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setSubmitError(
        typeof detail === 'string'
          ? detail
          : "Failed to submit. Please check all fields."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        const data = await publicApi.getJob(jobId);
        setJobData(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError("Job not found or link is invalid.");
        } else if (err.response?.status === 403) {
          setError("This job is no longer accepting applications.");
        } else {
          setError("Something went wrong loading the job details.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#E3F1F6]"></div>;
  }

  if (error || !jobData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#E3F1F6] px-4 text-center">
        <div className="w-20 h-20 bg-[#EDE9FF] text-[#7A60F4] rounded-full flex items-center justify-center mb-6">
           <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 max-w-md">{error}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="mt-8 px-6 py-2.5 bg-[#7A60F4] hover:bg-[#6B52E8] text-white rounded-xl text-sm font-bold transition-all"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const { title, description, region, level, requirements } = jobData;
  const reqs = requirements || {};

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  const InfoCard = ({ title, value, icon }: { title: string, value: string | null, icon: React.ReactNode }) => {
    if (!value || value === 'Any' || value === 'UNKNOWN') return null;
    return (
      <div className="bg-white border border-[#E5EAEE] rounded-2xl p-5 flex items-start gap-4 shadow-sm transition-colors">
        <div className="w-10 h-10 rounded-xl bg-[#EDE9FF] border border-[#C5BAFF] flex items-center justify-center text-[#5B52C8] shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="min-h-screen bg-[#E3F1F6] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#EDE9FF] selection:text-[#5B52C8] relative overflow-x-hidden">

      {/* aurora blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div style={{ position: 'absolute', top: -200, left: -100, width: 560, height: 560, borderRadius: '50%', background: '#7A60F4', filter: 'blur(120px)', opacity: 0.14 }} />
        <div style={{ position: 'absolute', top: 60, right: -140, width: 480, height: 480, borderRadius: '50%', background: '#9EA4FF', filter: 'blur(120px)', opacity: 0.14 }} />
        <div style={{ position: 'absolute', bottom: -160, left: '35%', width: 440, height: 440, borderRadius: '50%', background: '#92D8F2', filter: 'blur(120px)', opacity: 0.18 }} />
      </div>

      <div className="max-w-4xl mx-auto animate-in fade-in duration-700 space-y-8 relative z-10">

        {/* 1. Hero */}
        <div className="bg-white border border-[#E5EAEE] rounded-[2.5rem] shadow-sm overflow-hidden relative transition-colors">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#7A60F4]/8 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-[#92D8F2]/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 p-8 sm:p-12 lg:p-16">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-gray-200">
                {level || 'Middle'} Level
              </span>
              <span className="px-3 py-1.5 bg-[#EDE9FF] text-[#5B52C8] rounded-lg text-xs font-bold uppercase tracking-wider border border-[#C5BAFF]">
                {reqs.remoteCountryRestriction || region || 'Global Remote'}
              </span>
              {reqs.workFormat && reqs.workFormat !== 'Any' && (
                <span className="px-3 py-1.5 bg-[#EDE9FF] text-[#5B52C8] rounded-lg text-xs font-bold uppercase tracking-wider border border-[#C5BAFF]">
                  {reqs.workFormat}
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-8 leading-[1.1]">
              {title}
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <button
                onClick={openModal}
                className="w-full sm:w-auto px-8 py-4 bg-[#7A60F4] hover:bg-[#6B52E8] text-white rounded-2xl text-base font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Apply for this role
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-[#7A60F4]/40 hover:border-[#7A60F4] text-[#5B52C8] hover:bg-[#EDE9FF]/40 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Copy Link
              </button>
            </div>
          </div>
        </div>

        {/* 2. Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            title="Salary Range"
            value={reqs.salaryMin && reqs.salaryMax ? `${reqs.salaryMin} - ${reqs.salaryMax} ${reqs.currency}` : null}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <InfoCard
            title="Experience"
            value={reqs.minExperienceYears ? `${reqs.minExperienceYears}+ Years` : null}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />
          <InfoCard
            title="Timezone"
            value={reqs.timeZoneMatch}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <InfoCard
            title="Sponsorship"
            value={reqs.visaSponsorship ? 'Provided' : 'Not Provided'}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          />
        </div>

        {/* 3. Description + requirements */}
        <div className="bg-white border border-[#E5EAEE] rounded-[2.5rem] shadow-sm p-8 sm:p-12 lg:p-16 transition-colors">

          <h2 className="text-2xl font-bold text-gray-900 mb-6">About the Role</h2>
          <HtmlContent html={description} className="prose-lg text-gray-700" />

          {(reqs.mandatorySkills || reqs.mandatoryTechnologies || reqs.languageRequirements || reqs.minEducation) && (
            <hr className="my-12 border-[#EEF2F4]" />
          )}

          <div className="space-y-10">
            {reqs.mandatorySkills && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2.5">
                  {reqs.mandatorySkills.split(',').map((skill: string, i: number) => (
                    <span key={i} className="px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl text-sm font-semibold shadow-sm transition-colors hover:border-[#7A60F4]/40">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {reqs.mandatoryTechnologies && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tech Stack</h3>
                <div className="flex flex-wrap gap-2.5">
                  {reqs.mandatoryTechnologies.split(',').map((tech: string, i: number) => (
                    <span key={i} className="px-4 py-2 bg-[#EDE9FF] text-[#5B52C8] border border-[#C5BAFF] rounded-xl text-sm font-semibold shadow-sm">
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(reqs.languageRequirements || reqs.minEducation || reqs.mandatoryCertifications) && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Qualifications</h3>
                <ul className="space-y-4">
                  {reqs.languageRequirements && (
                    <li className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-[#7A60F4] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Languages</p>
                        <p className="text-sm text-gray-600">{reqs.languageRequirements}</p>
                      </div>
                    </li>
                  )}
                  {reqs.minEducation && reqs.minEducation !== 'Any' && (
                    <li className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-[#7A60F4] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Minimum Education</p>
                        <p className="text-sm text-gray-600">
                          {reqs.minEducation} {reqs.degreeField ? `in ${reqs.degreeField}` : ''}
                        </p>
                      </div>
                    </li>
                  )}
                  {reqs.mandatoryCertifications && (
                    <li className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-[#7A60F4] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Certifications</p>
                        <p className="text-sm text-gray-600">{reqs.mandatoryCertifications}</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>

    {/* APPLICATION MODAL */}
    {isModalOpen && (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={closeModal}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl border border-[#E5EAEE] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EEF2F4] flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Apply for this role</h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[320px]">{title}</p>
            </div>
            <button
              onClick={closeModal}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-[#EDE9FF] hover:text-[#5B52C8] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[75vh]">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-[#EDE9FF] rounded-full flex items-center justify-center mb-5">
                  <svg className="w-8 h-8 text-[#7A60F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h4>
                <p className="text-sm text-gray-500 max-w-xs">Thank you! We've received your application and will be in touch soon.</p>
                <button
                  onClick={closeModal}
                  className="mt-8 px-6 py-2.5 bg-[#7A60F4] hover:bg-[#6B52E8] text-white rounded-xl text-sm font-bold transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {submitError && (
                  <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium">
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone <span className="normal-case font-normal">(optional)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Motivation Letter <span className="normal-case font-normal">(optional)</span></label>
                  <textarea
                    value={motivation}
                    onChange={e => setMotivation(e.target.value)}
                    placeholder="Why are you a great fit for this role?"
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none resize-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">CV / Resume *</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${cvFile ? 'border-[#7A60F4]/60 bg-[#EDE9FF]/40' : 'border-gray-200 bg-gray-50 hover:border-[#7A60F4]/40 hover:bg-[#EDE9FF]/20'}`}
                  >
                    {cvFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-[#7A60F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-sm font-semibold text-[#5B52C8] truncate max-w-[240px]">{cvFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-6 h-6 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="text-sm font-semibold text-gray-500">Click to upload <span className="text-gray-900">PDF or DOCX</span></p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !cvFile}
                  className="w-full py-3.5 bg-[#7A60F4] hover:bg-[#6B52E8] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Submitting...
                    </>
                  ) : 'Submit Application'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
