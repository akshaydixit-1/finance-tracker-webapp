import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { Modal } from '../components/ui/Modal';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { Budget } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCurrency } from '../utils/format';

type BudgetFormValues = {
  categoryId: string;
  accountId: string;
  month: number;
  year: number;
  amount: number;
  alertThresholdPercent: number;
};

export function BudgetsPage() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const queryClient = useQueryClient();
  const { pushToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('create');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  const form = useForm<BudgetFormValues>({ defaultValues: { categoryId: '', accountId: '', month, year, amount: 0, alertThresholdPercent: 80 } });
  const editForm = useForm<BudgetFormValues>({ defaultValues: { categoryId: '', accountId: '', month, year, amount: 0, alertThresholdPercent: 80 } });

  const { data: budgets } = useQuery({ queryKey: ['budgets', month, year], queryFn: () => financeApi.getBudgets(month, year) });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });

  const tabs = useMemo(() => [
    { id: 'create', label: 'Set Budget' },
    { id: 'tracking', label: 'Budget Tracking' },
  ], []);

  const createMutation = useMutation({
    mutationFn: financeApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Budget saved', message: 'Monthly budget created successfully.', variant: 'success' });
      form.reset({ categoryId: '', accountId: '', month, year, amount: 0, alertThresholdPercent: 80 });
      setActiveTab('tracking');
    },
    onError: (error) => pushToast({ title: 'Budget failed', message: getApiErrorMessage(error, 'Unable to save budget.'), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateBudget(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Budget updated', message: 'Budget updated successfully.', variant: 'success' });
      setEditingBudget(null);
    },
    onError: (error) => pushToast({ title: 'Update failed', message: getApiErrorMessage(error, 'Unable to update budget.'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Budget deleted', message: 'Budget deleted successfully.', variant: 'success' });
      setDeletingBudget(null);
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete budget.'), variant: 'error' }),
  });

  return (
    <Card title="Budgets" description="Manage monthly budgets through tabs. Edit/delete actions use modals.">
      <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

      <TabPanel active={activeTab} id="create">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) => {
            if (createMutation.isPending) return;
            createMutation.mutate({
              categoryId: values.categoryId,
              accountId: values.accountId || null,
              month: Number(values.month),
              year: Number(values.year),
              amount: Number(values.amount),
              alertThresholdPercent: Number(values.alertThresholdPercent),
            });
          })}
        >
          <div><FieldLabel htmlFor="budget-category" hint="Pick the expense category this budget controls.">Category</FieldLabel><select id="budget-category" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...form.register('categoryId', { required: true })}><option value="">Select category</option>{categories?.filter((x) => x.type === 'Expense').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="budget-account" hint="Optional: limit this budget to one account.">Account (optional)</FieldLabel><select id="budget-account" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...form.register('accountId')}><option value="">All accessible accounts</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="budget-amount" hint="Enter the monthly budget limit for this category.">Budget Amount</FieldLabel><input id="budget-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 10000" {...form.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="budget-threshold" hint="Alert when spending reaches this percent of budget.">Alert Threshold (%)</FieldLabel><input id="budget-threshold" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" min="1" max="100" placeholder="e.g. 80" {...form.register('alertThresholdPercent', { required: true, min: 1, max: 100 })} /></div>
          <button className="rounded-2xl bg-brand-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" type="submit" disabled={createMutation.isPending}>Save budget</button>
        </form>
      </TabPanel>

      <TabPanel active={activeTab} id="tracking">
        <div className="space-y-4">
          {budgets?.map((item) => (
            <div key={item.id} className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.categoryName}</div>
                  <div className="text-sm text-slate-500">{formatCurrency(item.actualSpend)} / {formatCurrency(item.amount)}{item.accountName ? ` · ${item.accountName}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-slate-600">{item.usagePercent.toFixed(0)}%</div>
                  <button
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    type="button"
                    onClick={() => {
                      setEditingBudget(item);
                      editForm.reset({
                        categoryId: item.categoryId,
                        accountId: item.accountId ?? '',
                        month: item.month,
                        year: item.year,
                        amount: item.amount,
                        alertThresholdPercent: item.alertThresholdPercent,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700" type="button" onClick={() => setDeletingBudget(item)}>Delete</button>
                </div>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-200">
                <div className={`h-3 rounded-full ${item.usagePercent >= 100 ? 'bg-rose-500' : item.usagePercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(item.usagePercent, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </TabPanel>

      <Modal open={!!editingBudget} title="Edit budget" onClose={() => setEditingBudget(null)}>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={editForm.handleSubmit((values) => {
            if (updateMutation.isPending) return;
            if (!editingBudget) return;
            updateMutation.mutate({
              id: editingBudget.id,
              payload: {
                amount: Number(values.amount),
                alertThresholdPercent: Number(values.alertThresholdPercent),
              },
            });
          })}
        >
          <div><FieldLabel htmlFor="edit-budget-amount" hint="Update the budget limit amount.">Budget Amount</FieldLabel><input id="edit-budget-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 10000" {...editForm.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="edit-budget-threshold" hint="Update the alert percentage trigger.">Alert Threshold (%)</FieldLabel><input id="edit-budget-threshold" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" min="1" max="100" placeholder="e.g. 80" {...editForm.register('alertThresholdPercent', { required: true, min: 1, max: 100 })} /></div>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" type="submit" disabled={updateMutation.isPending}>Update budget</button>
        </form>
      </Modal>

      <Modal open={!!deletingBudget} title="Delete budget" onClose={() => setDeletingBudget(null)}>
        <p className="text-sm text-slate-600">Delete budget for <span className="font-semibold">{deletingBudget?.categoryName}</span>?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => setDeletingBudget(null)}>Cancel</button>
          <button className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700" type="button" onClick={() => deletingBudget ? deleteMutation.mutate(deletingBudget.id) : null}>Delete</button>
        </div>
      </Modal>
    </Card>
  );
}
