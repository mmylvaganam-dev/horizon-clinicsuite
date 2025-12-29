import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

export default function AdminPostingRules() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    organization_id: '',
    source_type: 'Invoice',
    source_category: '',
    debit_account_code: '',
    credit_account_code: '',
    description: '',
    is_active: true
  });

  const { data: postingRules = [] } = useQuery({
    queryKey: ['postingRules'],
    queryFn: () => base44.entities.PostingRule.list('-created_date'),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: () => base44.entities.ChartOfAccounts.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const rule = await base44.entities.PostingRule.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'create_posting_rule',
        record_type: 'PostingRule',
        record_id: rule.id,
        metadata: { source_type: data.source_type }
      });
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postingRules'] });
      resetForm();
      toast.success('Posting rule created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const rule = await base44.entities.PostingRule.update(id, data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'update_posting_rule',
        record_type: 'PostingRule',
        record_id: id,
        metadata: { source_type: data.source_type }
      });
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postingRules'] });
      resetForm();
      toast.success('Posting rule updated!');
    }
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingRule(null);
    setForm({
      organization_id: '',
      source_type: 'Invoice',
      source_category: '',
      debit_account_code: '',
      credit_account_code: '',
      description: '',
      is_active: true
    });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({ ...rule });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.debit_account_code || !form.credit_account_code) {
      toast.error('Debit and credit accounts are required');
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getAccountName = (code) => {
    const account = accounts.find(a => a.code === code);
    return account ? `${account.code} - ${account.name}` : code;
  };

  const sourceTypeColors = {
    Invoice: 'bg-blue-100 text-blue-700',
    PharmacySale: 'bg-green-100 text-green-700',
    Payment: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Posting Rules</h1>
          <p className="text-slate-500 mt-1">Configure automatic journal entry posting</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {postingRules.map((rule) => (
          <Card key={rule.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={sourceTypeColors[rule.source_type]}>
                    {rule.source_type}
                  </Badge>
                  {rule.source_category && (
                    <Badge variant="outline" className="text-xs">
                      {rule.source_category}
                    </Badge>
                  )}
                  <Badge variant={rule.is_active ? 'default' : 'outline'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {rule.description && (
                  <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex-1 bg-slate-50 p-3 rounded">
                    <p className="text-xs text-slate-500 mb-1">Debit</p>
                    <p className="font-medium font-mono text-slate-900">
                      {getAccountName(rule.debit_account_code)}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                  <div className="flex-1 bg-slate-50 p-3 rounded">
                    <p className="text-xs text-slate-500 mb-1">Credit</p>
                    <p className="font-medium font-mono text-slate-900">
                      {getAccountName(rule.credit_account_code)}
                    </p>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Posting Rule' : 'Add Posting Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Source Type *</Label>
              <Select value={form.source_type} onValueChange={(val) => setForm({ ...form, source_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="PharmacySale">Pharmacy Sale</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source Category (Optional)</Label>
              <Input
                value={form.source_category}
                onChange={(e) => setForm({ ...form, source_category: e.target.value })}
                placeholder="e.g., consultation, lab, pharmacy"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty to apply to all categories</p>
            </div>
            <div>
              <Label>Debit Account *</Label>
              <Select 
                value={form.debit_account_code} 
                onValueChange={(val) => setForm({ ...form, debit_account_code: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.is_active).map(acc => (
                    <SelectItem key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit Account *</Label>
              <Select 
                value={form.credit_account_code} 
                onValueChange={(val) => setForm({ ...form, credit_account_code: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.is_active).map(acc => (
                    <SelectItem key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this rule"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(val) => setForm({ ...form, is_active: val })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRule ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}