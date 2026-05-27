import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const APP_URL = import.meta.env.DEV ? 'http://localhost:5173/?login' : 'https://app.hraipp.com/?login';

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

const HraiLogo = ({ height = 32 }: { height?: number }) => (
  <img src="/logo.png" alt="HRAIPP" style={{ height: `${height}px`, width: 'auto' }} draggable={false} className="select-none shrink-0" />
);

const ArrowRightIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

function useIntersection<T extends HTMLElement>(ref: React.RefObject<T>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return visible;
}

interface StepData {
  num: string;
  title: string;
  desc: string;
  placeholder: string;
  imgSrc: string;
}

const STEPS: StepData[] = [
  {
    num: '01',
    title: 'Create a Job Position',
    desc: 'Navigate to the Jobs tab to create a new opening. Define mandatory skills, seniority levels, and specific requirements. The AI uses these exact criteria as a benchmark to evaluate all incoming candidates.',
    placeholder: 'Screenshot: Job creation modal with skill tags',
    imgSrc: '/assets/step1.jpeg'
  },
  {
    num: '02',
    title: 'Receive Applications',
    desc: 'Publish your job and wait for candidates to apply. As applications roll in, their resumes automatically flow into your talent pool, ready for the next phase.',
    placeholder: 'Screenshot: Candidates applying or list of received applications',
    imgSrc: '/assets/step2.jpeg'
  },
  {
    num: '03',
    title: 'Run AI Screening',
    desc: 'Once you have candidates, initiate the AI screening process. The engine cross-references every resume against your specific job requirements, generating an objective Match Score instantly.',
    placeholder: 'Screenshot: AI screening in progress or candidate list with scores',
    imgSrc: '/assets/step3.jpeg'
  },
  {
    num: '04',
    title: 'Visualize and Compare',
    desc: 'Use the Compare tab to view multi-dimensional radar charts. Visually compare shortlisted candidates side-by-side to easily spot skill gaps and identify the strongest applicant.',
    placeholder: 'Screenshot: Radar charts comparing candidates',
    imgSrc: '/assets/step4.jpeg'
  },
  {
    num: '05',
    title: 'Manage the Pipeline',
    desc: 'Track hiring progress on the interactive Kanban board. Drag and drop candidates through stages like Review, Shortlisted, and Interview to keep your recruitment organized and efficient.',
    placeholder: 'Screenshot: Kanban board with candidate cards',
    imgSrc: '/assets/step5.jpeg'
  }
];

interface StepBlockProps {
  step: StepData;
  idx: number;
  isDark: boolean;
}

