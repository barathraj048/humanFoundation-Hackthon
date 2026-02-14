'use client';
import { create } from 'zustand';
import { User, Workspace } from '@/types';

interface AppStore {
  user: User | null;
  workspace: Workspace | null;
  sidebarOpen: boolean;

  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setSidebarOpen: (open: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppStore>((set) => ({
  user: null,
  workspace: null,
  sidebarOpen: false,

  setUser: (user) => set({ user }),
  setWorkspace: (workspace) => set({ workspace }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('careops_token');
    }
    set({ user: null, workspace: null });
    window.location.href = '/login';
  },
}));

// Token helpers
export const setToken = (token: string) => {
  if (typeof window !== 'undefined') localStorage.setItem('careops_token', token);
};
export const getToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('careops_token');
  return null;
};
export const isAuthenticated = () => !!getToken();
