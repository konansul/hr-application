import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { publicApi } from '../../api';
import { HtmlContent } from '../shared/HtmlContent';
import { HraiLogo } from '../shared/HraiLogo';

interface PublicJobViewProps {
  jobId: string;
}

function CardHead({ label, pill, pillBg, pillFg, pillBorder }: {
  label: string; pill?: string;
  pillBg?: string; pillFg?: string; pillBorder?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EEF2F4]">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2F2F2F]">{label}</span>
      {pill && pillBg && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={{ background: pillBg, color: pillFg, borderColor: pillBorder, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' }}
        >
          {pill}
        </span>
      )}
    </div>
  );
}

export function PublicJobView({ jobId }: PublicJobViewProps) {
  const [jobData, setJobData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [motivation, setMotivation] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openModal = () => { setIsModalOpen(true); setIsSuccess(false); setSubmitError(null); };
  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false); setIsSuccess(false); setSubmitError(null);
    setFullName(''); setEmail(''); setPhone(''); setMotivation(''); setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { setCvFile(e.target.files?.[0] || null); };
  const handleCopyLink = () => { navigator.clipboard.writeText(window.location.href); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) return;
    setIsSubmitting(true); setSubmitError(null);
    try {
      await publicApi.submitPublicApplication({
        name: fullName, email, phone: phone || '', motivation: motivation || '',
        job_id: jobId, file: cvFile, position: jobData.title || 'Applicant',
        salary_expectation: 'Negotiable', education: 'See CV', skills: 'See CV', experience_years: 'See CV',
      });
      setIsSuccess(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setSubmitError(typeof detail === 'string' ? detail : 'Failed to submit. Please check all fields.');
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
        if (err.response?.status === 404) setError('Job not found or link is invalid.');
        else if (err.response?.status === 403) setError('This job is no longer accepting applications.');
        else setError('Something went wrong loading the job details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafcff] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-[#C5BAFF] border-t-[#7A60F4] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className="min-h-screen bg-[#fafcff] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#6B7785]">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: '#7A60F4' }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const { title, description, region, level, requirements } = jobData;
  const reqs = requirements || {};

  return (
    <>
      <div
        className="min-h-screen relative overflow-x-hidden"
        style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif', background: '#fafcff', color: '#2F2F2F' }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        `}</style>

        {/* aurora blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none print:hidden" aria-hidden="true">
          <div style={{ position: 'absolute', top: -240, left: -120, width: 600, height: 600, borderRadius: '50%', background: '#7A60F4', filter: 'blur(160px)', opacity: 0.35 }} />
          <div style={{ position: 'absolute', top: 40, right: -160, width: 520, height: 520, borderRadius: '50%', background: '#29C5F6', filter: 'blur(160px)', opacity: 0.65 }} />
          <div style={{ position: 'absolute', top: 360, left: '38%', width: 420, height: 420, borderRadius: '50%', background: '#9EA4FF', filter: 'blur(120px)', opacity: 0.35 }} />
        </div>

        {/* ── hero ── */}
        <section className="relative max-w-[1100px] mx-auto px-8 pt-12 pb-5">
          <div className="flex gap-6 items-start mb-5">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-4">
                {level && (
                  <span className="inline-flex items-center text-xs font-semibold bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563]">
                    {level} Level
                  </span>
                )}
                {(reqs.remoteCountryRestriction || region) && (
                  <span className="inline-flex items-center text-xs font-semibold bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563]">
                    {reqs.remoteCountryRestriction || region}
                  </span>
                )}
                {reqs.workFormat && reqs.workFormat !== 'Any' && (
                  <span className="inline-flex items-center text-xs font-semibold bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563]">
                    {reqs.workFormat}
                  </span>
                )}
              </div>
              <h1 className="font-bold leading-[1.05] text-[#2F2F2F]" style={{ fontSize: 38, letterSpacing: '-0.03em' }}>
                {title}
              </h1>
            </div>
            <div className="shrink-0 ml-auto">
              <HraiLogo height={90} />
            </div>
          </div>

          {/* CTA bar */}
          <div
            className="flex items-center justify-between bg-white border border-[#E5EAEE] rounded-[18px] py-3 pl-5 pr-3.5"
            style={{ boxShadow: '0 20px 40px -24px rgba(47,47,47,0.18)' }}
          >
            <span className="text-sm font-semibold text-[#2F2F2F]">Interested in this role?</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-[11px] border border-[#E5EAEE] bg-white text-[#4B5563] hover:border-[#7A60F4] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Copy Link
              </button>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-1.5 text-white text-[12.5px] font-semibold px-3 py-2 rounded-[11px] transition-all hover:opacity-90"
                style={{ background: '#7A60F4' }}
              >
                Apply for this role
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── body ── */}
        <main className="relative max-w-[1100px] mx-auto px-8 py-5 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">

            {/* LEFT */}
            <div className="flex flex-col gap-4">

              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="About the Role" />
                <div className="px-4 py-4 text-[14px] leading-relaxed text-[#2F2F2F]">
                  <HtmlContent html={description} className="prose-sm" />
                </div>
              </article>

              {(reqs.mandatorySkills || reqs.mandatoryTechnologies || reqs.languageRequirements || (reqs.minEducation && reqs.minEducation !== 'Any') || reqs.mandatoryCertifications) && (
                <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                  <CardHead label="Requirements" />
                  <div className="px-4 py-4 space-y-5">

                    {reqs.mandatorySkills && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7785] mb-2">Required Skills</div>
                        <div className="flex flex-wrap gap-1.5">
                          {reqs.mandatorySkills.split(',').map((s: string, i: number) => (
                            <span key={i} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border bg-[#F3F6F8] text-[#2F2F2F] border-[#E5EAEE]">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {reqs.mandatoryTechnologies && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7785] mb-2">Tech Stack</div>
                        <div className="flex flex-wrap gap-1.5">
                          {reqs.mandatoryTechnologies.split(',').map((t: string, i: number) => (
                            <span key={i} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(reqs.languageRequirements || (reqs.minEducation && reqs.minEducation !== 'Any') || reqs.mandatoryCertifications) && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B7785] mb-2">Additional Qualifications</div>
                        <div className="space-y-2">
                          {reqs.languageRequirements && (
                            <div className="flex items-start gap-2.5">
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[6px]" style={{ background: '#7A60F4' }} />
                              <span className="text-[13px] text-[#2F2F2F]"><strong>Languages:</strong> {reqs.languageRequirements}</span>
                            </div>
                          )}
                          {reqs.minEducation && reqs.minEducation !== 'Any' && (
                            <div className="flex items-start gap-2.5">
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[6px]" style={{ background: '#7A60F4' }} />
                              <span className="text-[13px] text-[#2F2F2F]"><strong>Education:</strong> {reqs.minEducation}{reqs.degreeField ? ` in ${reqs.degreeField}` : ''}</span>
                            </div>
                          )}
                          {reqs.mandatoryCertifications && (
                            <div className="flex items-start gap-2.5">
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[6px]" style={{ background: '#7A60F4' }} />
                              <span className="text-[13px] text-[#2F2F2F]"><strong>Certifications:</strong> {reqs.mandatoryCertifications}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )}
            </div>

            {/* RIGHT */}
            <div className="flex flex-col gap-4">

              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="Job Details" />

                {reqs.salaryMin && reqs.salaryMax && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4]">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7785]">Salary</div>
                      <div className="text-[12.5px] font-bold text-[#2F2F2F]">{reqs.salaryMin} – {reqs.salaryMax} {reqs.currency}</div>
                    </div>
                  </div>
                )}

                {reqs.minExperienceYears && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4]">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7785]">Experience</div>
                      <div className="text-[12.5px] font-bold text-[#2F2F2F]">{reqs.minExperienceYears}+ Years</div>
                    </div>
                  </div>
                )}

                {reqs.timeZoneMatch && reqs.timeZoneMatch !== 'Any' && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4]">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7785]">Timezone</div>
                      <div className="text-[12.5px] font-bold text-[#2F2F2F]">{reqs.timeZoneMatch}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4]">
                  <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7785]">Visa Sponsorship</div>
                    <div className="text-[12.5px] font-bold text-[#2F2F2F]">{reqs.visaSponsorship ? 'Provided' : 'Not Provided'}</div>
                  </div>
                </div>
              </article>

              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="Ready to Apply?" />
                <div className="px-4 py-4 space-y-2">
                  <button
                    onClick={openModal}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-white text-[13px] font-semibold px-3 py-2.5 rounded-[11px] transition-all hover:opacity-90"
                    style={{ background: '#7A60F4' }}
                  >
                    Apply for this role
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold px-3 py-2.5 rounded-[11px] border border-[#E5EAEE] bg-white text-[#4B5563] hover:border-[#7A60F4] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Copy Link
                  </button>
                </div>
              </article>

            </div>
          </div>
        </main>

        <footer className="relative text-center text-[11px] text-[#9CA3AF] py-6 pb-8 tracking-wider">
          Shared via HRAIPP · Read-only public link
        </footer>
      </div>

      {/* APPLICATION MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-[#E5EAEE] w-full max-w-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[#EEF2F4] flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#2F2F2F]">Apply for this role</h3>
                <p className="text-sm text-[#6B7785] mt-0.5 truncate max-w-[320px]">{title}</p>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-[#6B7785] hover:bg-[#EDE9FF] hover:text-[#5B52C8] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: '#EDE9FF' }}>
                    <svg className="w-8 h-8" style={{ color: '#7A60F4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-xl font-bold text-[#2F2F2F] mb-2">Application Submitted!</h4>
                  <p className="text-sm text-[#6B7785] max-w-xs">Thank you! We've received your application and will be in touch soon.</p>
                  <button onClick={closeModal} className="mt-8 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: '#7A60F4' }}>
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {submitError && (
                    <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium">{submitError}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7785] uppercase tracking-wider mb-1.5">Full Name *</label>
                      <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith"
                        className="w-full px-4 py-2.5 text-sm bg-[#F3F6F8] border border-[#E5EAEE] rounded-xl text-[#2F2F2F] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#6B7785] uppercase tracking-wider mb-1.5">Email *</label>
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com"
                        className="w-full px-4 py-2.5 text-sm bg-[#F3F6F8] border border-[#E5EAEE] rounded-xl text-[#2F2F2F] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7785] uppercase tracking-wider mb-1.5">Phone <span className="normal-case font-normal">(optional)</span></label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000"
                      className="w-full px-4 py-2.5 text-sm bg-[#F3F6F8] border border-[#E5EAEE] rounded-xl text-[#2F2F2F] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7785] uppercase tracking-wider mb-1.5">Motivation Letter <span className="normal-case font-normal">(optional)</span></label>
                    <textarea value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Why are you a great fit for this role?" rows={4}
                      className="w-full px-4 py-2.5 text-sm bg-[#F3F6F8] border border-[#E5EAEE] rounded-xl text-[#2F2F2F] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#7A60F4]/40 focus:border-[#7A60F4]/60 outline-none resize-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7785] uppercase tracking-wider mb-1.5">CV / Resume *</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${cvFile ? 'border-[#7A60F4]/60 bg-[#EDE9FF]/40' : 'border-[#E5EAEE] bg-[#F3F6F8] hover:border-[#7A60F4]/40 hover:bg-[#EDE9FF]/20'}`}
                    >
                      {cvFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" style={{ color: '#7A60F4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-sm font-semibold truncate max-w-[240px]" style={{ color: '#5B52C8' }}>{cvFile.name}</span>
                        </div>
                      ) : (
                        <div>
                          <svg className="w-6 h-6 text-[#6B7785] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          <p className="text-sm font-semibold text-[#6B7785]">Click to upload <span className="text-[#2F2F2F]">PDF or DOCX</span></p>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !cvFile}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: '#7A60F4' }}
                  >
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
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
