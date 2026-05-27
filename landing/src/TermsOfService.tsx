import { useState, useEffect } from 'react';
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

export function TermsOfServicePage() {
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
  const paragraph = isDark ? 'text-slate-300' : 'text-slate-600';
  const divider = isDark ? 'bg-white/10' : 'bg-slate-200';

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

            <Link to="/guide"   className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>HR Guide</Link>
            <Link to="/privacy" className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Privacy</Link>
            <Link to="/terms"   className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-[#9EA4FF] bg-[#7A60F4]/10' : 'text-[#7A60F4] bg-[#7A60F4]/8'}`}>Terms</Link>
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
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${isDark ? 'text-slate-300 border-white/10 hover:border-white/20 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]' : 'text-slate-600 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-sm'}`}>
              Log In
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-40 pb-32 px-6">
        <div className="max-w-3xl mx-auto">

          <div className="mb-20 text-center md:text-left">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-6 ${isDark ? 'bg-[#7A60F4]/10 border-[#7A60F4]/25 text-[#9EA4FF]' : 'bg-[#7A60F4]/10 border-[#7A60F4]/20 text-[#5B52C8]'}`}>
              Bold Generic Solutions
            </div>
            <h1 className={`text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight ${text}`}>
              Terms of Service
            </h1>
            <p className={`text-lg font-medium ${muted}`}>
              Effective Date: May 5, 2026
            </p>
          </div>

          <div className="space-y-16">

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">01.</span>
                Acceptance of Terms
              </h2>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                By creating an account or using the <strong className={text}>Bold Generic Solutions</strong> platform, you agree to be bound by these Terms. If you do not agree, you must not use our services.
              </p>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">02.</span>
                User Accounts
              </h2>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Eligibility:</strong> You must be at least 18 years old (or the legal age of majority in your jurisdiction).</li>
                <li><strong className={text}>Accuracy:</strong> You agree to provide accurate information. Creating accounts with fake names or disposable emails is a breach of these terms.</li>
                <li><strong className={text}>Security:</strong> You are solely responsible for protecting your password. Bold Generic Solutions is not liable for unauthorized access resulting from your failure to secure your credentials.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">03.</span>
                Third-Party Job Links
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${paragraph}`}>
                Our platform aggregates job listings from third-party sources (e.g., Adzuna).
              </p>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Independent Entities:</strong> External job boards and employers are independent of Bold Generic Solutions. We do not control their websites, application processes, or hiring decisions.</li>
                <li><strong className={text}>No Endorsement:</strong> The inclusion of a link does not imply endorsement. We do not guarantee that the job listings are accurate, current, or free from errors.</li>
                <li><strong className={text}>Risk:</strong> You acknowledge that applying for a job on a third-party site is at your own risk. We are not liable for any interactions, disputes, or losses (financial or data-related) that occur after you leave our platform.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">04.</span>
                AI-Generated Content & CV Parsing
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${paragraph}`}>
                We provide AI tools to assist in structuring your professional profile (EU AI Act Compliance).
              </p>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Informational Only:</strong> AI outputs (parsed skills, summaries, matched vacancies) are suggestions. They do not constitute professional career advice.</li>
                <li><strong className={text}>User Responsibility:</strong> You must review all AI-generated or AI-parsed content. Bold Generic Solutions is not responsible for inaccuracies in your profile created by the AI.</li>
                <li><strong className={text}>No Autonomy:</strong> Our AI does not make final employment decisions. It is a tool for your personal use.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">05.</span>
                Prohibited Conduct
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${paragraph}`}>
                You agree NOT to:
              </p>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li>Use any automated system (bots, scrapers) to extract data from our platform.</li>
                <li>Post fraudulent vacancies (for HR users) or submit fake CVs (for Candidates).</li>
                <li>Use the platform for any illegal purpose or to harass other users.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">06.</span>
                Limitation of Liability
              </h2>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                To the maximum extent permitted by law, <strong className={text}>Bold Generic Solutions</strong> shall not be liable for any indirect, incidental, or consequential damages, including loss of profits or employment opportunities. Our service is provided "As-Is" without warranties of any kind.
              </p>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">07.</span>
                Termination
              </h2>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                We reserve the right to suspend or terminate your account at our sole discretion if we believe you have violated these Terms or engaged in behaviour that puts our community or platform at risk.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className={`border-t relative z-10 ${isDark ? 'bg-[#050608] border-white/[0.06]' : 'bg-white border-slate-200/60'}`}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center">
            <Link to="/" className="group">
              <HraiLogo height={60} />
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Privacy</Link>
            <Link to="/terms" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Terms</Link>
            <a href="mailto:info@boldgeneric.com" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Support</a>
          </div>

          <div className={`text-xs font-medium flex items-center gap-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>© 2026 HRAIPP.</span>
            <span>Built by</span>
            <a href="https://boldgeneric.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity">
              <img src="/bold-generic-logo.png" alt="Bold Generic Solutions" className={`h-8 ${isDark ? 'brightness-0 invert opacity-60' : ''}`} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}