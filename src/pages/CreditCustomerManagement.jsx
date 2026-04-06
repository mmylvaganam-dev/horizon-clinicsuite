import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
  Trash2,
  Download,
  ShoppingCart,
  PackageCheck,
  ClipboardList,
  Link2,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import PageInfoTooltip from '@/components/shared/PageInfoTooltip';
import CreditMonthlyInvoicesPanel from '@/components/credit/CreditMonthlyInvoicesPanel';

export default function CreditCustomerManagement() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderCustomer, setOrderCustomer] = useState(null);
  const [orderLines, setOrderLines] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [showOrdersListDialog, setShowOrdersListDialog] = useState(false);
  const [ordersListCustomer, setOrdersListCustomer] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingPO, setRejectingPO] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  // Pharmacy stock for order items
  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock', selectedOrgId],
    queryFn: () => selectedOrgId
      ? base44.entities.PharmacyStock.filter({ organization_id: selectedOrgId })
      : [],
    enabled: !!selectedOrgId,
  });

  // Credit buyer purchase orders (institution orders FROM pharmacy)
  const { data: buyerPOs = [] } = useQuery({
    queryKey: ['buyerPurchaseOrders', selectedOrgId],
    queryFn: () => selectedOrgId
      ? base44.entities.PurchaseOrder.filter({ organization_id: selectedOrgId })
      : [],
    enabled: !!selectedOrgId,
  });

  const { data: allPOLines = [] } = useQuery({
    queryKey: ['buyerPOLines'],
    queryFn: () => base44.entities.PurchaseOrderLine.list(),
    enabled: !!selectedOrgId,
  });

  const stockItems = useMemo(() => {
    return pharmacyStock
      .filter(s => s.display_name || s.brand_name)
      .map(s => ({ id: s.id, name: s.display_name || s.brand_name, price: s.unit_price || s.mrp || 0, sku: s.product_id || s.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pharmacyStock]);

  const filteredStockItems = useMemo(() => {
    if (!itemSearch) return stockItems;
    const q = itemSearch.toLowerCase();
    return stockItems.filter(i => i.name?.toLowerCase().includes(q));
  }, [stockItems, itemSearch]);

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

  const createBuyerPOMutation = useMutation({
    mutationFn: async ({ customer, lines, notes, deliveryDate }) => {
      const user = await base44.auth.me();
      const year = new Date().getFullYear();
      const poNumber = `CPO-${year}-${Date.now().toString().slice(-5)}`;
      const po = await base44.entities.PurchaseOrder.create({
        organization_id: selectedOrgId,
        po_number: poNumber,
        supplier_name: customer.institution, // institution is the "buyer" here
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: deliveryDate || null,
        notes: `CREDIT_BUYER_ORDER|Institution: ${customer.institution}|${notes || ''}`,
        status: 'draft',
        created_at: new Date().toISOString(),
        created_by: user?.id || '',
        created_by_email: user?.email || '',
      });
      for (const line of lines) {
        await base44.entities.PurchaseOrderLine.create({
          purchase_order_id: po.id,
          sku_code: line.sku,
          item_name: line.name,
          qty_ordered: line.qty,
          unit_cost: line.price,
          line_total: line.qty * line.price,
        });
      }
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerPurchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['buyerPOLines'] });
      setShowOrderDialog(false);
      setOrderLines([]);
      setOrderNotes('');
      setOrderDeliveryDate('');
      setItemSearch('');
      toast.success('Credit buyer order created!');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleOpenOrder = (customer) => {
    setOrderCustomer(customer);
    setOrderLines([]);
    setOrderNotes('');
    setOrderDeliveryDate('');
    setItemSearch('');
    setShowOrderDialog(true);
  };

  const addOrderLine = () => setOrderLines(prev => [...prev, { id: Date.now(), sku: '', name: '', qty: 1, price: 0 }]);

  const updateOrderLine = (id, field, value) => {
    setOrderLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeOrderLine = (id) => setOrderLines(prev => prev.filter(l => l.id !== id));

  // Approve / Reject PO mutations
  const approvePOMutation = useMutation({
    mutationFn: async (po) => {
      const user = await base44.auth.me();
      await base44.entities.PurchaseOrder.update(po.id, {
        status: 'approved',
        reviewed_by: user?.email || '',
        reviewed_at: new Date().toISOString(),
      });
      // Notify institution by email if contact_email is available
      const institutionName = po.supplier_name;
      const inst = institutions.find(i => i.institution_name === institutionName);
      if (inst?.contact_email) {
        await base44.integrations.Core.SendEmail({
          to: inst.contact_email,
          subject: `Order ${po.po_number} — Approved`,
          body: `Dear ${inst.contact_person || inst.institution_name},\n\nYour credit purchase order <strong>${po.po_number}</strong> has been <strong>approved</strong> by our pharmacy team.\n\nYour order is now being processed and will be ready as per the requested delivery date.\n\nThank you for your business.\n\nRegards,\nPharmacy Team`,
        });
      }
      return po;
    },
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ['buyerPurchaseOrders'] });
      toast.success(`Order ${po.po_number} approved`);
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectPOMutation = useMutation({
    mutationFn: async ({ po, reason }) => {
      const user = await base44.auth.me();
      await base44.entities.PurchaseOrder.update(po.id, {
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: user?.email || '',
        reviewed_at: new Date().toISOString(),
      });
      const institutionName = po.supplier_name;
      const inst = institutions.find(i => i.institution_name === institutionName);
      if (inst?.contact_email) {
        await base44.integrations.Core.SendEmail({
          to: inst.contact_email,
          subject: `Order ${po.po_number} — Rejected`,
          body: `Dear ${inst.contact_person || inst.institution_name},\n\nUnfortunately, your credit purchase order <strong>${po.po_number}</strong> has been <strong>rejected</strong>.\n\n<strong>Reason:</strong> ${reason || 'Not specified'}\n\nPlease contact us if you have any questions.\n\nRegards,\nPharmacy Team`,
        });
      }
      return po;
    },
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ['buyerPurchaseOrders'] });
      setShowRejectDialog(false);
      setRejectingPO(null);
      setRejectionReason('');
      toast.success(`Order ${po.po_number} rejected`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmitOrder = () => {
    if (!orderLines.length || orderLines.some(l => !l.name)) {
      toast.error('Please add at least one item');
      return;
    }
    createBuyerPOMutation.mutate({ customer: orderCustomer, lines: orderLines, notes: orderNotes, deliveryDate: orderDeliveryDate });
  };

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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                Credit Customers Management
              </h1>
              <PageInfoTooltip
                title="Credit Sales Accounts"
                description="Track outstanding balances for credit customers (hospitals, corporates, clinics). Record payments and generate monthly statements."
                useCases={[
                  "View outstanding balance per institution after credit sales are made at POS",
                  "Record a payment when a cheque or bank transfer is received",
                  "Download a monthly account statement as PDF for a customer",
                  "Check total outstanding across all credit customers"
                ]}
                bestPractices={[
                  "Credit sales must first be made from Pharmacy POS with 'Credit Sale' toggled ON",
                  "Record payments promptly when received — do not wait until end of month",
                  "Always include cheque number / reference in the payment notes",
                  "Generate and send the monthly statement to the customer for reconciliation"
                ]}
              />
            </div>
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
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="invoices">Sales</TabsTrigger>
                      <TabsTrigger value="payments">Payments</TabsTrigger>
                      <TabsTrigger value="orders">Orders</TabsTrigger>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
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

                    <TabsContent value="orders" className="mt-4">
                      <div className="flex justify-end mb-3">
                        <Button size="sm" onClick={() => handleOpenOrder(customer)}>
                          <Plus className="w-4 h-4 mr-2" />
                          New Order
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {buyerPOs
                          .filter(po => po.supplier_name === customer.institution && po.notes?.includes('CREDIT_BUYER_ORDER'))
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map(po => {
                            const lines = allPOLines.filter(l => l.purchase_order_id === po.id);
                            const total = lines.reduce((s, l) => s + (l.line_total || 0), 0);
                            const statusColors = {
                              draft: 'bg-slate-100 text-slate-700',
                              sent: 'bg-blue-100 text-blue-700',
                              approved: 'bg-emerald-100 text-emerald-700',
                              rejected: 'bg-red-100 text-red-700',
                              received: 'bg-teal-100 text-teal-700',
                              closed: 'bg-slate-100 text-slate-500',
                            };
                            const isPending = po.status === 'draft' || po.status === 'sent';
                            return (
                              <div key={po.id} className="p-3 bg-slate-50 rounded border space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm font-mono">{po.po_number}</p>
                                    <p className="text-xs text-slate-500">{format(new Date(po.order_date || po.created_at), 'd MMM yyyy')} • {lines.length} item{lines.length !== 1 ? 's' : ''}</p>
                                    {po.rejection_reason && (
                                      <p className="text-xs text-red-600 mt-0.5">Reason: {po.rejection_reason}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={statusColors[po.status] || 'bg-slate-100 text-slate-700'}>{po.status}</Badge>
                                    <span className="font-bold text-sm">Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                                {isPending && (
                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                                      disabled={approvePOMutation.isPending}
                                      onClick={() => approvePOMutation.mutate(po)}
                                    >
                                      <ThumbsUp className="w-3 h-3 mr-1" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50 h-7 text-xs"
                                      onClick={() => { setRejectingPO(po); setRejectionReason(''); setShowRejectDialog(true); }}
                                    >
                                      <ThumbsDown className="w-3 h-3 mr-1" /> Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {buyerPOs.filter(po => po.supplier_name === customer.institution && po.notes?.includes('CREDIT_BUYER_ORDER')).length === 0 && (
                          <p className="text-center text-slate-500 text-sm py-4">No orders yet. Click "New Order" to create one.</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="monthly" className="mt-4">
                      <CreditMonthlyInvoicesPanel
                        customer={customer}
                        orgId={selectedOrgId}
                        creditPayments={creditPayments}
                        creditSales={creditSales}
                        selectedMonth={selectedMonth}
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap">
                    <Button
                      onClick={() => handleOpenOrder(customer)}
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Place Order
                    </Button>
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
                    <Button
                      variant="outline"
                      className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => {
                        const link = `${window.location.origin}/credit-buyer-portal?org=${selectedOrgId}&institution=${encodeURIComponent(customer.institution)}`;
                        navigator.clipboard.writeText(link).then(() => toast.success('Portal link copied! Share this with the institution.'));
                      }}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Share Portal Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Place Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={(open) => { setShowOrderDialog(open); if (!open) setItemSearch(''); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <ClipboardList className="w-5 h-5 inline mr-2 text-blue-600" />
              New Credit Order — {orderCustomer?.institution}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery / Required Date</Label>
                <Input type="date" value={orderDeliveryDate} onChange={e => setOrderDeliveryDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="e.g. urgent, monthly supply" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Order Items *</Label>
                <Button size="sm" onClick={addOrderLine}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>

              {stockItems.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2">No pharmacy stock found. Add items to pharmacy inventory first.</p>
              )}

              {orderLines.length > 0 && (
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input className="pl-9 text-sm" placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                </div>
              )}

              <div className="space-y-3">
                {orderLines.map(line => (
                  <Card key={line.id} className="p-3 bg-slate-50">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Select
                          value={line.sku}
                          onValueChange={val => {
                            const item = stockItems.find(i => i.sku === val);
                            updateOrderLine(line.id, 'sku', val);
                            updateOrderLine(line.id, 'name', item?.name || val);
                            updateOrderLine(line.id, 'price', item?.price || 0);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {filteredStockItems.map(item => (
                              <SelectItem key={item.sku} value={item.sku}>
                                {item.name} <span className="text-xs text-slate-400 ml-1">Rs.{item.price}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20">
                        <Input
                          type="number" min="1" placeholder="Qty"
                          value={line.qty}
                          onChange={e => updateOrderLine(line.id, 'qty', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number" min="0" step="0.01" placeholder="Price"
                          value={line.price}
                          onChange={e => updateOrderLine(line.id, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeOrderLine(line.id)}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </div>
                    {line.name && (
                      <p className="text-xs text-slate-500 mt-1">
                        {line.name} — Subtotal: Rs. {((line.qty || 0) * (line.price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </Card>
                ))}
              </div>

              {orderLines.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3 flex justify-between items-center">
                  <span className="font-medium text-blue-900">Order Total</span>
                  <span className="text-xl font-bold text-blue-900">
                    Rs. {orderLines.reduce((s, l) => s + (l.qty * l.price), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowOrderDialog(false)}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleSubmitOrder}
                disabled={createBuyerPOMutation.isPending || orderLines.length === 0}
              >
                {createBuyerPOMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ThumbsDown className="w-5 h-5" />
              Reject Order — {rejectingPO?.po_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Reason for Rejection</Label>
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Items out of stock, pricing issue, order incomplete..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={rejectPOMutation.isPending}
                onClick={() => rejectPOMutation.mutate({ po: rejectingPO, reason: rejectionReason })}
              >
                {rejectPOMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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