import { useState, type FormEvent } from 'react';
import { authApi } from '../api';

interface User {
  email: string;
  role: string;
}

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'Login' | 'Register'>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('hr');

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (mode === 'Register') {
        // Если регистрируется кандидат, организация ему не нужна
        const finalOrgName = role === 'hr' ? orgName : '';

        await authApi.register(email, password, finalOrgName, role);
        setMessage(`Account for ${email} created. Please login.`);
        setMode('Login');
        setPassword('');
        setOrgName('');
      } else {
        await authApi.login(email, password);
        const user = await authApi.getMe();
        onLoginSuccess(user); // Уведомляем App.tsx об успехе и передаем объект юзера
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Auth failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-[0_2px_40px_-12px_rgba(0,0,0,0.1)] border border-gray-100">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">AI Recruiter</h2>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'Login'
              ? 'Welcome back! Please sign in.'
              : 'Create your account to get started.'}
          </p>
        </div>

        {message && (
          <div className="mb-6 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
            <span>✓ {message}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
            <span>✕ {error}</span>
          </div>
        )}

        <div className="flex p-1 mb-8 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('Login')}
            className={`w-1/2 py-2 text-sm font-semibold rounded-xl transition-all ${
              mode === 'Login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('Register')}
            className={`w-1/2 py-2 text-sm font-semibold rounded-xl transition-all ${
              mode === 'Register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase text-gray-400 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase text-gray-400 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
            />
          </div>

          {mode === 'Register' && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase text-gray-400 ml-1">I am a...</label>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (e.target.value === 'candidate') setOrgName(''); // Очищаем орг. при смене роли
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none appearance-none transition-all"
                >
                  <option value="hr">Recruiter / HR</option>
                  <option value="candidate">Candidate</option>
                </select>
              </div>

              {/* Показываем поле организации только для HR */}
              {role === 'hr' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="block text-xs font-bold uppercase text-gray-400 ml-1">Organization Name</label>
                  <input
                    type="text"
                    placeholder="Cisco, Google, etc."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="w-full mt-4 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl shadow-lg shadow-gray-200 transition-all active:scale-[0.98]"
          >
            {mode === 'Login'
              ? 'Sign In'
              : role === 'hr' ? 'Create Corporate Account' : 'Create Personal Account'}
          </button>
        </form>
      </div>
    </div>
  );
}