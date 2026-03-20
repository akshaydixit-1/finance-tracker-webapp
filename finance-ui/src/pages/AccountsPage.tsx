import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { Account, Category } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { accountTypeMap, categoryTypeMap } from '../utils/enums';
import { formatCurrency } from '../utils/format';

type AccountFormValues = {
  name: string;
  type: 'Bank' | 'CreditCard' | 'CashWallet' | 'Savings';
  openingBalance: number;
  institutionName: string;
};

type CategoryFormValues = {
  name: string;
  type: 'Expense' | 'Income';
  color: string;
  icon: string;
};

const accountDefaults: AccountFormValues = { name: '', type: 'Bank', openingBalance: 0, institutionName: '' };
const categoryDefaults: CategoryFormValues = { name: '', type: 'Expense', color: '#2056d8', icon: 'CircleDollarSign' };

export function AccountsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToastStore();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const accountForm = useForm<AccountFormValues>({ defaultValues: accountDefaults });
  const categoryForm = useForm<CategoryFormValues>({ defaultValues: categoryDefaults });

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });

  const resetAccountForm = () => {
    setEditingAccount(null);
    accountForm.reset(accountDefaults);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    categoryForm.reset(categoryDefaults);
  };

  const createAccount = useMutation({
    mutationFn: financeApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      pushToast({ title: 'Account created', message: 'The account was added successfully.', variant: 'success' });
      resetAccountForm();
    },
    onError: (error) => pushToast({ title: 'Account creation failed', message: getApiErrorMessage(error, 'Unable to create account.'), variant: 'error' }),
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      pushToast({ title: 'Account updated', message: 'The account was updated successfully.', variant: 'success' });
      resetAccountForm();
    },
    onError: (error) => pushToast({ title: 'Account update failed', message: getApiErrorMessage(error, 'Unable to update account.'), variant: 'error' }),
  });

  const deleteAccount = useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      pushToast({ title: 'Account deleted', message: 'The account was deleted successfully.', variant: 'success' });
      resetAccountForm();
    },
    onError: (error) => pushToast({ title: 'Account delete failed', message: getApiErrorMessage(error, 'Unable to delete account.'), variant: 'error' }),
  });

  const createCategory = useMutation({
    mutationFn: financeApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      pushToast({ title: 'Category created', message: 'The category was added successfully.', variant: 'success' });
      resetCategoryForm();
    },
    onError: (error) => pushToast({ title: 'Category creation failed', message: getApiErrorMessage(error, 'Unable to create category.'), variant: 'error' }),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      pushToast({ title: 'Category updated', message: 'The category was updated successfully.', variant: 'success' });
      resetCategoryForm();
    },
    onError: (error) => pushToast({ title: 'Category update failed', message: getApiErrorMessage(error, 'Unable to update category.'), variant: 'error' }),
  });

  const deleteCategory = useMutation({
    mutationFn: financeApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      pushToast({ title: 'Category archived', message: 'The category was archived successfully.', variant: 'success' });
      resetCategoryForm();
    },
    onError: (error) => pushToast({ title: 'Category archive failed', message: getApiErrorMessage(error, 'Unable to archive category.'), variant: 'error' }),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <Card title={editingAccount ? 'Edit account' : 'Add account'} description="Create a bank, cash, card, or savings account to track balances.">
          <form
            className="grid gap-3"
            onSubmit={accountForm.handleSubmit((values) => {
              const payload = {
                name: values.name,
                type: accountTypeMap[values.type],
                institutionName: values.institutionName || null,
              };

              if (editingAccount) {
                updateAccount.mutate({ id: editingAccount.id, payload });
                return;
              }

              createAccount.mutate({ ...payload, openingBalance: Number(values.openingBalance) });
            })}
          >
            <div><FieldLabel htmlFor="account-name">Account Name</FieldLabel><input id="account-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Account name" {...accountForm.register('name', { required: true })} /></div>
            <div><FieldLabel htmlFor="account-type">Account Type</FieldLabel><select id="account-type" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...accountForm.register('type')}><option>Bank</option><option>CreditCard</option><option>CashWallet</option><option>Savings</option></select></div>
            <div><FieldLabel htmlFor="opening-balance">Opening Balance</FieldLabel><input id="opening-balance" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" step="0.01" disabled={!!editingAccount} placeholder="Opening balance" {...accountForm.register('openingBalance', { required: true, min: 0 })} /></div>
            <div><FieldLabel htmlFor="institution-name">Institution Name</FieldLabel><input id="institution-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Institution" {...accountForm.register('institutionName')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-2xl bg-brand-500 px-4 py-3 text-white" type="submit">{editingAccount ? 'Update account' : 'Create account'}</button>
              {editingAccount ? <button className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-700" type="button" onClick={resetAccountForm}>Cancel edit</button> : null}
            </div>
          </form>
        </Card>

        <Card title={editingCategory ? 'Edit category' : 'Add category'} description="Create custom income or expense categories for better tracking.">
          <form
            className="grid gap-3"
            onSubmit={categoryForm.handleSubmit((values) => {
              if (editingCategory) {
                updateCategory.mutate({
                  id: editingCategory.id,
                  payload: {
                    name: values.name,
                    color: values.color,
                    icon: values.icon,
                    isArchived: editingCategory.isArchived,
                  },
                });
                return;
              }

              createCategory.mutate({ ...values, type: categoryTypeMap[values.type] });
            })}
          >
            <div><FieldLabel htmlFor="category-name">Category Name</FieldLabel><input id="category-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Category name" {...categoryForm.register('name', { required: true })} /></div>
            <div><FieldLabel htmlFor="category-type">Category Type</FieldLabel><select id="category-type" className="w-full rounded-2xl border border-slate-200 px-4 py-3" disabled={!!editingCategory} {...categoryForm.register('type')}><option>Expense</option><option>Income</option></select></div>
            <div><FieldLabel htmlFor="category-color">Color</FieldLabel><input id="category-color" className="w-full h-12 rounded-2xl border border-slate-200 px-2 py-2" type="color" {...categoryForm.register('color')} /></div>
            <div><FieldLabel htmlFor="category-icon">Icon</FieldLabel><input id="category-icon" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Icon name" {...categoryForm.register('icon', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="submit">{editingCategory ? 'Update category' : 'Create category'}</button>
              {editingCategory ? <button className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-700" type="button" onClick={resetCategoryForm}>Cancel edit</button> : null}
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Accounts overview" description="See current balances across the accounts you have added.">
          <div className="space-y-3">
            {accounts?.map((account) => (
              <div key={account.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-slate-500">{account.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(account.currentBalance)}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
                        type="button"
                        onClick={() => {
                          setEditingAccount(account);
                          accountForm.reset({
                            name: account.name,
                            type: account.type as AccountFormValues['type'],
                            openingBalance: account.openingBalance,
                            institutionName: account.institutionName ?? '',
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700"
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Delete account "${account.name}"?`)) return;
                          deleteAccount.mutate(account.id);
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

        <Card title="Categories overview" description="Review the income and expense categories available for transactions and budgets.">
          <div className="space-y-3">
            {categories?.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-xs text-slate-500">{category.type}{category.isArchived ? ' · Archived' : ''}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
                    type="button"
                    onClick={() => {
                      setEditingCategory(category);
                      categoryForm.reset({
                        name: category.name,
                        type: category.type as CategoryFormValues['type'],
                        color: category.color,
                        icon: category.icon,
                      });
                    }}
                  >
                    Edit
                  </button>
                  {!category.isArchived ? (
                    <button
                      className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700"
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Archive category "${category.name}"?`)) return;
                        deleteCategory.mutate(category.id);
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
