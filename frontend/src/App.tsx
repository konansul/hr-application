import { useEffect, useState } from 'react';
import { AuthPage } from './components/auth/AuthTab';
import { HrDashboard } from './components/hr/HrDashboard';
import { CandidateDashboard } from './components/candidate/CandidateDashboard';
import { PublicCvView } from './components/candidate/PublicCvView';
import { authApi } from './api';
import { useStore } from './store';

const cvToken = new URLSearchParams(window.location.search).get('cv');

function App() {
  const { isLoggedIn, userRole, theme, setIsLoggedIn, setUserRole, setActiveTab } = useStore();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (cvToken) return;
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const user = await authApi.getMe();
          setUserRole(user.role as 'hr' | 'candidate');
          setIsLoggedIn(true);
        } catch (error) {
          localStorage.removeItem('auth_token');
          setIsLoggedIn(false);
          setUserRole(null);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [setIsLoggedIn, setUserRole]);

  if (cvToken) return <PublicCvView token={cvToken} />;

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 dark:text-white transition-colors duration-300">Loading...</div>;
  }

  if (!isLoggedIn || !userRole) {
    return (
      <AuthPage
        onLoginSuccess={(user) => {
          setUserRole(user.role as 'hr' | 'candidate');
          setIsLoggedIn(true);
          setActiveTab(user.role === 'hr' ? 'job' : 'upload-cv');
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