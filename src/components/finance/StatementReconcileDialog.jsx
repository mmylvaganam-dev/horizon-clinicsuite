import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';

export default function StatementReconcileDialog({ statement, account, onReconciled }) {
  const [open, setOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const summary = statement.extracted_summary_json || {};
  const transactions = statement.transactions || summary.transactions || [];
  const opening = Number(statement.opening_balance) || 0;
  const closing = Number(statement.closing_balance) || 0;
  const totalDeposits = Number(summary.total_deposits) || 0;
  const totalWithdrawals = Number(summary.total_withdrawals) || 0;
  const expectedClosing = opening + totalDeposits - totalWithdrawals;
  const discrepancy = closing - expectedClosing;
  const isReconciled = statement.reconciliation_status === 'reconciled';

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.BankStatementUpload.update(statement.id, {
        reconciliation_status: 'reconciled',
        reconciled_by: user?.email || '',
        reconciled_at: new Date().toISOString(),
      });
      setOpen(false);
      if (onReconciled) onReconciled();
    } catch (e) {
      alert('Failed to mark as reconciled: ' + e.message);
    } finally {
      setReconciling(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-teal-600 text-teal-700 hover:bg-teal-50"
        onClick={() => setOpen(true)}
      >
        <FileText className="w-3.5 h-3.5 mr-1" />
        {isReconciled ? 'View' : 'Reconcile'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Statement Details — {account?.account_nickname || 'Unknown'} {account?.bank_name}</span>
              {isReconciled ? (
                <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Reconciled</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3 mr-1" /> Unreconciled</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Reconciliation Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Opening Balance:</span>
                <span className="font-semibold">{opening.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Deposits:</span>
                <span className="font-semibold text-green-600">+{totalDeposits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Withdrawals:</span>
                <span className="font-semibold text-red-600">-{totalWithdrawals.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1">
                <span className="text-slate-500">Expected Closing:</span>
                <span className="font-semibold">{expectedClosing.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Actual Closing:</span>
                <span className="font-semibold">{closing.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Discrepancy:</span>
                <span className={`font-semibold ${Math.abs(discrepancy) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(discrepancy) < 0.01 ? '✓ Balanced' : discrepancy.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-sm">
              <div className="text-slate-500 mb-1">Period: {summary.period_start || 'N/A'} → {summary.period_end || 'N/A'}</div>
              <div className="text-slate-500">Transactions: {summary.transaction_count || transactions.length || 0}</div>
              {summary.file_name && <div className="text-slate-500 mt-1 truncate">File: {summary.file_name}</div>}
              {statement.file_ref && (
                <a href={statement.file_ref} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-teal-600 hover:underline mt-2 text-xs">
                  <FileText className="w-3 h-3" /> Open original file
                </a>
              )}
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-semibold text-slate-700 mb-2">
              Transactions ({transactions.length})
            </div>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No individual transactions stored for this statement.
                <br />
                Re-upload the file to capture full transaction details.
              </div>
            ) : (
              <ScrollArea className="h-[300px] rounded-md border">
                <div className="divide-y">
                  {transactions.map((tx, i) => {
                    const isDeposit = String(tx.type || '').toLowerCase().includes('deposit') || Number(tx.amount) > 0;
                    return (
                      <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                        <div className="flex items-center gap-2 min-w-0">
                          {isDeposit ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm truncate">{tx.description || '—'}</div>
                            <div className="text-xs text-slate-400">{tx.date || ''}</div>
                          </div>
                        </div>
                        <span className={`text-sm font-medium flex-shrink-0 ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                          {isDeposit ? '+' : ''}{Number(tx.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {!isReconciled && (
              <Button
                onClick={handleReconcile}
                disabled={reconciling}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {reconciling ? 'Saving...' : 'Mark as Reconciled'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}