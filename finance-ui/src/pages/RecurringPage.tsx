import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { RecurringItem } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { recurringFrequencyMap, transactionTypeMap } from '../utils/enums';
import { formatCurrency } from '../utils/format';

type RecurringFormValues = {
  title: string;
  type: 'Expense' | 'Income';
  amount: number;
  categoryId: string;
  accountId: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  startDate: string;
  endDate: string;
  autoCreateTransaction: boolean;
};

const defaults: RecurringFormValues = {
  title: '',
  type: 'Expense',
  amount: 0,
  categoryId: '',
  accountId: '',
  frequency: 'Monthly',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  autoCreateTransaction: true,
};

export function RecurringPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToastStore();
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const form = useForm<RecurringFormValues>({ defaultValues: defaults });

  const { data: items } = useQuery({ queryKey: ['recurring'], queryFn: financeApi.getRecurring });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });

  const resetForm = () => {
    setEditingItem(null);
    form.reset(defaults);
  };

  const createMutation = useMutation({
    mutationFn: financeApi.createRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      pushToast({ title: 'Recurring item saved', message: 'Recurring transaction created successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Recurring item failed', message: getApiErrorMessage(error, 'Unable to save recurring item.'), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateRecurring(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      pushToast({ title: 'Recurring item updated', message: 'Recurring item updated successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Update failed', message: getApiErrorMessage(error, 'Unable to update recurring item.'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      pushToast({ title: 'Recurring item deleted', message: 'Recurring item deleted successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete recurring item.'), variant: 'error' }),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <Card title={editingItem ? 'Edit recurring item' : 'Create recurring item'} description="Define bills, subscriptions, or salary items that repeat on a schedule.">
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit((values) => {
            if (editingItem) {
              updateMutation.mutate({
                id: editingItem.id,
                payload: {
                  title: values.title,
                  amount: Number(values.amount),
                  categoryId: values.categoryId || null,
                  accountId: values.accountId || null,
                  frequency: recurringFrequencyMap[values.frequency],
                  startDate: values.startDate,
                  endDate: values.endDate || null,
                  nextRunDate: editingItem.nextRunDate,
                  autoCreateTransaction: values.autoCreateTransaction,
                  isPaused: editingItem.isPaused,
                },
              });
              return;
            }

            createMutation.mutate({
              title: values.title,
              type: transactionTypeMap[values.type],
              amount: Number(values.amount),
              categoryId: values.categoryId || null,
              accountId: values.accountId || null,
              frequency: recurringFrequencyMap[values.frequency],
              startDate: values.startDate,
              endDate: values.endDate || null,
              autoCreateTransaction: values.autoCreateTransaction,
            });
          })}
        >
          <div><FieldLabel htmlFor="recurring-title">Title</FieldLabel><input id="recurring-title" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Title" {...form.register('title', { required: true })} /></div>
          <div><FieldLabel htmlFor="recurring-type">Type</FieldLabel><select id="recurring-type" className="w-full rounded-2xl border border-slate-200 px-4 py-3" disabled={!!editingItem} {...form.register('type')}><option>Expense</option><option>Income</option></select></div>
          <div><FieldLabel htmlFor="recurring-amount">Amount</FieldLabel><input id="recurring-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" step="0.01" placeholder="Amount" {...form.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="recurring-account">Account</FieldLabel><select id="recurring-account" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('accountId')}><option value="">Select account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="recurring-category">Category</FieldLabel><select id="recurring-category" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('categoryId')}><option value="">Select category</option>{categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="recurring-frequency">Frequency</FieldLabel><select id="recurring-frequency" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('frequency')}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></div>
          <div><FieldLabel htmlFor="recurring-start-date">Start Date</FieldLabel><input id="recurring-start-date" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="date" {...form.register('startDate', { required: true })} /></div>
          <div><FieldLabel htmlFor="recurring-end-date">End Date</FieldLabel><input id="recurring-end-date" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="date" {...form.register('endDate')} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...form.register('autoCreateTransaction')} />
            Auto-create transaction
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="submit">{editingItem ? 'Update recurring item' : 'Save recurring item'}</button>
            {editingItem ? <button className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-700" type="button" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>
      </Card>

      <Card title="Upcoming recurring payments" description="See the next recurring bills and income events due soon.">
        <div className="space-y-3">
          {items?.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-slate-500">{item.frequency} · Next {item.nextRunDate}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(item.amount)}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        form.reset({
                          title: item.title,
                          type: item.type as RecurringFormValues['type'],
                          amount: item.amount,
                          categoryId: item.categoryId ?? '',
                          accountId: item.accountId ?? '',
                          frequency: item.frequency as RecurringFormValues['frequency'],
                          startDate: item.startDate,
                          endDate: item.endDate ?? '',
                          autoCreateTransaction: item.autoCreateTransaction,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700"
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Delete recurring item "${item.title}"?`)) return;
                        deleteMutation.mutate(item.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
