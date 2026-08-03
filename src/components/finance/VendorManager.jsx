import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, Building2 } from 'lucide-react';

export default function VendorManager({ orgId }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newPayee, setNewPayee] = useState({ display_name: '', payee_type: 'VENDOR' });

  const { data: payees = [], isLoading } = useQuery({
    queryKey: ['payees', orgId],
    queryFn: async () => {
      const all = await base44.entities.PayeeDirectory.filter({ organization_id: orgId });
      return all.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
    },
    enabled: !!orgId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PayeeDirectory.create({
      organization_id: orgId,
      payee_type: data.payee_type,
      source_ref_id: 'manual',
      display_name: data.display_name,
      status: 'active',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payees'] });
      setAddOpen(false);
      setNewPayee({ display_name: '', payee_type: 'VENDOR' });
    },
    onError: (e) => alert('Failed to create vendor: ' + e.message),
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor? Existing matches will remain but new transactions won\'t auto-match.')) return;
    try {
      await base44.entities.PayeeDirectory.delete(id);
      queryClient.invalidateQueries({ queryKey: ['payees'] });
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vendors & Payees</h2>
          <p className="text-sm text-slate-500">Create vendors once — they'll auto-match future bank transactions</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Vendor
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vendor / Payee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vendor / Payee Name</Label>
                <Input
                  value={newPayee.display_name}
                  onChange={(e) => setNewPayee({ ...newPayee, display_name: e.target.value })}
                  placeholder="e.g. ABC Suppliers Ltd"
                  autoFocus
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newPayee.payee_type} onValueChange={(v) => setNewPayee({ ...newPayee, payee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="THIRDPARTY">Third Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(newPayee)}
                disabled={!newPayee.display_name.trim() || createMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Vendor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payees.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No vendors yet</p>
            <p className="text-sm mt-1">Add vendors so bank transactions can auto-match them</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {payees.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{p.display_name}</p>
                  <Badge variant="outline" className="text-xs mt-0.5">{p.payee_type}</Badge>
                </div>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}