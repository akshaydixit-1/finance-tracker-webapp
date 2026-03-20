import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const form = useForm<TransactionFormValues>({ defaultValues: transactionDefaults });
  const transactionType = form.watch('type');

  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: financeApi.getTransactions });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });

  const resetForm = () => {
    setEditingTransaction(null);
    form.reset(transactionDefaults);
  };

  const createMutation = useMutation({
    mutationFn: financeApi.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Transaction saved', message: 'The transaction was added successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Transaction failed', message: getApiErrorMessage(error, 'Unable to save transaction.'), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateTransaction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Transaction updated', message: 'The transaction was updated successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Update failed', message: getApiErrorMessage(error, 'Unable to update transaction.'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      pushToast({ title: 'Transaction deleted', message: 'The transaction was deleted successfully.', variant: 'success' });
      resetForm();
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete transaction.'), variant: 'error' }),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <Card title={editingTransaction ? 'Edit transaction' : 'Add transaction'} description="Record income, expenses, or transfers with the account and category details.">
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit((values) => {
            if (values.type === 'Transfer' && !values.destinationAccountId) {
              pushToast({ title: 'Destination required', message: 'Select a destination account for transfer.', variant: 'error' });
              return;
            }

            if (values.type === 'Transfer' && values.accountId && values.accountId === values.destinationAccountId) {
              pushToast({ title: 'Invalid transfer', message: 'Source and destination accounts must be different.', variant: 'error' });
              return;
            }

            const payload = {
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
            };

            if (editingTransaction) {
              updateMutation.mutate({ id: editingTransaction.id, payload });
              return;
            }

            createMutation.mutate({ ...payload, recurringTransactionId: null });
          })}
        >
          <div><FieldLabel htmlFor="transaction-type">Type</FieldLabel><select id="transaction-type" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('type')}><option>Expense</option><option>Income</option><option>Transfer</option></select></div>
          <div><FieldLabel htmlFor="transaction-amount">Amount</FieldLabel><input id="transaction-amount" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" step="0.01" placeholder="Amount" {...form.register('amount', { required: true, min: 0.01 })} /></div>
          <div><FieldLabel htmlFor="transaction-date">Date</FieldLabel><input id="transaction-date" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="date" {...form.register('date', { required: true })} /></div>
          <div><FieldLabel htmlFor="transaction-account">Account</FieldLabel><select id="transaction-account" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('accountId', { required: true })}><option value="">Select account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          {transactionType === 'Transfer' ? (
            <div><FieldLabel htmlFor="transaction-destination-account">Destination Account</FieldLabel><select id="transaction-destination-account" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('destinationAccountId')}><option value="">Select destination account</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          ) : (
            <div><FieldLabel htmlFor="transaction-category">Category</FieldLabel><select id="transaction-category" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('categoryId')}><option value="">Select category</option>{categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          )}
          <div><FieldLabel htmlFor="transaction-merchant">Merchant</FieldLabel><input id="transaction-merchant" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Merchant" {...form.register('merchant')} /></div>
          <div><FieldLabel htmlFor="transaction-payment-method">Payment Method</FieldLabel><input id="transaction-payment-method" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Payment method" {...form.register('paymentMethod')} /></div>
          <div><FieldLabel htmlFor="transaction-note">Note</FieldLabel><textarea id="transaction-note" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Note" {...form.register('note')} /></div>
          <div><FieldLabel htmlFor="transaction-tags">Tags</FieldLabel><input id="transaction-tags" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Tags comma separated" {...form.register('tags')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="submit">{editingTransaction ? 'Update transaction' : 'Save transaction'}</button>
            {editingTransaction ? <button className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-700" type="button" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>
      </Card>

      <Card title="Recent entries" description="Review the latest transactions and confirm your records are correct.">
        <div className="overflow-hidden rounded-3xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
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
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
                        type="button"
                        onClick={() => {
                          setEditingTransaction(item);
                          form.reset({
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
                      <button
                        className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700"
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Delete this transaction?')) return;
                          deleteMutation.mutate(item.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
