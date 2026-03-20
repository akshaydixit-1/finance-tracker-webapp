import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { BadgeIndianRupee } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getApiErrorMessage } from '../utils/apiError';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

const inputClassName = (hasError: boolean) => `w-full rounded-2xl border px-4 py-3 outline-none transition ${hasError ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`;

export function LoginPage() {
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
      navigate('/');
    },
    onError: (error) => {
      pushToast({ title: 'Login failed', message: getApiErrorMessage(error, 'Check your credentials and try again.'), variant: 'error' });
    },
  });

  const { errors, isValid } = form.formState;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(32,86,216,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e0e7ff_100%)] p-6">
      <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-card backdrop-blur">
        <div className="mb-8 flex items-center gap-3 text-brand-700"><BadgeIndianRupee size={30} /><span className="text-lg font-semibold">Personal Finance Tracker</span></div>
        <h1 className="text-3xl font-semibold text-slate-950">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Securely manage your income, budgets, goals, and recurring bills.</p>
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
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
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <Link className="font-semibold text-brand-700" to="/forgot-password">Forgot password?</Link>
          <span>No account? <Link className="font-semibold text-brand-700" to="/register">Create one</Link></span>
        </div>
      </div>
    </div>
  );
}
