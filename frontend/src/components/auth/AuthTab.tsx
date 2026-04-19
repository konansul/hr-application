import { useState, type FormEvent } from 'react';
import { authApi } from '../../api';
import { useStore } from '../../store';
import { DICT, LANGUAGES } from '../../internationalization.ts';

interface User {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const { theme, setTheme, language, setLanguage } = useStore();
  const t = DICT[language as keyof typeof DICT]?.auth || DICT.en.auth;

  const [mode, setMode] = useState<'Login' | 'Register'>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState<'hr' | 'candidate'>('hr');

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (mode === 'Register') {
        const finalOrgName = role === 'hr' ? orgName : '';
        await authApi.register(email, password, firstName, lastName, finalOrgName, role);
        setMessage(`Account created. Please login.`);
        setMode('Login');
      } else {
        await authApi.login(email, password);
        const user = await authApi.getMe();
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Auth failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-black transition-colors duration-500 overflow-hidden relative">

      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
        >
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
        </select>

        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 bg-gray-100 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
        >
          {theme === 'light' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          ) : (
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          )}
        </button>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 dark:bg-neutral-950 p-16 flex-col justify-between relative overflow-hidden border-r border-gray-100 dark:border-neutral-900 transition-colors">
        <div className="relative z-10">
          <div className="w-14 h-14 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center mb-10 shadow-lg transition-colors">
            <svg className="w-8 h-8 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h1 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
            {t.heroTitle} <br />
            <span className="text-blue-600 dark:text-blue-400">{t.heroSubtitle}</span>
          </h1>

          <p className="text-lg text-gray-500 dark:text-neutral-400 max-w-md mb-12 font-medium">
            {t.heroDesc}
          </p>

          <div className="space-y-10">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-900 shadow-sm border border-gray-100 dark:border-neutral-800 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-bold">{num}</div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{t[`feature${num}` as keyof typeof t]}</h4>
                  <p className="text-gray-400 dark:text-neutral-500 text-sm mt-1">{t[`feature${num}Desc` as keyof typeof t]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 dark:text-neutral-700 flex gap-8">
          <span>AI RECRUITER v2.0</span>
          <span>ENTERPRISE READY</span>
        </div>

        <div className="absolute top-[-5%] right-[-5%] w-80 h-80 bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-black transition-colors">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {mode === 'Login' ? t.signIn : t.createAccount}
            </h2>
            <p className="text-gray-500 dark:text-neutral-400 mt-2">
              {mode === 'Login' ? t.accessDash : t.joinPlatform}
            </p>
          </div>

          <div className="flex p-1 mb-8 bg-gray-100 dark:bg-neutral-900 rounded-2xl">
            <button
              onClick={() => setMode('Login')}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                mode === 'Login' ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-neutral-500 hover:text-gray-700'
              }`}
            >
              {t.login}
            </button>
            <button
              onClick={() => setMode('Register')}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                mode === 'Register' ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-neutral-500 hover:text-gray-700'
              }`}
            >
              {t.register}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className="p-4 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl transition-colors">
                ✓ {message}
              </div>
            )}

            {error && (
              <div className="p-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl transition-colors">
                ✕ {error}
              </div>
            )}

            {mode === 'Register' && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-wider ml-1">{t.firstName}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-neutral-900 dark:text-white border border-gray-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-600"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-wider ml-1">{t.lastName}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-neutral-900 dark:text-white border border-gray-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-600"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-wider ml-1">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-neutral-900 dark:text-white border border-gray-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-600"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-wider ml-1">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-neutral-900 dark:text-white border border-gray-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-600"
                placeholder="••••••••"
              />
            </div>

            {mode === 'Register' && (
              <>
                <div className="space-y-3 pt-2">
                  <label className="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-wider ml-1">{t.accountType}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setRole('hr')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${
                        role === 'hr' ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-neutral-800' : 'border-gray-100 dark:border-neutral-900 bg-white dark:bg-black hover:border-gray-200'
                      }`}
                    >
                      <svg className={`w-5 h-5 ${role === 'hr' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-[11px] font-bold uppercase ${role === 'hr' ? 'dark:text-white' : 'text-gray-400'}`}>HR</span>
                    </div>
                    <div
                      onClick={() => setRole('candidate')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${
                        role === 'candidate' ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-neutral-800' : 'border-gray-100 dark:border-neutral-900 bg-white dark:bg-black hover:border-gray-200'
                      }`}
                    >
                      <svg className={`w-5 h-5 ${role === 'candidate' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className={`text-[11px] font-bold uppercase ${role === 'candidate' ? 'dark:text-white' : 'text-gray-400'}`}>Candidate</span>
                    </div>
                  </div>
                </div>

                {role === 'hr' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 tracking-wider ml-1">{t.organization}</label>
                    <input
                      type="text"
                      placeholder={t.orgPlaceholder}
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 bg-gray-50 dark:bg-neutral-900 dark:text-white border border-gray-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-600"
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="w-full mt-6 py-4 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black font-bold rounded-2xl shadow-sm transition-all active:scale-[0.98]"
            >
              {mode === 'Login' ? t.signIn : t.createAccount}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}