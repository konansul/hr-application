import { useEffect, useState } from 'react';
import { AuthPage } from './components/auth/AuthTab';
import { HrDashboard } from './components/hr/HrDashboard';
import { CandidateDashboard } from './components/candidate/CandidateDashboard';
import { PublicCvView } from './components/public/PublicCvView';
import { PublicProfileView } from './components/public/PublicProfileView';
import { PublicJobView } from './components/public/PublicJobView';
import { authApi } from './api';
import { useStore } from './store';

// If the user appears to be logged in (persisted store) and arrives via a
// ?cv=<id> link, redirect to /resumes/<id> so the dashboard handles it as a
// deep link instead of showing the public viewer to the owner.
let cvToken: string | null = new URLSearchParams(window.location.search).get('cv');
if (cvToken) {
  try {
    const stored = JSON.parse(localStorage.getItem('app-storage') || '{}');
    if (stored?.state?.isLoggedIn) {
      window.history.replaceState({}, '', `/resumes/${cvToken}`);
      cvToken = null; // skip PublicCvView branch below
    }
  } catch { /* ignore parse errors */ }
}

const pathname = window.location.pathname;
const searchParams = new URLSearchParams(window.location.search);
const forceLogin = searchParams.has('login');

const isPublicJob = pathname.startsWith('/p/jobs/');
const publicJobId = isPublicJob ? pathname.split('/')[3] : null;

const isPublicProfile = pathname.startsWith('/p/') && !isPublicJob;
const publicSlug = isPublicProfile ? pathname.split('/')[2] : null;

function App() {
  const { isLoggedIn, userRole, theme, setIsLoggedIn, setUserId, setUserRole, setActiveTab, setAiLimits } = useStore();

  // cvToken is null here if we already redirected to /resumes/<id>
  const [isLoading, setIsLoading] = useState<boolean>(!cvToken && !isPublicProfile && !isPublicJob && !forceLogin);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // cvToken is null after the logged-in redirect, so we still run checkAuth
    if (cvToken || isPublicProfile || isPublicJob || forceLogin) return;

    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const user = await authApi.getMe();
          setUserRole(user.role as 'hr' | 'candidate');
          setUserId(user.user_id ?? '');
          setIsLoggedIn(true);

          if (user.ai_quota !== undefined && user.ai_used !== undefined) {
             setAiLimits(user.ai_quota, user.ai_used);
          }

          if (window.location.pathname === '/' && user.role === 'candidate') {
            setActiveTab('profile');
            window.history.replaceState({}, '', '/profile');
          }
        } catch (error) {
          localStorage.removeItem('auth_token');
          setIsLoggedIn(false);
          setUserRole(null);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [setIsLoggedIn, setUserRole, setAiLimits]);

  if (cvToken) return <PublicCvView token={cvToken} />;

  if (isPublicProfile && publicSlug) return <PublicProfileView slug={publicSlug} />;

  if (isPublicJob && publicJobId) return <PublicJobView jobId={publicJobId} />;

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 dark:text-white transition-colors duration-300">Loading...</div>;
  }

  if (!isLoggedIn || !userRole) {
    return (
      <AuthPage
        onLoginSuccess={(user: any) => {
          setUserRole(user.role as 'hr' | 'candidate');
          setUserId(user.user_id ?? '');
          setIsLoggedIn(true);

          if (user.ai_quota !== undefined && user.ai_used !== undefined) {
             setAiLimits(user.ai_quota, user.ai_used);
          }

          if (user.role === 'candidate') {
            setActiveTab('profile');
            window.history.replaceState({}, '', '/profile');
          } else {
            setActiveTab('job');
          }
        }}
      />
    );
  }

  if (userRole === 'hr') {
    return <HrDashboard />;
  }

  return <CandidateDashboard />;
}

export default App;