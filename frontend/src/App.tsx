import { useEffect, useState } from 'react';
import { AuthPage } from './components/AuthTab';
import { HrDashboard } from './components/HrDashboard';
import { CandidateDashboard } from './components/CandidateDashboard';
import { authApi } from './api';
import { useStore } from './store';

function App() {
  const { isLoggedIn, userRole, setIsLoggedIn, setUserRole, setActiveTab } = useStore();
  const [isLoading, setIsLoading] = useState<boolean>(true);

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