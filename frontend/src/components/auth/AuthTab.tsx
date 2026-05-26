import { useState, useEffect, type FormEvent } from 'react';
import { authApi } from '../../api';
import { useStore } from '../../store';
import { DICT, LANGUAGES } from '../../internationalization.ts';
import { HraiLogo } from '../shared/HraiLogo';

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

  const [mode, setMode] = useState<'Login' | 'Register' | 'ForgotPassword' | 'ResetPassword'>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState<'hr' | 'candidate'>('hr');
  const [consentChecked, setConsentChecked] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setResetToken(token);
      setMode('ResetPassword');
    }
  }, []);

  const PRIVACY_URL = "https://www.hraipp.com/privacy";
  const TERMS_URL = "https://www.hraipp.com/terms";

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
      } else if (mode === 'ForgotPassword') {
        await authApi.requestPasswordReset(email);
        setMessage('If this email is in our system, a reset link is on its way! Please check your inbox.');
      } else if (mode === 'ResetPassword') {
        await authApi.resetPassword(resetToken, newPassword);
        setMessage('Password updated. You can now log in.');
        setResetToken('');
        window.history.replaceState({}, '', window.location.pathname);
        setTimeout(() => setMode('Login'), 2000);
      } else {
        const loginData = await authApi.login(email, password);
        onLoginSuccess(loginData);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Auth failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafcff] dark:bg-[#08090c] transition-colors duration-500 overflow-hidden font-sans relative">

      {/* ── Background blobs ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[160px] ${theme === 'dark' ? 'bg-[#7A60F4]/12' : 'bg-[#7A60F4]/35'}`} style={{ animation: 'drift1 18s ease-in-out infinite alternate' }} />
        <div className={`absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] ${theme === 'dark' ? 'bg-[#29C5F6]/18' : 'bg-[#29C5F6]/65'}`} style={{ animation: 'drift2 22s ease-in-out infinite alternate' }} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] ${theme === 'dark' ? 'bg-[#9EA4FF]/8' : 'bg-[#9EA4FF]/35'}`} style={{ animation: 'drift1 14s ease-in-out infinite alternate-reverse' }} />
        <style>{`
          @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,40px) scale(1.08); } }
          @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,60px) scale(1.12); } }
        `}</style>
      </div>

      {/* ── Top-right controls ── */}
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
          style={theme === 'light' ? { color: '#7A60F4', backgroundColor: 'rgba(122,96,244,0.08)', borderColor: 'rgba(122,96,244,0.3)' } : undefined}
          className="p-2.5 backdrop-blur-md rounded-full border dark:bg-zinc-900/70 dark:border-zinc-800/50 dark:text-[#FF906D] dark:hover:bg-zinc-800 shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'light' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          )}
        </button>
      </div>

      {/* ── Left hero panel ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-white/20 dark:bg-[#08090c]/40 backdrop-blur-sm p-16 flex-col justify-between relative overflow-hidden border-r border-white/40 dark:border-white/[0.06] transition-colors z-10">

        <div className="relative z-10">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-2.5 mb-12">
            <HraiLogo height={38} />
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#92D8F2] via-[#7A60F4] to-[#9EA4FF] bg-clip-text text-transparent select-none">
              HRAIPP
            </span>
          </div>

          <h1 className="text-[2.75rem] font-black tracking-tight text-zinc-900 dark:text-white mb-6 leading-[1.15]">
            {t.heroTitle} <br />
            <span style={{ color: '#7A60F4' }}>
              {t.heroSubtitle}
            </span>
          </h1>

          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mb-14 font-medium leading-relaxed">
            {t.heroDesc}
          </p>

          <div className="space-y-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex gap-5 group">
                <div className="w-12 h-12 rounded-2xl bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center shrink-0 text-[#7A60F4] dark:text-[#9EA4FF] font-black group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-zinc-900 transition-all duration-300">
                  {num}
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base leading-tight group-hover:text-[#7A60F4] dark:group-hover:text-[#9EA4FF] transition-colors">{t[`feature${num}` as keyof typeof t]}</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1.5 leading-snug">{t[`feature${num}Desc` as keyof typeof t]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 mt-12">
          <div className="px-3 py-1.5 rounded-md bg-[#7A60F4]/10 dark:bg-[#7A60F4]/10 text-[10px] font-black uppercase tracking-[0.2em] text-[#5B52C8] dark:text-[#9EA4FF] border border-[#7A60F4]/25 dark:border-[#7A60F4]/20">
            AI RECRUITER v2.0
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7A60F4]"></span>
            ENTERPRISE READY
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white/30 dark:bg-[#08090c]/40 backdrop-blur-sm transition-colors relative z-10">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-10">
            <HraiLogo height={32} />
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#92D8F2] via-[#7A60F4] to-[#9EA4FF] bg-clip-text text-transparent select-none">
              HRAIPP
            </span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
              {mode === 'Login' ? t.signIn : mode === 'Register' ? t.createAccount : mode === 'ForgotPassword' ? 'Forgot password?' : 'Set new password'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-sm sm:text-base font-medium">
              {mode === 'Login' ? t.accessDash : mode === 'Register' ? t.joinPlatform : mode === 'ForgotPassword' ? "Enter your email and we'll send a reset link." : 'Choose a new password for your account.'}
            </p>
          </div>

          {(mode === 'ForgotPassword' || mode === 'ResetPassword') && (
            <button
              type="button"
              onClick={() => { setMode('Login'); setError(null); setMessage(null); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to login
            </button>
          )}

          {/* Login / Register toggle */}
          <div className={`relative flex p-1 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-2xl mb-10 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 ${(mode === 'ForgotPassword' || mode === 'ResetPassword') ? 'hidden' : ''}`}>
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
              <div className="p-4 text-sm font-medium text-[#5B52C8] dark:text-[#9EA4FF] bg-[#7A60F4]/10 dark:bg-[#7A60F4]/5 border border-[#7A60F4]/25 dark:border-[#7A60F4]/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                <svg className="w-5 h-5 shrink-0 text-[#7A60F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-[#7A60F4]/60 dark:focus:border-[#7A60F4]/50 outline-none transition-all text-sm font-medium placeholder-zinc-300 dark:placeholder-zinc-600"
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
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-[#7A60F4]/60 dark:focus:border-[#7A60F4]/50 outline-none transition-all text-sm font-medium placeholder-zinc-300 dark:placeholder-zinc-600"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            {mode !== 'ResetPassword' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-[#7A60F4]/60 dark:focus:border-[#7A60F4]/50 outline-none transition-all text-sm font-medium placeholder-zinc-300 dark:placeholder-zinc-600"
                  placeholder="name@example.com"
                />
              </div>
            )}

            {(mode === 'Login' || mode === 'Register') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-11 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-[#7A60F4]/60 dark:focus:border-[#7A60F4]/50 outline-none transition-all text-sm font-medium placeholder-zinc-300 dark:placeholder-zinc-600 tracking-widest"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {mode === 'Login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setMode('ForgotPassword'); setError(null); setMessage(null); }}
                      className="text-[11px] font-semibold text-[#7A60F4] dark:text-[#9EA4FF] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'ResetPassword' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-11 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-[#7A60F4]/60 dark:focus:border-[#7A60F4]/50 outline-none transition-all text-sm font-medium placeholder-zinc-300 dark:placeholder-zinc-600 tracking-widest"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'Register' && (
              <div className="animate-in slide-in-from-bottom-2 duration-300 pt-2 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest ml-1">{t.accountType}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* HR role card */}
                    <div
                      onClick={() => { setRole('hr'); setConsentChecked(false); }}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 overflow-hidden group ${
                        role === 'hr'
                        ? 'border-[#7A60F4] bg-[#7A60F4]/5 dark:bg-[#7A60F4]/10 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {role === 'hr' && <div className="absolute inset-0 bg-[#7A60F4]/5 pointer-events-none"></div>}
                      <svg className={`w-6 h-6 relative z-10 transition-colors ${role === 'hr' ? 'text-[#7A60F4] dark:text-[#9EA4FF]' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-[11px] font-black uppercase tracking-wider relative z-10 transition-colors ${role === 'hr' ? 'text-[#5B52C8] dark:text-[#9EA4FF]' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`}>HR Manager</span>
                    </div>

                    {/* Candidate role card */}
                    <div
                      onClick={() => { setRole('candidate'); setConsentChecked(false); }}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 overflow-hidden group ${
                        role === 'candidate'
                        ? 'border-[#7A60F4] bg-[#7A60F4]/5 dark:bg-[#7A60F4]/10 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {role === 'candidate' && <div className="absolute inset-0 bg-[#7A60F4]/5 pointer-events-none"></div>}
                      <svg className={`w-6 h-6 relative z-10 transition-colors ${role === 'candidate' ? 'text-[#7A60F4] dark:text-[#9EA4FF]' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className={`text-[11px] font-black uppercase tracking-wider relative z-10 transition-colors ${role === 'candidate' ? 'text-[#5B52C8] dark:text-[#9EA4FF]' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`}>Candidate</span>
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
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:border-[#7A60F4]/60 dark:focus:border-[#7A60F4]/50 outline-none transition-all text-sm font-medium placeholder-zinc-300 dark:placeholder-zinc-600"
                    />
                  </div>
                )}
              </div>
            )}

            {/* HR pre-use notice */}
            {mode === 'Register' && role === 'hr' && (
              <>
                <div className="px-4 py-3 bg-[#FF906D]/10 dark:bg-[#FF906D]/5 border border-[#FF906D]/25 dark:border-[#FF906D]/20 rounded-xl space-y-1.5">
                  <div className="flex gap-2">
                    <svg className="w-3.5 h-3.5 text-[#FF906D] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1">
                      <p className="text-[11px] text-[#c05020] dark:text-[#FF906D] leading-relaxed">{t.hrPreUseNotice1}</p>
                      <p className="text-[11px] text-[#c05020] dark:text-[#FF906D] leading-relaxed">{t.hrPreUseNotice2}</p>
                      <p className="text-[11px] text-[#c05020] dark:text-[#FF906D] leading-relaxed font-semibold">{t.hrPreUseNotice3}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="hr-consent-checkbox"
                    checked={consentChecked}
                    onChange={e => setConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-zinc-300 dark:border-zinc-700 accent-[#7A60F4] cursor-pointer"
                  />
                  <label htmlFor="hr-consent-checkbox" className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed cursor-pointer select-none">
                    {t.consentStart}{' '}
                    <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-[#7A60F4] dark:text-[#9EA4FF] underline underline-offset-2 hover:no-underline" onClick={e => e.stopPropagation()}>
                      {t.tos}
                    </a>
                    {' '}{t.consentAnd}{' '}
                    <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-[#7A60F4] dark:text-[#9EA4FF] underline underline-offset-2 hover:no-underline" onClick={e => e.stopPropagation()}>
                      {t.hrPp}
                    </a>
                    .
                  </label>
                </div>
              </>
            )}

            {/* Candidate pre-use notice */}
            {mode === 'Register' && role === 'candidate' && (
              <>
                <div className="px-4 py-3 bg-[#9EA4FF]/10 dark:bg-[#9EA4FF]/5 border border-[#9EA4FF]/25 dark:border-[#9EA4FF]/20 rounded-xl space-y-1.5">
                  <div className="flex gap-2">
                    <svg className="w-3.5 h-3.5 text-[#7A60F4] dark:text-[#9EA4FF] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1">
                      <p className="text-[11px] text-[#5B52C8] dark:text-[#9EA4FF] leading-relaxed">{t.preUseNotice1}</p>
                      <p className="text-[11px] text-[#5B52C8] dark:text-[#9EA4FF] leading-relaxed">{t.preUseNotice2}</p>
                      <p className="text-[11px] text-[#5B52C8] dark:text-[#9EA4FF] leading-relaxed">{t.preUseNotice3}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="consent-checkbox"
                    checked={consentChecked}
                    onChange={e => setConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-zinc-300 dark:border-zinc-700 accent-[#7A60F4] cursor-pointer"
                  />
                  <label htmlFor="consent-checkbox" className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed cursor-pointer select-none">
                    {t.consentStart}{' '}
                    <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-[#7A60F4] dark:text-[#9EA4FF] underline underline-offset-2 hover:no-underline" onClick={e => e.stopPropagation()}>
                      {t.tos}
                    </a>
                    {' '}{t.consentAnd}{' '}
                    <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-[#7A60F4] dark:text-[#9EA4FF] underline underline-offset-2 hover:no-underline" onClick={e => e.stopPropagation()}>
                      {t.pp}
                    </a>
                    .
                  </label>
                </div>
              </>
            )}

            {/* Submit button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={mode === 'Register' && !consentChecked}
                className="w-full py-3.5 bg-[#7A60F4] hover:bg-[#6B52E8] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#7A60F4]/25 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#7A60F4]/40 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                {mode === 'Login' ? t.signIn : mode === 'Register' ? t.createAccount : mode === 'ForgotPassword' ? 'Send reset link' : 'Set new password'}
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                By continuing, you acknowledge that you have read and agree to our{' '}
                <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Privacy Policy</a>.
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Powered by <strong className="font-bold text-zinc-600 dark:text-zinc-300">Bold Generic Solutions</strong>
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
