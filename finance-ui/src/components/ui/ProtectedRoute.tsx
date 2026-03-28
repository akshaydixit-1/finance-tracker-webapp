import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { accessToken } = useAuthStore();
  const persistedToken = typeof window !== 'undefined' ? localStorage.getItem('pft_access_token') : null;
  const token = accessToken ?? persistedToken;
  if (!token) return <Navigate to='/' replace />;
  return children;
}
