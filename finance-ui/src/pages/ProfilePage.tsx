import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useThemeStore } from '../store/themeStore';

type ProfileForm = {
  displayName: string;
  email: string;
};

export function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const { pushToast } = useToastStore();
  const { isDark, toggleTheme } = useThemeStore();

  const form = useForm<ProfileForm>({
    mode: 'onChange',
    defaultValues: {
      displayName: user?.displayName ?? '',
      email: user?.email ?? '',
    },
  });

  return (
    <section className={`rounded-[26px] border p-6 shadow-card ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Profile Settings</h2>
        <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Update your profile information and preferences.</p>
      </div>
      <form className="grid gap-4 md:max-w-xl" onSubmit={form.handleSubmit((values) => {
        updateUser(values);
        pushToast({ title: 'Profile updated', message: 'Your profile settings were saved.', variant: 'success' });
      })}>
        <label className="space-y-1">
          <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Display Name</span>
          <input className={`w-full rounded-xl border px-4 py-3 outline-none ${isDark ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`} placeholder="Your full name" {...form.register('displayName', { required: true, minLength: 2 })} />
        </label>
        <label className="space-y-1">
          <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Email</span>
          <input className={`w-full rounded-xl border px-4 py-3 outline-none ${isDark ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`} placeholder="you@email.com" {...form.register('email', { required: true })} />
        </label>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-slate-400/40 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Theme</div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Toggle dashboard appearance.</div>
          </div>
          <button type="button" onClick={toggleTheme} className={`rounded-full px-4 py-2 text-sm font-semibold ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700'}`}>
            {isDark ? 'Dark' : 'Light'}
          </button>
        </div>
        <button type="submit" disabled={form.formState.isSubmitting} className="mt-2 w-fit rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          Save Changes
        </button>
      </form>
    </section>
  );
}
