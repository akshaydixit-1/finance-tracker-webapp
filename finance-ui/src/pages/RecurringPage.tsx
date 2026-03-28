import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { Modal } from '../components/ui/Modal';
import { TabPanel, Tabs } from '../components/ui/Tabs';
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
  const [activeTab, setActiveTab] = useState('create');
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<RecurringItem | null>(null);

  const createForm = useForm<RecurringFormValues>({ defaultValues: defaults });
  const editForm = useForm<RecurringFormValues>({ defaultValues: defaults });
  const tabs = useMemo(() => [
    { id: 'create', label: 'Create Recurring' },
    { id: 'upcoming', label: 'Upcoming' },
  ], []);

  const { data: items } = useQuery({ queryKey: ['recurring'], queryFn: financeApi.getRecurring });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });

  const createMutation = useMutation({
    mutationFn: financeApi.createRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      pushToast({ title: 'Recurring item saved', message: 'Recurring transaction created successfully.', variant: 'success' });
      createForm.reset(defaults);
      setActiveTab('upcoming');
    },
    onError: (error) => pushToast({ title: 'Recurring item failed', message: getApiErrorMessage(error, 'Unable to save recurring item.'), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateRecurring(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      pushToast({ title: 'Recurring item updated', message: 'Recurring item updated successfully.', variant: 'success' });
      setEditingItem(null);
    },
    onError: (error) => pushToast({ title: 'Update failed', message: getApiErrorMessage(error, 'Unable to update recurring item.'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      pushToast({ title: 'Recurring item deleted', message: 'Recurring item deleted successfully.', variant: 'success' });
      setDeletingItem(null);
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete recurring item.'), variant: 'error' }),
  });

  return (
    <Card title="Recurring" description="Tab-based recurring management with modal edit/delete actions.">
      <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

      <TabPanel active={activeTab} id="create">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={createForm.handleSubmit((values) => {
            if (createMutation.isPending) return;
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
          <div><FieldLabel htmlFor="recurring-title" hint="Name used to identify this recurring entry.">Title</FieldLabel><input id="recurring-title" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Rent Payment" {...createForm.register('title', { required: true })} /></div>
          <div><FieldLabel htmlFor="recurring-type" hint="Choose whether this recurring entry is income or expense.">Type</FieldLabel><select id="recurring-type" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...createForm.register('type')}><option>Expense</option><option>Income</option></select></div>
          <div><FieldLabel htmlFor="recurring-amount" hint="Amount to create each time this runs.">Amount</FieldLabel><input id="recurring-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 25000" {...createForm.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="recurring-account" hint="Optional account used for generated transactions.">Account</FieldLabel><select id="recurring-account" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...createForm.register('accountId')}><option value="">Select account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="recurring-category" hint="Optional category to auto-assign when created.">Category</FieldLabel><select id="recurring-category" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...createForm.register('categoryId')}><option value="">Select category</option>{categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="recurring-frequency" hint="How often this recurring item should run.">Frequency</FieldLabel><select id="recurring-frequency" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...createForm.register('frequency')}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></div>
          <div><FieldLabel htmlFor="recurring-start-date" hint="Date this recurring schedule starts.">Start Date</FieldLabel><input id="recurring-start-date" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="date" placeholder="Select start date" {...createForm.register('startDate', { required: true })} /></div>
          <div><FieldLabel htmlFor="recurring-end-date" hint="Optional date when this schedule should stop.">End Date</FieldLabel><input id="recurring-end-date" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="date" placeholder="Select end date" {...createForm.register('endDate')} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" {...createForm.register('autoCreateTransaction')} /> Auto-create transaction</label>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" type="submit" disabled={createMutation.isPending}>Save recurring item</button>
        </form>
      </TabPanel>

      <TabPanel active={activeTab} id="upcoming">
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
                        editForm.reset({
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
                    <button className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700" type="button" onClick={() => setDeletingItem(item)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </TabPanel>

      <Modal open={!!editingItem} title="Edit recurring item" onClose={() => setEditingItem(null)}>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={editForm.handleSubmit((values) => {
            if (updateMutation.isPending) return;
            if (!editingItem) return;
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
          })}
        >
          <div><FieldLabel htmlFor="edit-recurring-title" hint="Update the recurring entry name.">Title</FieldLabel><input id="edit-recurring-title" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Rent Payment" {...editForm.register('title', { required: true })} /></div>
          <div><FieldLabel htmlFor="edit-recurring-amount" hint="Update amount used in each run.">Amount</FieldLabel><input id="edit-recurring-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 25000" {...editForm.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="edit-recurring-frequency" hint="Update how often this entry repeats.">Frequency</FieldLabel><select id="edit-recurring-frequency" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...editForm.register('frequency')}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></div>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" type="submit" disabled={updateMutation.isPending}>Update recurring item</button>
        </form>
      </Modal>

      <Modal open={!!deletingItem} title="Delete recurring item" onClose={() => setDeletingItem(null)}>
        <p className="text-sm text-slate-600">Delete recurring item <span className="font-semibold">{deletingItem?.title}</span>?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => setDeletingItem(null)}>Cancel</button>
          <button className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700" type="button" onClick={() => deletingItem ? deleteMutation.mutate(deletingItem.id) : null}>Delete</button>
        </div>
      </Modal>
    </Card>
  );
}
