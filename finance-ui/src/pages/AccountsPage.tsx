import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { Modal } from '../components/ui/Modal';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { Account, AccountMember, Category } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { accountMemberRoleMap, accountTypeMap, categoryTypeMap } from '../utils/enums';
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
  const [activeTab, setActiveTab] = useState('accounts');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [sharedAccountId, setSharedAccountId] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Editor' | 'Viewer'>('Editor');

  const accountCreateForm = useForm<AccountFormValues>({ defaultValues: accountDefaults });
  const accountEditForm = useForm<AccountFormValues>({ defaultValues: accountDefaults });
  const categoryCreateForm = useForm<CategoryFormValues>({ defaultValues: categoryDefaults });
  const categoryEditForm = useForm<CategoryFormValues>({ defaultValues: categoryDefaults });

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });
  const { data: sharedMembers } = useQuery({
    queryKey: ['account-members', sharedAccountId],
    queryFn: () => financeApi.getAccountMembers(sharedAccountId),
    enabled: Boolean(sharedAccountId),
  });

  const tabs = useMemo(() => [
    { id: 'accounts', label: 'Accounts' },
    { id: 'categories', label: 'Categories' },
    { id: 'shared', label: 'Shared' },
  ], []);

  const createAccount = useMutation({
    mutationFn: financeApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      pushToast({ title: 'Account created', message: 'The account was added successfully.', variant: 'success' });
      accountCreateForm.reset(accountDefaults);
    },
    onError: (error) => pushToast({ title: 'Account creation failed', message: getApiErrorMessage(error, 'Unable to create account.'), variant: 'error' }),
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      pushToast({ title: 'Account updated', message: 'The account was updated successfully.', variant: 'success' });
      setEditingAccount(null);
    },
    onError: (error) => pushToast({ title: 'Account update failed', message: getApiErrorMessage(error, 'Unable to update account.'), variant: 'error' }),
  });

  const deleteAccount = useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      pushToast({ title: 'Account deleted', message: 'The account was deleted successfully.', variant: 'success' });
      setDeletingAccount(null);
    },
    onError: (error) => pushToast({ title: 'Account delete failed', message: getApiErrorMessage(error, 'Unable to delete account.'), variant: 'error' }),
  });

  const createCategory = useMutation({
    mutationFn: financeApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      pushToast({ title: 'Category created', message: 'The category was added successfully.', variant: 'success' });
      categoryCreateForm.reset(categoryDefaults);
    },
    onError: (error) => pushToast({ title: 'Category creation failed', message: getApiErrorMessage(error, 'Unable to create category.'), variant: 'error' }),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => financeApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      pushToast({ title: 'Category updated', message: 'The category was updated successfully.', variant: 'success' });
      setEditingCategory(null);
    },
    onError: (error) => pushToast({ title: 'Category update failed', message: getApiErrorMessage(error, 'Unable to update category.'), variant: 'error' }),
  });

  const deleteCategory = useMutation({
    mutationFn: financeApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      pushToast({ title: 'Category archived', message: 'The category was archived successfully.', variant: 'success' });
      setDeletingCategory(null);
    },
    onError: (error) => pushToast({ title: 'Category archive failed', message: getApiErrorMessage(error, 'Unable to archive category.'), variant: 'error' }),
  });

  const inviteMember = useMutation({
    mutationFn: ({ accountId, email, role }: { accountId: string; email: string; role: 'Editor' | 'Viewer' }) =>
      financeApi.inviteAccountMember(accountId, { email, role: accountMemberRoleMap[role] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-members', sharedAccountId] });
      pushToast({ title: 'Member invited', message: 'Invite processed successfully.', variant: 'success' });
      setInviteEmail('');
      setInviteRole('Editor');
      setInviteModalOpen(false);
    },
    onError: (error) => pushToast({ title: 'Invite failed', message: getApiErrorMessage(error, 'Unable to invite member.'), variant: 'error' }),
  });

  const updateMemberRole = useMutation({
    mutationFn: ({ accountId, member }: { accountId: string; member: AccountMember }) =>
      financeApi.updateAccountMemberRole(accountId, member.userId, { role: accountMemberRoleMap[member.role === 'Editor' ? 'Viewer' : 'Editor'] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-members', sharedAccountId] });
      pushToast({ title: 'Role updated', message: 'Member role updated successfully.', variant: 'success' });
    },
    onError: (error) => pushToast({ title: 'Role update failed', message: getApiErrorMessage(error, 'Unable to update member role.'), variant: 'error' }),
  });

  return (
    <Card title="Accounts & Categories" description="Use section tabs; edit/delete operations are handled in modals.">
      <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

      <TabPanel active={activeTab} id="accounts">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <form
            className="grid gap-3"
            onSubmit={accountCreateForm.handleSubmit((values) => createAccount.mutate({
              name: values.name,
              type: accountTypeMap[values.type],
              openingBalance: Number(values.openingBalance),
              institutionName: values.institutionName || null,
            }))}
          >
            <div><FieldLabel htmlFor="account-name">Account Name</FieldLabel><input id="account-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. HDFC Savings" {...accountCreateForm.register('name', { required: true })} /></div>
            <div><FieldLabel htmlFor="account-type">Account Type</FieldLabel><select id="account-type" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...accountCreateForm.register('type')}><option>Bank</option><option>CreditCard</option><option>CashWallet</option><option>Savings</option></select></div>
            <div><FieldLabel htmlFor="opening-balance">Opening Balance</FieldLabel><input id="opening-balance" className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="number" step="0.01" placeholder="e.g. 50000" {...accountCreateForm.register('openingBalance', { required: true, min: 0 })} /></div>
            <div><FieldLabel htmlFor="institution-name">Institution Name</FieldLabel><input id="institution-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. HDFC Bank" {...accountCreateForm.register('institutionName')} /></div>
            <button className="rounded-2xl bg-brand-500 px-4 py-3 text-white" type="submit">Create account</button>
          </form>

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
                          accountEditForm.reset({
                            name: account.name,
                            type: account.type as AccountFormValues['type'],
                            openingBalance: account.openingBalance,
                            institutionName: account.institutionName ?? '',
                          });
                          setSharedAccountId(account.id);
                        }}
                      >
                        Edit
                      </button>
                      <button className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700" type="button" onClick={() => setDeletingAccount(account)}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabPanel>

      <TabPanel active={activeTab} id="categories">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <form
            className="grid gap-3"
            onSubmit={categoryCreateForm.handleSubmit((values) => createCategory.mutate({ ...values, type: categoryTypeMap[values.type] }))}
          >
            <div><FieldLabel htmlFor="category-name">Category Name</FieldLabel><input id="category-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. Groceries" {...categoryCreateForm.register('name', { required: true })} /></div>
            <div><FieldLabel htmlFor="category-type">Category Type</FieldLabel><select id="category-type" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...categoryCreateForm.register('type')}><option>Expense</option><option>Income</option></select></div>
            <div><FieldLabel htmlFor="category-color">Color</FieldLabel><input id="category-color" className="w-full h-12 rounded-2xl border border-slate-200 px-2 py-2" type="color" {...categoryCreateForm.register('color')} /></div>
            <div><FieldLabel htmlFor="category-icon">Icon</FieldLabel><input id="category-icon" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. Utensils" {...categoryCreateForm.register('icon', { required: true })} /></div>
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="submit">Create category</button>
          </form>

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
                      categoryEditForm.reset({
                        name: category.name,
                        type: category.type as CategoryFormValues['type'],
                        color: category.color,
                        icon: category.icon,
                      });
                    }}
                  >
                    Edit
                  </button>
                  {!category.isArchived ? <button className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700" type="button" onClick={() => setDeletingCategory(category)}>Delete</button> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabPanel>

      <TabPanel active={activeTab} id="shared">
        <div className="space-y-3">
          <select className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={sharedAccountId} onChange={(event) => setSharedAccountId(event.target.value)}>
            <option value="">Select account</option>
            {accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700" type="button" disabled={!sharedAccountId} onClick={() => setInviteModalOpen(true)}>Invite member</button>
          {sharedMembers?.map((member) => (
            <div key={member.userId} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{member.displayName}</div>
                <div className="text-xs text-slate-500">{member.email}</div>
              </div>
              {member.role === 'Owner' ? (
                <div className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Owner</div>
              ) : (
                <button className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700" type="button" onClick={() => updateMemberRole.mutate({ accountId: sharedAccountId, member })}>
                  Role: {member.role}
                </button>
              )}
            </div>
          ))}
        </div>
      </TabPanel>

      <Modal open={!!editingAccount} title="Edit account" onClose={() => setEditingAccount(null)}>
        <form
          className="grid gap-3"
          onSubmit={accountEditForm.handleSubmit((values) => editingAccount ? updateAccount.mutate({
            id: editingAccount.id,
            payload: { name: values.name, type: accountTypeMap[values.type], institutionName: values.institutionName || null },
          }) : null)}
        >
          <div><FieldLabel htmlFor="edit-account-name">Account Name</FieldLabel><input id="edit-account-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. HDFC Savings" {...accountEditForm.register('name', { required: true })} /></div>
          <div><FieldLabel htmlFor="edit-account-type">Account Type</FieldLabel><select id="edit-account-type" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...accountEditForm.register('type')}><option>Bank</option><option>CreditCard</option><option>CashWallet</option><option>Savings</option></select></div>
          <div><FieldLabel htmlFor="edit-institution-name">Institution Name</FieldLabel><input id="edit-institution-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. HDFC Bank" {...accountEditForm.register('institutionName')} /></div>
          <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="submit">Update account</button>
        </form>
      </Modal>

      <Modal open={!!deletingAccount} title="Delete account" onClose={() => setDeletingAccount(null)}>
        <p className="text-sm text-slate-600">Delete account <span className="font-semibold">{deletingAccount?.name}</span>?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => setDeletingAccount(null)}>Cancel</button>
          <button className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700" type="button" onClick={() => deletingAccount ? deleteAccount.mutate(deletingAccount.id) : null}>Delete</button>
        </div>
      </Modal>

      <Modal open={!!editingCategory} title="Edit category" onClose={() => setEditingCategory(null)}>
        <form
          className="grid gap-3"
          onSubmit={categoryEditForm.handleSubmit((values) => editingCategory ? updateCategory.mutate({
            id: editingCategory.id,
            payload: { name: values.name, color: values.color, icon: values.icon, isArchived: editingCategory.isArchived },
          }) : null)}
        >
          <div><FieldLabel htmlFor="edit-category-name">Category Name</FieldLabel><input id="edit-category-name" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. Groceries" {...categoryEditForm.register('name', { required: true })} /></div>
          <div><FieldLabel htmlFor="edit-category-color">Color</FieldLabel><input id="edit-category-color" className="w-full h-12 rounded-2xl border border-slate-200 px-2 py-2" type="color" {...categoryEditForm.register('color')} /></div>
          <div><FieldLabel htmlFor="edit-category-icon">Icon</FieldLabel><input id="edit-category-icon" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="e.g. Utensils" {...categoryEditForm.register('icon', { required: true })} /></div>
          <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="submit">Update category</button>
        </form>
      </Modal>

      <Modal open={!!deletingCategory} title="Delete category" onClose={() => setDeletingCategory(null)}>
        <p className="text-sm text-slate-600">Archive category <span className="font-semibold">{deletingCategory?.name}</span>?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => setDeletingCategory(null)}>Cancel</button>
          <button className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700" type="button" onClick={() => deletingCategory ? deleteCategory.mutate(deletingCategory.id) : null}>Delete</button>
        </div>
      </Modal>

      <Modal open={inviteModalOpen} title="Invite member" onClose={() => setInviteModalOpen(false)}>
        <div className="space-y-3">
          <div><FieldLabel htmlFor="invite-email-modal">Email</FieldLabel><input id="invite-email-modal" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="member@email.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></div>
          <div><FieldLabel htmlFor="invite-role-modal">Role</FieldLabel><select id="invite-role-modal" className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'Editor' | 'Viewer')}><option>Editor</option><option>Viewer</option></select></div>
          <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" type="button" onClick={() => inviteMember.mutate({ accountId: sharedAccountId, email: inviteEmail, role: inviteRole })}>Send invite</button>
        </div>
      </Modal>
    </Card>
  );
}
