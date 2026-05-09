import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export function TermsOfServicePage() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

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

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-500/20 overflow-x-hidden transition-colors duration-500 ${bg} ${text}`}>

      {/* === ФОНОВЫЕ ЭФФЕКТЫ (Цвета приложения) === */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Индиго (Слева сверху) */}
        <div className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[160px] ${isDark ? 'bg-indigo-600/15' : 'bg-indigo-300/40'}`} style={{ animation: 'drift1 18s ease-in-out infinite alternate' }} />

        {/* Фиолетовый (Справа снизу) */}
        <div className={`absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] ${isDark ? 'bg-violet-600/15' : 'bg-violet-300/40'}`} style={{ animation: 'drift2 22s ease-in-out infinite alternate' }} />

        {/* Изумрудный (Справа по центру) */}
        <div className={`absolute top-1/3 -right-20 w-[600px] h-[600px] rounded-full blur-[140px] ${isDark ? 'bg-emerald-600/10' : 'bg-emerald-200/40'}`} style={{ animation: 'drift1 25s ease-in-out infinite alternate-reverse' }} />

        {/* Фуксия (Слева снизу) */}
        <div className={`absolute bottom-1/3 -left-20 w-[500px] h-[500px] rounded-full blur-[150px] ${isDark ? 'bg-fuchsia-600/10' : 'bg-fuchsia-200/40'}`} style={{ animation: 'drift2 20s ease-in-out infinite alternate-reverse' }} />

        {/* Сетка */}
        <div className={`absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:40px_40px] ${isDark ? 'text-white opacity-[0.03]' : 'text-slate-900 opacity-[0.03]'}`} />

        <style>{`
          @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,40px) scale(1.08); } }
          @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,60px) scale(1.12); } }
        `}</style>
      </div>

      {/* ШАПКА */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? (isDark ? 'bg-[#08090c]/85 backdrop-blur-2xl border-b border-white/[0.07] py-3 shadow-2xl shadow-black/30' : 'bg-white/85 backdrop-blur-2xl border-b border-slate-200/60 py-3 shadow-lg shadow-slate-200/30') : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 items-center">
          <div className="flex justify-start">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${isDark ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-indigo-500/25' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'}`}>
                <BoltIcon />
              </div>
              <span className={`font-black text-xl tracking-tighter ${text}`}>HR.App</span>
            </Link>
          </div>

          <div className="hidden md:flex justify-center" />

          <div className="flex justify-end items-center gap-3">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-white/[0.06] border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link to="/" className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${isDark ? 'text-slate-300 border-white/10 hover:border-white/20 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]' : 'text-slate-600 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-sm'}`}>
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ (ЧИСТАЯ ТИПОГРАФИКА) */}
      <main className="relative z-10 pt-40 pb-32 px-6">
        <div className="max-w-3xl mx-auto">

          {/* ЗАГОЛОВОК СТРАНИЦЫ */}
          <div className="mb-20">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-6 ${isDark ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
              Bold Generic Solutions
            </div>
            <h1 className={`text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight ${text}`}>
              Terms of Service
            </h1>
            <p className={`text-lg font-medium ${muted}`}>
              Effective Date: May 5, 2026
            </p>
          </div>

          {/* ТЕКСТ ДОКУМЕНТА */}
          <div className="space-y-16">

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">01.</span>
                Acceptance of Terms
              </h2>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                By creating an account or using the <strong className={text}>Bold Generic Solutions</strong> platform, you agree to be bound by these Terms. If you do not agree, you must not use our services.
              </p>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">02.</span>
                User Accounts
              </h2>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>Eligibility:</strong> You must be at least 18 years old (or the legal age of majority in your jurisdiction).</li>
                <li><strong className={text}>Accuracy:</strong> You agree to provide accurate information. Creating accounts with fake names or disposable emails is a breach of these terms.</li>
                <li><strong className={text}>Security:</strong> You are solely responsible for protecting your password. Bold Generic Solutions is not liable for unauthorized access resulting from your failure to secure your credentials.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">03.</span>
                Third-Party Job Links
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Our platform aggregates job listings from third-party sources (e.g., Adzuna).
              </p>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>Independent Entities:</strong> External job boards and employers are independent of Bold Generic Solutions. We do not control their websites, application processes, or hiring decisions.</li>
                <li><strong className={text}>No Endorsement:</strong> The inclusion of a link does not imply endorsement. We do not guarantee that the job listings are accurate, current, or free from errors.</li>
                <li><strong className={text}>Risk:</strong> You acknowledge that applying for a job on a third-party site is at your own risk. We are not liable for any interactions, disputes, or losses (financial or data-related) that occur after you leave our platform.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">04.</span>
                AI-Generated Content & CV Parsing
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                We provide AI tools to assist in structuring your professional profile (EU AI Act Compliance).
              </p>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>Informational Only:</strong> AI outputs (parsed skills, summaries, matched vacancies) are suggestions. They do not constitute professional career advice.</li>
                <li><strong className={text}>User Responsibility:</strong> You must review all AI-generated or AI-parsed content. Bold Generic Solutions is not responsible for inaccuracies in your profile created by the AI.</li>
                <li><strong className={text}>No Autonomy:</strong> Our AI does not make final employment decisions. It is a tool for your personal use.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">05.</span>
                Prohibited Conduct
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                You agree NOT to:
              </p>
              <ul className={`list-disc pl-6 space-y-4 text-lg leading-relaxed marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li>Use any automated system (bots, scrapers) to extract data from our platform.</li>
                <li>Post fraudulent vacancies (for HR users) or submit fake CVs (for Candidates).</li>
                <li>Use the platform for any illegal purpose or to harass other users.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">06.</span>
                Limitation of Liability
              </h2>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                To the maximum extent permitted by law, <strong className={text}>Bold Generic Solutions</strong> shall not be liable for any indirect, incidental, or consequential damages, including loss of profits or employment opportunities. Our service is provided "As-Is" without warranties of any kind.
              </p>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">07.</span>
                Termination
              </h2>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                We reserve the right to suspend or terminate your account at our sole discretion if we believe you have violated these Terms or engaged in behaviour that puts our community or platform at risk.
              </p>
            </section>

          </div>
        </div>
      </main>

      {/* ФУТЕР */}
      <footer className={`border-t relative z-10 ${isDark ? 'bg-[#050608] border-white/[0.06]' : 'bg-white border-slate-200/60'}`}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-indigo-600 to-violet-700'}`}>
                <BoltIcon />
              </div>
              <span className={`font-black text-lg tracking-tighter ${text}`}>HR.App</span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Privacy</Link>
            <Link to="/terms" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Terms</Link>
            <a href="mailto:info@boldgeneric.com" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Support</a>
          </div>

          <div className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>© 2026 HR Application.</span>
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