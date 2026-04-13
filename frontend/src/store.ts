import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  isLoggedIn: boolean;
  userRole: 'hr' | 'candidate' | null;
  activeTab: 'profile' | 'job' | 'screen' | 'compare' | 'improve' | 'kanban' | 'upload-cv' | 'history' | 'jobs' | 'applications' | 'talent';
  globalJobDescription: string;
  globalJobId: string;
  globalJobTitle: string;
  globalJobStages: string[];
  globalBatchResults: any[];
  isSidebarOpen: boolean;
  setIsLoggedIn: (status: boolean) => void;
  setUserRole: (role: 'hr' | 'candidate' | null) => void;
  setActiveTab: (tab: 'profile' | 'job' | 'screen' | 'compare' | 'improve' | 'kanban' | 'upload-cv' | 'history' | 'jobs' | 'applications' | 'talent') => void;
  setGlobalJobDescription: (desc: string) => void;
  setGlobalJobId: (id: string) => void;
  setGlobalJobTitle: (title: string) => void;
  setGlobalJobStages: (stages: string[]) => void;
  setGlobalBatchResults: (results: any[]) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  logoutStore: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userRole: null,
      activeTab: 'profile',
      globalJobDescription: '',
      globalJobId: '',
      globalJobTitle: '',
      globalJobStages: [],
      globalBatchResults: [],
      isSidebarOpen: true,
      setIsLoggedIn: (status) => set({ isLoggedIn: status }),
      setUserRole: (role) => set({ userRole: role }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setGlobalJobDescription: (desc) => set({ globalJobDescription: desc }),
      setGlobalJobId: (id) => set({ globalJobId: id }),
      setGlobalJobTitle: (title) => set({ globalJobTitle: title }),
      setGlobalJobStages: (stages) => set({ globalJobStages: stages }),
      setGlobalBatchResults: (results) => set({ globalBatchResults: results }),
      setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      logoutStore: () => set({
        isLoggedIn: false,
        userRole: null,
        activeTab: 'profile',
        globalJobDescription: '',
        globalJobId: '',
        globalJobTitle: '',
        globalJobStages: [], // Сброс при выходе
        globalBatchResults: []
      }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        userRole: state.userRole,
        globalJobDescription: state.globalJobDescription,
        globalJobId: state.globalJobId,
        globalJobTitle: state.globalJobTitle,
        globalJobStages: state.globalJobStages
      }),
    }
  )
);