import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Plus, ArrowUpRight, ArrowDownRight, UserPlus } from 'lucide-react';

const DEPOSIT_CATEGORIES = ['Sales Revenue', 'Service Revenue', 'Interest Income', 'Transfer In', 'Refund Received', 'Other Income'];
const WITHDRAWAL_CATEGORIES = ['Rent', 'Utilities', 'Office Supplies', 'Payroll', 'Insurance', 'Professional Fees', 'Bank Fees', 'Marketing', 'Travel', 'Software & Subscriptions', 'Equipment', 'Transfer Out', 'Tax Payment', 'Loan Payment', 'Other Expense'];

export default function TransactionMatchDialog({ transaction, payees = [], orgId, onClose }) {
  const queryClient = useQueryClient();
  const [selectedPayeeId, setSelectedPayeeId] = useState('');
  const [category, setCategory] = useState('');
  const [newPayeeName, setNewPayeeName] = useState('');
  const [showNewPayee, setShowNewPayee] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setSelectedPayeeId(transaction.matched_payee_id || '');
      setCategory(transaction.category || '');
      setNewPayeeName('');
      setShowNewPayee(false);
    }
  }, [transaction]);

  const open = !!transaction;
  if (!transaction) return null;

  const isDeposit = transaction.type === 'deposit' || Number(transaction.amount) > 0;
  const absAmount = Math.abs(Number(transaction.amount) || 0);
  const categories = isDeposit ? DEPOSIT_CATEGORIES : WITHDRAWAL_CATEGORIES;

  const handleSave = async (status) => {
    setSaving(true);
    try {
      const payee = payees.find(p => p.id === selectedPayeeId);
      await base44.entities.BankTransaction.update(transaction.id, {
        matched_payee_id: selectedPayeeId || '',
        matched_payee_name: payee?.display_name || '',
        category: category || '',
        reconciliation_status: status,
      });
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['bankTxUnmatched'] });
      onClose();
    } catch (e) {
      alert('Failed to save: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndMatch = async () => {
    if (!newPayeeName.trim()) return;
    setSaving(true);
    try {
      const newPayee = await base44.entities.PayeeDirectory.create({
        organization_id: orgId,
        payee_type: 'VENDOR',
        source_ref_id: 'manual',
        display_name: newPayeeName.trim(),
        status: 'active',
      });
      await base44.entities.BankTransaction.update(transaction.id, {
        matched_payee_id: newPayee.id,
        matched_payee_name: newPayee.display_name,
        category: category || '',
        reconciliation_status: 'manually_matched',
      });
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['bankTxUnmatched'] });
      queryClient.invalidateQueries({ queryKey: ['payees'] });
      onClose();
    } catch (e) {
      alert('Failed to create vendor: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDeposit ? (
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            )}
            Match Transaction
          </DialogTitle>
        </DialogHeader>

        {/* Transaction details */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Date:</span>
            <span className="font-medium">{transaction.transaction_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Description:</span>
            <span className="font-medium text-right">{transaction.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount:</span>
            <span className={`font-bold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
              {isDeposit ? '+' : '-'}${absAmount.toLocaleString()}
            </span>
          </div>
          {transaction.matched_payee_name && (
            <div className="flex justify-between">
              <span className="text-slate-500">Auto-matched:</span>
              <Badge className="bg-blue-100 text-blue-700">{transaction.matched_payee_name}</Badge>
            </div>
          )}
        </div>

        {/* Match controls */}
        {!showNewPayee ? (
          <div className="space-y-3">
            <div>
              <Label>Vendor / Payee</Label>
              <Select value={selectedPayeeId} onValueChange={setSelectedPayeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {payees.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => setShowNewPayee(true)}
              className="text-sm text-teal-600 hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" /> Create new vendor
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>New Vendor Name</Label>
              <Input
                value={newPayeeName}
                onChange={(e) => setNewPayeeName(e.target.value)}
                placeholder="e.g. ABC Suppliers"
                autoFocus
              />
            </div>
            <button
              onClick={() => setShowNewPayee(false)}
              className="text-sm text-slate-500 hover:underline"
            >
              ← Use existing vendor instead
            </button>
          </div>
        )}

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onClose()}>Cancel</Button>
          <Button
            variant="secondary"
            onClick={() => handleSave('reviewed')}
            disabled={saving}
          >
            Mark Reviewed
          </Button>
          {showNewPayee ? (
            <Button
              onClick={handleCreateAndMatch}
              disabled={saving || !newPayeeName.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              {saving ? 'Creating...' : 'Create & Match'}
            </Button>
          ) : (
            <Button
              onClick={() => handleSave(selectedPayeeId ? 'manually_matched' : 'reviewed')}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Match'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}