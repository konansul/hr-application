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

const TAG_COLORS = [
  'bg-violet-50  border-violet-200  text-violet-700',
  'bg-indigo-50  border-indigo-200  text-indigo-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-rose-50    border-rose-200    text-rose-700',
  'bg-amber-50   border-amber-200   text-amber-700',
  'bg-sky-50     border-sky-200     text-sky-700',
  'bg-pink-50    border-pink-200    text-pink-700',
  'bg-teal-50    border-teal-200    text-teal-700',
];

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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}
function EmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
function LocationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

/* ─── section card ────────────────────────────────────────────────────────── */
function Section({ id, title, accentBar, children }: {
  id: string; title: string; accentBar: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden scroll-mt-20">
      <div className="flex items-center gap-3 px-7 py-4 border-b border-slate-100">
        <div className={`w-1 h-5 rounded-full shrink-0 ${accentBar}`} />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h2>
      </div>
      <div className="px-7 py-6">{children}</div>
    </section>
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

  /* highlight active nav link while scrolling */
  useEffect(() => {
    if (!cv) return;
    const ids = ['about', 'experience', 'skills', 'education', 'languages', 'contact'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [cv]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-start p-6">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-start mx-auto">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-start">
        <div className="w-9 h-9 border-4 border-violet-900 border-t-violet-400 rounded-full animate-spin" />
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

  /* nav items — only show sections with content */
  const navItems = [
    { id: 'about',      label: 'About',      show: !!info.summary },
    { id: 'experience', label: 'Experience',  show: experience.length > 0 },
    { id: 'skills',     label: 'Skills',      show: skills.length > 0 },
    { id: 'education',  label: 'Education',   show: education.length > 0 },
    { id: 'languages',  label: 'Languages',   show: languages.length > 0 || certs.length > 0 },
    { id: 'contact',    label: 'Contact',     show: !!(info.email || info.phone || info.linkedin_url || info.github_url || info.portfolio_url) },
    { id: 'references', label: 'References',  show: true },
  ].filter(n => n.show);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">

      {/* ── hero ──────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-8 pt-16 pb-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-10">

            {/* photo */}
            <div className="shrink-0">
              {hasPhoto ? (
                <div className="w-36 h-36 lg:w-44 lg:h-44 rounded-2xl ring-4 ring-white/15 overflow-hidden shadow-2xl">
                  <img src={info.photo} alt={fullName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-36 h-36 lg:w-44 lg:h-44 rounded-2xl ring-4 ring-violet-400/20 bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-700 flex items-center justify-center shadow-2xl">
                  <span className="text-5xl lg:text-6xl font-black text-white/90 tracking-tight">{initials(info.first_name, info.last_name)}</span>
                </div>
              )}
            </div>

            {/* text */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] mb-3">
                {fullName}
              </h1>
              {cv.title && (
                <p className="text-violet-300 font-semibold text-xl lg:text-2xl mb-7 leading-snug">{cv.title}</p>
              )}

              {/* contact pills */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-7">
                {info.email && (
                  <a href={`mailto:${info.email}`} className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white bg-white/8 hover:bg-white/14 border border-white/10 px-3.5 py-2 rounded-full transition-all">
                    <EmailIcon className="w-3.5 h-3.5 text-violet-400" />{info.email}
                  </a>
                )}
                {info.phone && (
                  <a href={`tel:${info.phone}`} className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white bg-white/8 hover:bg-white/14 border border-white/10 px-3.5 py-2 rounded-full transition-all">
                    <PhoneIcon className="w-3.5 h-3.5 text-violet-400" />{info.phone}
                  </a>
                )}
                {(info.city || info.country) && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-300 bg-white/8 border border-white/10 px-3.5 py-2 rounded-full">
                    <LocationIcon className="w-3.5 h-3.5 text-violet-400" />
                    {[info.city, info.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              {/* social buttons */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2.5">
                {info.linkedin_url && (
                  <a href={info.linkedin_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] hover:bg-[#0958a8] text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/40">
                    <LinkedInIcon className="w-4 h-4" />LinkedIn
                  </a>
                )}
                {info.github_url && (
                  <a href={info.github_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/15 transition-all">
                    <GitHubIcon className="w-4 h-4" />GitHub
                  </a>
                )}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/15 transition-all disabled:opacity-60"
                >
                  {isDownloading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                    : <><DownloadIcon className="w-4 h-4" />Download CV</>}
                </button>
                {info.portfolio_url && (
                  <a href={info.portfolio_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-sm font-semibold rounded-xl border border-violet-400/25 transition-all">
                    <GlobeIcon className="w-4 h-4" />Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── sticky nav ────────────────────────────────────────────────────── */}
      <div ref={navRef} className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-1 py-1">
              {navItems.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`px-4 py-3 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                    activeSection === id
                      ? 'text-violet-700 bg-violet-50'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8 items-start">

          {/* ── left column: About + Experience + Education ───────────────── */}
          <div className="space-y-6">

            {info.summary && (
              <Section id="about" title="About" accentBar="bg-violet-500">
                <p className="text-base text-slate-600 leading-relaxed">{info.summary}</p>
              </Section>
            )}

            {experience.length > 0 && (
              <Section id="experience" title="Experience" accentBar="bg-indigo-500">
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-300 via-violet-200 to-transparent" />
                  <div className="space-y-8">
                    {experience.map((exp: any, i: number) => (
                      <div key={i} className="flex gap-5">
                        <div className="relative mt-1.5 shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-400 shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-0.5">
                            <p className="text-sm font-bold text-slate-900">{exp.title || 'Role'}</p>
                            {dateRange(exp) && (
                              <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                                {dateRange(exp)}
                              </span>
                            )}
                          </div>
                          {exp.company && <p className="text-xs font-semibold text-indigo-500 mb-2">{exp.company}</p>}
                          {exp.description && <p className="text-sm text-slate-500 leading-relaxed">{exp.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {education.length > 0 && (
              <Section id="education" title="Education" accentBar="bg-emerald-500">
                <div className="space-y-5">
                  {education.map((edu: any, i: number) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-start shrink-0">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{edu.degree || 'Degree'}</p>
                        {edu.institution && <p className="text-sm text-slate-500 mt-0.5">{edu.institution}</p>}
                        {(edu.start_date || edu.end_date) && (
                          <p className="text-xs text-slate-400 mt-1">{[edu.start_date, edu.end_date].filter(Boolean).join(' – ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section id="references" title="References" accentBar="bg-slate-400">
              <p className="text-sm text-slate-500 italic">References available upon request</p>
            </Section>
          </div>

          {/* ── right column: Skills + Languages + Certs + Contact ────────── */}
          <div className="space-y-6">

            {skills.length > 0 && (
              <Section id="skills" title="Skills" accentBar="bg-violet-500">
                <div className="flex flex-wrap gap-2">
                  {skills.map((s: any, i: number) => (
                    <span key={i} className={`px-3 py-1.5 border rounded-lg text-xs font-semibold ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                      {skillName(s)}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {(languages.length > 0 || certs.length > 0) && (
              <div id="languages" className="space-y-6 scroll-mt-20">
                {languages.length > 0 && (
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-7 py-4 border-b border-slate-100">
                      <div className="w-1 h-5 rounded-full bg-sky-500 shrink-0" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Languages</h2>
                    </div>
                    <div className="px-7 py-6 flex flex-wrap gap-2">
                      {languages.map((l: any, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-xs font-semibold text-sky-700">
                          {langName(l)}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
                {certs.length > 0 && (
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-7 py-4 border-b border-slate-100">
                      <div className="w-1 h-5 rounded-full bg-amber-500 shrink-0" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Certifications</h2>
                    </div>
                    <div className="px-7 py-6 flex flex-wrap gap-2">
                      {certs.map((c: any, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
                          {certName(c)}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* contact card */}
            {(info.email || info.phone || info.linkedin_url || info.github_url || info.portfolio_url) && (
              <section id="contact" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden scroll-mt-20">
                <div className="flex items-center gap-3 px-7 py-4 border-b border-slate-100">
                  <div className="w-1 h-5 rounded-full bg-rose-500 shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Contact</h2>
                </div>
                <div className="px-7 py-6 space-y-3">
                  {info.email && (
                    <a href={`mailto:${info.email}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-violet-700 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-start shrink-0 group-hover:bg-violet-100 transition-colors">
                        <EmailIcon className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      {info.email}
                    </a>
                  )}
                  {info.phone && (
                    <a href={`tel:${info.phone}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-violet-700 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-start shrink-0 group-hover:bg-violet-100 transition-colors">
                        <PhoneIcon className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      {info.phone}
                    </a>
                  )}
                  {info.linkedin_url && (
                    <a href={info.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-slate-600 hover:text-[#0A66C2] transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-start shrink-0 group-hover:bg-blue-100 transition-colors">
                        <LinkedInIcon className="w-3.5 h-3.5 text-[#0A66C2]" />
                      </div>
                      LinkedIn
                    </a>
                  )}
                  {info.github_url && (
                    <a href={info.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-start shrink-0 group-hover:bg-slate-100 transition-colors">
                        <GitHubIcon className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      GitHub
                    </a>
                  )}
                  {info.portfolio_url && (
                    <a href={info.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-slate-600 hover:text-violet-700 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-start shrink-0 group-hover:bg-violet-100 transition-colors">
                        <GlobeIcon className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      Portfolio
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-300 mt-12 pb-6 tracking-wide print:hidden">
          Shared via HRAI · View only
        </p>
      </div>
    </div>
  );
}
