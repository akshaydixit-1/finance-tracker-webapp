import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { FieldLabel } from '../components/ui/FieldLabel';
import { Modal } from '../components/ui/Modal';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { rulesApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import type { Rule } from '../types/api';
import { getApiErrorMessage } from '../utils/apiError';
import { ruleActionTypeMap, ruleFieldMap, ruleOperatorMap } from '../utils/enums';

type RuleForm = {
  conditionField: keyof typeof ruleFieldMap;
  conditionOperator: keyof typeof ruleOperatorMap;
  conditionValue: string;
  actionType: keyof typeof ruleActionTypeMap;
  actionValue: string;
  priority: number;
  isActive: boolean;
};

const defaults: RuleForm = {
  conditionField: 'Merchant',
  conditionOperator: 'Equals',
  conditionValue: '',
  actionType: 'SetCategory',
  actionValue: '',
  priority: 0,
  isActive: true,
};

export function RulesPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [editing, setEditing] = useState<Rule | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);
  const createForm = useForm<RuleForm>({ defaultValues: defaults });
  const editForm = useForm<RuleForm>({ defaultValues: defaults });
  const { pushToast } = useToastStore();
  const queryClient = useQueryClient();
  const { data: rules } = useQuery({ queryKey: ['rules'], queryFn: rulesApi.getRules });

  const tabs = useMemo(() => [
    { id: 'create', label: 'Create Rule' },
    { id: 'list', label: 'Rules List' },
  ], []);

  const createMutation = useMutation({
    mutationFn: rulesApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      pushToast({ title: 'Rule created', message: 'Automation rule added successfully.', variant: 'success' });
      createForm.reset(defaults);
      setActiveTab('list');
    },
    onError: (error) => pushToast({ title: 'Create failed', message: getApiErrorMessage(error, 'Unable to create rule.'), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => rulesApi.updateRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      pushToast({ title: 'Rule updated', message: 'Rule updated successfully.', variant: 'success' });
      setEditing(null);
    },
    onError: (error) => pushToast({ title: 'Update failed', message: getApiErrorMessage(error, 'Unable to update rule.'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: rulesApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      pushToast({ title: 'Rule deleted', message: 'Rule deleted successfully.', variant: 'success' });
      setDeleting(null);
    },
    onError: (error) => pushToast({ title: 'Delete failed', message: getApiErrorMessage(error, 'Unable to delete rule.'), variant: 'error' }),
  });

  const toPayload = (values: RuleForm) => ({
    conditionField: ruleFieldMap[values.conditionField],
    conditionOperator: ruleOperatorMap[values.conditionOperator],
    conditionValue: values.conditionValue,
    actionType: ruleActionTypeMap[values.actionType],
    actionValue: values.actionValue,
    priority: Number(values.priority),
    isActive: values.isActive,
  });

  return (
    <Card title="Rules Engine" description="Tabs for rule creation and list. Edit/delete operations are modal-based.">
      <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

      <TabPanel active={activeTab} id="create">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={createForm.handleSubmit((values) => {
          if (createMutation.isPending) return;
          createMutation.mutate(toPayload(values));
        })}>
          <div><FieldLabel htmlFor="field" hint="Transaction field to evaluate, such as merchant or amount.">Condition field</FieldLabel><select id="field" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...createForm.register('conditionField')}>{Object.keys(ruleFieldMap).map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><FieldLabel htmlFor="operator" hint="How to compare the selected field with the value.">Operator</FieldLabel><select id="operator" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...createForm.register('conditionOperator')}>{Object.keys(ruleOperatorMap).map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><FieldLabel htmlFor="condition-value" hint="Value to match against the condition field.">Condition value</FieldLabel><input id="condition-value" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Uber" {...createForm.register('conditionValue', { required: true })} /></div>
          <div><FieldLabel htmlFor="action-type" hint="Action to run when the condition is true.">Action</FieldLabel><select id="action-type" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...createForm.register('actionType')}>{Object.keys(ruleActionTypeMap).map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><FieldLabel htmlFor="action-value" hint="Value used by the selected action.">Action value</FieldLabel><input id="action-value" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Transport" {...createForm.register('actionValue', { required: true })} /></div>
          <div><FieldLabel htmlFor="priority" hint="Lower numbers run first when multiple rules match.">Priority</FieldLabel><input id="priority" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" placeholder="e.g. 1" {...createForm.register('priority', { valueAsNumber: true, min: 0 })} /></div>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" {...createForm.register('isActive')} /> Rule is active</label>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" type="submit" disabled={createMutation.isPending}>Save rule</button>
        </form>
      </TabPanel>

      <TabPanel active={activeTab} id="list">
        <div className="space-y-3">
          {rules?.map((rule) => (
            <div key={rule.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">Priority {rule.priority} · {rule.isActive ? 'Enabled' : 'Disabled'}</div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
                    type="button"
                    onClick={() => {
                      setEditing(rule);
                      editForm.reset({
                        conditionField: rule.conditionField as RuleForm['conditionField'],
                        conditionOperator: rule.conditionOperator as RuleForm['conditionOperator'],
                        conditionValue: rule.conditionValue,
                        actionType: rule.actionType as RuleForm['actionType'],
                        actionValue: rule.actionValue,
                        priority: rule.priority,
                        isActive: rule.isActive,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button className="rounded-xl border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700" type="button" onClick={() => setDeleting(rule)}>Delete</button>
                </div>
              </div>
              <div className="mt-2 text-sm text-slate-800">
                If <span className="font-medium">{rule.conditionField}</span> <span className="font-medium">{rule.conditionOperator}</span> <span className="font-medium">{rule.conditionValue}</span>, then <span className="font-medium">{rule.actionType}</span> <span className="font-medium">{rule.actionValue}</span>
              </div>
              <button
                className="mt-3 rounded-xl border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                type="button"
                onClick={() => updateMutation.mutate({
                  id: rule.id,
                  payload: {
                    conditionField: ruleFieldMap[rule.conditionField as keyof typeof ruleFieldMap],
                    conditionOperator: ruleOperatorMap[rule.conditionOperator as keyof typeof ruleOperatorMap],
                    conditionValue: rule.conditionValue,
                    actionType: ruleActionTypeMap[rule.actionType as keyof typeof ruleActionTypeMap],
                    actionValue: rule.actionValue,
                    priority: rule.priority,
                    isActive: !rule.isActive,
                  },
                })}
              >
                {rule.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </TabPanel>

      <Modal open={!!editing} title="Edit rule" onClose={() => setEditing(null)}>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={editForm.handleSubmit((values) => {
          if (updateMutation.isPending) return;
          if (!editing) return;
          updateMutation.mutate({ id: editing.id, payload: toPayload(values) });
        })}>
          <div><FieldLabel htmlFor="edit-field" hint="Field the rule checks before applying action.">Condition field</FieldLabel><select id="edit-field" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...editForm.register('conditionField')}>{Object.keys(ruleFieldMap).map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><FieldLabel htmlFor="edit-operator" hint="Comparison operator used for the condition.">Operator</FieldLabel><select id="edit-operator" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...editForm.register('conditionOperator')}>{Object.keys(ruleOperatorMap).map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><FieldLabel htmlFor="edit-condition-value" hint="Value matched by the rule condition.">Condition value</FieldLabel><input id="edit-condition-value" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Uber" {...editForm.register('conditionValue', { required: true })} /></div>
          <div><FieldLabel htmlFor="edit-action-type" hint="Action executed when condition is true.">Action</FieldLabel><select id="edit-action-type" className="w-full rounded-2xl border border-slate-200 px-4 py-2" {...editForm.register('actionType')}>{Object.keys(ruleActionTypeMap).map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><FieldLabel htmlFor="edit-action-value" hint="Action target value.">Action value</FieldLabel><input id="edit-action-value" className="w-full rounded-2xl border border-slate-200 px-4 py-2" placeholder="e.g. Transport" {...editForm.register('actionValue', { required: true })} /></div>
          <div><FieldLabel htmlFor="edit-priority" hint="Rule execution order priority.">Priority</FieldLabel><input id="edit-priority" className="w-full rounded-2xl border border-slate-200 px-4 py-2" type="number" placeholder="e.g. 1" {...editForm.register('priority', { valueAsNumber: true, min: 0 })} /></div>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" {...editForm.register('isActive')} /> Rule is active</label>
          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" type="submit" disabled={updateMutation.isPending}>Update rule</button>
        </form>
      </Modal>

      <Modal open={!!deleting} title="Delete rule" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">Delete this rule permanently?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" type="button" onClick={() => setDeleting(null)}>Cancel</button>
          <button className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700" type="button" onClick={() => deleting ? deleteMutation.mutate(deleting.id) : null}>Delete</button>
        </div>
      </Modal>
    </Card>
  );
}
