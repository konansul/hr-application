import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const APP_URL = import.meta.env.DEV ? 'http://localhost:5173/?login' : 'https://app.hraipp.com/?login';

// Brand palette
// Purple  #7A60F4 (primary)  hover #6B52E8   dark text #5B52C8
// Violet  #9EA4FF (variant)  dark text #5B52C8
// Blue    #92D8F2 (comms)
// Orange  #FF906D (accent)   dark text #c05020

// ── Inline logo (3 pills) ──────────────────────────────────────────
const HraiLogo = ({ height = 32 }: { height?: number }) => {
  const width = Math.round(height * 50 / 68);
  return (
    <svg width={width} height={height} viewBox="0 0 50 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hrai-mid" x1="0" y1="68" x2="0" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#16C0EE" />
          <stop offset="100%" stopColor="#4B6CF5" />
        </linearGradient>
        <linearGradient id="hrai-right" x1="0" y1="68" x2="0" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4060F8" />
          <stop offset="100%" stopColor="#7020EF" />
        </linearGradient>
      </defs>
      <circle cx="5"  cy="35" r="5"  fill="#00C8E8" />
      <rect   x="0"  y="44"  width="10" height="24" rx="5" fill="#00C8E8" />
      <circle cx="25" cy="19" r="5"  fill="#4B6CF5" />
      <rect   x="20" y="28"  width="10" height="40" rx="5" fill="url(#hrai-mid)" />
      <circle cx="45" cy="3"  r="5"  fill="#8020EF" />
      <rect   x="40" y="12"  width="10" height="56" rx="5" fill="url(#hrai-right)" />
    </svg>
  );
};

// ── Icon helpers ───────────────────────────────────────────────────
const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const MoonIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);
const ArrowRightIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

