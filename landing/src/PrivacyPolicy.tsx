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

export function PrivacyPolicyPage() {
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

      {/* === НОВЫЕ ФОНОВЫЕ ЭФФЕКТЫ (Цвета приложения) === */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Индиго (Слева сверху) */}
        <div className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[160px] ${isDark ? 'bg-indigo-600/15' : 'bg-indigo-300/40'}`} style={{ animation: 'drift1 18s ease-in-out infinite alternate' }} />

        {/* Фиолетовый (Справа снизу) */}
        <div className={`absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] ${isDark ? 'bg-violet-600/15' : 'bg-violet-300/40'}`} style={{ animation: 'drift2 22s ease-in-out infinite alternate' }} />

        {/* Изумрудный / HR (Справа по центру) */}
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
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-white/[0.06] border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}>
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
              Privacy Policy
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
                Introduction
              </h2>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Bold Generic Solutions (“we,” “us,” or “our”) provides a platform for job discovery and professional profile management. This Privacy Policy explains how we collect, use, and protect your information when you create an account and upload professional documents.
              </p>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">02.</span>
                Information We Collect
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                We only collect information that you voluntarily provide to us:
              </p>
              <ul className={`space-y-4 text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>Account Credentials:</strong> Your email address and a password (stored using industry-standard encryption).</li>
                <li><strong className={text}>Profile Information:</strong> Your name and any LinkedIn profile URL, or other personal link you choose to provide as a reference.</li>
                <li><strong className={text}>Professional Data:</strong> Information contained within CVs or resumes you upload (e.g., work history, education, and skills).</li>
                <li><strong className={text}>Technical Data:</strong> IP address and browser type, collected for security and fraud prevention.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">03.</span>
                AI Processing & Transparency
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                To help you build a profile, we use Artificial Intelligence (AI) to parse your uploaded documents.
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed mb-10 marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>How it works:</strong> Our AI identifies professional milestones and skills from your CV to pre-fill your profile fields.</li>
                <li><strong className={text}>User Control:</strong> You have full "Human-in-the-loop" control. The AI does not finalize your profile; you must review, edit, and save the data yourself.</li>
                <li><strong className={text}>No Automated Decision-Making:</strong> We do not use AI to rank you against other candidates or decide your eligibility for a job. We are a tool for you, not a screening tool for employers.</li>
              </ul>

              <h3 className={`text-xl font-bold tracking-tight mb-4 ${text}`}>3.1 Third-Party AI Sub-processors</h3>
              <p className={`text-lg leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                To provide high-quality CV parsing and profile generation, The Company utilizes third-party Artificial Intelligence providers. Specifically, your professional data is processed through <strong className={text}>OpenRouter</strong>, which serves as a secure gateway to Large Language Models (LLMs) including, but not limited to, <strong className={text}>OpenAI</strong>.
              </p>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                These sub-processors are contractually prohibited from using your personal data to train their global models and may only process your data to provide the specific parsing services requested by the Platform.
              </p>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">04.</span>
                Our "No-Sharing" Commitment
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                We do not share, sell, or rent your personal data to third parties.
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>Direct Application:</strong> Our app provides links to external job boards. When you click these links, you leave our app.</li>
                <li><strong className={text}>No Data Transfer:</strong> We do not send your CV or email to these external sites. You remain in control of your data and must submit your own application on the third-party website.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">05.</span>
                Data Security
              </h2>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>Encryption:</strong> Your password and CV are encrypted in transit (SSL/TLS) and at rest on our secure servers.</li>
                <li><strong className={text}>Account Safety:</strong> You are responsible for maintaining the confidentiality of your password. We recommend using a unique password for this service.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">06.</span>
                Your Rights & Compliance
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Regardless of where you live, we provide the following rights:
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-indigo-500 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li><strong className={text}>Right to Access:</strong> You can view all data we hold about you in your Profile settings.</li>
                <li><strong className={text}>Right to Erasure:</strong> You may delete your account at any time. Upon deletion, your email, password, and all uploaded CV files are permanently removed from our active databases.</li>
                <li><strong className={text}>California (CCPA) / EU (GDPR) Notice:</strong> This policy serves as your "Notice at Collection." By creating an account, you consent to the processing of your professional data for the purpose of job discovery.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500 font-black">07.</span>
                Contact
              </h2>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                For questions or to exercise your data rights, contact: <a href="mailto:info@boldgeneric.com" className="font-bold text-indigo-500 hover:text-indigo-400 underline underline-offset-4 transition-colors">info@boldgeneric.com</a>
              </p>
            </section>

            {/* БЛОК ДЛЯ HR (Элегантно выделен фоном) */}
            <div className={`mt-20 p-10 md:p-14 rounded-[2.5rem] border relative overflow-hidden ${isDark ? 'bg-[#111622]/80 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]' : 'bg-emerald-50/50 border-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.1)]'}`}>

              <div className="mb-12 relative z-10">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-4 ${isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-800'}`}>
                  For Employers
                </div>
                <h2 className={`text-3xl md:text-4xl font-black tracking-tight mb-2 ${text}`}>
                  HR Specialist Version
                </h2>
                <p className={`text-sm font-medium ${muted}`}>Effective Date: May 5, 2026</p>
              </div>

              <div className="space-y-12 relative z-10">
                <section>
                  <h3 className={`text-xl font-bold tracking-tight mb-4 ${text}`}>1. Introduction</h3>
                  <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    This policy applies to HR specialists, recruiters, and hiring managers ("Recruiters") using Bold Generic Solutions. As a Recruiter, you are a <strong className={text}>Data Controller</strong> for any candidate information you access or download through our platform.
                  </p>
                </section>

                <section>
                  <h3 className={`text-xl font-bold tracking-tight mb-4 ${text}`}>2. Information We Collect</h3>
                  <p className={`text-lg leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>To verify your account and provide our services, we collect:</p>
                  <ul className={`list-disc pl-6 space-y-2 text-lg leading-relaxed marker:text-emerald-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li><strong className={text}>Professional Identity:</strong> Work email (corporate domains only), job title, and company name.</li>
                    <li><strong className={text}>Verification Data:</strong> LinkedIn Business URL or corporate tax ID.</li>
                    <li><strong className={text}>Platform Activity:</strong> Logs of vacancies posted, candidates contacted, and AI queries (Mandatory under 2026 Audit Laws).</li>
                  </ul>
                </section>

                <section>
                  <h3 className={`text-xl font-bold tracking-tight mb-4 ${text}`}>3. Permitted Use of Candidate Data</h3>
                  <ul className={`list-disc pl-6 space-y-2 text-lg leading-relaxed marker:text-emerald-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li><strong className={text}>Prohibition on Harvesting:</strong> Automated scraping or mass-downloading of candidate data is strictly prohibited and will result in an immediate ban.</li>
                    <li><strong className={text}>Direct Contact:</strong> You may only contact candidates through the platform's approved channels unless shared explicitly.</li>
                  </ul>
                </section>

                <section>
                  <h3 className={`text-xl font-bold tracking-tight mb-4 ${text}`}>4. AI-Assisted Matching</h3>
                  <ul className={`list-disc pl-6 space-y-2 text-lg leading-relaxed mb-6 marker:text-emerald-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li><strong className={text}>Human Oversight:</strong> Our AI is a recommendation engine, not a decision-maker. Recruiters are legally responsible for the final selection.</li>
                    <li><strong className={text}>Bias Monitoring:</strong> We monitor our AI for demographic bias. Recruiters agree not to use AI outputs to discriminate.</li>
                  </ul>
                  <h4 className={`text-lg font-bold tracking-tight mb-3 ${text}`}>4.1 AI Infrastructure Disclosure</h4>
                  <p className={`text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    The Company employs <strong>OpenRouter</strong> and <strong>OpenAI</strong> as sub-processors to analyze job descriptions and facilitate candidate matching. By using these tools, Recruiters acknowledge that anonymized job requirements and search queries are processed by these third-party providers.
                  </p>
                </section>

                <section>
                  <h3 className={`text-xl font-bold tracking-tight mb-4 ${text}`}>5. Data Processing Agreement (DPA)</h3>
                  <p className={`text-lg leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>By using our HR tools, you agree to our Data Processing Addendum. You promise to:</p>
                  <ul className={`list-disc pl-6 space-y-2 text-lg leading-relaxed marker:text-emerald-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li>Delete any downloaded candidate data if the candidate exercises their "Right to be Forgotten."</li>
                    <li>Maintain "Reasonable Security" over any data moved to your internal Applicant Tracking System (ATS).</li>
                  </ul>
                </section>
              </div>
            </div>

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