import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const env = (import.meta as any)?.env ?? {};
const configuredBaseUrl = env.PROD
  ? env.VITE_API_BASE_URL
  : (env.VITE_API_BASE_URL ?? env.VITE_API_URL);

if (env.PROD && !configuredBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL for production build.');
}

const baseURL = configuredBaseUrl ?? 'http://localhost:5170/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pft_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('pft_refresh_token');
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh', { refreshToken })
      .then((response) => {
        const payload = response.data;
        useAuthStore.getState().setAuth(payload);
        return payload.accessToken as string;
      })
      .catch(() => {
        useAuthStore.getState().logout();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config ?? {};
    const requestUrl = String(originalRequest?.url ?? '');
    const status = error?.response?.status;
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const newAccessToken = await tryRefreshAccessToken();
      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }
    }

    if (status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);
