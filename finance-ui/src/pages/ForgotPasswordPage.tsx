import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { getApiErrorMessage } from '../utils/apiError';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

export function ForgotPasswordPage() {
  const { pushToast } = useToastStore();
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '' },
  });
  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      pushToast({ title: 'Reset request submitted', message: 'If the email exists, a reset token was generated.', variant: 'success' });
    },
    onError: (error) => {
      pushToast({ title: 'Request failed', message: getApiErrorMessage(error, 'Unable to process reset request right now.'), variant: 'error' });
    },
  });

  const { errors, isValid } = form.formState;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-card">
        <h1 className="text-3xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-500">For development, the backend generates a reset token entry. Wire email delivery later for production.</p>
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div>
            <input className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${errors.email ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`} placeholder="Email" autoComplete="email" {...form.register('email')} />
            {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p> : null}
          </div>
          <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-slate-400" type="submit" disabled={mutation.isPending || !isValid}>
            {mutation.isPending ? 'Submitting...' : 'Send reset request'}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-500"><Link className="font-semibold text-brand-700" to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
