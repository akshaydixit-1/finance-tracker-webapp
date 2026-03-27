import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { getApiErrorMessage } from '../../utils/apiError';

const schema = z.object({
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/\d/, 'Password must include a number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

const inputClassName = (hasError: boolean) => `w-full rounded-2xl border px-4 py-3 outline-none transition ${hasError ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`;

type SignUpPanelProps = {
  onSuccess?: () => void;
  onOpenSignIn?: () => void;
};

export function SignUpPanel({ onSuccess, onOpenSignIn }: SignUpPanelProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { pushToast } = useToastStore();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: ({ confirmPassword, ...payload }: FormValues) => authApi.register(payload),
    onSuccess: (data) => {
      setAuth(data);
      pushToast({ title: 'Account created', message: 'Your account was created successfully.', variant: 'success' });
      onSuccess?.();
      navigate('/app');
    },
    onError: (error) => {
      pushToast({ title: 'Signup failed', message: getApiErrorMessage(error, 'Please review your details and try again.'), variant: 'error' });
    },
  });

  const { errors, isValid } = form.formState;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-950">Create account</h2>
      <p className="mt-1 text-sm text-slate-500">Create your FinTrack account in a minute.</p>
      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div>
          <input className={inputClassName(!!errors.displayName)} placeholder="Display name" autoComplete="name" {...form.register('displayName')} />
          {errors.displayName ? <p className="mt-1 text-sm text-rose-600">{errors.displayName.message}</p> : null}
        </div>
        <div>
          <input className={inputClassName(!!errors.email)} placeholder="Email" autoComplete="email" {...form.register('email')} />
          {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p> : null}
        </div>
        <div>
          <input className={inputClassName(!!errors.password)} placeholder="Password" type="password" autoComplete="new-password" {...form.register('password')} />
          {errors.password ? <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p> : <p className="mt-1 text-xs text-slate-500">Use 8+ chars with uppercase, lowercase, and a number.</p>}
        </div>
        <div>
          <input className={inputClassName(!!errors.confirmPassword)} placeholder="Confirm password" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
          {errors.confirmPassword ? <p className="mt-1 text-sm text-rose-600">{errors.confirmPassword.message}</p> : null}
        </div>
        <button className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-slate-400" type="submit" disabled={mutation.isPending || !isValid}>
          {mutation.isPending ? 'Creating...' : 'Create Account'}
        </button>
      </form>
      <div className="mt-5 text-sm text-slate-500">
        Already registered?{' '}
        {onOpenSignIn ? (
          <button className="font-semibold text-brand-700" type="button" onClick={onOpenSignIn}>Sign in</button>
        ) : null}
      </div>
    </div>
  );
}
