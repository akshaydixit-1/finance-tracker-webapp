import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { Modal } from '../components/ui/Modal';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { financeApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { getApiErrorMessage } from '../utils/apiError';
import { accountMemberRoleMap } from '../utils/enums';
import type { AccountMember } from '../types/api';

type InviteForm = {
  accountId: string;
  email: string;
  role: 'Editor' | 'Viewer';
};

const defaults: InviteForm = {
  accountId: '',
  email: '',
  role: 'Editor',
};

export function SharedAccountsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('invite');
  const [editingMember, setEditingMember] = useState<AccountMember | null>(null);
  const [editRole, setEditRole] = useState<'Editor' | 'Viewer'>('Editor');
  const form = useForm<InviteForm>({ defaultValues: defaults });
  const selectedAccountId = form.watch('accountId');

  const tabs = useMemo(() => [
    { id: 'invite', label: 'Invite' },
    { id: 'members', label: 'Members' },
    { id: 'activity', label: 'Activity' },
  ], []);

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: members } = useQuery({
    queryKey: ['account-members', selectedAccountId],
    queryFn: () => financeApi.getAccountMembers(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });
  const { data: activity } = useQuery({
    queryKey: ['account-activity', selectedAccountId],
    queryFn: () => financeApi.getAccountActivity(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });

  useEffect(() => {
    if (!selectedAccountId && accounts?.[0]?.id) {
      form.setValue('accountId', accounts[0].id);
    }
  }, [accounts, form, selectedAccountId]);

  const inviteMutation = useMutation({
    mutationFn: ({ accountId, payload }: { accountId: string; payload: { email: string; role: number } }) => financeApi.inviteAccountMember(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-members', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account-activity', selectedAccountId] });
      pushToast({ title: 'Member invited', message: 'Shared account invitation sent/updated.', variant: 'success' });
      form.setValue('email', '');
      setActiveTab('members');
    },
    onError: (error) => pushToast({ title: 'Invite failed', message: getApiErrorMessage(error, 'Unable to invite member.'), variant: 'error' }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ accountId, userId, role }: { accountId: string; userId: string; role: number }) => financeApi.updateAccountMemberRole(accountId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-members', selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ['account-activity', selectedAccountId] });
      pushToast({ title: 'Role updated', message: 'Member role updated successfully.', variant: 'success' });
      setEditingMember(null);
    },
    onError: (error) => pushToast({ title: 'Role update failed', message: getApiErrorMessage(error, 'Unable to update role.'), variant: 'error' }),
  });

  return (
    <Card title="Shared Accounts" description="Manage collaborators with tabbed areas and modal-based role updates.">
      <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

      <TabPanel active={activeTab} id="invite">
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
          onSubmit={form.handleSubmit((values) => {
            inviteMutation.mutate({
              accountId: values.accountId,
              payload: { email: values.email, role: accountMemberRoleMap[values.role] },
            });
          })}
        >
          <div><FieldLabel htmlFor="shared-account-id">Account</FieldLabel><select id="shared-account-id" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('accountId', { required: true })}>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          <div><FieldLabel htmlFor="invite-email">Invite email</FieldLabel><input id="invite-email" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="member@email.com" {...form.register('email', { required: true })} /></div>
          <div><FieldLabel htmlFor="invite-role">Role</FieldLabel><select id="invite-role" className="w-full rounded-2xl border border-slate-200 px-4 py-3" {...form.register('role')}><option>Editor</option><option>Viewer</option></select></div>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-white" type="submit">Invite</button>
        </form>
      </TabPanel>

      <TabPanel active={activeTab} id="members">
        <div className="space-y-3">
          {members?.map((member) => (
            <div key={member.userId} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{member.displayName}</div>
                <div className="text-sm text-slate-500">{member.email}</div>
              </div>
              {member.role === 'Owner' ? (
                <span className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Owner</span>
              ) : (
                <button
                  className="rounded-xl border border-slate-300 px-3 py-1 text-sm"
                  type="button"
                  onClick={() => {
                    setEditingMember(member);
                    setEditRole(member.role === 'Viewer' ? 'Viewer' : 'Editor');
                  }}
                >
                  Role: {member.role}
                </button>
              )}
            </div>
          ))}
        </div>
      </TabPanel>

      <TabPanel active={activeTab} id="activity">
        <div className="space-y-3">
          {activity?.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-slate-900">{item.action}</div>
              <div className="text-xs text-slate-500">{item.entityType} · {new Date(item.createdAtUtc).toLocaleString()}</div>
              {item.metadata ? <div className="mt-1 text-sm text-slate-700">{item.metadata}</div> : null}
            </div>
          ))}
        </div>
      </TabPanel>

      <Modal open={!!editingMember} title="Update member role" onClose={() => setEditingMember(null)}>
        <div className="space-y-3">
          <div className="text-sm text-slate-700">{editingMember?.displayName} ({editingMember?.email})</div>
          <div>
            <FieldLabel htmlFor="member-role-edit">Role</FieldLabel>
            <select id="member-role-edit" className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={editRole} onChange={(e) => setEditRole(e.target.value as 'Editor' | 'Viewer')}>
              <option>Editor</option>
              <option>Viewer</option>
            </select>
          </div>
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-white"
            type="button"
            onClick={() => editingMember ? roleMutation.mutate({ accountId: selectedAccountId, userId: editingMember.userId, role: accountMemberRoleMap[editRole] }) : null}
          >
            Save role
          </button>
        </div>
      </Modal>
    </Card>
  );
}
