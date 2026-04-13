import { useState, type FormEvent } from 'react';
import { authApi } from '../../api';

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
        setMessage(`Account for ${email} created. Please login.`);
        setMode('Login');
        setPassword('');
        setFirstName('');
        setLastName('');
        setOrgName('');
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 p-16 flex-col justify-between relative overflow-hidden border-r border-gray-100">
        <div className="relative z-10">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-gray-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h1 className="text-5xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1]">
            Next-gen AI <br />
            <span className="text-blue-600">Recruitment.</span>
          </h1>

          <p className="text-lg text-gray-500 max-w-md mb-12 font-medium">
            Streamline your hiring process with artificial intelligence. Precise matching, smart parsing, and automated workflows.
          </p>

          <div className="space-y-10">
            <div className="flex gap-5">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 text-blue-600 font-bold">1</div>
              <div>
                <h4 className="font-bold text-gray-900">Smart Resume Parsing</h4>
                <p className="text-gray-400 text-sm mt-1">AI automatically extracts experience, skills, and metrics from PDF/Docx files.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 text-blue-600 font-bold">2</div>
              <div>
                <h4 className="font-bold text-gray-900">AI Scoring & Insights</h4>
                <p className="text-gray-400 text-sm mt-1">Get immediate feedback on how well a candidate fits your specific job description.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 text-blue-600 font-bold">3</div>
              <div>
                <h4 className="font-bold text-gray-900">Applicant Tracking</h4>
                <p className="text-gray-400 text-sm mt-1">Manage everything from a unified Kanban board designed for efficiency.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 flex gap-8">
          <span>AI RECRUITER v2.0</span>
          <span>ENTERPRISE READY</span>
        </div>

        <div className="absolute top-[-5%] right-[-5%] w-80 h-80 bg-blue-100/50 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] left-[-5%] w-64 h-64 bg-indigo-50/80 rounded-full blur-[80px]"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              {mode === 'Login' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-gray-500 mt-2">
              {mode === 'Login' ? 'Access your recruitment dashboard' : 'Join the platform to start screening'}
            </p>
          </div>

          <div className="flex p-1 mb-8 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setMode('Login')}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                mode === 'Login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('Register')}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                mode === 'Register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className="p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl">
                ✓ {message}
              </div>
            )}

            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl">
                ✕ {error}
              </div>
            )}

            {mode === 'Register' && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider ml-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider ml-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {mode === 'Register' && (
              <>
                <div className="space-y-3 pt-2">
                  <label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider ml-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setRole('hr')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${
                        role === 'hr' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <svg className={`w-5 h-5 ${role === 'hr' ? 'text-gray-900' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[11px] font-bold uppercase">HR</span>
                    </div>
                    <div
                      onClick={() => setRole('candidate')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${
                        role === 'candidate' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <svg className={`w-5 h-5 ${role === 'candidate' ? 'text-gray-900' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-[11px] font-bold uppercase">Candidate</span>
                    </div>
                  </div>
                </div>

                {role === 'hr' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider ml-1">Organization</label>
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="w-full mt-6 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl shadow-sm transition-all active:scale-[0.98]"
            >
              {mode === 'Login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}