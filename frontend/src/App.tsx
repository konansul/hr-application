import { useEffect, useState } from 'react';
import { AuthPage } from './components/AuthTab';
import { HrDashboard } from './components/HrDashboard';
import { CandidateDashboard } from './components/CandidateDashboard';
import { PublicCvView } from './components/PublicCvView';
import { authApi } from './api';
import { useStore } from './store';

// Check for public CV share link before anything else
const cvToken = new URLSearchParams(window.location.search).get('cv');

function App() {
  const { isLoggedIn, userRole, setIsLoggedIn, setUserRole, setActiveTab } = useStore();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  if (cvToken) return <PublicCvView token={cvToken} />;

  useEffect(() => {
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50">Loading...</div>;
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