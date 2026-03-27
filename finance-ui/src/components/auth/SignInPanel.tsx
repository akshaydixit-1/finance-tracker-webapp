import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { getApiErrorMessage } from '../../utils/apiError';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

const inputClassName = (hasError: boolean) => `w-full rounded-2xl border px-4 py-3 outline-none transition ${hasError ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`;

type SignInPanelProps = {
  onSuccess?: () => void;
  onOpenForgotPassword?: () => void;
  onOpenSignUp?: () => void;
};

export function SignInPanel({ onSuccess, onOpenForgotPassword, onOpenSignUp }: SignInPanelProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { pushToast } = useToastStore();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data);
      pushToast({ title: 'Login successful', message: 'You are now signed in.', variant: 'success' });
      onSuccess?.();
      navigate('/app');
    },
    onError: (error) => {
      pushToast({ title: 'Login failed', message: getApiErrorMessage(error, 'Check your credentials and try again.'), variant: 'error' });
    },
  });

  const { errors, isValid } = form.formState;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
      <p className="mt-1 text-sm text-slate-500">Continue to your FinTrack dashboard.</p>
      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div>
          <input className={inputClassName(!!errors.email)} placeholder="Email" autoComplete="email" {...form.register('email')} />
          {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p> : null}
        </div>
        <div>
          <input className={inputClassName(!!errors.password)} placeholder="Password" type="password" autoComplete="current-password" {...form.register('password')} />
          {errors.password ? <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p> : null}
        </div>
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-slate-400" type="submit" disabled={mutation.isPending || !isValid}>
          {mutation.isPending ? 'Signing in...' : 'Log In'}
        </button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
        {onOpenForgotPassword ? (
          <button className="font-semibold text-brand-700" type="button" onClick={onOpenForgotPassword}>Forgot password?</button>
        ) : (
          <Link className="font-semibold text-brand-700" to="/forgot-password">Forgot password?</Link>
        )}
        <span>
          No account?{' '}
          {onOpenSignUp ? (
            <button className="font-semibold text-brand-700" type="button" onClick={onOpenSignUp}>Create one</button>
          ) : (
            <Link className="font-semibold text-brand-700" to="/register">Create one</Link>
          )}
        </span>
      </div>
    </div>
  );
}
