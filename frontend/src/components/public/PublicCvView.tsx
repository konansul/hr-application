import { useEffect, useRef, useState } from 'react';
import { resumesApi } from '../../api';
import { generateResumePdfBlob } from '../candidate/2. Resumes/ResumePdfTemplates.tsx';

const skillName = (s: any) => (typeof s === 'string' ? s : s?.name || '');
const langName  = (l: any) => (typeof l === 'string' ? l : l?.name || l?.language || '');
const certName  = (c: any) => (typeof c === 'string' ? c : c?.name || c?.title || '');

function initials(first?: string, last?: string) {
  return [(first || '').charAt(0), (last || '').charAt(0)].filter(Boolean).join('').toUpperCase() || '?';
}

function dateRange(exp: any) {
  const s = exp.start_date || '';
  const e = exp.end_date || 'Present';
  return s ? `${s} – ${e}` : '';
}

/* ─── icons ──────────────────────────────────────────────────────────────── */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
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
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
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
function CertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l9 5-9 5-9-5 9-5zm-7 7.5V14a7 7 0 0014 0v-3.5M12 13v7l3 1-1.5-2.5 2-1L12 13z" />
    </svg>
  );
}

/* ─── card heading ────────────────────────────────────────────────────────── */
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

/* ─── main ────────────────────────────────────────────────────────────────── */
export function PublicCvView({ token }: { token: string }) {
  const [cv, setCv] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resumesApi.getPublicResume(token)
      .then(setCv)
      .catch(() => setError('This CV link is invalid or has been revoked.'));
  }, [token]);

  useEffect(() => {
    if (!cv) return;
    const ids = ['about', 'experience', 'education', 'skills', 'languages', 'contact'];
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }); },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [cv]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#E3F1F6] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#6B7785]">{error}</p>
        </div>
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="min-h-screen bg-[#E3F1F6] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-[#FFCDB9] border-t-[#FC5B26] rounded-full animate-spin" />
      </div>
    );
  }

  const d = cv.resume_data ?? {};
  const info: any         = d.personal_info    ?? {};
  const experience: any[] = d.experience       ?? [];
  const education: any[]  = d.education        ?? [];
  const skills: any[]     = d.skills           ?? [];
  const languages: any[]  = d.languages        ?? [];
  const certs: any[]      = d.certifications   ?? [];

  const fullName = [info.first_name, info.last_name].filter(Boolean).join(' ') || 'Resume';
  const hasPhoto = !!info.photo;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateResumePdfBlob('classic', d, cv.title, info.photo ?? undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cv.title || fullName}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setIsDownloading(false);
    }
  };

  const navItems = [
    { id: 'about',      label: 'About',      show: !!info.summary },
    { id: 'experience', label: 'Experience',  show: experience.length > 0 },
    { id: 'education',  label: 'Education',   show: education.length > 0 },
    { id: 'skills',     label: 'Skills',      show: skills.length > 0 },
    { id: 'languages',  label: 'Languages',   show: languages.length > 0 },
    { id: 'contact',    label: 'Contact',     show: !!(info.email || info.phone || info.linkedin_url || info.github_url || info.portfolio_url) },
  ].filter(n => n.show);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden print:bg-white"
      style={{ fontFamily: '"Overused Grotesk", "Inter", system-ui, sans-serif', background: '#E3F1F6', color: '#2F2F2F' }}
    >
      {/* font imports */}
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=overused-grotesk@400,500,600,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
      `}</style>

      {/* aurora blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none print:hidden" aria-hidden="true">
        <div style={{ position: 'absolute', top: -240, left: -120, width: 600, height: 600, borderRadius: '50%', background: '#FF906D', filter: 'blur(120px)', opacity: 0.18 }} />
        <div style={{ position: 'absolute', top: 40, right: -160, width: 520, height: 520, borderRadius: '50%', background: '#9EA4FF', filter: 'blur(120px)', opacity: 0.18 }} />
        <div style={{ position: 'absolute', top: 360, left: '38%', width: 420, height: 420, borderRadius: '50%', background: '#92D8F2', filter: 'blur(120px)', opacity: 0.22 }} />
      </div>

      {/* ── hero ──────────────────────────────────────────────────────────── */}
      <section className="relative max-w-[1100px] mx-auto px-8 pt-12 pb-5">

        {/* avatar + name row */}
        <div className="flex gap-6 items-center mb-5">

          {/* avatar */}
          <div
            className="w-24 h-24 rounded-[22px] flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #FC5B26 0%, #FF906D 100%)', boxShadow: '0 16px 40px -16px rgba(252,91,38,0.45)' }}
          >
            {hasPhoto ? (
              <img src={info.photo} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-white tracking-tight">{initials(info.first_name, info.last_name)}</span>
            )}
          </div>

          {/* name + title + chips */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold leading-[1.05] mb-1 text-[#2F2F2F]" style={{ fontSize: 38, letterSpacing: '-0.03em' }}>
              {fullName}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {(info.city || info.country) && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563]">
                  <LocationIcon className="w-3.5 h-3.5 shrink-0" />
                  {[info.city, info.country].filter(Boolean).join(', ')}
                </span>
              )}
              {info.email && (
                <a href={`mailto:${info.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563] hover:border-[#FC5B26] transition-colors">
                  <EmailIcon className="w-3.5 h-3.5 shrink-0" />{info.email}
                </a>
              )}
              {info.phone && (
                <a href={`tel:${info.phone}`} className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-[#E5EAEE] px-2.5 py-1 rounded-full text-[#4B5563] hover:border-[#FC5B26] transition-colors">
                  <PhoneIcon className="w-3.5 h-3.5 shrink-0" />{info.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* CTA bar */}
        <div
          className="flex items-center justify-between bg-white border border-[#E5EAEE] rounded-[18px] py-3 pl-5 pr-3.5 print:hidden"
          style={{ boxShadow: '0 20px 40px -24px rgba(47,47,47,0.18)' }}
        >
          <span className="text-sm font-semibold text-[#2F2F2F]">Take this with you</span>
          <div className="flex items-center gap-1.5">
            {info.linkedin_url && (
              <a
                href={info.linkedin_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-[11px] border border-[#E5EAEE] bg-[#F3F6F8] text-[#2F2F2F] hover:bg-[#E5EAEE] transition-colors"
              >
                <LinkedInIcon className="w-3.5 h-3.5" />LinkedIn
              </a>
            )}
            {info.github_url && (
              <a
                href={info.github_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-[11px] border border-[#E5EAEE] bg-[#F3F6F8] text-[#2F2F2F] hover:bg-[#E5EAEE] transition-colors"
              >
                <GitHubIcon className="w-3.5 h-3.5" />GitHub
              </a>
            )}
            {info.portfolio_url && (
              <a
                href={info.portfolio_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-[11px] border border-[#E5EAEE] bg-[#F3F6F8] text-[#2F2F2F] hover:bg-[#E5EAEE] transition-colors"
              >
                <GlobeIcon className="w-3.5 h-3.5" />Portfolio
              </a>
            )}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 text-white text-[13.5px] font-bold px-4 py-2.5 rounded-[11px] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #FC5B26 0%, #FF7A48 100%)', boxShadow: '0 10px 24px -8px rgba(252,91,38,0.55), inset 0 1px 0 rgba(255,255,255,0.25)' }}
            >
              {isDownloading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                : <><DownloadIcon className="w-[18px] h-[18px]" />Download CV</>}
            </button>
          </div>
        </div>
      </section>

      {/* ── tab nav ───────────────────────────────────────────────────────── */}
      <nav ref={navRef} className="sticky top-0 z-30 bg-white border-t border-b border-[#E5EAEE] mt-4 print:hidden">
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="flex items-center overflow-x-auto gap-0.5">
            {navItems.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="px-3 py-3 text-[13px] whitespace-nowrap border-b-2 -mb-px transition-colors"
                style={activeSection === id
                  ? { color: '#FC5B26', borderColor: '#FC5B26', fontWeight: 700 }
                  : { color: '#6B7785', borderColor: 'transparent', fontWeight: 500 }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── body ──────────────────────────────────────────────────────────── */}
      <main className="relative max-w-[1100px] mx-auto px-8 py-5 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">

          {/* LEFT: About + Experience + Education */}
          <div className="flex flex-col gap-4">

            {info.summary && (
              <article id="about" className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
                <CardHead label="About" />
                <p className="px-4 py-4 text-[14.5px] leading-relaxed text-[#4B5563]">{info.summary}</p>
              </article>
            )}

            {experience.length > 0 && (
              <article id="experience" className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
                <CardHead label="Experience" pill={`${experience.length} ROLES`} pillBg="#DBEFF8" pillFg="#1B6A8A" pillBorder="#BFE3F2" />
                <div className="px-4 pt-1 pb-2">
                  {experience.map((exp: any, i: number) => (
                    <div key={i} className="flex gap-3 pt-3">
                      <div className="w-3.5 flex flex-col items-center shrink-0 pt-1">
                        <div
                          className="w-3 h-3 rounded-full bg-white border-2 border-[#FC5B26] shrink-0"
                          style={{ boxShadow: '0 0 0 3px rgba(252,91,38,0.12)' }}
                        />
                        {i < experience.length - 1 && (
                          <div className="w-0.5 flex-1 mt-1 min-h-[24px]" style={{ background: 'linear-gradient(180deg, #FFCDB9 0%, #F3F6F8 100%)' }} />
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 pb-3 ${i < experience.length - 1 ? 'border-b border-[#EEF2F4]' : ''}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="text-sm font-bold text-[#2F2F2F]">{exp.title || 'Role'}</div>
                            {exp.company && <div className="text-[12.5px] font-semibold mt-0.5" style={{ color: '#FC5B26' }}>{exp.company}</div>}
                          </div>
                          {dateRange(exp) && (
                            <span
                              className="text-[10.5px] text-[#6B7785] bg-[#F3F6F8] border border-[#E5EAEE] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                              style={{ fontFamily: '"JetBrains Mono", monospace' }}
                            >
                              {dateRange(exp)}
                            </span>
                          )}
                        </div>
                        {exp.description && <p className="text-[12.5px] leading-relaxed text-[#4B5563] mt-1.5">{exp.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {education.length > 0 && (
              <article id="education" className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
                <CardHead label="Education" pill="EDU" pillBg="#E6E8FF" pillFg="#4A55C9" pillBorder="#D2D6FF" />
                {education.map((edu: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-[#EEF2F4]">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: '#E6E8FF', color: '#4A55C9', borderColor: '#D2D6FF' }}>
                      <CapIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[#2F2F2F]">{edu.degree || 'Degree'}</div>
                      {edu.institution && <div className="text-[11.5px] text-[#6B7785] mt-0.5">{edu.institution}</div>}
                    </div>
                    {(edu.start_date || edu.end_date) && (
                      <div className="text-[10.5px] text-[#6B7785] whitespace-nowrap shrink-0" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {[edu.start_date, edu.end_date].filter(Boolean).join(' – ')}
                      </div>
                    )}
                  </div>
                ))}
              </article>
            )}

          </div>

          {/* RIGHT: Skills + Languages + Certifications + Contact */}
          <div className="flex flex-col gap-4">

            {skills.length > 0 && (
              <article id="skills" className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
                <CardHead label="Skills" pill={String(skills.length)} pillBg="#F3F6F8" pillFg="#6B7785" pillBorder="#E5EAEE" />
                <div className="flex flex-wrap gap-1.5 px-4 py-3">
                  {skills.map((s: any, i: number) => (
                    <span key={i} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#DBEFF8', color: '#1B6A8A', borderColor: '#BFE3F2' }}>
                      {skillName(s)}
                    </span>
                  ))}
                </div>
              </article>
            )}

            {languages.length > 0 && (
              <article id="languages" className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
                <CardHead label="Languages" />
                {languages.map((l: any, i: number) => {
                  const raw = langName(l);
                  const parts = raw.split(' — ');
                  const langLabel = parts[0];
                  const level = parts[1] || (typeof l === 'object' ? (l.level || l.proficiency || '') : '');
                  const pct = level === 'Native' ? 100 : level === 'Fluent' ? 85 : level === 'Conversational' ? 55 : level ? 65 : 70;
                  return (
                    <div key={i} className="px-4 py-2.5 border-t border-[#EEF2F4]">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-[12.5px] font-bold text-[#2F2F2F]">{langLabel}</span>
                        {level && <span className="text-[10.5px] text-[#6B7785]">{level}</span>}
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#EEF2F4' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FC5B26, #FF906D)' }} />
                      </div>
                    </div>
                  );
                })}
              </article>
            )}

            {certs.length > 0 && (
              <article className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm">
                <CardHead label="Certifications" />
                {certs.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4]">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#FFE5DA', color: '#C7401C', borderColor: '#FFCDB9' }}>
                      <CertIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[12.5px] font-medium text-[#2F2F2F]">{certName(c)}</span>
                  </div>
                ))}
              </article>
            )}

            {(info.email || info.phone || info.linkedin_url || info.github_url || info.portfolio_url) && (
              <article id="contact" className="bg-white border border-[#E5EAEE] rounded-2xl overflow-hidden shadow-sm scroll-mt-20">
                <CardHead label="Contact" />
                {info.email && (
                  <a href={`mailto:${info.email}`} className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline hover:bg-[#F3F6F8] transition-colors">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#DBEFF8', color: '#1B6A8A', borderColor: '#BFE3F2' }}>
                      <EmailIcon className="w-3.5 h-3.5" />
                    </div>
                    {info.email}
                  </a>
                )}
                {info.phone && (
                  <a href={`tel:${info.phone}`} className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline hover:bg-[#F3F6F8] transition-colors">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#DBEFF8', color: '#1B6A8A', borderColor: '#BFE3F2' }}>
                      <PhoneIcon className="w-3.5 h-3.5" />
                    </div>
                    {info.phone}
                  </a>
                )}
                {info.linkedin_url && (
                  <a href={info.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline hover:bg-[#F3F6F8] transition-colors">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#DBEFF8', color: '#1B6A8A', borderColor: '#BFE3F2' }}>
                      <LinkedInIcon className="w-3.5 h-3.5" />
                    </div>
                    LinkedIn
                  </a>
                )}
                {info.github_url && (
                  <a href={info.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline hover:bg-[#F3F6F8] transition-colors">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#DBEFF8', color: '#1B6A8A', borderColor: '#BFE3F2' }}>
                      <GitHubIcon className="w-3.5 h-3.5" />
                    </div>
                    GitHub
                  </a>
                )}
                {info.portfolio_url && (
                  <a href={info.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#EEF2F4] text-[#2F2F2F] text-[12.5px] no-underline hover:bg-[#F3F6F8] transition-colors">
                    <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 border" style={{ background: '#DBEFF8', color: '#1B6A8A', borderColor: '#BFE3F2' }}>
                      <GlobeIcon className="w-3.5 h-3.5" />
                    </div>
                    Portfolio
                  </a>
                )}
              </article>
            )}

          </div>
        </div>
      </main>

      <footer className="relative text-center text-[11px] text-[#9CA3AF] py-6 pb-8 tracking-wider print:hidden">
        Shared via HRAIPP · Read-only public link
      </footer>
    </div>
  );
}
