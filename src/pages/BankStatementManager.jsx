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
  Upload, 
  Building2, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  FileText,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import moment from 'moment';

const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function BankStatementManager() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();

  // CRITICAL: All useState hooks MUST be at the top, before any conditional returns
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_nickname: '',
    account_mask_last4: '',
    bank_name: '',
    currency: 'USD'
  });

  // Check user access
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // CRITICAL: Platform owner ALWAYS has full access - no restrictions
  const isPlatformOwner = currentUser?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                         currentUser?.email === 'mylvaganam@premierhealthcanada.ca' ||
                         currentUser?.is_platform_owner === true;

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', currentUser?.id, selectedOrgId],
    queryFn: async () => {
      if (!currentUser?.id || !selectedOrgId) return [];
      const roles = await base44.entities.UserRole.filter({
        user_id: currentUser.id,
        organization_id: selectedOrgId
      });
      return roles;
    },
    enabled: !!currentUser?.id && !!selectedOrgId && !isPlatformOwner
  });

  const hasAccess = isPlatformOwner || currentUser?.bank_statement_access === true || userRoles.some(r => r.role_id === 'ORG_SUPER_USER' || r.role_id === 'PLATFORM_OWNER');

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
              <p className="text-slate-600 mt-2">
                You don't have permission to view bank statements. Please contact your organization administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch company profile first
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

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', selectedOrgId],
    queryFn: async () => {
      const accounts = await base44.entities.BankAccount.filter({ organization_id: selectedOrgId });
      return accounts;
    },
    enabled: !!selectedOrgId
  });

  // Fetch bank statement uploads
  const { data: statements = [] } = useQuery({
    queryKey: ['bankStatements', selectedOrgId, selectedAccountId],
    queryFn: async () => {
      const filter = { organization_id: selectedOrgId };
      if (selectedAccountId) filter.bank_account_id = selectedAccountId;
      const allStatements = await base44.entities.BankStatementUpload.filter(filter);
      return allStatements.sort((a, b) => new Date(b.statement_month) - new Date(a.statement_month));
    },
    enabled: !!selectedOrgId
  });

  // Create bank account
  const createAccountMutation = useMutation({
    mutationFn: (data) => {
      if (!companyProfile?.id) {
        throw new Error('Company profile not found. Please contact support.');
      }
      return base44.entities.BankAccount.create({
        organization_id: selectedOrgId,
        company_ref: companyProfile.id,
        bank_name: data.bank_name,
        account_nickname: data.account_nickname,
        account_mask_last4: data.account_mask_last4,
        currency: data.currency
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bankAccounts']);
      setNewAccountOpen(false);
      setNewAccount({
        account_nickname: '',
        account_mask_last4: '',
        bank_name: '',
        currency: 'USD'
      });
    },
    onError: (error) => {
      alert('Failed to create account: ' + error.message);
    }
  });

  // Upload bank statement
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedAccountId) return;

    setUploading(true);
    try {
      // Upload file
      const { data: uploadResult } = await base44.integrations.Core.UploadFile({ file });
      
      // Extract data from file
      const { data: extractResult } = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: "object",
          properties: {
            statement_period_start: { type: "string" },
            statement_period_end: { type: "string" },
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  description: { type: "string" },
                  amount: { type: "number" },
                  type: { type: "string" }
                }
              }
            },
            opening_balance: { type: "number" },
            closing_balance: { type: "number" },
            total_deposits: { type: "number" },
            total_withdrawals: { type: "number" }
          }
        }
      });

      // Auto-detect statement month from the data
      const detectedMonth = extractResult.output.statement_period_start 
        ? moment(extractResult.output.statement_period_start).format('YYYY-MM')
        : moment().format('YYYY-MM');

      // Create bank statement upload record
      await base44.entities.BankStatementUpload.create({
        organization_id: selectedOrgId,
        bank_account_id: selectedAccountId,
        statement_month: detectedMonth,
        file_url: uploadResult.file_url,
        opening_balance: extractResult.output.opening_balance || 0,
        closing_balance: extractResult.output.closing_balance || 0,
        total_deposits: extractResult.output.total_deposits || 0,
        total_withdrawals: extractResult.output.total_withdrawals || 0,
        transaction_count: extractResult.output.transactions?.length || 0,
        upload_status: 'processed',
        processed_at: new Date().toISOString()
      });

      queryClient.invalidateQueries(['bankStatements']);
      setUploadDialogOpen(false);
    } catch (error) {
      alert('Failed to upload statement: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Calculate KPIs
  const kpis = React.useMemo(() => {
    const totalDeposits = statements.reduce((sum, s) => sum + (s.total_deposits || 0), 0);
    const totalWithdrawals = statements.reduce((sum, s) => sum + (s.total_withdrawals || 0), 0);
    const netCashFlow = totalDeposits - totalWithdrawals;
    const avgMonthlyDeposits = statements.length > 0 ? totalDeposits / statements.length : 0;
    
    return {
      totalDeposits,
      totalWithdrawals,
      netCashFlow,
      avgMonthlyDeposits,
      transactionCount: statements.reduce((sum, s) => sum + (s.transaction_count || 0), 0)
    };
  }, [statements]);

  // Detect missing periods
  const missingPeriods = React.useMemo(() => {
    if (statements.length === 0) return [];
    
    const sortedStatements = [...statements].sort((a, b) => 
      new Date(a.statement_month) - new Date(b.statement_month)
    );
    
    const gaps = [];
    for (let i = 1; i < sortedStatements.length; i++) {
      const prevMonth = moment(sortedStatements[i - 1].statement_month);
      const currMonth = moment(sortedStatements[i].statement_month);
      const monthsDiff = currMonth.diff(prevMonth, 'months');
      
      if (monthsDiff > 1) {
        for (let j = 1; j < monthsDiff; j++) {
          gaps.push(prevMonth.clone().add(j, 'months').format('YYYY-MM'));
        }
      }
    }
    
    return gaps;
  }, [statements]);

  // Prepare chart data
  const monthlyData = React.useMemo(() => {
    return statements.map(s => ({
      month: moment(s.statement_month).format('MMM YYYY'),
      deposits: s.total_deposits || 0,
      withdrawals: s.total_withdrawals || 0,
      netFlow: (s.total_deposits || 0) - (s.total_withdrawals || 0)
    }));
  }, [statements]);

  const incomeExpenseData = [
    { name: 'Income', value: kpis.totalDeposits },
    { name: 'Expenses', value: kpis.totalWithdrawals }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bank Statement Manager</h1>
          <p className="text-slate-500 mt-1">Upload and analyze bank statements</p>
        </div>
        <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Bank Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Account Nickname</Label>
                <Input
                  value={newAccount.account_nickname}
                  onChange={(e) => setNewAccount({ ...newAccount, account_nickname: e.target.value })}
                  placeholder="Business Checking"
                />
              </div>
              <div>
                <Label>Last 4 Digits of Account</Label>
                <Input
                  value={newAccount.account_mask_last4}
                  onChange={(e) => setNewAccount({ ...newAccount, account_mask_last4: e.target.value.slice(0, 4) })}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={newAccount.bank_name}
                  onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                  placeholder="Chase Bank"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={newAccount.currency} onValueChange={(v) => setNewAccount({ ...newAccount, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="LKR">LKR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewAccountOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createAccountMutation.mutate(newAccount)}
                disabled={!newAccount.account_nickname || !newAccount.bank_name || !companyProfile}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Bank Account</Label>
              <Select value={selectedAccountId || 'all'} onValueChange={(v) => setSelectedAccountId(v === 'all' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_nickname} - {acc.bank_name} ****{acc.account_mask_last4}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!selectedAccountId}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Statement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Bank Statement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-900">
                        📅 Statement period will be automatically detected from the file
                      </p>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-sm text-slate-600 mb-4">Upload CSV, Excel, or PDF bank statement</p>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        disabled={uploading}
                      />
                      <label htmlFor="file-upload">
                        <Button asChild disabled={uploading}>
                          <span>
                            {uploading ? 'Uploading...' : 'Choose File'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Periods Alert */}
      {missingPeriods.length > 0 && (
        <Card className="border-2 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 mb-2">⚠️ Missing Statements Detected</h3>
                <p className="text-red-700 mb-3">
                  The following periods are missing bank statements. Please upload them for complete financial tracking.
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingPeriods.map(period => (
                    <Badge key={period} className="bg-red-600 text-white text-sm px-3 py-1">
                      {moment(period).format('MMMM YYYY')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Deposits</p>
                <p className="text-2xl font-bold text-green-600">${kpis.totalDeposits.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Withdrawals</p>
                <p className="text-2xl font-bold text-red-600">${kpis.totalWithdrawals.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${kpis.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${kpis.netCashFlow.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg Monthly Income</p>
                <p className="text-2xl font-bold text-teal-600">${kpis.avgMonthlyDeposits.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{kpis.transactionCount}</p>
              </div>
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash Flow Trend</CardTitle>
            <CardDescription>Deposits vs Withdrawals over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="deposits" stroke="#10b981" strokeWidth={2} name="Deposits" />
                <Line type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={2} name="Withdrawals" />
                <Line type="monotone" dataKey="netFlow" stroke="#3b82f6" strokeWidth={2} name="Net Flow" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Overall financial breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeExpenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
            <CardDescription>Bar chart of deposits and withdrawals</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="deposits" fill="#10b981" name="Deposits" />
                <Bar dataKey="withdrawals" fill="#ef4444" name="Withdrawals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Statement History */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Statements</CardTitle>
          <CardDescription>History of all uploaded bank statements</CardDescription>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No statements uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statements.map(statement => {
                const account = bankAccounts.find(a => a.id === statement.bank_account_id);
                return (
                  <div key={statement.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Building2 className="w-8 h-8 text-teal-600" />
                      <div>
                        <p className="font-semibold">{account?.account_nickname || 'Unknown Account'} - {account?.bank_name}</p>
                        <p className="text-sm text-slate-500">{moment(statement.statement_month).format('MMMM YYYY')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs text-slate-500">Deposits</p>
                        <p className="font-semibold text-green-600">${statement.total_deposits?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Withdrawals</p>
                        <p className="font-semibold text-red-600">${statement.total_withdrawals?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Transactions</p>
                        <p className="font-semibold">{statement.transaction_count}</p>
                      </div>
                      <Badge className={statement.upload_status === 'processed' ? 'bg-green-500' : 'bg-yellow-500'}>
                        {statement.upload_status === 'processed' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Processed
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}