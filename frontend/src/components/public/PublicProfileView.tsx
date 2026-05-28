import { useEffect, useState } from 'react';
import { publicApi } from '../../api';
import { HraiLogo } from '../shared/HraiLogo';

interface PublicCvViewProps {
  slug: string;
}

function initials(first?: string, last?: string) {
  return [(first || '').charAt(0), (last || '').charAt(0)].filter(Boolean).join('').toUpperCase() || '?';
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

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
function LocationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function CapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9l9-5 9 5-9 5-9-5zM6 11v4a6 6 0 0012 0v-4M21 9v6" />
    </svg>
  );
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
        if (err.response?.status === 404) setError('Profile not found or link is invalid.');
        else if (err.response?.status === 403) setError('This profile is private.');
        else setError('Something went wrong loading the profile.');
      }
    };
    fetchProfile();
  }, [slug]);

  if (error) {
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

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#fafcff] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-[#C5BAFF] border-t-[#7A60F4] rounded-full animate-spin" />
      </div>
    );
  }

  const { first_name, last_name, profile_data } = profileData;
  const pInfo = profile_data?.personal_info || {};
  const experience: any[] = profile_data?.experience || [];
  const education: any[]  = profile_data?.education  || [];
  const skills: any[]     = profile_data?.skills     || [];
  const references: any[] = profile_data?.references || [];

  const fullName = [first_name || pInfo.first_name, last_name || pInfo.last_name].filter(Boolean).join(' ') || 'Candidate';

  function dateRange(item: any) {
    const s = item.start_date || '';
    const e = item.is_current ? 'Present' : (item.end_date || '');
    return [s, e].filter(Boolean).join(' – ');
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif', background: '#fafcff', color: '#2F2F2F' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      `}</style>

      {/* aurora blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div style={{ position: 'absolute', top: -240, left: -120, width: 600, height: 600, borderRadius: '50%', background: '#7A60F4', filter: 'blur(160px)', opacity: 0.35 }} />
        <div style={{ position: 'absolute', top: 40, right: -160, width: 520, height: 520, borderRadius: '50%', background: '#29C5F6', filter: 'blur(160px)', opacity: 0.65 }} />
        <div style={{ position: 'absolute', top: 360, left: '38%', width: 420, height: 420, borderRadius: '50%', background: '#9EA4FF', filter: 'blur(120px)', opacity: 0.35 }} />
      </div>

      {/* ── hero ── */}
      <section className="relative max-w-[1100px] mx-auto px-8 pt-12 pb-5">
        <div className="flex gap-6 items-center mb-5">

          {/* avatar */}
          <div
            className="w-24 h-24 rounded-[22px] flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7A60F4 0%, #9EA4FF 100%)', boxShadow: '0 16px 40px -16px rgba(122,96,244,0.45)' }}
          >
            {pInfo.photo ? (
              <img src={pInfo.photo} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-white tracking-tight">{initials(first_name || pInfo.first_name, last_name || pInfo.last_name)}</span>
            )}
          </div>

          {/* name + title + chips */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold leading-[1.05] mb-1 text-[#2F2F2F]" style={{ fontSize: 38, letterSpacing: '-0.03em' }}>
              {fullName}
            </h1>
            {pInfo.title && (
              <p className="text-[14px] font-semibold mb-2" style={{ color: '#7A60F4' }}>{pInfo.title}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(pInfo.city || pInfo.country) && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563]">
                  <LocationIcon className="w-3.5 h-3.5 shrink-0" />
                  {[pInfo.city, pInfo.country].filter(Boolean).join(', ')}
                </span>
              )}
              {pInfo.email && (
                <a href={`mailto:${pInfo.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563] hover:border-[#7A60F4] transition-colors">
                  <EmailIcon className="w-3.5 h-3.5 shrink-0" />{pInfo.email}
                </a>
              )}
              {pInfo.open_to_remote && (
                <span className="inline-flex items-center text-xs font-medium bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563]">
                  Remote ✓
                </span>
              )}
              {pInfo.open_to_relocation && (
                <span className="inline-flex items-center text-xs font-medium bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563]">
                  Relocation ✓
                </span>
              )}
            </div>
          </div>

          {/* logo */}
          <div className="shrink-0 ml-auto">
            <HraiLogo height={90} />
          </div>
        </div>

        {/* CTA bar */}
        <div
          className="flex items-center justify-between bg-white border border-[#E5EAEE] rounded-[18px] py-3 pl-5 pr-3.5"
          style={{ boxShadow: '0 20px 40px -24px rgba(47,47,47,0.18)' }}
        >
          <span className="text-sm font-semibold text-[#2F2F2F]">Candidate Profile</span>
          <div className="flex items-center gap-1.5">
            {pInfo.linkedin_url && (
              <a
                href={pInfo.linkedin_url.startsWith('http') ? pInfo.linkedin_url : `https://${pInfo.linkedin_url}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-[11px] border border-[#7A60F4] bg-[#7A60F4] text-white hover:bg-[#6B52E8] hover:border-[#6B52E8] transition-colors"
              >
                <LinkedInIcon className="w-3.5 h-3.5" />LinkedIn
              </a>
            )}
            {pInfo.email && (
              <a
                href={`mailto:${pInfo.email}`}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-[11px] border border-[#7A60F4] bg-[#7A60F4] text-white hover:bg-[#6B52E8] hover:border-[#6B52E8] transition-colors"
              >
                <EmailIcon className="w-3.5 h-3.5" />Contact
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── body ── */}
      <main className="relative max-w-[1100px] mx-auto px-8 py-5 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">

          {/* LEFT */}
          <div className="flex flex-col gap-4">

            {/* Summary */}
            {pInfo.summary && (
              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="About" />
                <p className="px-4 py-4 text-[15px] leading-relaxed text-[#2F2F2F]">{pInfo.summary}</p>
              </article>
            )}

            {/* Experience */}
            {experience.length > 0 && (
              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="Experience" pill={`${experience.length} ROLES`} pillBg="#EDE9FF" pillFg="#5B52C8" pillBorder="#C5BAFF" />
                <div className="px-4 pt-1 pb-2">
                  {experience.map((exp: any, i: number) => (
                    <div key={i} className="flex gap-3 pt-3">
                      <div className="w-3.5 flex flex-col items-center shrink-0 pt-1">
                        <div className="w-3 h-3 rounded-full bg-white border-2 shrink-0" style={{ borderColor: '#7A60F4', boxShadow: '0 0 0 3px rgba(122,96,244,0.12)' }} />
                        {i < experience.length - 1 && (
                          <div className="w-0.5 flex-1 mt-1 min-h-[24px]" style={{ background: 'linear-gradient(180deg, #C5BAFF 0%, #F3F6F8 100%)' }} />
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 pb-3 ${i < experience.length - 1 ? 'border-b border-[#EEF2F4]' : ''}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="text-sm font-bold text-[#2F2F2F]">{exp.title || 'Role'}</div>
                            {exp.company && <div className="text-[12.5px] font-semibold mt-0.5" style={{ color: '#7A60F4' }}>{exp.company}</div>}
                          </div>
                          {dateRange(exp) && (
                            <span className="text-[10.5px] text-[#6B7785] bg-[#F3F6F8] border border-[#E5EAEE] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              {dateRange(exp)}
                            </span>
                          )}
                        </div>
                        {exp.description && (
                          <p className="text-[13px] leading-relaxed text-[#4B5563] mt-1.5 whitespace-pre-wrap">{exp.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {/* Education */}
            {education.length > 0 && (
              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="Education" pill="EDU" pillBg="#E6E8FF" pillFg="#4A55C9" pillBorder="#D2D6FF" />
                {education.map((edu: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-t border-[#EEF2F4]">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5" style={{ background: '#E6E8FF', color: '#4A55C9', borderColor: '#D2D6FF' }}>
                      <CapIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[#2F2F2F]">{edu.degree || 'Degree'}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</div>
                      {edu.institution && <div className="text-[11.5px] text-[#6B7785] mt-0.5">{edu.institution}</div>}
                      {edu.description && <p className="text-[12px] text-[#4B5563] mt-1 leading-relaxed">{edu.description}</p>}
                    </div>
                    {(edu.start_date || edu.end_date) && (
                      <div className="text-[10.5px] text-[#6B7785] whitespace-nowrap shrink-0 mt-0.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {[edu.start_date, edu.end_date].filter(Boolean).join(' – ')}
                      </div>
                    )}
                  </div>
                ))}
              </article>
            )}

            {/* References */}
            {references.length > 0 && (
              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="References" pill={String(references.length)} pillBg="#F3F6F8" pillFg="#6B7785" pillBorder="#E5EAEE" />
                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {references.map((ref: any, i: number) => (
                    <div key={i} className="p-3 border border-[#EEF2F4] rounded-xl bg-[#F3F6F8]/50">
                      <div className="text-[13px] font-bold text-[#2F2F2F]">{ref.name}</div>
                      <div className="text-[11.5px] text-[#6B7785] mt-0.5">{ref.title}{ref.company ? ` · ${ref.company}` : ''}</div>
                      <div className="mt-2 pt-2 border-t border-[#EEF2F4] space-y-1">
                        {ref.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7785]">
                            <EmailIcon className="w-3 h-3 shrink-0" />{ref.email}
                          </div>
                        )}
                        {ref.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7785]">
                            <PhoneIcon className="w-3 h-3 shrink-0" />{ref.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4">

            {/* Contact */}
            {(pInfo.email || pInfo.phone || pInfo.linkedin_url) && (
              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="Contact" />
                {pInfo.email && (
                  <a href={`mailto:${pInfo.email}`} className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline transition-colors hover:bg-[#F3F6F8]">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                      <EmailIcon className="w-3.5 h-3.5" />
                    </div>
                    {pInfo.email}
                  </a>
                )}
                {pInfo.phone && (
                  <a href={`tel:${pInfo.phone}`} className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline transition-colors hover:bg-[#F3F6F8]">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                      <PhoneIcon className="w-3.5 h-3.5" />
                    </div>
                    {pInfo.phone}
                  </a>
                )}
                {pInfo.linkedin_url && (
                  <a href={pInfo.linkedin_url.startsWith('http') ? pInfo.linkedin_url : `https://${pInfo.linkedin_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline transition-colors hover:bg-[#F3F6F8]">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                      <LinkedInIcon className="w-3.5 h-3.5" />
                    </div>
                    LinkedIn
                  </a>
                )}
              </article>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="Skills" pill={String(skills.length)} pillBg="#F3F6F8" pillFg="#6B7785" pillBorder="#E5EAEE" />
                <div className="flex flex-wrap gap-1.5 px-4 py-3">
                  {skills.map((s: any, i: number) => (
                    <span key={i} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#EDE9FF', color: '#5B52C8', borderColor: '#C5BAFF' }}>
                      {s.name || s}{s.level ? ` · ${s.level}` : ''}
                    </span>
                  ))}
                </div>
              </article>
            )}

            {/* Personal Info */}
            <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
              <CardHead label="Personal Info" />
              {[
                { label: 'Nationality', value: pInfo.nationality },
                { label: 'Visa Status', value: pInfo.visa_status?.replace(/_/g, ' ') },
                { label: 'Work Preference', value: pInfo.work_preference },
              ].filter(r => r.value && r.value !== 'UNKNOWN').map((row, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-t border-[#EEF2F4]">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B7785]">{row.label}</span>
                  <span className="text-[12.5px] font-semibold text-[#2F2F2F]">{row.value}</span>
                </div>
              ))}
            </article>

          </div>
        </div>
      </main>

      <footer className="relative text-center text-[11px] text-[#9CA3AF] py-6 pb-8 tracking-wider">
        Shared via HRAIPP · Read-only public link
      </footer>
    </div>
  );
}
