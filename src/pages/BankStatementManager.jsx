import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Building2, Plus, TrendingUp, TrendingDown, DollarSign,
  FileText, BarChart3, CheckCircle2, Clock, AlertCircle, Lock
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import moment from 'moment';
import StatementReconcileDialog from '@/components/finance/StatementReconcileDialog';
import BankTransactionTable from '@/components/finance/BankTransactionTable';
import VendorManager from '@/components/finance/VendorManager';

export default function BankStatementManager() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [newAccount, setNewAccount] = useState({ account_nickname: '', account_mask_last4: '', bank_name: '', currency: 'USD' });

  // ── Auth & access ──
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isPlatformOwner = currentUser?.email === 'mmylvaganam@premierhealthcanada.ca' ||
    currentUser?.email === 'mylvaganam@premierhealthcanada.ca' || currentUser?.is_platform_owner === true;

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', currentUser?.id, selectedOrgId],
    queryFn: async () => {
      if (!currentUser?.id || !selectedOrgId) return [];
      return await base44.entities.UserRole.filter({ user_id: currentUser.id, organization_id: selectedOrgId });
    },
    enabled: !!currentUser?.id && !!selectedOrgId && !isPlatformOwner
  });

  // ── Data queries ──
  const { data: companyProfile } = useQuery({
    queryKey: ['companyProfile', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      const org = await base44.entities.Organization.list();
      const currentOrg = org.find(o => o.id === selectedOrgId);
      if (!currentOrg?.company_id) return null;
      const companies = await base44.entities.CompanyProfile.filter({ id: currentOrg.company_id });
      return companies[0];
    },
    enabled: !!selectedOrgId
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return await base44.entities.BankAccount.filter({ organization_id: selectedOrgId });
    },
    enabled: !!selectedOrgId
  });

  const { data: statements = [] } = useQuery({
    queryKey: ['bankStatements', selectedOrgId, selectedAccountId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const q = { organization_id: selectedOrgId };
      if (selectedAccountId) q.bank_account_ref = selectedAccountId;
      const all = await base44.entities.BankStatementUpload.filter(q);
      return all.sort((a, b) => new Date(b.statement_month) - new Date(a.statement_month));
    },
    enabled: !!selectedOrgId
  });

  const { data: payees = [] } = useQuery({
    queryKey: ['payees', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return await base44.entities.PayeeDirectory.filter({ organization_id: selectedOrgId, status: 'active' });
    },
    enabled: !!selectedOrgId
  });

  const { data: unmatchedCount = 0 } = useQuery({
    queryKey: ['bankTxUnmatched', selectedOrgId, selectedAccountId],
    queryFn: async () => {
      const q = { organization_id: selectedOrgId, reconciliation_status: 'unmatched' };
      if (selectedAccountId) q.bank_account_ref = selectedAccountId;
      const all = await base44.entities.BankTransaction.filter(q);
      return all.length;
    },
    enabled: !!selectedOrgId
  });

  // ── Create bank account ──
  const createAccountMutation = useMutation({
    mutationFn: (data) => {
      if (!companyProfile?.id) throw new Error('Company profile not found.');
      return base44.entities.BankAccount.create({
        organization_id: selectedOrgId, company_ref: companyProfile.id,
        bank_name: data.bank_name, account_nickname: data.account_nickname,
        account_mask_last4: data.account_mask_last4, currency: data.currency
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setNewAccountOpen(false);
      setNewAccount({ account_nickname: '', account_mask_last4: '', bank_name: '', currency: 'USD' });
    },
    onError: (error) => alert('Failed to create account: ' + error.message)
  });

  // ── Auto-match helpers ──
  const autoMatchPayee = (description, payeeList) => {
    if (!description || !payeeList?.length) return null;
    const desc = description.toLowerCase();
    const sorted = [...payeeList]
      .filter(p => p.display_name && p.display_name.length >= 3)
      .sort((a, b) => b.display_name.length - a.display_name.length);
    for (const p of sorted) {
      if (desc.includes(p.display_name.toLowerCase())) return p;
    }
    return null;
  };

  const guessCategory = (description, type) => {
    const d = (description || '').toLowerCase();
    if (type === 'deposit') {
      if (d.includes('interest')) return 'Interest Income';
      if (d.includes('transfer')) return 'Transfer In';
      if (d.includes('refund')) return 'Refund Received';
      if (d.includes('payroll') || d.includes('salary')) return 'Service Revenue';
      return '';
    }
    if (d.includes('rent')) return 'Rent';
    if (d.includes('utilit') || d.includes('water') || d.includes('electric')) return 'Utilities';
    if (d.includes('payroll') || d.includes('salary') || d.includes('wages')) return 'Payroll';
    if (d.includes('insurance')) return 'Insurance';
    if (d.includes('bank fee') || d.includes('service charge') || d.includes('overdraft')) return 'Bank Fees';
    if (d.includes('suppl')) return 'Office Supplies';
    if (d.includes('marketing') || d.includes('advertis')) return 'Marketing';
    if (d.includes('travel') || d.includes('fuel')) return 'Travel';
    if (d.includes('software') || d.includes('subscription') || d.includes('saas')) return 'Software & Subscriptions';
    if (d.includes('tax')) return 'Tax Payment';
    if (d.includes('loan') || d.includes('mortgage')) return 'Loan Payment';
    if (d.includes('transfer')) return 'Transfer Out';
    return '';
  };

  // ── Upload & auto-reconcile ──
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedAccountId) return;
    e.target.value = '';

    const validTypes = ['text/csv', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|pdf|xlsx?|xls)$/i)) {
      alert('Please upload a CSV, Excel, or PDF file');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading file...');
    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const uploadResult = uploadResponse.data || uploadResponse;
      if (!uploadResult?.file_url) throw new Error('File upload failed');

      setUploadStatus('Extracting transactions...');
      const bankSchema = {
        type: "object",
        properties: {
          statement_period_start: { type: "string" },
          statement_period_end: { type: "string" },
          transactions: { type: "array", items: { type: "object", properties: {
            date: { type: "string" }, description: { type: "string" },
            amount: { type: "number" }, type: { type: "string" }
          }}},
          opening_balance: { type: "number" },
          closing_balance: { type: "number" },
          total_deposits: { type: "number" },
          total_withdrawals: { type: "number" }
        }
      };

      let extractResult = null;
      let primaryError = null;
      try {
        const r = await base44.functions.invoke('extractDataOpenAI', { file_url: uploadResult.file_url, json_schema: bankSchema });
        extractResult = r.data || r;
        if (!extractResult?.output || extractResult.status === 'error') { primaryError = extractResult?.details || 'No data'; extractResult = null; }
      } catch (e) { primaryError = e.message; }

      if (!extractResult) {
        try {
          const r2 = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: uploadResult.file_url, json_schema: bankSchema });
          extractResult = r2.data || r2;
          if (!extractResult?.output || extractResult.status === 'error') throw new Error(extractResult?.details || 'No data');
        } catch (fallbackErr) {
          throw new Error(`Extraction failed.\nPrimary: ${primaryError}\nFallback: ${fallbackErr.message}`);
        }
      }

      const summaryData = extractResult?.output || {};
      const detectedMonth = summaryData.statement_period_start
        ? moment(summaryData.statement_period_start).format('YYYY-MM')
        : moment().format('YYYY-MM');

      // Create statement record
      const statementRecord = await base44.entities.BankStatementUpload.create({
        organization_id: selectedOrgId,
        company_ref: companyProfile?.id || '',
        bank_account_ref: selectedAccountId,
        statement_month: detectedMonth,
        file_ref: uploadResult.file_url,
        created_by: currentUser?.email || 'system',
        created_by_email: currentUser?.email || 'system',
        upload_date: new Date().toISOString(),
        opening_balance: summaryData.opening_balance || 0,
        closing_balance: summaryData.closing_balance || 0,
        transactions: summaryData.transactions || [],
        extracted_summary_json: {
          total_deposits: summaryData.total_deposits || 0,
          total_withdrawals: summaryData.total_withdrawals || 0,
          transaction_count: summaryData.transactions?.length || 0,
          file_name: file.name,
          period_start: summaryData.statement_period_start,
          period_end: summaryData.statement_period_end,
        }
      });

      // Auto-match & create individual transaction records
      setUploadStatus('Auto-matching vendors...');
      const allPayees = payees.length > 0 ? payees : await base44.entities.PayeeDirectory.filter({ organization_id: selectedOrgId, status: 'active' });

      const txRecords = (summaryData.transactions || []).map(tx => {
        const isDeposit = String(tx.type || '').toLowerCase().includes('deposit') || Number(tx.amount) > 0;
        const matched = autoMatchPayee(tx.description, allPayees);
        const type = isDeposit ? 'deposit' : 'withdrawal';
        return {
          organization_id: selectedOrgId,
          bank_account_ref: selectedAccountId,
          statement_upload_id: statementRecord.id,
          transaction_date: tx.date || detectedMonth,
          description: tx.description || '',
          amount: Number(tx.amount) || 0,
          type,
          payee_name: matched?.display_name || '',
          matched_payee_id: matched?.id || '',
          matched_payee_name: matched?.display_name || '',
          category: matched ? guessCategory(tx.description, type) : '',
          reconciliation_status: matched ? 'auto_matched' : 'unmatched',
          created_by: currentUser?.email || 'system',
          created_by_email: currentUser?.email || 'system',
        };
      });

      if (txRecords.length > 0) {
        await base44.entities.BankTransaction.bulkCreate(txRecords);
      }

      // Log balance
      if (summaryData.closing_balance !== undefined) {
        try {
          await base44.entities.BankBalanceLog.create({
            organization_id: selectedOrgId,
            company_ref: companyProfile?.id || '',
            bank_account_ref: selectedAccountId,
            as_of_date: summaryData.statement_period_end || detectedMonth,
            balance: summaryData.closing_balance || 0,
            source: 'statement',
            source_ref: statementRecord.id,
            created_by: currentUser?.email || 'system',
            created_by_email: currentUser?.email || 'system',
          });
        } catch (_) { /* non-critical */ }
      }

      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['bankTxUnmatched'] });
      queryClient.invalidateQueries({ queryKey: ['bankBalanceLog'] });
      setUploadDialogOpen(false);
      setActiveTab('transactions');

      const matchedCount = txRecords.filter(t => t.reconciliation_status === 'auto_matched').length;
      alert(`✓ Statement uploaded!\n${txRecords.length} transactions extracted\n${matchedCount} auto-matched to vendors\n${txRecords.length - matchedCount} need review`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload statement:\n\n' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  // ── Access check ──
  const hasAccess = isPlatformOwner || currentUser?.bank_statement_access === true ||
    userRoles.some(r => r.role_id === 'ORG_SUPER_USER' || r.role_id === 'PLATFORM_OWNER');

  // ── Helpers ──
  const getDeposits = (s) => s.extracted_summary_json?.total_deposits ?? 0;
  const getWithdrawals = (s) => s.extracted_summary_json?.total_withdrawals ?? 0;
  const getTxCount = (s) => s.extracted_summary_json?.transaction_count ?? 0;

  const kpis = React.useMemo(() => {
    const totalDeposits = statements.reduce((sum, s) => sum + getDeposits(s), 0);
    const totalWithdrawals = statements.reduce((sum, s) => sum + getWithdrawals(s), 0);
    return {
      totalDeposits, totalWithdrawals,
      netCashFlow: totalDeposits - totalWithdrawals,
      avgMonthlyDeposits: statements.length > 0 ? totalDeposits / statements.length : 0,
      transactionCount: statements.reduce((sum, s) => sum + getTxCount(s), 0)
    };
  }, [statements]);

  const missingPeriods = React.useMemo(() => {
    if (statements.length < 2) return [];
    const sorted = [...statements].sort((a, b) => new Date(a.statement_month) - new Date(b.statement_month));
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = moment(sorted[i].statement_month).diff(moment(sorted[i - 1].statement_month), 'months');
      for (let j = 1; j < diff; j++) gaps.push(moment(sorted[i - 1].statement_month).add(j, 'months').format('YYYY-MM'));
    }
    return gaps;
  }, [statements]);

  const monthlyData = React.useMemo(() => statements.map(s => ({
    month: moment(s.statement_month).format('MMM YYYY'),
    deposits: getDeposits(s), withdrawals: getWithdrawals(s),
    netFlow: getDeposits(s) - getWithdrawals(s)
  })), [statements]);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
              <p className="text-slate-600 mt-2">You don't have permission to view bank statements.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bank Statements</h1>
          <p className="text-slate-500 mt-1">Upload, auto-match vendors, and reconcile transactions</p>
        </div>
        <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" /> Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Bank Account</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Account Nickname</Label>
                <Input value={newAccount.account_nickname} onChange={(e) => setNewAccount({ ...newAccount, account_nickname: e.target.value })} placeholder="Business Checking" />
              </div>
              <div>
                <Label>Last 4 Digits</Label>
                <Input value={newAccount.account_mask_last4} onChange={(e) => setNewAccount({ ...newAccount, account_mask_last4: e.target.value.slice(0, 4) })} placeholder="1234" maxLength={4} />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={newAccount.bank_name} onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })} placeholder="Chase Bank" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={newAccount.currency} onValueChange={(v) => setNewAccount({ ...newAccount, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="LKR">LKR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewAccountOpen(false)}>Cancel</Button>
              <Button onClick={() => createAccountMutation.mutate(newAccount)} disabled={!newAccount.account_nickname || !newAccount.bank_name || !companyProfile} className="bg-teal-600 hover:bg-teal-700">Create Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters + Upload */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Bank Account</Label>
              <Select value={selectedAccountId || 'all'} onValueChange={(v) => setSelectedAccountId(v === 'all' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="All Accounts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.account_nickname} - {acc.bank_name} ****{acc.account_mask_last4}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!selectedAccountId}>
                    <Upload className="w-4 h-4 mr-2" /> Upload Statement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Upload Bank Statement</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                      Upload a statement → transactions are auto-extracted, vendors auto-matched, and categories guessed. You'll review unmatched items next.
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-sm text-slate-600 mb-4">Upload CSV, Excel, or PDF bank statement</p>
                      <input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleFileUpload} className="hidden" id="file-upload" disabled={uploading} />
                      <label htmlFor="file-upload">
                        <Button asChild disabled={uploading}><span>{uploading ? uploadStatus : 'Choose File'}</span></Button>
                      </label>
                      {uploading && (
                        <div className="flex items-center justify-center gap-2 mt-3 text-sm text-blue-600">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          {uploadStatus}
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions
            {unmatchedCount > 0 && <Badge className="ml-2 bg-red-500 text-white">{unmatchedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
          {missingPeriods.length > 0 && (
            <Card className="border-2 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-900 mb-2">⚠️ Missing Statements</h3>
                    <p className="text-red-700 mb-3">These periods are missing bank statements:</p>
                    <div className="flex flex-wrap gap-2">
                      {missingPeriods.map(p => <Badge key={p} className="bg-red-600 text-white px-3 py-1">{moment(p).format('MMMM YYYY')}</Badge>)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPI cards */}
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { label: 'Total Deposits', val: kpis.totalDeposits, icon: TrendingUp, color: 'text-green-600' },
              { label: 'Total Withdrawals', val: kpis.totalWithdrawals, icon: TrendingDown, color: 'text-red-600' },
              { label: 'Net Cash Flow', val: kpis.netCashFlow, icon: DollarSign, color: kpis.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'Avg Monthly Income', val: kpis.avgMonthlyDeposits, icon: BarChart3, color: 'text-teal-600' },
              { label: 'Transactions', val: kpis.transactionCount, raw: true, icon: FileText, color: 'text-slate-900' },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{k.label}</p>
                      <p className={`text-2xl font-bold ${k.color}`}>{k.raw ? k.val : `$${Number(k.val).toLocaleString()}`}</p>
                    </div>
                    <k.icon className={`w-8 h-8 ${k.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Monthly Cash Flow</CardTitle><CardDescription>Deposits vs Withdrawals</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                    <Line type="monotone" dataKey="deposits" stroke="#10b981" strokeWidth={2} name="Deposits" />
                    <Line type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={2} name="Withdrawals" />
                    <Line type="monotone" dataKey="netFlow" stroke="#3b82f6" strokeWidth={2} name="Net Flow" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={[{ name: 'Income', value: kpis.totalDeposits }, { name: 'Expenses', value: kpis.totalWithdrawals }]}
                      cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                      outerRadius={100} dataKey="value">
                      {[0, 1].map(i => <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Statement history */}
          <Card>
            <CardHeader><CardTitle>Uploaded Statements</CardTitle><CardDescription>Click Reconcile to view transaction details</CardDescription></CardHeader>
            <CardContent>
              {statements.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No statements uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statements.map(statement => {
                    const account = bankAccounts.find(a => a.id === statement.bank_account_ref);
                    return (
                      <div key={statement.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg flex-wrap gap-2">
                        <div className="flex items-center gap-4">
                          <Building2 className="w-8 h-8 text-teal-600" />
                          <div>
                            <p className="font-semibold">{account?.account_nickname || 'Unknown'} - {account?.bank_name}</p>
                            <p className="text-sm text-slate-500">{moment(statement.statement_month).format('MMMM YYYY')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div><p className="text-xs text-slate-500">Deposits</p><p className="font-semibold text-green-600">${getDeposits(statement).toLocaleString()}</p></div>
                          <div><p className="text-xs text-slate-500">Withdrawals</p><p className="font-semibold text-red-600">${getWithdrawals(statement).toLocaleString()}</p></div>
                          <div><p className="text-xs text-slate-500">Transactions</p><p className="font-semibold">{getTxCount(statement)}</p></div>
                          <Badge className={statement.reconciliation_status === 'reconciled' ? 'bg-green-500' : 'bg-yellow-500'}>
                            {statement.reconciliation_status === 'reconciled' ? (<><CheckCircle2 className="w-3 h-3 mr-1" />Reconciled</>) : (<><Clock className="w-3 h-3 mr-1" />Pending</>)}
                          </Badge>
                          <StatementReconcileDialog
                            statement={statement}
                            account={account}
                            onReconciled={() => queryClient.invalidateQueries({ queryKey: ['bankStatements'] })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transactions Tab ── */}
        <TabsContent value="transactions">
          <BankTransactionTable orgId={selectedOrgId} accountId={selectedAccountId} payees={payees} />
        </TabsContent>

        {/* ── Vendors Tab ── */}
        <TabsContent value="vendors">
          <VendorManager orgId={selectedOrgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}