function StepBlock({ step, idx, isDark }: StepBlockProps) {
  const stepRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
    const stepVisible = useIntersection(stepRef, 0.2);
  const isEven = idx % 2 === 0;

  const text = isDark ? 'text-white' : 'text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  const windowBorder = isDark ? 'border-white/10' : 'border-slate-200/80';
  const windowShadow = isDark ? 'shadow-[0_0_50px_-12px_rgba(122,96,244,0.15)]' : 'shadow-2xl shadow-slate-200/60';
  const headerBg = isDark ? 'bg-gradient-to-b from-[#1a1d24] to-[#111318]' : 'bg-gradient-to-b from-slate-50 to-slate-100';

  const transitionClass = `transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1) ${stepVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`;

  return (
    <div ref={stepRef} className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${isEven ? '' : 'lg:flex-row-reverse'} ${transitionClass}`}>

      <div className={`w-full lg:w-5/12 flex flex-col ${isEven ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'}`}>

        <div className={`text-[5.5rem] sm:text-[7rem] font-black leading-none tracking-tighter mb-4 text-transparent bg-clip-text ${isDark ? 'bg-gradient-to-b from-[#7A60F4]/30 to-transparent' : 'bg-gradient-to-b from-[#7A60F4]/20 to-transparent'}`}>
          {step.num}
        </div>
        <h3 className={`text-3xl sm:text-4xl font-black mb-6 tracking-tight ${text}`}>{step.title}</h3>
        <p className={`text-lg sm:text-xl leading-relaxed ${muted}`}>{step.desc}</p>
      </div>

      <div className="w-full lg:w-7/12 relative group">

        <div className={`absolute -inset-4 rounded-[2.5rem] blur-2xl transition-opacity duration-700 opacity-0 group-hover:opacity-100 ${isDark ? 'bg-[#7A60F4]/10' : 'bg-[#7A60F4]/8'}`} />

        <div className={`relative rounded-[1.5rem] border ${windowBorder} flex flex-col overflow-hidden transition-transform duration-700 hover:-translate-y-1 ${windowShadow} ${isDark ? 'bg-[#0b0d13]' : 'bg-white'}`}>

          <div className={`flex items-center px-4 py-3.5 border-b ${windowBorder} ${headerBg}`}>
            <div className="flex gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-rose-400/90" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FF906D]/90" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#7A60F4]/70" />
            </div>
          </div>

          <div className={`relative w-full ${isDark ? 'bg-[#08090c]' : 'bg-slate-50'}`}>
            <img
              src={step.imgSrc}
              alt={step.title}
              className="w-full h-auto block object-contain"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

export function GuidePage() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#08090c' : '#fafcff';
  }, [theme]);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#08090c]' : 'bg-[#fafcff]';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  const headerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
    const headerVisible = useIntersection(headerRef, 0.1);

  return (
    <div className={`min-h-screen font-sans selection:bg-[#7A60F4]/20 overflow-x-hidden transition-colors duration-500 ${bg} ${text}`}>

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[160px] ${isDark ? 'bg-[#7A60F4]/12' : 'bg-[#7A60F4]/35'}`} style={{ animation: 'drift1 18s ease-in-out infinite alternate' }} />
        <div className={`absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] ${isDark ? 'bg-[#29C5F6]/18' : 'bg-[#29C5F6]/65'}`} style={{ animation: 'drift2 22s ease-in-out infinite alternate' }} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] ${isDark ? 'bg-[#9EA4FF]/8' : 'bg-[#9EA4FF]/35'}`} style={{ animation: 'drift1 14s ease-in-out infinite alternate-reverse' }} />
        <style>{`
          @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,40px) scale(1.08); } }
          @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,60px) scale(1.12); } }
        `}</style>
      </div>

      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? (isDark ? 'bg-[#08090c]/85 backdrop-blur-2xl border-b border-white/[0.07] py-3 shadow-2xl shadow-black/30' : 'bg-white/85 backdrop-blur-2xl border-b border-slate-200/60 py-3 shadow-lg shadow-slate-200/30') : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative">

          <div className="flex justify-start z-10">
            <Link to="/" className="group">
              <HraiLogo height={72} />
            </Link>
          </div>

          <nav className={`hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10 justify-center items-center gap-0.5 px-2 py-1.5 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/70 border-slate-200/70 shadow-sm'}`}>
            <Link to="/" className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Home</Link>

            <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />

            <Link to="/guide"    className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-[#9EA4FF] bg-[#7A60F4]/10' : 'text-[#7A60F4] bg-[#7A60F4]/8'}`}>HR Guide</Link>
            <Link to="/privacy"  className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Privacy</Link>
            <Link to="/terms"    className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Terms</Link>
          </nav>

          <div className="flex justify-end items-center gap-4 z-10">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label="Toggle theme"
              style={!isDark ? { color: '#7A60F4', backgroundColor: 'rgba(122,96,244,0.08)', borderColor: 'rgba(122,96,244,0.3)' } : undefined}
              className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-white/[0.06] border-white/10 text-[#FF906D] hover:text-[#FF906D] hover:bg-white/10' : 'shadow-sm hover:opacity-80'}`}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-36 pb-24 px-6 max-w-7xl mx-auto">

        <div ref={headerRef} className={`text-center mb-32 transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1) ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-6 ${isDark ? 'bg-[#7A60F4]/10 border-[#7A60F4]/25 text-[#9EA4FF]' : 'bg-[#7A60F4]/10 border-[#7A60F4]/20 text-[#5B52C8]'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7A60F4] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7A60F4]" />
            </span>
            HR Guide
          </div>
          <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.05] ${text}`}>
            How to hire faster with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF]">HRAIPP</span>
          </h1>
          <p className={`text-xl sm:text-2xl max-w-3xl mx-auto leading-relaxed ${muted}`}>
            A complete walkthrough for HR professionals and recruiters: from creating a job profile to shortlisting the perfect candidate.
          </p>
        </div>

        <div className="relative">
          <div className={`absolute left-8 lg:left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden lg:block ${isDark ? 'bg-gradient-to-b from-transparent via-white/10 to-transparent' : 'bg-gradient-to-b from-transparent via-slate-200 to-transparent'}`} />

          <div className="space-y-40">
            {STEPS.map((step, idx) => (
              <StepBlock key={idx} step={step} idx={idx} isDark={isDark} />
            ))}
          </div>
        </div>

        <div className="mt-48 text-center relative">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none ${isDark ? 'bg-[#7A60F4]/10' : 'bg-[#7A60F4]/8'}`} />
          <h3 className={`text-3xl sm:text-4xl font-bold mb-8 relative z-10 ${text}`}>Ready to optimize your hiring?</h3>
          <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="relative z-10 inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold transition-all hover:scale-[1.02] shadow-xl bg-[#7A60F4] hover:bg-[#6B52E8] text-white shadow-[#7A60F4]/25 hover:shadow-[#7A60F4]/40">
            Launch Platform
            <ArrowRightIcon className="w-5 h-5" />
          </a>
        </div>

      </main>

      <footer className={`border-t relative z-10 mt-20 ${isDark ? 'bg-[#050608] border-white/[0.06]' : 'bg-white border-slate-200/60'}`}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center">
            <Link to="/" className="group">
              <HraiLogo height={60} />
            </Link>
          </div>
          <div className={`text-sm font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>© 2026 HRAIPP.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}