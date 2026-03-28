import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { Modal } from '../components/ui/Modal';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { Transaction } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { transactionTypeMap } from '../utils/enums';
import { formatCurrency } from '../utils/format';

type TransactionFormValues = {
  accountId: string;
  destinationAccountId: string;
  categoryId: string;
  type: 'Expense' | 'Income' | 'Transfer';
  amount: number;
  date: string;
  merchant: string;
  note: string;
  paymentMethod: string;
  tags: string;
};

const transactionDefaults: TransactionFormValues = {
  accountId: '',
  destinationAccountId: '',
  categoryId: '',
  type: 'Expense',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  merchant: '',
  note: '',
  paymentMethod: '',
  tags: '',
};

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('create');
  const [importPayload, setImportPayload] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const createForm = useForm<TransactionFormValues>({ defaultValues: transactionDefaults });
  const editForm = useForm<TransactionFormValues>({ defaultValues: transactionDefaults });
  const createType = createForm.watch('type');
  const editType = editForm.watch('type');

  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: financeApi.getTransactions });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });

  const tabItems = useMemo(() => [
    { id: 'create', label: 'Add Transaction' },
    { id: 'import', label: 'Import' },
    { id: 'history', label: 'History' },
  ], []);

  const notifyRuleAlerts = (items: Transaction[], source: 'created' | 'updated' | 'imported') => {
    const alerts = items.flatMap((item) => (item.ruleAlerts ?? []).map((message) => ({ message, merchant: item.merchant ?? 'Transaction' })));
    if (!alerts.length) return;
    pushToast({
      title: `Rule alerts ${source}`,
      message: `${alerts.length} alert${alerts.length > 1 ? 's' : ''} triggered by automation rules.`,
      variant: 'info',
    });
    alerts.slice(0, 3).forEach((alert) => pushToast({ title: alert.merchant, message: alert.message, variant: 'error' }));
  };

  const toPayload = (values: TransactionFormValues) => ({
    accountId: values.accountId,
    type: transactionTypeMap[values.type],
    amount: Number(values.amount),
    date: values.date,
    merchant: values.merchant || null,
    note: values.note || null,
    paymentMethod: values.paymentMethod || null,
    tags: values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    categoryId: values.type === 'Transfer' ? null : values.categoryId || null,
    destinationAccountId: values.type === 'Transfer' ? values.destinationAccountId || null : null,
  });

  const validateTransfer = (values: TransactionFormValues) => {
    if (values.type !== 'Transfer') return true;
    if (!values.destinationAccountId) {
      pushToast({ title: 'Destination required', message: 'Select a destination account for transfer.', variant: 'error' });
      return false;
    }
    if (values.accountId && values.accountId === values.destinationAccountId) {
      pushToast({ title: 'Invalid transfer', message: 'Source and destination accounts must be different.', variant: 'error' });
      return false;
    }
    return true;
  };

  const createMutation = useMutation({
    mutationFn: financeApi.createTransaction,
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Transaction saved', message: 'The transaction was added successfully.', variant: 'success' });
      notifyRuleAlerts([transaction], 'created');
      createForm.reset(transactionDefaults);
      setActiveTab('history');
    },
    onError: (error) => pushToast({ title: 'Transaction failed', message: getApiErrorMessage(error, 'Unable to save transaction.'), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateTransaction(id, payload),
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Transaction updated', message: 'The transaction was updated successfully.', variant: 'success' });
      notifyRuleAlerts([transaction], 'updated');
      setEditingTransaction(null);
    },
    onError: (error) => pushToast({ title: 'Update failed', message: getApiErrorMessage(error, 'Unable to update transaction.'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Transaction deleted', message: 'The transaction was deleted successfully.', variant: 'success' });
      setDeletingTransaction(null);
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete transaction.'), variant: 'error' }),
  });

  const importMutation = useMutation({
    mutationFn: financeApi.importTransactions,
    onSuccess: (items) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Import complete', message: `${items.length} transactions imported successfully.`, variant: 'success' });
      notifyRuleAlerts(items, 'imported');
      setImportPayload('');
      setActiveTab('history');
    },
    onError: (error) => pushToast({ title: 'Import failed', message: getApiErrorMessage(error, 'Unable to import transactions.'), variant: 'error' }),
  });

  const TransactionForm = ({ form, type, submitLabel, submitting, onSubmit }: { form: ReturnType<typeof useForm<TransactionFormValues>>; type: 'create' | 'edit'; submitLabel: string; submitting: boolean; onSubmit: (values: TransactionFormValues) => void; }) => (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) => {
        if (submitting) return;
        if (!validateTransfer(values)) return;
        onSubmit(values);
      })}
    >
      <div><FieldLabel htmlFor={`${type}-type`} hint="Choose whether this entry is income, expense, or transfer.">Type</FieldLabel><select id={`${type}-type`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...form.register('type')}><option>Expense</option><option>Income</option><option>Transfer</option></select></div>
      <div><FieldLabel htmlFor={`${type}-amount`} hint="Enter the transaction amount.">Amount</FieldLabel><input id={`${type}-amount`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" step="0.01" placeholder="e.g. 1250.00" {...form.register('amount', { required: true, min: 0.01 })} /></div>
      <div><FieldLabel htmlFor={`${type}-date`} hint="Select the date this transaction happened.">Date</FieldLabel><input id={`${type}-date`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="date" placeholder="Select date" {...form.register('date', { required: true })} /></div>
      <div><FieldLabel htmlFor={`${type}-account`} hint="Select the source account for this transaction.">Account</FieldLabel><select id={`${type}-account`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...form.register('accountId', { required: true })}><option value="">Select account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
      {(type === 'create' ? createType : editType) === 'Transfer' ? (
        <div><FieldLabel htmlFor={`${type}-destination`} hint="Choose where the transferred amount should go.">Destination Account</FieldLabel><select id={`${type}-destination`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...form.register('destinationAccountId')}><option value="">Select destination account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
      ) : (
        <div><FieldLabel htmlFor={`${type}-category`} hint="Assign a category for budgeting and reporting.">Category</FieldLabel><select id={`${type}-category`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...form.register('categoryId')}><option value="">Select category</option>{categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      )}
      <div><FieldLabel htmlFor={`${type}-merchant`} hint="Optional merchant or payee name.">Merchant</FieldLabel><input id={`${type}-merchant`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Uber, Amazon" {...form.register('merchant')} /></div>
      <div><FieldLabel htmlFor={`${type}-payment`} hint="Optional method like card, cash, or bank transfer.">Payment Method</FieldLabel><input id={`${type}-payment`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Credit Card" {...form.register('paymentMethod')} /></div>
      <div><FieldLabel htmlFor={`${type}-tags`} hint="Optional comma-separated tags for search and filters.">Tags</FieldLabel><input id={`${type}-tags`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. groceries, monthly" {...form.register('tags')} /></div>
      <div className="md:col-span-2"><FieldLabel htmlFor={`${type}-note`} hint="Optional short note for this entry.">Note</FieldLabel><textarea id={`${type}-note`} className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="Add short details..." {...form.register('note')} /></div>
      <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" type="submit" disabled={submitting}>{submitLabel}</button>
    </form>
  );

  return (
    <Card title="Transactions" description="Use tabs to add, import, or review transactions. Edit/delete actions open in modals.">
      <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

      <TabPanel active={activeTab} id="create">
        <TransactionForm form={createForm} type="create" submitLabel="Save transaction" submitting={createMutation.isPending} onSubmit={(values) => createMutation.mutate({ ...toPayload(values), recurringTransactionId: null })} />
      </TabPanel>

      <TabPanel active={activeTab} id="import">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-medium text-slate-900">Import transactions (JSON array)</div>
          <textarea
            className="h-36 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
            value={importPayload}
            onChange={(event) => setImportPayload(event.target.value)}
            placeholder='[{"accountId":"...","type":2,"amount":5600,"date":"2026-03-26"}]'
          />
          <button
            className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={importMutation.isPending}
            onClick={() => {
              if (importMutation.isPending) return;
              try {
                const items = JSON.parse(importPayload);
                if (!Array.isArray(items) || items.length === 0) {
                  pushToast({ title: 'Invalid import payload', message: 'Provide a non-empty JSON array.', variant: 'error' });
                  return;
                }
                importMutation.mutate({ items });
              } catch {
                pushToast({ title: 'Invalid JSON', message: 'Please provide valid JSON array payload.', variant: 'error' });
              }
            }}
          >
            Import JSON
          </button>
        </div>
      </TabPanel>

      <TabPanel active={activeTab} id="history">
        <div className="overflow-hidden rounded-3xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Alerts</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {transactions?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.date}</td>
                  <td className="px-4 py-3">{item.merchant ?? '-'}</td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3">
                    {(item.ruleAlerts?.length ?? 0) > 0 ? (
                      <div className="space-y-1">
                        {item.ruleAlerts?.slice(0, 2).map((alert) => <div key={alert} className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-800">{alert}</div>)}
                      </div>
                    ) : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
                        type="button"
                        onClick={() => {
                          setEditingTransaction(item);
                          editForm.reset({
                            accountId: item.accountId,
                            destinationAccountId: item.destinationAccountId ?? '',
                            categoryId: item.categoryId ?? '',
                            type: item.type,
                            amount: item.amount,
                            date: item.date,
                            merchant: item.merchant ?? '',
                            note: item.note ?? '',
                            paymentMethod: item.paymentMethod ?? '',
                            tags: item.tags.join(', '),
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700" type="button" onClick={() => setDeletingTransaction(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabPanel>

      <Modal open={!!editingTransaction} title="Edit transaction" onClose={() => setEditingTransaction(null)}>
        <TransactionForm form={editForm} type="edit" submitLabel="Update transaction" submitting={updateMutation.isPending} onSubmit={(values) => {
          if (!editingTransaction) return;
          updateMutation.mutate({ id: editingTransaction.id, payload: toPayload(values) });
        }} />
      </Modal>

      <Modal open={!!deletingTransaction} title="Delete transaction" onClose={() => setDeletingTransaction(null)}>
        <p className="text-sm text-slate-600">Delete transaction for <span className="font-semibold">{deletingTransaction?.merchant ?? 'this entry'}</span>?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => setDeletingTransaction(null)}>Cancel</button>
          <button
            className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700"
            type="button"
            onClick={() => deletingTransaction ? deleteMutation.mutate(deletingTransaction.id) : null}
          >
            Delete
          </button>
        </div>
      </Modal>
    </Card>
  );
}
