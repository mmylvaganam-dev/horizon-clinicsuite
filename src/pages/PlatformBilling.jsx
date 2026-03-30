import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  FileText, 
  Building2, 
  Lock,
  Plus,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PlatformBilling() {
  const queryClient = useQueryClient();
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // CRITICAL: Platform owner status is based ONLY on email
  const isPlatformOwner = user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
    user?.email === 'mylvaganam@premierhealthcanada.ca' ||
    user?.is_platform_owner === true;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
    enabled: isPlatformOwner,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isPlatformOwner,
  });

  const { data: pricingModels = [] } = useQuery({
    queryKey: ['pricingModels'],
    queryFn: () => base44.entities.PlatformPricingModel.list(),
    enabled: isPlatformOwner,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.PlatformSubscription.list('-created_date'),
    enabled: isPlatformOwner,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.PlatformInvoice.list('-created_date'),
    enabled: isPlatformOwner,
  });

  const { data: moduleAccess = [] } = useQuery({
    queryKey: ['moduleAccess'],
    queryFn: () => base44.entities.OrganizationModuleAccess.list(),
    enabled: isPlatformOwner,
  });

  const { data: usageLogs = [] } = useQuery({
    queryKey: ['usageLogs'],
    queryFn: () => base44.entities.PlatformUsageLog.list('-log_date', 1000),
    enabled: isPlatformOwner,
  });

  if (user && !isPlatformOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Platform Owner Only</h2>
          <p className="text-slate-600">This billing system is only accessible to platform owners.</p>
        </Card>
      </div>
    );
  }

  const generateInvoiceMutation = useMutation({
    mutationFn: async (subscription) => {
      const company = companies.find(c => c.id === subscription.company_id);
      if (!company) {
        throw new Error('Company not found');
      }
      const pricingModel = pricingModels.find(p => p.id === subscription.pricing_model_id);
      if (!pricingModel) {
        throw new Error('Pricing model not found');
      }
      const companyOrgs = organizations.filter(o => o.company_id === subscription.company_id);
      
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Calculate fees
      const baseFee = pricingModel.base_company_fee || 0;
      const orgFees = (pricingModel.per_organization_fee || 0) * companyOrgs.length;
      
      // Module fees
      const enabledModules = moduleAccess.filter(ma => 
        companyOrgs.some(org => org.id === ma.organization_id) && ma.is_enabled
      );
      let moduleFees = 0;
      if (pricingModel.module_pricing) {
        const modulePricing = JSON.parse(pricingModel.module_pricing);
        enabledModules.forEach(mod => {
          moduleFees += modulePricing[mod.module_code] || 0;
        });
      }
      
      // Volume fees
      const companyUsage = usageLogs.filter(log => 
        log.company_id === subscription.company_id &&
        new Date(log.log_date) >= periodStart &&
        new Date(log.log_date) <= periodEnd
      );
      const totalVolume = companyUsage.reduce((sum, log) => sum + (log.metric_count || 0), 0);
      let volumeFees = 0;
      if (pricingModel.volume_pricing_tiers) {
        const tiers = JSON.parse(pricingModel.volume_pricing_tiers);
        const tier = tiers.find(t => totalVolume >= t.min && totalVolume <= (t.max || Infinity));
        if (tier) {
          volumeFees = totalVolume * (tier.rate || 0);
        }
      }
      
      const subtotal = baseFee + orgFees + moduleFees + volumeFees;
      const discountAmount = subtotal * ((subscription.custom_discount_percent || 0) / 100);
      const taxAmount = 0; // Implement tax logic if needed
      const totalAmount = subtotal - discountAmount + taxAmount;
      
      const lineItems = [
        { description: 'Base Company Fee', quantity: 1, unit_price: baseFee, amount: baseFee },
        { description: `Organizations (${companyOrgs.length})`, quantity: companyOrgs.length, unit_price: pricingModel.per_organization_fee || 0, amount: orgFees },
        { description: `Modules (${enabledModules.length})`, quantity: enabledModules.length, unit_price: moduleFees / (enabledModules.length || 1), amount: moduleFees },
        { description: `Volume Usage (${totalVolume} transactions)`, quantity: totalVolume, unit_price: volumeFees / (totalVolume || 1), amount: volumeFees }
      ];
      
      const invoiceNumber = `INV-${Date.now()}`;
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);
      
      const invoice = await base44.entities.PlatformInvoice.create({
        invoice_number: invoiceNumber,
        company_id: subscription.company_id,
        company_name: subscription.company_name,
        subscription_id: subscription.id,
        invoice_date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        billing_period_start: periodStart.toISOString().split('T')[0],
        billing_period_end: periodEnd.toISOString().split('T')[0],
        currency: pricingModel.currency,
        base_fee: baseFee,
        organization_fees: orgFees,
        module_fees: moduleFees,
        volume_fees: volumeFees,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        line_items: JSON.stringify(lineItems),
        usage_summary: JSON.stringify({ totalVolume, enabledModules: enabledModules.length, organizations: companyOrgs.length }),
        status: 'draft',
        generated_by: user.id
      });
      
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      toast.success('Invoice generated successfully');
      setShowInvoiceDialog(false);
    },
  });

  const getCompanyStats = (companyId) => {
    const companyOrgs = organizations.filter(o => o.company_id === companyId);
    const sub = subscriptions.find(s => s.company_id === companyId);
    const companyInvoices = invoices.filter(i => i.company_id === companyId);
    const totalBilled = companyInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const unpaidInvoices = companyInvoices.filter(i => i.status !== 'paid');
    
    return {
      organizations: companyOrgs.length,
      subscription: sub,
      totalBilled,
      unpaidInvoices: unpaidInvoices.length
    };
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'overdue': return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'sent': return <Send className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Platform Billing</h1>
          <p className="text-slate-600 mt-2">Manage customer subscriptions and invoicing</p>
        </div>
        <Button onClick={() => setShowPricingDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Pricing Model
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Companies</p>
                <p className="text-2xl font-bold text-slate-900">{companies.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-slate-900">
                  {subscriptions.filter(s => s.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Invoices</p>
                <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Companies & Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Models</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <div className="grid gap-4">
            {companies.map(company => {
              const stats = getCompanyStats(company.id);
              return (
                <Card key={company.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{company.company_legal_name || company.company_name}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          {stats.organizations} organizations • Total billed: ${stats.totalBilled.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {stats.subscription ? (
                          <Badge className={stats.subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                            {stats.subscription.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Subscription</Badge>
                        )}
                        {stats.unpaidInvoices > 0 && (
                          <Badge variant="destructive">{stats.unpaidInvoices} Unpaid</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {!stats.subscription && (
                        <Button size="sm" onClick={() => {
                          setSelectedCompany(company);
                          setShowSubscriptionDialog(true);
                        }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Subscription
                        </Button>
                      )}
                      {stats.subscription && (
                        <Button size="sm" onClick={() => {
                          setSelectedCompany(company);
                          generateInvoiceMutation.mutate(stats.subscription);
                        }}>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Invoice
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="grid gap-4">
            {invoices.map(invoice => (
              <Card key={invoice.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">{invoice.company_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {getStatusIcon(invoice.status)}
                        <Badge className={
                          invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {invoice.currency} {invoice.total_amount?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Invoice Date</p>
                      <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Due Date</p>
                      <p className="font-medium">{format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Period</p>
                      <p className="font-medium">
                        {format(new Date(invoice.billing_period_start), 'MMM d')} - {format(new Date(invoice.billing_period_end), 'MMM d')}
                      </p>
                    </div>
                    <div>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <div className="grid gap-4">
            {pricingModels.map(model => (
              <Card key={model.id}>
                <CardHeader>
                  <CardTitle>{model.model_name}</CardTitle>
                  <p className="text-sm text-slate-600">
                    {model.country_code} • {model.currency} • {model.billing_cycle}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Base Fee</p>
                      <p className="font-bold">{model.currency} {model.base_company_fee || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Per Organization</p>
                      <p className="font-bold">{model.currency} {model.per_organization_fee || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Status</p>
                      <Badge className={model.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {model.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subscription for {selectedCompany?.company_legal_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Pricing Model</label>
              <Select onValueChange={(value) => {
                const model = pricingModels.find(p => p.id === value);
                if (model && selectedCompany) {
                  base44.entities.PlatformSubscription.create({
                    company_id: selectedCompany.id,
                    company_name: selectedCompany.company_legal_name,
                    pricing_model_id: model.id,
                    pricing_model_name: model.model_name,
                    status: 'active',
                    start_date: new Date().toISOString().split('T')[0],
                    billing_cycle: model.billing_cycle,
                    currency: model.currency,
                    custom_discount_percent: 0
                  }).then(() => {
                    queryClient.invalidateQueries(['subscriptions']);
                    setShowSubscriptionDialog(false);
                    setSelectedCompany(null);
                    toast.success('Subscription created');
                  });
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing model..." />
                </SelectTrigger>
                <SelectContent>
                  {pricingModels.filter(p => p.is_active).map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.model_name} - {model.currency} {model.base_company_fee} ({model.billing_cycle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}