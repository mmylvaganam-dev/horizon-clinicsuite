import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

export default function AdminChartOfAccounts() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState({
    organization_id: '',
    code: '',
    name: '',
    type: 'asset',
    parent_code: '',
    description: '',
    is_active: true
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: () => base44.entities.ChartOfAccounts.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const account = await base44.entities.ChartOfAccounts.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'create_account',
        record_type: 'ChartOfAccounts',
        record_id: account.id,
        metadata: { code: data.code, name: data.name }
      });
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      resetForm();
      toast.success('Account created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const account = await base44.entities.ChartOfAccounts.update(id, data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'update_account',
        record_type: 'ChartOfAccounts',
        record_id: id,
        metadata: { code: data.code, name: data.name }
      });
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      resetForm();
      toast.success('Account updated!');
    }
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingAccount(null);
    setForm({
      organization_id: '',
      code: '',
      name: '',
      type: 'asset',
      parent_code: '',
      description: '',
      is_active: true
    });
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setForm({ ...account });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.name) {
      toast.error('Code and name are required');
      return;
    }

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const typeColors = {
    asset: 'bg-blue-100 text-blue-700',
    liability: 'bg-red-100 text-red-700',
    equity: 'bg-purple-100 text-purple-700',
    revenue: 'bg-green-100 text-green-700',
    expense: 'bg-orange-100 text-orange-700'
  };

  const accountsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-slate-500 mt-1">Manage accounting accounts</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => (
        accountsByType[type]?.length > 0 && (
          <div key={type}>
            <h2 className="text-lg font-semibold text-slate-900 mb-3 capitalize">{type}s</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {accountsByType[type].map((account) => (
                <Card key={account.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">{account.code}</Badge>
                        <Badge variant="outline" className={typeColors[account.type]}>
                          {account.type}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900">{account.name}</h3>
                      {account.description && (
                        <p className="text-xs text-slate-500 mt-1">{account.description}</p>
                      )}
                      <Badge variant={account.is_active ? 'default' : 'outline'} className="mt-2">
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      ))}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g., 1000"
                />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Cash"
              />
            </div>
            <div>
              <Label>Parent Account (Optional)</Label>
              <Input
                value={form.parent_code}
                onChange={(e) => setForm({ ...form, parent_code: e.target.value })}
                placeholder="Parent account code"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
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
                {editingAccount ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}