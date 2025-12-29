import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';

export default function AdminTaxRules() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    organization_id: '',
    name: '',
    rate: 0,
    applies_to_categories: [],
    is_active: true
  });

  const categories = ['consultation', 'lab', 'cardiology', 'pft', 'radiology', 'pharmacy', 'other'];

  const { data: taxRules = [] } = useQuery({
    queryKey: ['taxRules'],
    queryFn: () => base44.entities.TaxRule.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const rule = await base44.entities.TaxRule.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'create_tax_rule',
        record_type: 'TaxRule',
        record_id: rule.id,
        metadata: { name: data.name, rate: data.rate }
      });
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxRules'] });
      resetForm();
      toast.success('Tax rule created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const rule = await base44.entities.TaxRule.update(id, data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'update_tax_rule',
        record_type: 'TaxRule',
        record_id: id,
        metadata: { name: data.name, rate: data.rate }
      });
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxRules'] });
      resetForm();
      toast.success('Tax rule updated!');
    }
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingRule(null);
    setForm({
      organization_id: '',
      name: '',
      rate: 0,
      applies_to_categories: [],
      is_active: true
    });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({ ...rule });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.name || form.rate < 0) {
      toast.error('Name and rate are required');
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleCategory = (category) => {
    const current = form.applies_to_categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    setForm({ ...form, applies_to_categories: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Rules</h1>
          <p className="text-slate-500 mt-1">Configure tax rates and applicability</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tax Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {taxRules.map((rule) => (
          <Card key={rule.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">{rule.name}</h3>
                <p className="text-2xl font-bold text-teal-600">{rule.rate}%</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Applies to:</p>
                <div className="flex flex-wrap gap-1">
                  {rule.applies_to_categories?.length > 0 ? (
                    rule.applies_to_categories.map(cat => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">All categories</span>
                  )}
                </div>
              </div>
              <Badge variant={rule.is_active ? 'default' : 'outline'}>
                {rule.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Tax Rule' : 'Add Tax Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., HST, GST, VAT"
              />
            </div>
            <div>
              <Label>Rate (%) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="mb-3 block">Applies to Categories</Label>
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox
                      id={cat}
                      checked={form.applies_to_categories?.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <label htmlFor={cat} className="text-sm capitalize cursor-pointer">
                      {cat}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Leave empty to apply to all categories</p>
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