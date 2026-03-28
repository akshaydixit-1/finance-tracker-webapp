import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const env = (import.meta as any)?.env ?? {};
const configuredBaseUrl = env.PROD
  ? env.VITE_API_BASE_URL
  : (env.VITE_API_BASE_URL ?? env.VITE_API_URL);

if (env.PROD && !configuredBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL for production build.');
}

const baseURL = env.VITE_API_BASE_URL ?? 'https://fintrack-service.azurewebsites.net/api';

export const api = axios.create({
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);
