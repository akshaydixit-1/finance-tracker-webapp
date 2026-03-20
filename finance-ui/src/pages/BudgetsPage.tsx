import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { Budget } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCurrency } from '../utils/format';

type BudgetFormValues = {
  categoryId: string;
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
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const form = useForm<BudgetFormValues>({ defaultValues: { categoryId: '', month, year, amount: 0, alertThresholdPercent: 80 } });

  const { data: budgets } = useQuery({ queryKey: ['budgets', month, year], queryFn: () => financeApi.getBudgets(month, year) });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });

  const resetForm = () => {
    setEditingBudget(null);
    form.reset({ categoryId: '', month, year, amount: 0, alertThresholdPercent: 80 });
  };

  const createMutation = useMutation({
    mutationFn: financeApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Budget saved', message: 'Monthly budget created successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Budget failed', message: getApiErrorMessage(error, 'Unable to save budget.'), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateBudget(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Budget updated', message: 'Budget updated successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Update failed', message: getApiErrorMessage(error, 'Unable to update budget.'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Budget deleted', message: 'Budget deleted successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete budget.'), variant: 'error' }),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <Card title={editingBudget ? 'Edit monthly budget' : 'Set monthly budget'} description="Define a spending limit for a category and compare it with actual spend.">
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit((values) => {
            if (editingBudget) {
              updateMutation.mutate({
                id: editingBudget.id,
                payload: { amount: Number(values.amount), alertThresholdPercent: Number(values.alertThresholdPercent) },
              });
              return;
            }

            createMutation.mutate({
              categoryId: values.categoryId,
              month: Number(values.month),
              year: Number(values.year),
              amount: Number(values.amount),
              alertThresholdPercent: Number(values.alertThresholdPercent),
            });
          })}
        >
          <div>
            <FieldLabel htmlFor="budget-category">Category</FieldLabel>
            <select id="budget-category" className="w-full rounded-2xl border border-slate-200 px-4 py-3" disabled={!!editingBudget} {...form.register('categoryId', { required: true })}>
              <option value="">Select category</option>
              {categories?.filter((item) => item.type === 'Expense').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div><FieldLabel htmlFor="budget-amount">Budget Amount</FieldLabel><input id="budget-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" step="0.01" placeholder="Budget amount" {...form.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="budget-threshold">Alert Threshold (%)</FieldLabel><input id="budget-threshold" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" min="1" max="100" {...form.register('alertThresholdPercent', { required: true, min: 1, max: 100 })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-2xl bg-brand-500 px-4 py-3 text-white" type="submit">{editingBudget ? 'Update budget' : 'Save budget'}</button>
            {editingBudget ? <button className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-700" type="button" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>
      </Card>

      <Card title="Budget tracking" description="Monitor which categories are on track, near limit, or over budget.">
        <div className="space-y-4">
          {budgets?.map((item) => (
            <div key={item.id} className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.categoryName}</div>
                  <div className="text-sm text-slate-500">{formatCurrency(item.actualSpend)} / {formatCurrency(item.amount)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-slate-600">{item.usagePercent.toFixed(0)}%</div>
                  <button
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    type="button"
                    onClick={() => {
                      setEditingBudget(item);
                      form.reset({
                        categoryId: item.categoryId,
                        month: item.month,
                        year: item.year,
                        amount: item.amount,
                        alertThresholdPercent: item.alertThresholdPercent,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Delete budget for ${item.categoryName}?`)) return;
                      deleteMutation.mutate(item.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-200">
                <div className={`h-3 rounded-full ${item.usagePercent >= 100 ? 'bg-rose-500' : item.usagePercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(item.usagePercent, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
