import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Package, ShoppingCart, CreditCard, TrendingUp, Users, Lock, AlertTriangle, ChevronDown, Building2, PackageCheck, RotateCcw, Truck, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import WSProviderDashboard from '@/components/wholesale/WSProviderDashboard.jsx';
import WSProviderProducts from '@/components/wholesale/WSProviderProducts.jsx';
import WSProviderOrders from '@/components/wholesale/WSProviderOrders.jsx';
import WSProviderConnections from '@/components/wholesale/WSProviderConnections.jsx';
import WSProviderCreditAccounts from '@/components/wholesale/WSProviderCreditAccounts.jsx';
import WSProviderPayments from '@/components/wholesale/WSProviderPayments.jsx';
import WSStockAlerts from '@/components/wholesale/WSStockAlerts.jsx';
import WSGoodsReceiving from '@/components/wholesale/WSGoodsReceiving.jsx';
import WSReturns from '@/components/wholesale/WSReturns.jsx';
import WSDeliveryManager from '@/components/wholesale/WSDeliveryManager.jsx';
import WSSupplierMessages from '@/components/wholesale/WSSupplierMessages.jsx';
import { useOrganization } from '@/components/OrganizationProvider';

export default function WholesaleProviderAdmin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const { isPlatformOwner, isDefinitelyPlatformOwner } = useOrganization();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Load ONLY WholesaleProvider records (not Organizations)
  const { data: allProviders = [], isLoading: providerLoading } = useQuery({
    queryKey: ['allWholesaleProviders'],
    queryFn: async () => {
      const all = await base44.entities.WholesaleProvider.list();
      // Strictly filter: must have company_code (required field) — excludes any cross-contaminated data
      return all.filter(p => p.company_code && p.company_name);
    },
    enabled: !!user,
  });

  const isAdmin = isDefinitelyPlatformOwner || isPlatformOwner || user?.role === 'admin' || user?.is_platform_owner;

  // For platform owners: show all providers with a dropdown selector
  // For supplier admins: find their own provider by email
  const myProvider = isAdmin
    ? (allProviders.find(p => p.id === selectedProviderId) || null)
    : allProviders.find(p => p.admin_emails?.includes(user?.email)) || null;

  // Auto-select first provider for platform owners
  useEffect(() => {
    if (isAdmin && allProviders.length > 0 && !selectedProviderId) {
      setSelectedProviderId(allProviders[0].id);
    }
  }, [isAdmin, allProviders, selectedProviderId]);

  if (isLoading || providerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!isAdmin && !myProvider) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="w-12 h-12 text-red-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-900">No Wholesale Provider Account</h1>
          <p className="text-slate-500 mt-2">Your account is not linked to any wholesale provider.</p>
          <p className="text-slate-400 mt-1 text-sm">Contact the platform administrator to set up your wholesale provider profile.</p>
        </div>
      </div>
    );
  }

  if (isAdmin && allProviders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Package className="w-16 h-16 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">No Wholesale Suppliers Yet</h2>
        <p className="text-slate-500">Create wholesale suppliers first from the <strong>Wholesale Platform Admin</strong> page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with provider selector for platform owners */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            {myProvider?.logo_url
              ? <img src={myProvider.logo_url} alt="logo" className="w-12 h-12 rounded-xl object-contain" />
              : <Package className="w-8 h-8 text-white" />
            }
          </div>
          <div className="flex-1 min-w-0">
            {isAdmin ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-indigo-300" />
                  <span className="text-indigo-200 text-xs font-medium uppercase tracking-wide">Platform Owner View — Select Wholesale Company</span>
                </div>
                <Select value={selectedProviderId} onValueChange={(v) => { setSelectedProviderId(v); setActiveTab('dashboard'); }}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white w-full max-w-sm text-base font-bold h-11">
                    <SelectValue placeholder="Select a wholesale company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allProviders.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.company_name}</span>
                          <span className="text-xs text-slate-400 font-mono">({p.company_code})</span>
                          <Badge className={p.status === 'active' ? 'bg-green-100 text-green-700 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                            {p.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {myProvider && (
                  <p className="text-indigo-200 text-sm mt-1">{myProvider.description || 'Wholesale Supplier'} · Code: {myProvider.company_code} · Net {myProvider.payment_terms_days || 30} days</p>
                )}
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-black tracking-tight">{myProvider?.company_name}</h1>
                <p className="text-indigo-200 text-sm">{myProvider?.description || 'Wholesale Supplier'} · Code: {myProvider?.company_code}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {myProvider && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border-2 border-slate-200 p-1 rounded-xl h-auto flex-wrap gap-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" /> Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Buyer Connections
            </TabsTrigger>
            <TabsTrigger value="credit" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Credit Accounts
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="stock_alerts" className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Stock Alerts
            </TabsTrigger>
            <TabsTrigger value="grn" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <PackageCheck className="w-4 h-4" /> Goods Receiving
            </TabsTrigger>
            <TabsTrigger value="delivery" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4" /> Deliveries
            </TabsTrigger>
            <TabsTrigger value="returns" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Returns
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Buyer Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><WSProviderDashboard provider={myProvider} /></TabsContent>
          <TabsContent value="products"><WSProviderProducts provider={myProvider} /></TabsContent>
          <TabsContent value="orders"><WSProviderOrders provider={myProvider} /></TabsContent>
          <TabsContent value="connections"><WSProviderConnections provider={myProvider} /></TabsContent>
          <TabsContent value="credit"><WSProviderCreditAccounts provider={myProvider} /></TabsContent>
          <TabsContent value="payments"><WSProviderPayments provider={myProvider} /></TabsContent>
          <TabsContent value="stock_alerts"><WSStockAlerts provider={myProvider} /></TabsContent>
          <TabsContent value="grn"><WSGoodsReceiving provider={myProvider} /></TabsContent>
          <TabsContent value="delivery"><WSDeliveryManager provider={myProvider} /></TabsContent>
          <TabsContent value="returns"><WSReturns provider={myProvider} /></TabsContent>
          <TabsContent value="messages"><WSSupplierMessages providerId={myProvider?.id} user={user} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}