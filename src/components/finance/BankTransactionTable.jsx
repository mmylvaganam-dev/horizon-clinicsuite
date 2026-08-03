import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, CheckCircle2, Zap, UserCheck, Inbox } from 'lucide-react';
import TransactionMatchDialog from './TransactionMatchDialog';

export default function BankTransactionTable({ orgId, accountId, payees = [] }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [matchDialogTx, setMatchDialogTx] = useState(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['bankTransactions', orgId, accountId],
    queryFn: async () => {
      const q = { organization_id: orgId };
      if (accountId) q.bank_account_ref = accountId;
      const all = await base44.entities.BankTransaction.filter(q);
      return all.sort((a, b) => {
        const da = new Date(a.transaction_date);
        const db = new Date(b.transaction_date);
        if (isNaN(db) && isNaN(da)) return 0;
        if (isNaN(db)) return -1;
        if (isNaN(da)) return 1;
        return db - da;
      });
    },
    enabled: !!orgId
  });

  const counts = {
    all: transactions.length,
    unmatched: transactions.filter(t => t.reconciliation_status === 'unmatched').length,
    auto_matched: transactions.filter(t => t.reconciliation_status === 'auto_matched').length,
    matched: transactions.filter(t => ['manually_matched', 'reviewed'].includes(t.reconciliation_status)).length,
  };

  const filtered = transactions.filter(t => {
    if (filter === 'unmatched') return t.reconciliation_status === 'unmatched';
    if (filter === 'auto_matched') return t.reconciliation_status === 'auto_matched';
    if (filter === 'matched') return ['manually_matched', 'reviewed'].includes(t.reconciliation_status);
    if (search) {
      const s = search.toLowerCase();
      return (t.description || '').toLowerCase().includes(s) ||
             (t.matched_payee_name || '').toLowerCase().includes(s) ||
             (t.category || '').toLowerCase().includes(s);
    }
    return true;
  });

  const filterButtons = [
    { key: 'all', label: 'All', icon: FileText, count: counts.all },
    { key: 'unmatched', label: 'Needs Review', icon: Inbox, count: counts.unmatched },
    { key: 'auto_matched', label: 'Auto-Matched', icon: Zap, count: counts.auto_matched },
    { key: 'matched', label: 'Reconciled', icon: CheckCircle2, count: counts.matched },
  ];

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        {filterButtons.map(btn => (
          <Button
            key={btn.key}
            variant={filter === btn.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter(btn.key); setSearch(''); }}
            className={filter === btn.key ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            <btn.icon className="w-3.5 h-3.5 mr-1.5" />
            {btn.label}
            <Badge className="ml-1.5 bg-white/20">{btn.count}</Badge>
          </Button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setFilter('all'); }}
            className="pl-8 pr-3 py-1.5 text-sm border rounded-md w-48"
          />
        </div>
      </div>

      {/* Transaction list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">{search ? 'No matching transactions found' : 'No transactions yet'}</p>
              <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Upload a bank statement to get started'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div className="col-span-2">Date</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Vendor</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {filtered.map(tx => {
                const isDeposit = tx.type === 'deposit' || Number(tx.amount) > 0;
                const absAmount = Math.abs(Number(tx.amount) || 0);
                return (
                  <div
                    key={tx.id}
                    onClick={() => setMatchDialogTx(tx)}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-teal-50/50 cursor-pointer transition-colors items-center text-sm"
                  >
                    <div className="col-span-3 md:col-span-2 text-slate-600 whitespace-nowrap">
                      {tx.transaction_date}
                    </div>
                    <div className="col-span-9 md:col-span-4 truncate font-medium text-slate-800">
                      {tx.description}
                    </div>
                    <div className="col-span-4 md:col-span-2 truncate">
                      {tx.matched_payee_name ? (
                        <span className="text-slate-700">{tx.matched_payee_name}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Click to match</span>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2 truncate">
                      {tx.category ? (
                        <Badge variant="outline" className="text-xs">{tx.category}</Badge>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2 text-right flex items-center justify-end gap-1">
                      <span className={`font-semibold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                        {isDeposit ? '+' : '-'}${absAmount.toLocaleString()}
                      </span>
                      {tx.reconciliation_status === 'auto_matched' && <Zap className="w-3 h-3 text-blue-500" />}
                      {tx.reconciliation_status === 'manually_matched' && <UserCheck className="w-3 h-3 text-green-500" />}
                      {tx.reconciliation_status === 'reviewed' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionMatchDialog
        transaction={matchDialogTx}
        payees={payees}
        orgId={orgId}
        onClose={() => setMatchDialogTx(null)}
      />
    </div>
  );
}