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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-sans relative">

      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <div className="relative group">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="appearance-none bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md text-zinc-900 dark:text-white text-[10px] font-bold uppercase tracking-widest pl-4 pr-8 py-2.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm outline-none cursor-pointer hover:bg-white dark:hover:bg-zinc-800 transition-all"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-full border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-900 dark:text-white hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'light' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          ) : (
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          )}
        </button>
      </div>

      <div className="hidden lg:flex lg:w-5/12 bg-zinc-50 dark:bg-zinc-900 p-16 flex-col justify-between relative overflow-hidden border-r border-zinc-200/50 dark:border-zinc-800/50 transition-colors">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="w-14 h-14 bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-200 rounded-2xl flex items-center justify-center mb-12 shadow-xl shadow-zinc-900/10 dark:shadow-white/5 transition-colors">
            <svg className="w-7 h-7 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h1 className="text-[2.75rem] font-black tracking-tight text-zinc-900 dark:text-white mb-6 leading-[1.15]">
            {t.heroTitle} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              {t.heroSubtitle}
            </span>
          </h1>

          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mb-14 font-medium leading-relaxed">
            {t.heroDesc}
          </p>

          <div className="space-y-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex gap-5 group">
                <div className="w-12 h-12 rounded-2xl bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-black group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-zinc-900 transition-all duration-300">
                  {num}
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t[`feature${num}` as keyof typeof t]}</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1.5 leading-snug">{t[`feature${num}Desc` as keyof typeof t]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 mt-12">
          <div className="px-3 py-1.5 rounded-md bg-zinc-200/50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 border border-zinc-300/50 dark:border-zinc-700/50">
            AI RECRUITER v2.0
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ENTERPRISE READY
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-zinc-950 transition-colors relative">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
              {mode === 'Login' ? t.signIn : t.createAccount}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-sm sm:text-base font-medium">
              {mode === 'Login' ? t.accessDash : t.joinPlatform}
            </p>
          </div>

          <div className="relative flex p-1 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-2xl mb-10 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-800 rounded-xl shadow-sm transition-all duration-300 ease-out ${mode === 'Register' ? 'translate-x-full' : 'translate-x-0'}`}
            ></div>
            <button
              type="button"
              onClick={() => setMode('Login')}
              className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors duration-300 ${
                mode === 'Login' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {t.login}
            </button>
            <button
              type="button"
              onClick={() => setMode('Register')}
              className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors duration-300 ${
                mode === 'Register' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {t.register}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div className="p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {message}
              </div>
            )}

            {error && (
              <div className="p-4 text-sm font-medium text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            {mode === 'Register' && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.firstName}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500 outline-none transition-all text-sm font-medium placeholder-zinc-400 dark:placeholder-zinc-600"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.lastName}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500 outline-none transition-all text-sm font-medium placeholder-zinc-400 dark:placeholder-zinc-600"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500 outline-none transition-all text-sm font-medium placeholder-zinc-400 dark:placeholder-zinc-600"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500 outline-none transition-all text-sm font-medium placeholder-zinc-400 dark:placeholder-zinc-600 tracking-widest"
                placeholder="••••••••"
              />
            </div>

            {mode === 'Register' && (
              <div className="animate-in slide-in-from-bottom-2 duration-300 pt-2 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.accountType}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setRole('hr')}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 overflow-hidden group ${
                        role === 'hr' 
                        ? 'border-blue-500 dark:border-indigo-500 bg-blue-50/50 dark:bg-indigo-500/10 shadow-sm' 
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {role === 'hr' && <div className="absolute inset-0 bg-blue-500/5 dark:bg-indigo-500/10 pointer-events-none"></div>}
                      <svg className={`w-6 h-6 relative z-10 transition-colors ${role === 'hr' ? 'text-blue-600 dark:text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-[11px] font-black uppercase tracking-wider relative z-10 transition-colors ${role === 'hr' ? 'text-blue-700 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`}>HR Manager</span>
                    </div>

                    <div
                      onClick={() => setRole('candidate')}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 overflow-hidden group ${
                        role === 'candidate' 
                        ? 'border-blue-500 dark:border-indigo-500 bg-blue-50/50 dark:bg-indigo-500/10 shadow-sm' 
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {role === 'candidate' && <div className="absolute inset-0 bg-blue-500/5 dark:bg-indigo-500/10 pointer-events-none"></div>}
                      <svg className={`w-6 h-6 relative z-10 transition-colors ${role === 'candidate' ? 'text-blue-600 dark:text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className={`text-[11px] font-black uppercase tracking-wider relative z-10 transition-colors ${role === 'candidate' ? 'text-blue-700 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`}>Candidate</span>
                    </div>
                  </div>
                </div>

                {role === 'hr' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.organization}</label>
                    <input
                      type="text"
                      placeholder={t.orgPlaceholder}
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500 outline-none transition-all text-sm font-medium placeholder-zinc-400 dark:placeholder-zinc-600"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                className="relative w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-xl shadow-lg shadow-zinc-900/20 dark:shadow-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-zinc-900/30 dark:hover:shadow-white/20 active:scale-[0.98] transition-all overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out"></div>
                <span className="relative z-10">{mode === 'Login' ? t.signIn : t.createAccount}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}