function useIntersection(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [activeStep, setActiveStep] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const ids = ['overview', 'features', 'workflow'];
    const observers: IntersectionObserver[] = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-20% 0px -60% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#08090c' : '#fafcff';
  }, [theme]);

  const isDark = theme === 'dark';

  const bg      = isDark ? 'bg-[#08090c]' : 'bg-[#fafcff]';
  const text    = isDark ? 'text-white' : 'text-slate-900';
  const muted   = isDark ? 'text-slate-400' : 'text-slate-500';
  const card    = isDark ? 'bg-[#0f1117] border-white/[0.07]' : 'bg-white border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]';
  const cardHover = isDark
    ? 'hover:border-white/20 hover:bg-[#141720]'
    : 'hover:border-[#7A60F4]/25 hover:shadow-[0_20px_40px_rgba(122,96,244,0.08)]';
  const subtle  = isDark ? 'bg-white/[0.04] border-white/[0.07]' : 'bg-white border-slate-200 shadow-sm';

  const FEATURES = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Intelligent Resume Parsing',
      description: 'Instantly extract structured data from any PDF or DOCX. Our models understand context, seniority, and project scale — not just keywords.',
      accent: isDark ? 'text-[#92D8F2]' : 'text-slate-700',
      glow:   isDark ? 'bg-[#92D8F2]/10' : 'bg-[#92D8F2]/10',
      border: isDark ? 'border-[#92D8F2]/20' : 'border-[#92D8F2]/30',
      span: 'col-span-1 md:col-span-2',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Visual Comparison',
      description: 'Multi-dimensional radar charts for side-by-side candidate analysis.',
      accent: isDark ? 'text-[#9EA4FF]' : 'text-[#5B52C8]',
      glow:   isDark ? 'bg-[#9EA4FF]/10' : 'bg-[#9EA4FF]/10',
      border: isDark ? 'border-[#9EA4FF]/20' : 'border-[#9EA4FF]/30',
      span: 'col-span-1',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      title: 'Kanban Pipeline',
      description: 'Drag-and-drop hiring board synced live with AI screening results.',
      accent: isDark ? 'text-[#9EA4FF]' : 'text-[#5B52C8]',
      glow:   isDark ? 'bg-[#7A60F4]/10' : 'bg-[#7A60F4]/10',
      border: isDark ? 'border-[#7A60F4]/20' : 'border-[#7A60F4]/30',
      span: 'col-span-1',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Zero-Bias Matching',
      description: 'Standardized evaluation focused purely on validated skills and objective metrics, removing human fatigue from the equation.',
      accent: isDark ? 'text-[#7A60F4]' : 'text-[#5B52C8]',
      glow:   isDark ? 'bg-[#7A60F4]/10' : 'bg-[#7A60F4]/10',
      border: isDark ? 'border-[#7A60F4]/20' : 'border-[#7A60F4]/30',
      span: 'col-span-1 md:col-span-2',
    },
  ];

  const STEPS = [
    { id: '01', title: 'Configure Job Requirements', desc: 'Define mandatory skills, experience levels, and custom criteria using the intuitive dashboard builder.' },
    { id: '02', title: 'Upload Resumes in Bulk', desc: 'Drop hundreds of files at once. The platform instantly sanitizes, normalizes, and extracts structured data.' },
    { id: '03', title: 'Run AI Screening', desc: 'The engine cross-references every candidate against your job description, producing objective ranked scores.' },
    { id: '04', title: 'Make Decisions Faster', desc: 'Review actionable shortlists, detailed skill-gap analyses, and AI-generated interview questions.' },
  ];

  const heroSection     = useIntersection(0.1);
  const aboutSection    = useIntersection(0.1);
  const featuresSection = useIntersection(0.05);
  const workflowSection = useIntersection(0.1);
  const ctaSection      = useIntersection(0.1);

  const transitionClass = (visible: boolean, delay = 0) =>
    `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${delay ? `delay-[${delay}ms]` : ''}`;

  return (
    <div className={`min-h-screen font-sans selection:bg-[#7A60F4]/20 overflow-x-hidden transition-colors duration-500 ${bg} ${text}`}>

      {/* ── Background glows ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[160px] ${isDark ? 'bg-[#7A60F4]/12' : 'bg-[#7A60F4]/35'}`} style={{ animation: 'drift1 18s ease-in-out infinite alternate' }} />
        <div className={`absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] ${isDark ? 'bg-[#29C5F6]/18' : 'bg-[#29C5F6]/65'}`} style={{ animation: 'drift2 22s ease-in-out infinite alternate' }} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] ${isDark ? 'bg-[#9EA4FF]/8' : 'bg-[#9EA4FF]/35'}`} style={{ animation: 'drift1 14s ease-in-out infinite alternate-reverse' }} />
        <style>{`
          @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,40px) scale(1.08); } }
          @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,60px) scale(1.12); } }
        `}</style>
      </div>

      {/* ── Header ── */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? (isDark ? 'bg-[#08090c]/85 backdrop-blur-2xl border-b border-white/[0.07] py-3 shadow-2xl shadow-black/30' : 'bg-white/85 backdrop-blur-2xl border-b border-slate-200/60 py-3 shadow-lg shadow-slate-200/30') : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative">

          {/* Logo */}
          <div className="flex justify-start z-10">
            <Link to="/" className="flex items-center gap-2.5 group">
              <HraiLogo height={36} />
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-[#92D8F2] via-[#7A60F4] to-[#9EA4FF] bg-clip-text text-transparent select-none">
                HRAIPP
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className={`hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10 justify-center items-center gap-0.5 px-2 py-1.5 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/70 border-slate-200/70 shadow-sm'}`}>
            {(['overview','features','workflow'] as const).map(id => (
              <a key={id} href={`#${id}`}
                className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all capitalize ${
                  activeSection === id
                    ? (isDark ? 'text-[#9EA4FF] bg-[#7A60F4]/10' : 'text-[#7A60F4] bg-[#7A60F4]/8')
                    : (isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100')
                }`}>
                {id === 'overview' ? 'Overview' : id === 'features' ? 'Features' : 'Workflow'}
              </a>
            ))}
            <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />
            <Link to="/guide"   className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>HR Guide</Link>
            <Link to="/privacy" className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Privacy</Link>
            <Link to="/terms"   className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Terms</Link>
          </nav>

          {/* Actions */}
          <div className="flex justify-end items-center gap-3 z-10">
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label="Toggle theme"
              style={!isDark ? { color: '#7A60F4', backgroundColor: 'rgba(122,96,244,0.08)', borderColor: 'rgba(122,96,244,0.3)' } : undefined}
              className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-white/[0.06] border-white/10 text-[#FF906D] hover:text-[#FF906D] hover:bg-white/10' : 'shadow-sm hover:opacity-80'}`}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer"
              className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${isDark ? 'text-slate-300 border-white/10 hover:border-white/20 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]' : 'text-slate-600 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-sm'}`}>
              Log In
            </a>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#7A60F4] hover:bg-[#6B52E8] text-white shadow-lg shadow-[#7A60F4]/25 hover:shadow-[#7A60F4]/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Get Started
              <ArrowRightIcon />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">

        {/* ── Hero ── */}
        <section id="overview" className="pt-36 pb-24 px-6 max-w-7xl mx-auto">
          <div ref={heroSection.ref} className={`flex flex-col items-center text-center ${transitionClass(heroSection.visible)}`}>

            <a href={APP_URL} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-semibold mb-10 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-[#7A60F4]/10 border-[#7A60F4]/25 text-[#9EA4FF] hover:bg-[#7A60F4]/15' : 'bg-white border-[#7A60F4]/20 text-[#5B52C8] hover:bg-[#7A60F4]/5 hover:border-[#7A60F4]/30'}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7A60F4] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7A60F4]" />
              </span>
              Now live — AI-powered hiring platform
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </a>

            <h1 className="text-[3.5rem] sm:text-[5rem] lg:text-[6.25rem] font-black tracking-tight leading-[0.95] mb-7 max-w-5xl drop-shadow-sm">
              Hire smarter.
              <br />
              <span className="text-[#7A60F4]">
                Move faster.
              </span>
            </h1>

            <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${muted}`}>
              The unified AI platform for HR teams and talent alike. Screen thousands of candidates in seconds, compare top contenders instantly, and build world-class teams — without the guesswork.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
              <a href={APP_URL} target="_blank" rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold bg-[#7A60F4] hover:bg-[#6B52E8] text-white shadow-xl shadow-[#7A60F4]/25 hover:shadow-[#7A60F4]/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Launch Platform
                <ArrowRightIcon />
              </a>
              <a href="#workflow"
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold transition-all border ${isDark ? 'bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.09] hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                See how it works
              </a>
              <Link to="/guide"
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold transition-all border ${isDark ? 'bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.09] hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                HR Guide
              </Link>
            </div>

            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No credit card required &nbsp;·&nbsp; Free to get started</p>

            {/* Dashboard preview */}
            <div className="w-full mt-20 relative group max-w-5xl mx-auto">
              <div className={`absolute -inset-px rounded-[2rem] transition-all duration-700 bg-gradient-to-r from-[#7A60F4]/40 via-[#9EA4FF]/40 to-[#92D8F2]/40 blur-xl group-hover:blur-2xl ${isDark ? 'opacity-50 group-hover:opacity-80' : 'opacity-40 group-hover:opacity-70'}`} />
              <div className={`relative rounded-[1.75rem] border overflow-hidden ${isDark ? 'bg-[#0d0f16] border-white/[0.08]' : 'bg-white border-white shadow-2xl shadow-slate-300/50'}`}>
                {/* Browser chrome */}
                <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${isDark ? 'bg-[#111318] border-white/[0.06]' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400/90" />
                    <div className="w-3 h-3 rounded-full bg-[#FF906D]/90" />
                    <div className="w-3 h-3 rounded-full bg-[#7A60F4]/70" />
                  </div>
                  <div className={`mx-auto flex items-center gap-2 px-4 py-1.5 rounded-lg border text-xs font-mono ${isDark ? 'bg-[#08090c] border-white/[0.08] text-slate-500' : 'bg-white border-slate-200 text-slate-400 shadow-sm'}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    app.hraipp.com/dashboard
                  </div>
                </div>

                <div className={`p-5 ${isDark ? 'bg-[#0d0f16]' : 'bg-slate-50/50'}`}>
                  <div className={`rounded-2xl border p-5 flex flex-col md:flex-row gap-4 ${isDark ? 'bg-[#0a0b10] border-white/[0.06]' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="w-full md:w-1/3 flex flex-col gap-4">
                      {/* Stat card */}
                      <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#111318] border-white/[0.07]' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                        <div className={`text-xs font-semibold mb-3 ${muted}`}>Active Candidates</div>
                        <div className={`text-4xl font-black mb-4 tracking-tight ${text}`}>412</div>
                        <div className="flex gap-1 h-12 items-end">
                          {[30, 50, 35, 70, 45, 85, 60, 95, 75, 100].map((h, i) => (
                            <div key={i} className={`flex-1 rounded-t-sm transition-all ${isDark ? 'bg-[#7A60F4]/70 hover:bg-[#9EA4FF]' : 'bg-[#7A60F4] hover:bg-[#6B52E8]'}`} style={{ height: `${h}%` }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-[#7A60F4] dark:text-[#9EA4FF]">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                          +12% this week
                        </div>
                      </div>
                      {/* Score ring */}
                      <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#111318] border-white/[0.07]' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                        <div className={`text-xs font-semibold mb-4 ${muted}`}>Top Match Score</div>
                        <div className="flex items-center gap-4">
                          <div className="relative w-14 h-14 shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                              <circle cx="28" cy="28" r="24" className={isDark ? 'stroke-white/5' : 'stroke-slate-200'} strokeWidth="5" fill="none" />
                              <circle cx="28" cy="28" r="24" stroke="url(#grad)" strokeWidth="5" fill="none" strokeDasharray="150" strokeDashoffset="15" strokeLinecap="round" />
                              <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#7A60F4" /><stop offset="100%" stopColor="#9EA4FF" /></linearGradient></defs>
                            </svg>
                            <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${text}`}>94</span>
                          </div>
                          <div className="flex-1 space-y-2.5">
                            <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}><div className="w-[94%] h-full rounded-full bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF]" /></div>
                            <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}><div className="w-[78%] h-full rounded-full bg-[#92D8F2]" /></div>
                            <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}><div className="w-[85%] h-full rounded-full bg-[#FF906D]" /></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Candidate list */}
                    <div className={`flex-1 rounded-xl border p-5 flex flex-col ${isDark ? 'bg-[#111318] border-white/[0.07]' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className={`text-xs font-semibold ${muted}`}>Shortlisted Candidates</div>
                        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide ${isDark ? 'bg-[#7A60F4]/15 text-[#9EA4FF]' : 'bg-[#7A60F4]/10 text-[#5B52C8]'}`}>3 New</div>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {[
                          { name: 'Alex Reinholt',  role: 'Senior Engineer',  score: 94, color: 'bg-[#7A60F4]' },
                          { name: 'Mia Svensson',   role: 'Product Designer', score: 91, color: 'bg-[#9EA4FF]' },
                          { name: 'Jordan Park',    role: 'Data Scientist',   score: 88, color: 'bg-[#92D8F2]' },
                          { name: 'Priya Mehta',    role: 'DevOps Lead',      score: 85, color: 'bg-[#FF906D]' },
                        ].map((c, i) => (
                          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDark ? 'bg-[#0d0f16] border-white/[0.05] hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                            <div className={`w-8 h-8 rounded-lg ${c.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{c.name[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-bold truncate ${text}`}>{c.name}</div>
                              <div className={`text-[10px] truncate ${muted}`}>{c.role}</div>
                            </div>
                            <div className={`text-xs font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{c.score}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── About (two sides) ── */}
        <section id="about" className={`py-32 border-t border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
          <div className="max-w-7xl mx-auto px-6">
            <div ref={aboutSection.ref} className={transitionClass(aboutSection.visible)}>
              <div className="text-center mb-16">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-5 ${isDark ? 'bg-[#9EA4FF]/10 border-[#9EA4FF]/25 text-[#9EA4FF]' : 'bg-[#9EA4FF]/10 border-[#9EA4FF]/30 text-[#5B52C8]'}`}>
                  Built for both sides
                </div>
                <h2 className={`text-4xl sm:text-5xl font-black tracking-tight mb-5 ${text}`}>One platform. Two superpowers.</h2>
                <p className={`text-lg max-w-xl mx-auto ${muted}`}>
                  We close the gap between great companies and great talent with transparent, AI-driven tools for everyone.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* HR card */}
                <div className={`group relative p-9 rounded-[2rem] border overflow-hidden transition-all duration-500 ${card} ${cardHover}`}>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br ${isDark ? 'from-[#7A60F4]/5 via-transparent to-transparent' : 'from-[#7A60F4]/5 via-transparent to-transparent'}`} />
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-7 border ${isDark ? 'bg-[#92D8F2]/10 border-[#92D8F2]/20 text-[#92D8F2]' : 'bg-[#92D8F2]/10 border-[#92D8F2]/30 text-slate-700 shadow-sm'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold mb-4 ${isDark ? 'bg-[#92D8F2]/10 border-[#92D8F2]/20 text-[#92D8F2]' : 'bg-[#92D8F2]/10 border-[#92D8F2]/30 text-slate-700'}`}>
                    For HR &amp; Recruiters
                  </div>
                  <h3 className={`text-2xl font-black tracking-tight mb-4 ${text}`}>Stop reviewing resumes manually.</h3>
                  <p className={`text-base leading-relaxed mb-8 ${muted}`}>
                    Upload your entire candidate pool and let the AI instantly parse, score, and rank every individual against your specific job requirements. Reclaim hours every day.
                  </p>
                  <ul className="space-y-3.5">
                    {['Screen thousands of CVs in seconds', 'Compare candidates on multi-axis charts', 'Manage pipelines with a built-in Kanban board', 'Eliminate cognitive bias from every hire'].map((item, i) => (
                      <li key={i} className={`flex items-center gap-3 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="text-[#7A60F4]"><CheckIcon /></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={`mt-9 inline-flex items-center gap-2 text-sm font-bold transition-all hover:gap-3 ${isDark ? 'text-[#9EA4FF] hover:text-[#7A60F4]' : 'text-[#5B52C8] hover:text-[#7A60F4]'}`}>
                    Start screening candidates <ArrowRightIcon className="w-4 h-4" />
                  </a>
                </div>

                {/* Candidate card */}
                <div className={`group relative p-9 rounded-[2rem] border overflow-hidden transition-all duration-500 ${card} ${cardHover}`}>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br ${isDark ? 'from-[#FF906D]/5 via-transparent to-transparent' : 'from-[#FF906D]/5 via-transparent to-transparent'}`} />
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-7 border ${isDark ? 'bg-[#FF906D]/10 border-[#FF906D]/20 text-[#FF906D]' : 'bg-[#FF906D]/10 border-[#FF906D]/20 text-[#c05020] shadow-sm'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold mb-4 ${isDark ? 'bg-[#FF906D]/10 border-[#FF906D]/20 text-[#FF906D]' : 'bg-[#FF906D]/10 border-[#FF906D]/20 text-[#c05020]'}`}>
                    For Candidates &amp; Talent
                  </div>
                  <h3 className={`text-2xl font-black tracking-tight mb-4 ${text}`}>Own your application process.</h3>
                  <p className={`text-base leading-relaxed mb-8 ${muted}`}>
                    See exactly how the AI evaluates your profile, identify critical skill gaps, and understand your real match percentage before you even apply — so you can present your best self.
                  </p>
                  <ul className="space-y-3.5">
                    {['Get instant AI feedback on your resume', 'Identify skills that boost your match score', 'Track your real-time status in the pipeline', 'Be evaluated on merit, not resume formatting'].map((item, i) => (
                      <li key={i} className={`flex items-center gap-3 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="text-[#FF906D]"><CheckIcon /></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={`mt-9 inline-flex items-center gap-2 text-sm font-bold transition-all hover:gap-3 ${isDark ? 'text-[#FF906D] hover:text-[#c05020]' : 'text-[#c05020] hover:text-[#FF906D]'}`}>
                    Analyze your resume <ArrowRightIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div ref={featuresSection.ref} className={transitionClass(featuresSection.visible)}>
              <div className="text-center mb-16">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-5 ${isDark ? 'bg-[#7A60F4]/10 border-[#7A60F4]/25 text-[#9EA4FF]' : 'bg-[#7A60F4]/10 border-[#7A60F4]/20 text-[#5B52C8]'}`}>
                  Core capabilities
                </div>
                <h2 className={`text-4xl sm:text-5xl font-black tracking-tight mb-5 ${text}`}>Everything you need to hire well.</h2>
                <p className={`text-lg max-w-xl mx-auto ${muted}`}>
                  A purpose-built engine for modern talent acquisition — fast, fair, and precise.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FEATURES.map((feature, idx) => (
                  <div key={idx} className={`group relative p-8 rounded-[1.75rem] border overflow-hidden transition-all duration-500 hover:-translate-y-1 ${card} ${cardHover} ${feature.span}`}>
                    <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none transition-opacity duration-700 opacity-0 group-hover:opacity-100 ${feature.glow}`} />
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border transition-transform duration-500 group-hover:scale-110 ${feature.glow} ${feature.border} ${feature.accent}`}>
                      {feature.icon}
                    </div>
                    <h3 className={`text-xl font-bold tracking-tight mb-3 ${text}`}>{feature.title}</h3>
                    <p className={`text-sm leading-relaxed ${muted}`}>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Workflow ── */}
        <section id="workflow" className={`py-32 border-t border-b relative overflow-hidden ${isDark ? 'bg-[#0a0b10] border-white/[0.06]' : 'border-slate-200/40'}`}>
          <div className={`absolute right-0 top-1/3 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${isDark ? 'bg-[#7A60F4]/8' : 'bg-[#7A60F4]/10'}`} />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div ref={workflowSection.ref} className={`flex flex-col lg:flex-row gap-14 items-start ${transitionClass(workflowSection.visible)}`}>
              <div className="w-full lg:w-1/2 lg:sticky lg:top-28">
                <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-sm font-semibold mb-6 ${isDark ? 'bg-[#9EA4FF]/30 border-[#9EA4FF]/50 text-white' : 'bg-[#9EA4FF] border-[#7A60F4]/30 text-white shadow-md shadow-[#9EA4FF]/30'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  How it works
                </div>
                <h2 className={`text-4xl sm:text-5xl font-black tracking-tight mb-5 leading-[1.1] ${text}`}>
                  From raw data to<br />
                  <span className="text-[#7A60F4]">decisive clarity.</span>
                </h2>
                <p className={`text-lg mb-10 ${muted}`}>Four steps from upload to decision. No spreadsheets. No guesswork.</p>

                <div className="space-y-3">
                  {STEPS.map((step, idx) => (
                    <button key={idx} onClick={() => setActiveStep(idx)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 group ${activeStep === idx
                        ? (isDark ? 'border-[#7A60F4]/70 bg-[#7A60F4]/5 shadow-[0_0_25px_rgba(122,96,244,0.08)]' : 'border-[#7A60F4]/50 bg-[#7A60F4]/5 shadow-lg shadow-[#7A60F4]/10')
                        : (isDark ? 'border-transparent hover:border-white/10 hover:bg-white/[0.03]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50/80')}`}>
                      <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all duration-300 ${activeStep === idx ? 'bg-[#7A60F4] text-white' : (isDark ? 'bg-white/[0.06] text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                          {step.id}
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold mb-1 transition-colors ${activeStep === idx ? text : muted}`}>{step.title}</div>
                          <div className={`text-sm leading-relaxed transition-all duration-300 ${activeStep === idx ? (isDark ? 'text-slate-300 max-h-10 opacity-100' : 'text-slate-600 max-h-10 opacity-100') : 'max-h-0 opacity-0 overflow-hidden'}`}>{step.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full lg:w-1/2">
                <div className={`rounded-[2rem] border overflow-hidden ${card}`}>
                  <div className={`p-5 border-b ${isDark ? 'bg-[#111318] border-white/[0.06]' : 'bg-slate-50 border-slate-100'}`}>
                    <div className={`p-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-[#0d0f16] border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="w-10 h-10 bg-[#7A60F4] rounded-xl flex items-center justify-center text-white shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm truncate ${text}`}>candidates_q2_2026.zip</div>
                        <div className={`text-xs ${muted}`}>{activeStep === 0 ? 'Ready to upload' : activeStep === 1 ? 'Parsing in progress...' : 'Processing complete — 247 resumes'}</div>
                      </div>
                      {activeStep >= 1 && (
                        <div className={`w-7 h-7 border-4 rounded-full ${activeStep === 1 ? 'animate-spin' : ''} ${isDark ? 'border-white/10 border-t-[#7A60F4]' : 'border-slate-200 border-t-[#7A60F4]'}`} style={{ animation: activeStep === 1 ? undefined : 'none', borderTopColor: activeStep >= 2 ? '#7A60F4' : undefined }} />
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-3">
                    {[
                      { name: 'Alex Reinholt', role: 'Senior Eng.',  score: 94, tag: 'Top Match' },
                      { name: 'Mia Svensson',  role: 'Designer',    score: 91, tag: 'Shortlisted' },
                      { name: 'Jordan Park',   role: 'Data Sci.',   score: 88, tag: 'Shortlisted' },
                      { name: 'Priya Mehta',   role: 'DevOps',      score: 85, tag: 'Review' },
                      { name: 'Sam Torres',    role: 'Full Stack',  score: 79, tag: 'Review' },
                    ].map((c, i) => (
                      <div key={i}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-700 ease-out ${activeStep > 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'} ${card}`}
                        style={{ transitionDelay: `${i * 100}ms` }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${['bg-[#7A60F4]','bg-[#9EA4FF]','bg-[#92D8F2]','bg-[#FF906D]','bg-[#6B52E8]'][i]}`}>{c.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${text}`}>{c.name}</div>
                          <div className={`text-xs truncate ${muted}`}>{c.role}</div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className={`text-sm font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{c.score}%</div>
                          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide whitespace-nowrap ${
                            i === 0   ? (isDark ? 'bg-[#7A60F4]/20 text-[#9EA4FF]' : 'bg-[#7A60F4]/10 text-[#5B52C8]')
                            : i <= 2  ? (isDark ? 'bg-[#92D8F2]/15 text-[#92D8F2]' : 'bg-[#92D8F2]/15 text-slate-700')
                            : (isDark ? 'bg-[#FF906D]/15 text-[#FF906D]' : 'bg-[#FF906D]/10 text-[#c05020]')
                          }`}>
                            {c.tag}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`p-5 border-t flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <div className={`text-xs ${muted}`}>Showing 5 of 247 results</div>
                    <a href={APP_URL} target="_blank" rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-[#9EA4FF] hover:text-[#7A60F4]' : 'text-[#5B52C8] hover:text-[#7A60F4]'}`}>
                      View all in Dashboard <ArrowRightIcon className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust strip ── */}
        <section className={`py-12 border-b ${isDark ? 'bg-[#08090c] border-white/[0.06]' : 'border-slate-200/40'}`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Enterprise-Grade Security', desc: 'SOC 2 compliant infrastructure. Your data stays private.', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, color: isDark ? 'text-[#92D8F2]' : 'text-slate-600' },
                { label: 'Instant Onboarding', desc: 'Get your first screening results within minutes of signing up.', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, color: isDark ? 'text-[#9EA4FF]' : 'text-[#5B52C8]' },
                { label: 'Always Improving', desc: 'Our models update continuously, getting smarter with every hire.', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>, color: isDark ? 'text-[#FF906D]' : 'text-[#c05020]' },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-4 p-6 rounded-2xl border transition-all ${subtle} ${isDark ? 'hover:border-white/10' : 'hover:border-[#7A60F4]/20'}`}>
                  <div className={`shrink-0 ${item.color}`}>{item.icon}</div>
                  <div>
                    <div className={`font-bold mb-1 text-sm ${text}`}>{item.label}</div>
                    <div className={`text-sm ${muted}`}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={`py-36 relative overflow-hidden ${isDark ? 'bg-[#08090c]' : ''}`}>
          <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(122,96,244,0.08),transparent)]' : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(122,96,244,0.06),transparent)]'}`} />
          <div ref={ctaSection.ref} className={`max-w-7xl mx-auto px-4 text-center relative z-10 ${transitionClass(ctaSection.visible)}`}>
            <div className={`p-16 md:p-28 rounded-[2.5rem] border overflow-hidden relative ${isDark ? 'bg-gradient-to-br from-[#0f1117] via-[#0d0f16] to-[#111622] border-white/[0.08]' : 'bg-gradient-to-br from-white to-slate-50/80 border-slate-200 shadow-2xl shadow-slate-200/60'}`}>
              <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7A60F4]/40 to-transparent" />
              <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(122,96,244,0.12),transparent)]' : 'bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(122,96,244,0.06),transparent)]'}`} />

              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-7 relative z-10 ${isDark ? 'bg-[#7A60F4]/10 border-[#7A60F4]/25 text-[#9EA4FF]' : 'bg-[#7A60F4]/10 border-[#7A60F4]/20 text-[#5B52C8]'}`}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7A60F4] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#7A60F4]" />
                </span>
                Ready when you are
              </div>

              <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-[-0.03em] mb-6 leading-[1.05] relative z-10 ${text}`}>
                Transform your<br />hiring process today.
              </h2>
              <p className={`text-xl max-w-xl mx-auto mb-10 relative z-10 ${muted}`}>
                Join thousands of HR teams and candidates building better careers with AI-powered intelligence.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
                <a href={APP_URL} target="_blank" rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-[1.125rem] rounded-2xl font-bold bg-[#7A60F4] hover:bg-[#6B52E8] text-white shadow-xl shadow-[#7A60F4]/25 hover:shadow-[#7A60F4]/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm">
                  Get Started for Free
                  <ArrowRightIcon />
                </a>
                <a href={APP_URL} target="_blank" rel="noopener noreferrer"
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-[1.125rem] rounded-2xl font-bold transition-all border text-sm ${isDark ? 'bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.09] hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                  Log In to Dashboard
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className={`border-t relative z-10 ${isDark ? 'bg-[#050608] border-white/[0.06]' : 'bg-white border-slate-200/60'}`}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <HraiLogo height={30} />
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#92D8F2] via-[#7A60F4] to-[#9EA4FF] bg-clip-text text-transparent select-none">
              HRAIPP
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Privacy</Link>
            <Link to="/terms"   className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Terms</Link>
            <a href="mailto:info@boldgeneric.com" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Support</a>
          </div>

          <div className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>© 2026 HRAIPP.</span>
            <span>Built by</span>
            <a href="https://boldgeneric.com/" target="_blank" rel="noreferrer" className={`font-bold transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              Bold Generic
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
