import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      setToken: (token) => {
        localStorage.setItem('nexboard_token', token);
        set({ token });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('nexboard_token');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.user, token, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem('nexboard_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data;
        localStorage.setItem('nexboard_token', token);
        set({ user, token, isAuthenticated: true });
        toast.success(`Welcome back, ${user.name}!`);
        return user;
      },

      register: async (name, email, password) => {
        const res = await api.post('/auth/register', { name, email, password });
        const { token, user } = res.data;
        localStorage.setItem('nexboard_token', token);
        set({ user, token, isAuthenticated: true });
        toast.success(`Welcome to NexBoard, ${user.name}!`);
        return user;
      },

      logout: () => {
        localStorage.removeItem('nexboard_token');
        set({ user: null, token: null, isAuthenticated: false });
        toast.success('Logged out successfully');
      },

      updateUser: (updates) => {
        set((state) => ({ user: { ...state.user, ...updates } }));
      },

      updatePreferences: async (preferences) => {
        try {
          const res = await api.put('/auth/profile', { preferences });
          set((state) => ({ user: { ...state.user, preferences: res.data.user.preferences } }));
        } catch (err) {
          toast.error('Failed to update preferences');
        }
      },
    }),
    {
      name: 'nexboard-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
