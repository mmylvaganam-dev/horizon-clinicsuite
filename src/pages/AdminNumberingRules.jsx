import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Hash } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

export default function AdminNumberingRules() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    organization_id: '',
    doc_type: 'invoice',
    prefix: '',
    next_number: 1,
    format_json: { padding: 6, include_year: true },
    is_active: true
  });

  const { data: numberingRules = [] } = useQuery({
    queryKey: ['numberingRules'],
    queryFn: () => base44.entities.NumberingRule.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const rule = await base44.entities.NumberingRule.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'create_numbering_rule',
        record_type: 'NumberingRule',
        record_id: rule.id,
        metadata: { doc_type: data.doc_type, prefix: data.prefix }
      });
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numberingRules'] });
      resetForm();
      toast.success('Numbering rule created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const rule = await base44.entities.NumberingRule.update(id, data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'update_numbering_rule',
        record_type: 'NumberingRule',
        record_id: id,
        metadata: { doc_type: data.doc_type, prefix: data.prefix }
      });
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numberingRules'] });
      resetForm();
      toast.success('Numbering rule updated!');
    }
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingRule(null);
    setForm({
      organization_id: '',
      doc_type: 'invoice',
      prefix: '',
      next_number: 1,
      format_json: { padding: 6, include_year: true },
      is_active: true
    });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({ ...rule });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.prefix || form.next_number < 1) {
      toast.error('Prefix and next number are required');
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const generatePreview = (rule) => {
    const { prefix, next_number, format_json } = rule;
    const padding = format_json?.padding || 6;
    const includeYear = format_json?.include_year !== false;
    const year = includeYear ? new Date().getFullYear() + '-' : '';
    const number = next_number.toString().padStart(padding, '0');
    return `${prefix}-${year}${number}`;
  };

  const docTypeColors = {
    invoice: 'bg-blue-100 text-blue-700',
    receipt: 'bg-green-100 text-green-700',
    purchase_order: 'bg-purple-100 text-purple-700',
    goods_receipt: 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Numbering Rules</h1>
          <p className="text-slate-500 mt-1">Configure document numbering formats</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {numberingRules.map((rule) => (
          <Card key={rule.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Badge variant="outline" className={docTypeColors[rule.doc_type]}>
                  {rule.doc_type.replace('_', ' ')}
                </Badge>
                <h3 className="font-semibold text-slate-900 mt-2">Prefix: {rule.prefix}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Next Number:</span>
                <span className="font-semibold">{rule.next_number}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Hash className="w-3 h-3" />
                  <span>Preview:</span>
                </div>
                <p className="font-mono text-sm font-semibold text-slate-900">
                  {generatePreview(rule)}
                </p>
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
            <DialogTitle>{editingRule ? 'Edit Numbering Rule' : 'Add Numbering Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Document Type *</Label>
              <Select value={form.doc_type} onValueChange={(val) => setForm({ ...form, doc_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                  <SelectItem value="goods_receipt">Goods Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prefix *</Label>
              <Input
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                placeholder="e.g., INV, RX, PO"
              />
            </div>
            <div>
              <Label>Next Number *</Label>
              <Input
                type="number"
                min="1"
                value={form.next_number}
                onChange={(e) => setForm({ ...form, next_number: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Padding</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={form.format_json?.padding || 6}
                  onChange={(e) => setForm({ 
                    ...form, 
                    format_json: { ...form.format_json, padding: parseInt(e.target.value) || 6 }
                  })}
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.format_json?.include_year !== false}
                    onCheckedChange={(val) => setForm({ 
                      ...form, 
                      format_json: { ...form.format_json, include_year: val }
                    })}
                  />
                  <Label>Include Year</Label>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded border">
              <p className="text-xs text-slate-500 mb-1">Preview:</p>
              <p className="font-mono font-semibold">{generatePreview(form)}</p>
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