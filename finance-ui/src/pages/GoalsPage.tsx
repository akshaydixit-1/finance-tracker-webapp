import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { Goal } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCurrency } from '../utils/format';

type GoalFormValues = {
  name: string;
  targetAmount: number;
  targetDate: string;
  linkedAccountId: string;
  icon: string;
  color: string;
};

export function GoalsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToastStore();
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const goalForm = useForm<GoalFormValues>({
    defaultValues: { name: '', targetAmount: 0, targetDate: '', linkedAccountId: '', icon: 'PiggyBank', color: '#059669' },
  });

  const contributionForm = useForm({ defaultValues: { goalId: '', amount: 0, sourceAccountId: '', note: '', date: new Date().toISOString().slice(0, 10) } });
  const { data: goals } = useQuery({ queryKey: ['goals'], queryFn: financeApi.getGoals });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });

  const resetGoalForm = () => {
    setEditingGoal(null);
    goalForm.reset({ name: '', targetAmount: 0, targetDate: '', linkedAccountId: '', icon: 'PiggyBank', color: '#059669' });
  };

  const createGoal = useMutation({
    mutationFn: financeApi.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Goal created', message: 'Savings goal created successfully.', variant: 'success' });
      resetGoalForm();
    },
    onError: (error) => pushToast({ title: 'Goal creation failed', message: getApiErrorMessage(error, 'Unable to create goal.'), variant: 'error' }),
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateGoal(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Goal updated', message: 'Goal updated successfully.', variant: 'success' });
      resetGoalForm();
    },
    onError: (error) => pushToast({ title: 'Goal update failed', message: getApiErrorMessage(error, 'Unable to update goal.'), variant: 'error' }),
  });

  const deleteGoal = useMutation({
    mutationFn: financeApi.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Goal deleted', message: 'Goal deleted successfully.', variant: 'success' });
      resetGoalForm();
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete goal.'), variant: 'error' }),
  });

  const contributeGoal = useMutation({
    mutationFn: ({ goalId, ...payload }: any) => financeApi.contributeGoal(goalId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Contribution added', message: 'Goal contribution saved successfully.', variant: 'success' });
      contributionForm.reset({ goalId: '', amount: 0, sourceAccountId: '', note: '', date: new Date().toISOString().slice(0, 10) });
    },
    onError: (error) => pushToast({ title: 'Contribution failed', message: getApiErrorMessage(error, 'Unable to add contribution.'), variant: 'error' }),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6">
        <Card title={editingGoal ? 'Edit savings goal' : 'Create savings goal'} description="Set a target amount and date for the money you want to save.">
          <form
            className="grid gap-3"
            onSubmit={goalForm.handleSubmit((values) => {
              const payload = {
                name: values.name,
                targetAmount: Number(values.targetAmount),
                targetDate: values.targetDate || null,
                linkedAccountId: values.linkedAccountId || null,
                icon: values.icon || 'PiggyBank',
                color: values.color || '#059669',
              };

              if (editingGoal) {
                updateGoal.mutate({ id: editingGoal.id, payload: { ...payload, status: editingGoal.status } });
                return;
              }

              createGoal.mutate(payload);
            })}
          >
            <div><FieldLabel htmlFor="goal-name">Goal Name</FieldLabel><input id="goal-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Goal name" {...goalForm.register('name', { required: true })} /></div>
            <div><FieldLabel htmlFor="goal-target">Target Amount</FieldLabel><input id="goal-target" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" step="0.01" placeholder="Target amount" {...goalForm.register('targetAmount', { required: true, min: 0.01 })} /></div>
            <div><FieldLabel htmlFor="goal-date">Target Date</FieldLabel><input id="goal-date" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="date" {...goalForm.register('targetDate')} /></div>
            <div><FieldLabel htmlFor="goal-account">Linked Account</FieldLabel><select id="goal-account" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...goalForm.register('linkedAccountId')}><option value="">Link account (optional)</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="submit">{editingGoal ? 'Update goal' : 'Create goal'}</button>
              {editingGoal ? <button className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-700" type="button" onClick={resetGoalForm}>Cancel edit</button> : null}
            </div>
          </form>
        </Card>

        <Card title="Add contribution" description="Add money toward a goal and optionally record the source account.">
          <form className="grid gap-3" onSubmit={contributionForm.handleSubmit((values) => contributeGoal.mutate({ goalId: values.goalId, amount: Number(values.amount), sourceAccountId: values.sourceAccountId || null, note: values.note || null, date: values.date }))}>
            <div><FieldLabel htmlFor="contribution-goal">Goal</FieldLabel><select id="contribution-goal" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...contributionForm.register('goalId', { required: true })}><option value="">Select goal</option>{goals?.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></div>
            <div><FieldLabel htmlFor="contribution-amount">Amount</FieldLabel><input id="contribution-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" step="0.01" placeholder="Amount" {...contributionForm.register('amount', { required: true, min: 0.01 })} /></div>
            <div><FieldLabel htmlFor="contribution-account">Source Account</FieldLabel><select id="contribution-account" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...contributionForm.register('sourceAccountId')}><option value="">Source account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
            <div><FieldLabel htmlFor="contribution-note">Note</FieldLabel><input id="contribution-note" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Optional note" {...contributionForm.register('note')} /></div>
            <div><FieldLabel htmlFor="contribution-date">Date</FieldLabel><input id="contribution-date" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="date" {...contributionForm.register('date', { required: true })} /></div>
            <button className="rounded-2xl bg-brand-500 px-4 py-3 text-white" type="submit">Contribute</button>
          </form>
        </Card>
      </div>

      <Card title="Goal progress" description="Check how close each savings goal is to completion.">
        <div className="space-y-4">
          {goals?.map((item) => (
            <div key={item.id} className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-slate-500">{formatCurrency(item.currentAmount)} / {formatCurrency(item.targetAmount)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-slate-600">{item.progressPercent.toFixed(0)}%</div>
                  <button
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    type="button"
                    onClick={() => {
                      setEditingGoal(item);
                      goalForm.reset({
                        name: item.name,
                        targetAmount: item.targetAmount,
                        targetDate: item.targetDate ?? '',
                        linkedAccountId: item.linkedAccountId ?? '',
                        icon: item.icon,
                        color: item.color,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Delete goal "${item.name}"?`)) return;
                      deleteGoal.mutate(item.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-200">
                <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.min(item.progressPercent, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
