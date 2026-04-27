import { useEffect, useState } from 'react';
import { AuthPage } from './components/auth/AuthTab';
import { HrDashboard } from './components/hr/HrDashboard';
import { CandidateDashboard } from './components/candidate/CandidateDashboard';
import { PublicCvView } from './components/candidate/PublicCvView';
import { PublicProfileView } from './components/candidate/PublicProfileView';
import { PublicJobView } from './components/candidate/PublicJobView';
import { authApi } from './api';
import { useStore } from './store';
import { pathToNavState, hrPathToNavState } from './utils/urlRouting';

const cvToken = new URLSearchParams(window.location.search).get('cv');

const pathname = window.location.pathname;

const isPublicJob = pathname.startsWith('/p/jobs/');
const publicJobId = isPublicJob ? pathname.split('/')[3] : null;

const isPublicProfile = pathname.startsWith('/p/') && !isPublicJob;
const publicSlug = isPublicProfile ? pathname.split('/')[2] : null;

function App() {
  const { isLoggedIn, userRole, theme, setIsLoggedIn, setUserRole, setActiveTab, setAiLimits } = useStore();

  const [isLoading, setIsLoading] = useState<boolean>(!cvToken && !isPublicProfile && !isPublicJob);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (cvToken || isPublicProfile || isPublicJob) return;

    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const user = await authApi.getMe();
          setUserRole(user.role as 'hr' | 'candidate');
          setIsLoggedIn(true);

          if (user.ai_quota !== undefined && user.ai_used !== undefined) {
             setAiLimits(user.ai_quota, user.ai_used);
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
          setIsLoggedIn(true);

          if (user.ai_quota !== undefined && user.ai_used !== undefined) {
             setAiLimits(user.ai_quota, user.ai_used);
          }

          const navState = user.role === 'candidate'
            ? pathToNavState(window.location.pathname)
            : hrPathToNavState(window.location.pathname);
          setActiveTab(navState?.tab as any ?? (user.role === 'hr' ? 'job' : 'upload-cv'));
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