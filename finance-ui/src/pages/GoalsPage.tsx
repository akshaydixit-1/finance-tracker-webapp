import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { Modal } from '../components/ui/Modal';
import { TabPanel, Tabs } from '../components/ui/Tabs';
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
  const [activeTab, setActiveTab] = useState('create');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);

  const goalForm = useForm<GoalFormValues>({
    defaultValues: { name: '', targetAmount: 0, targetDate: '', linkedAccountId: '', icon: 'PiggyBank', color: '#059669' },
  });
  const editGoalForm = useForm<GoalFormValues>({
    defaultValues: { name: '', targetAmount: 0, targetDate: '', linkedAccountId: '', icon: 'PiggyBank', color: '#059669' },
  });
  const contributionForm = useForm({ defaultValues: { goalId: '', amount: 0, sourceAccountId: '', note: '', date: new Date().toISOString().slice(0, 10) } });

  const { data: goals } = useQuery({ queryKey: ['goals'], queryFn: financeApi.getGoals });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const tabs = useMemo(() => [
    { id: 'create', label: 'Create Goal' },
    { id: 'contribute', label: 'Contribute' },
    { id: 'progress', label: 'Progress' },
  ], []);

  const createGoal = useMutation({
    mutationFn: financeApi.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Goal created', message: 'Savings goal created successfully.', variant: 'success' });
      goalForm.reset({ name: '', targetAmount: 0, targetDate: '', linkedAccountId: '', icon: 'PiggyBank', color: '#059669' });
      setActiveTab('progress');
    },
    onError: (error) => pushToast({ title: 'Goal creation failed', message: getApiErrorMessage(error, 'Unable to create goal.'), variant: 'error' }),
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateGoal(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Goal updated', message: 'Goal updated successfully.', variant: 'success' });
      setEditingGoal(null);
    },
    onError: (error) => pushToast({ title: 'Goal update failed', message: getApiErrorMessage(error, 'Unable to update goal.'), variant: 'error' }),
  });

  const deleteGoal = useMutation({
    mutationFn: financeApi.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Goal deleted', message: 'Goal deleted successfully.', variant: 'success' });
      setDeletingGoal(null);
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete goal.'), variant: 'error' }),
  });

  const contributeGoal = useMutation({
    mutationFn: ({ goalId, ...payload }: any) => financeApi.contributeGoal(goalId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      pushToast({ title: 'Contribution added', message: 'Goal contribution saved successfully.', variant: 'success' });
      contributionForm.reset({ goalId: '', amount: 0, sourceAccountId: '', note: '', date: new Date().toISOString().slice(0, 10) });
      setActiveTab('progress');
    },
    onError: (error) => pushToast({ title: 'Contribution failed', message: getApiErrorMessage(error, 'Unable to add contribution.'), variant: 'error' }),
  });

  return (
    <Card title="Goals" description="Each goal area is tabbed; edits/deletes use modals only.">
      <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

      <TabPanel active={activeTab} id="create">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={goalForm.handleSubmit((values) => createGoal.mutate({
            name: values.name,
            targetAmount: Number(values.targetAmount),
            targetDate: values.targetDate || null,
            linkedAccountId: values.linkedAccountId || null,
            icon: values.icon || 'PiggyBank',
            color: values.color || '#059669',
          }))}
        >
          <div><FieldLabel htmlFor="goal-name" hint="Set a short name for this savings goal.">Goal Name</FieldLabel><input id="goal-name" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Vacation Fund" {...goalForm.register('name', { required: true })} /></div>
          <div><FieldLabel htmlFor="goal-target" hint="Total amount you want to reach.">Target Amount</FieldLabel><input id="goal-target" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 150000" {...goalForm.register('targetAmount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="goal-date" hint="Optional deadline for this goal.">Target Date</FieldLabel><input id="goal-date" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="date" placeholder="Select target date" {...goalForm.register('targetDate')} /></div>
          <div><FieldLabel htmlFor="goal-account" hint="Optional account tied to this goal.">Linked Account</FieldLabel><select id="goal-account" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...goalForm.register('linkedAccountId')}><option value="">Link account (optional)</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white md:col-span-2" type="submit">Create goal</button>
        </form>
      </TabPanel>

      <TabPanel active={activeTab} id="contribute">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={contributionForm.handleSubmit((values) => contributeGoal.mutate({ goalId: values.goalId, amount: Number(values.amount), sourceAccountId: values.sourceAccountId || null, note: values.note || null, date: values.date }))}>
          <div><FieldLabel htmlFor="contribution-goal" hint="Choose which goal this contribution belongs to.">Goal</FieldLabel><select id="contribution-goal" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...contributionForm.register('goalId', { required: true })}><option value="">Select goal</option>{goals?.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="contribution-amount" hint="Amount to add to the selected goal.">Amount</FieldLabel><input id="contribution-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 5000" {...contributionForm.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="contribution-account" hint="Optional account where this contribution came from.">Source Account</FieldLabel><select id="contribution-account" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...contributionForm.register('sourceAccountId')}><option value="">Source account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="contribution-note" hint="Optional note for this contribution.">Note</FieldLabel><input id="contribution-note" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Bonus contribution" {...contributionForm.register('note')} /></div>
          <div><FieldLabel htmlFor="contribution-date" hint="Date when this contribution was made.">Date</FieldLabel><input id="contribution-date" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="date" placeholder="Select contribution date" {...contributionForm.register('date', { required: true })} /></div>
          <button className="rounded-2xl bg-brand-500 px-4 py-2 text-white md:col-span-2" type="submit">Contribute</button>
        </form>
      </TabPanel>

      <TabPanel active={activeTab} id="progress">
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
                      editGoalForm.reset({
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
                  <button className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700" type="button" onClick={() => setDeletingGoal(item)}>Delete</button>
                </div>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-200">
                <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.min(item.progressPercent, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </TabPanel>

      <Modal open={!!editingGoal} title="Edit goal" onClose={() => setEditingGoal(null)}>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={editGoalForm.handleSubmit((values) => {
            if (!editingGoal) return;
            updateGoal.mutate({
              id: editingGoal.id,
              payload: {
                name: values.name,
                targetAmount: Number(values.targetAmount),
                targetDate: values.targetDate || null,
                linkedAccountId: values.linkedAccountId || null,
                icon: values.icon,
                color: values.color,
                status: editingGoal.status,
              },
            });
          })}
        >
          <div><FieldLabel htmlFor="edit-goal-name" hint="Update the goal name.">Goal Name</FieldLabel><input id="edit-goal-name" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Vacation Fund" {...editGoalForm.register('name', { required: true })} /></div>
          <div><FieldLabel htmlFor="edit-goal-target" hint="Update the target amount to reach.">Target Amount</FieldLabel><input id="edit-goal-target" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 150000" {...editGoalForm.register('targetAmount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="edit-goal-date" hint="Update or clear the target date.">Target Date</FieldLabel><input id="edit-goal-date" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="date" placeholder="Select target date" {...editGoalForm.register('targetDate')} /></div>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white md:col-span-2" type="submit">Update goal</button>
        </form>
      </Modal>

      <Modal open={!!deletingGoal} title="Delete goal" onClose={() => setDeletingGoal(null)}>
        <p className="text-sm text-slate-600">Delete goal <span className="font-semibold">{deletingGoal?.name}</span>?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => setDeletingGoal(null)}>Cancel</button>
          <button className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700" type="button" onClick={() => deletingGoal ? deleteGoal.mutate(deletingGoal.id) : null}>Delete</button>
        </div>
      </Modal>
    </Card>
  );
}
