import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  DollarSign, 
  FileText, 
  Search, 
  Plus,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Filter
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import PageInfoTooltip from '@/components/shared/PageInfoTooltip';

export default function CreditCustomerManagement() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Fetch all credit sales - INCLUDING institution-based sales
  const { data: creditSales = [] } = useQuery({
    queryKey: ['creditSales', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const sales = await base44.entities.PharmacySaleHeader.filter({
        ...orgFilter,
        status: 'credit'
      }, '-sale_date');
      return sales;
    },
    enabled: !!selectedOrgId,
  });

  // Fetch institutions
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      try {
        return await base44.entities.Institution.filter(orgFilter);
      } catch {
        return [];
      }
    },
    enabled: !!selectedOrgId,
  });

  // Fetch credit payments (from a hypothetical CreditPayment entity)
  const { data: creditPayments = [] } = useQuery({
    queryKey: ['creditPayments', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      try {
        return await base44.entities.CreditPayment.filter(orgFilter, '-payment_date');
      } catch {
        return [];
      }
    },
    enabled: !!selectedOrgId,
  });

  // Group sales by institution - Match with registered institutions
  const customerGroups = creditSales.reduce((acc, sale) => {
    // Try to get institution name from notes or customer_id
    let institution = sale.notes?.split('|').find(n => n.includes('Bill To:'))?.split('Bill To:')[1]?.trim();
    
    // If not found, try to extract from notes containing institution info
    if (!institution) {
      const billToMatch = sale.notes?.match(/Bill To:\s*([^|]+)/);
      institution = billToMatch ? billToMatch[1].trim() : null;
    }

    // Fallback to customer_id if it's an institution UUID
    if (!institution && sale.customer_id) {
      const matchedInst = institutions.find(i => i.id === sale.customer_id);
      institution = matchedInst?.institution_name;
    }

    institution = institution || 'Unknown Institution';

    if (!acc[institution]) {
      acc[institution] = [];
    }
    acc[institution].push(sale);
    return acc;
  }, {});

  // Calculate balances per customer with integrated institution data
  const customerData = Object.entries(customerGroups).map(([institution, sales]) => {
    const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const paidAmount = creditPayments
      .filter(p => p.institution_name === institution)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstanding = totalSales - paidAmount;

    // Find matching institution record
    const instRecord = institutions.find(i => i.institution_name === institution);

    return {
      institution,
      institution_id: instRecord?.id,
      institution_type: instRecord?.institution_type,
      contact_person: instRecord?.contact_person,
      contact_phone: instRecord?.contact_phone,
      contact_email: instRecord?.contact_email,
      credit_limit: instRecord?.credit_limit,
      credit_terms_days: instRecord?.credit_terms_days,
      totalSales,
      paidAmount,
      outstanding,
      invoiceCount: sales.length,
      lastSaleDate: sales[0]?.sale_date,
      sales,
    };
  });

  // Filter by search
  const filteredCustomers = customerData.filter(c =>
    c.institution.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create payment record mutation
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentAmount || !selectedCustomer) {
        throw new Error('Please enter payment amount');
      }
      return base44.entities.CreditPayment.create({
        organization_id: selectedOrgId,
        institution_name: selectedCustomer.institution,
        amount: parseFloat(paymentAmount),
        payment_date: new Date().toISOString(),
        payment_method: 'cheque', // Default, can be enhanced
        notes: paymentNotes,
        recorded_by: (await base44.auth.me())?.email || 'system'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditPayments'] });
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentNotes('');
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleRecordPayment = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount('');
    setPaymentNotes('');
    setShowPaymentDialog(true);
  };

  const handleGenerateStatement = (customer) => {
    // Filter sales for selected month
    const monthStart = startOfMonth(new Date(selectedMonth));
    const monthEnd = endOfMonth(monthStart);

    const monthSales = customer.sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= monthStart && saleDate <= monthEnd;
    });

    const monthPayments = creditPayments.filter(p =>
      p.institution_name === customer.institution &&
      new Date(p.payment_date) >= monthStart &&
      new Date(p.payment_date) <= monthEnd
    );

    // Generate and print statement
    const statementHTML = `
      <html>
        <head>
          <title>Statement - ${customer.institution}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20mm; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .meta-row { display: flex; justify-content: space-between; margin: 15px 0; }
            .meta-box { flex: 1; }
            .meta-box strong { display: block; font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 1px solid #ddd; }
            td { padding: 8px 10px; border-bottom: 1px solid #eee; }
            .amount { text-align: right; font-family: 'Courier New', monospace; }
            .summary-box { margin-top: 30px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; }
            .summary-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
            .summary-row.total { font-weight: bold; font-size: 16px; border-top: 1px solid #ddd; padding-top: 10px; }
            .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Credit Account Statement</h1>
            <p>Period: ${format(monthStart, 'MMMM yyyy')}</p>
          </div>

          <div class="meta-row">
            <div class="meta-box">
              <strong>Bill To:</strong>
              <p>${customer.institution}</p>
            </div>
            <div class="meta-box">
              <strong>Statement Date:</strong>
              <p>${format(new Date(), 'd MMMM yyyy')}</p>
            </div>
            <div class="meta-box">
              <strong>Account Outstanding:</strong>
              <p style="font-size: 18px; font-weight: bold; color: #d32f2f;">Rs. ${customer.outstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <h3>Invoices for ${format(monthStart, 'MMMM yyyy')}</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Description</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${monthSales.map(sale => `
                <tr>
                  <td>${format(new Date(sale.sale_date), 'd MMM yyyy')}</td>
                  <td>${sale.sale_number}</td>
                  <td>Invoice for medicines & services</td>
                  <td class="amount">Rs. ${(sale.total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              ${monthSales.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#999;">No invoices for this period</td></tr>' : ''}
            </tbody>
          </table>

          <h3>Payments for ${format(monthStart, 'MMMM yyyy')}</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Payment Method</th>
                <th>Notes</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${monthPayments.map(payment => `
                <tr>
                  <td>${format(new Date(payment.payment_date), 'd MMM yyyy')}</td>
                  <td>${payment.payment_method || 'Cheque'}</td>
                  <td>${payment.notes || '-'}</td>
                  <td class="amount">Rs. ${(payment.amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              ${monthPayments.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#999;">No payments for this period</td></tr>' : ''}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-row">
              <span>Total Invoices (${format(monthStart, 'MMM yyyy')}):</span>
              <span>Rs. ${monthSales.reduce((sum, s) => sum + (s.total || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>Total Payments (${format(monthStart, 'MMM yyyy')}):</span>
              <span>Rs. ${monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row total">
              <span>Outstanding Balance:</span>
              <span>Rs. ${customer.outstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer-generated statement. Please contact us if you have any discrepancies.</p>
            <p>Generated on ${format(new Date(), 'd MMM yyyy HH:mm')}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(statementHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  if (!selectedOrgId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Organization Selected</h2>
          <p className="text-slate-600">Please select an organization from the top right to continue.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              Credit Customers Management
            </h1>
            <p className="text-slate-600 mt-1">Track outstanding balances, payments, and generate statements</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Total Outstanding
                </p>
                <p className="text-2xl font-bold text-red-600">
                  Rs. {customerData.reduce((sum, c) => sum + c.outstanding, 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Active Customers
                </p>
                <p className="text-2xl font-bold text-blue-600">{customerData.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Total Invoices
                </p>
                <p className="text-2xl font-bold text-green-600">{creditSales.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Total Collected
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  Rs. {creditPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search institution name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No credit customers found</p>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.institution} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        {customer.institution}
                      </CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {customer.invoiceCount} invoices • Last sale: {format(new Date(customer.lastSaleDate), 'd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        Rs. {customer.outstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Outstanding</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="invoices">Invoices</TabsTrigger>
                      <TabsTrigger value="payments">Payments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-xs text-blue-600 mb-1">Total Sales</p>
                          <p className="font-bold text-blue-900">Rs. {customer.totalSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <p className="text-xs text-green-600 mb-1">Paid</p>
                          <p className="font-bold text-green-900">Rs. {customer.paidAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                          <p className="text-xs text-red-600 mb-1">Outstanding</p>
                          <p className="font-bold text-red-900">Rs. {customer.outstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200">
                          <p className="text-xs text-slate-600 mb-1">% Paid</p>
                          <p className="font-bold text-slate-900">{((customer.paidAmount / customer.totalSales) * 100 || 0).toFixed(1)}%</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="invoices" className="mt-4">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customer.sales.slice(0, 10).map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{sale.sale_number}</p>
                              <p className="text-xs text-slate-600">{format(new Date(sale.sale_date), 'd MMM yyyy')}</p>
                            </div>
                            <p className="font-bold text-slate-900">Rs. {(sale.total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-4">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {creditPayments
                          .filter(p => p.institution_name === customer.institution)
                          .map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                              <div className="flex-1">
                                <p className="font-medium text-sm flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  {payment.payment_method || 'Cheque'}
                                </p>
                                <p className="text-xs text-slate-600">{format(new Date(payment.payment_date), 'd MMM yyyy')}</p>
                              </div>
                              <p className="font-bold text-green-600">Rs. {(payment.amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      onClick={() => handleRecordPayment(customer)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Record Payment
                    </Button>
                    <Button
                      onClick={() => handleGenerateStatement(customer)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Statement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 mb-1">Institution</p>
                <p className="font-bold text-blue-900">{selectedCustomer.institution}</p>
                <p className="text-xs text-blue-600 mt-2">Outstanding: Rs. {selectedCustomer.outstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
              </div>

              <div>
                <Label className="text-sm">Payment Amount *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                  step="0.01"
                />
              </div>

              <div>
                <Label className="text-sm">Notes (Optional)</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cheque #, reference"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createPaymentMutation.mutate()}
                  disabled={!paymentAmount || createPaymentMutation.isPending}
                  className="flex-1"
                >
                  {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}