import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import { getApiErrorMessage } from '../../utils/apiError';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

type ForgotPasswordPanelProps = {
  onOpenSignIn?: () => void;
};

export function ForgotPasswordPanel({ onOpenSignIn }: ForgotPasswordPanelProps) {
  const { pushToast } = useToastStore();
  const form = useForm<FormValues>({
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
    <div>
      <h2 className="text-2xl font-semibold text-slate-950">Forgot password</h2>
      <p className="mt-1 text-sm text-slate-500">Enter your email and we will generate a reset request.</p>
      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div>
          <input className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${errors.email ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`} placeholder="Email" autoComplete="email" {...form.register('email')} />
          {errors.email ? <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p> : null}
        </div>
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-slate-400" type="submit" disabled={mutation.isPending || !isValid}>
          {mutation.isPending ? 'Submitting...' : 'Send reset request'}
        </button>
      </form>
      {onOpenSignIn ? (
        <div className="mt-5 text-sm text-slate-500">
          Back to{' '}
          <button className="font-semibold text-brand-700" type="button" onClick={onOpenSignIn}>Sign in</button>
        </div>
      ) : null}
    </div>
  );
}
