import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, User } from '../types/api';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (payload: AuthResponse) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (payload) => {
        localStorage.setItem('pft_access_token', payload.accessToken);
        localStorage.setItem('pft_refresh_token', payload.refreshToken);
        localStorage.setItem('pft_user', JSON.stringify(payload.user));
        set({ user: payload.user, accessToken: payload.accessToken, refreshToken: payload.refreshToken });
      },
      logout: () => {
        localStorage.removeItem('pft_access_token');
        localStorage.removeItem('pft_refresh_token');
        localStorage.removeItem('pft_user');
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    { name: 'pft-auth' },
  ),
);
