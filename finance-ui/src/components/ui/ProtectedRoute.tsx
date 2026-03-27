import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) {
    window.location.href = '/';
    return <div />;
  }
  return children;
}
