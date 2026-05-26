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
            <Link to="/" className="flex items-center gap-2.5 group">
              <HraiLogo height={36} />
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-[#92D8F2] via-[#7A60F4] to-[#9EA4FF] bg-clip-text text-transparent select-none">
                HRAIPP
              </span>
            </Link>
          </div>

          <nav className={`hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10 justify-center items-center gap-0.5 px-2 py-1.5 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/70 border-slate-200/70 shadow-sm'}`}>
            <Link to="/" className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Home</Link>

            <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />

            <Link to="/guide"   className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>HR Guide</Link>
            <Link to="/privacy" className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-[#9EA4FF] bg-[#7A60F4]/10' : 'text-[#7A60F4] bg-[#7A60F4]/8'}`}>Privacy</Link>
            <Link to="/terms"   className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.07]' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}>Terms</Link>
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
              Privacy Policy
            </h1>
            <p className={`text-lg font-medium ${muted}`}>
              Effective Date: May 5, 2026
            </p>
          </div>

          <div className="space-y-16">
            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">01.</span>
                Introduction
              </h2>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                Bold Generic Solutions (“we,” “us,” or “our”) provides a platform for job discovery and professional profile management. This Privacy Policy explains how we collect, use, and protect your information when you create an account and upload professional documents.
              </p>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">02.</span>
                Information We Collect
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${paragraph}`}>
                We only collect information that you voluntarily provide to us:
              </p>
              <ul className={`space-y-4 text-lg leading-relaxed ${paragraph}`}>
                <li><strong className={text}>Account Credentials:</strong> Your email address and a password (stored using industry-standard encryption).</li>
                <li><strong className={text}>Profile Information:</strong> Your name and any LinkedIn profile URL, or other personal link you choose to provide as a reference.</li>
                <li><strong className={text}>Professional Data:</strong> Information contained within CVs or resumes you upload (e.g., work history, education, and skills).</li>
                <li><strong className={text}>Technical Data:</strong> IP address and browser type, collected for security and fraud prevention.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">03.</span>
                AI Processing & Transparency
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${paragraph}`}>
                To help you build a profile, we use Artificial Intelligence (AI) to parse your uploaded documents.
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed mb-10 marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>How it works:</strong> Our AI identifies professional milestones and skills from your CV to pre-fill your profile fields.</li>
                <li><strong className={text}>User Control:</strong> You have full "Human-in-the-loop" control. The AI does not finalize your profile; you must review, edit, and save the data yourself.</li>
                <li><strong className={text}>No Automated Decision-Making:</strong> We do not use AI to rank you against other candidates or decide your eligibility for a job. We are a tool for you, not a screening tool for employers.</li>
              </ul>

              <h3 className={`text-xl md:text-2xl font-bold tracking-tight mb-4 mt-10 flex items-baseline gap-3 ${text}`}>
                <span className={`font-black ${isDark ? 'text-[#9EA4FF]/80' : 'text-[#5B52C8]/80'}`}>3.1</span>
                Third-Party AI Sub-processors
              </h3>
              <p className={`text-lg leading-relaxed mb-4 ${paragraph}`}>
                To provide high-quality CV parsing and profile generation, The Company utilizes third-party Artificial Intelligence providers. Specifically, your professional data is processed through <strong className={text}>OpenRouter</strong>, which serves as a secure gateway to Large Language Models (LLMs) including, but not limited to, <strong className={text}>OpenAI</strong>.
              </p>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                These sub-processors are contractually prohibited from using your personal data to train their global models and may only process your data to provide the specific parsing services requested by the Platform.
              </p>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">04.</span>
                Our "No-Sharing" Commitment
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${paragraph}`}>
                We do not share, sell, or rent your personal data to third parties.
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Direct Application:</strong> Our app provides links to external job boards. When you click these links, you leave our app.</li>
                <li><strong className={text}>No Data Transfer:</strong> We do not send your CV or email to these external sites. You remain in control of your data and must submit your own application on the third-party website.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">05.</span>
                Data Security
              </h2>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Encryption:</strong> Your password and CV are encrypted in transit (SSL/TLS) and at rest on our secure servers.</li>
                <li><strong className={text}>Account Safety:</strong> You are responsible for maintaining the confidentiality of your password. We recommend using a unique password for this service.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">06.</span>
                Your Rights & Compliance
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${paragraph}`}>
                Regardless of where you live, we provide the following rights:
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Right to Access:</strong> You can view all data we hold about you in your Profile settings.</li>
                <li><strong className={text}>Right to Erasure:</strong> You may delete your account at any time. Upon deletion, your email, password, and all uploaded CV files are permanently removed from our active databases.</li>
                <li><strong className={text}>California (CCPA) / EU (GDPR) Notice:</strong> This policy serves as your "Notice at Collection." By creating an account, you consent to the processing of your professional data for the purpose of job discovery.</li>
              </ul>

              <h3 className={`text-xl md:text-2xl font-bold tracking-tight mb-4 mt-10 flex items-baseline gap-3 ${text}`}>
                <span className={`font-black ${isDark ? 'text-[#9EA4FF]/80' : 'text-[#5B52C8]/80'}`}>6.1</span>
                Data Retention
              </h3>
              <p className={`text-lg leading-relaxed mb-4 ${paragraph}`}>
                We retain personal and professional data only for as long as necessary to provide our services, maintain platform security, comply with legal obligations, and support legitimate recruitment-related activities.
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Active Accounts:</strong> Your profile, uploaded CVs, AI-parsed profile information, and related account data are retained while your account remains active.</li>
                <li><strong className={text}>Inactive Accounts:</strong> Accounts that remain inactive for an extended period may be deleted or anonymized after approximately 6 months of inactivity unless continued retention is legally required or you provide renewed consent.</li>
                <li><strong className={text}>Account Deletion Requests:</strong> If you delete your account, your personal data and uploaded files will be removed from our active systems within a reasonable operational timeframe, except where retention is required for fraud prevention, dispute resolution, security logging, or compliance with applicable law.</li>
                <li><strong className={text}>AI Processing Data:</strong> AI-generated profile parsing results and related processing metadata are retained only as long as necessary to support profile functionality, platform integrity, and service improvement obligations.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">07.</span>
                Contact
              </h2>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                For questions or to exercise your data rights, contact: <a href="mailto:info@boldgeneric.com" className="font-bold text-[#7A60F4] hover:text-[#9EA4FF] underline underline-offset-4 transition-colors">info@boldgeneric.com</a>
              </p>
            </section>

            <div className="pt-20 pb-10">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-6 ${isDark ? 'bg-[#7A60F4]/10 border-[#7A60F4]/25 text-[#9EA4FF]' : 'bg-[#7A60F4]/10 border-[#7A60F4]/20 text-[#5B52C8]'}`}>
                For Employers
              </div>
              <h2 className={`text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight ${text}`}>
                HR Specialist Version
              </h2>
              <p className={`text-lg font-medium ${muted}`}>
                Applies to recruiters, hiring managers, and HR personnel.
              </p>
            </div>

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">01.</span>
                Introduction
              </h2>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                This policy applies to HR specialists, recruiters, and hiring managers ("Recruiters") using Bold Generic Solutions. As a Recruiter, you are a <strong className={text}>Data Controller</strong> for any candidate information you access or download through our platform.
              </p>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">02.</span>
                Information We Collect
              </h2>
              <p className={`text-lg leading-relaxed mb-4 ${paragraph}`}>To verify your account and provide our services, we collect:</p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Professional Identity:</strong> Work email (corporate domains only), job title, and company name.</li>
                <li><strong className={text}>Verification Data:</strong> LinkedIn Business URL or corporate tax ID.</li>
                <li><strong className={text}>Platform Activity:</strong> Logs of vacancies posted, candidates contacted, and AI queries (Mandatory under 2026 Audit Laws).</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">03.</span>
                Permitted Use of Candidate Data
              </h2>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Prohibition on Harvesting:</strong> Automated scraping or mass-downloading of candidate data is strictly prohibited and will result in an immediate ban.</li>
                <li><strong className={text}>Direct Contact:</strong> You may only contact candidates through the platform's approved channels unless shared explicitly.</li>
              </ul>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">04.</span>
                AI-Assisted Matching
              </h2>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed mb-10 marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Human Oversight:</strong> Our AI is a recommendation engine, not a decision-maker. Recruiters are legally responsible for the final selection.</li>
                <li><strong className={text}>Bias Monitoring:</strong> We monitor our AI for demographic bias. Recruiters agree not to use AI outputs to discriminate.</li>
              </ul>

              <h3 className={`text-xl md:text-2xl font-bold tracking-tight mb-4 mt-10 flex items-baseline gap-3 ${text}`}>
                <span className={`font-black ${isDark ? 'text-[#9EA4FF]/80' : 'text-[#5B52C8]/80'}`}>4.1</span>
                AI Infrastructure Disclosure
              </h3>
              <p className={`text-lg leading-relaxed ${paragraph}`}>
                The Company employs <strong>OpenRouter</strong> and <strong>OpenAI</strong> as sub-processors to analyze job descriptions and facilitate candidate matching. By using these tools, Recruiters acknowledge that anonymized job requirements and search queries are processed by these third-party providers.
              </p>
            </section>

            <div className={`h-px w-full ${divider}`} />

            <section>
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-baseline gap-3 ${text}`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A60F4] to-[#9EA4FF] font-black">05.</span>
                Data Processing Agreement (DPA)
              </h2>
              <p className={`text-lg leading-relaxed mb-4 ${paragraph}`}>By using our HR tools, you agree to our Data Processing Addendum. You promise to:</p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li>Delete any downloaded candidate data if the candidate exercises their "Right to be Forgotten."</li>
                <li>Maintain "Reasonable Security" over any data moved to your internal Applicant Tracking System (ATS).</li>
              </ul>

              <h3 className={`text-xl md:text-2xl font-bold tracking-tight mb-4 mt-10 flex items-baseline gap-3 ${text}`}>
                <span className={`font-black ${isDark ? 'text-[#9EA4FF]/80' : 'text-[#5B52C8]/80'}`}>5.1</span>
                Recruiter Data Retention
              </h3>
              <p className={`text-lg leading-relaxed mb-4 ${paragraph}`}>
                Recruiter account information, platform activity logs, and recruitment-related records are retained only for as long as necessary to provide the service, maintain auditability, enforce platform rules, and comply with applicable legal obligations.
              </p>
              <ul className={`list-disc pl-6 space-y-3 text-lg leading-relaxed marker:text-[#7A60F4] ${paragraph}`}>
                <li><strong className={text}>Retention Limits:</strong> Recruiters must not independently retain, export, or store candidate personal data longer than necessary for legitimate recruitment purposes.</li>
                <li><strong className={text}>Secure Deletion:</strong> Downloaded or exported candidate information should be securely deleted when no longer required for an active recruitment process or when a candidate exercises applicable privacy rights.</li>
                <li><strong className={text}>Activity Logs:</strong> Platform-generated activity logs, including candidate profile views, recruiter actions, and AI-assisted matching activity, may be retained for approximately 6 months for security, fraud prevention, compliance auditing, and dispute resolution purposes.</li>
              </ul>
            </section>

          </div>
        </div>
      </main>

      <footer className={`border-t relative z-10 ${isDark ? 'bg-[#050608] border-white/[0.06]' : 'bg-white border-slate-200/60'}`}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <HraiLogo height={30} />
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#92D8F2] via-[#7A60F4] to-[#9EA4FF] bg-clip-text text-transparent select-none">
                HRAIPP
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Privacy</Link>
            <Link to="/terms" className={`text-xs font-semibold transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>Terms</Link>
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