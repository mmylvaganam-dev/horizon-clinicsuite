import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Package, ShoppingCart, CreditCard, TrendingUp, Users, Lock, AlertTriangle } from 'lucide-react';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import { Card, CardContent } from '@/components/ui/card';
import WSProviderDashboard from '@/components/wholesale/WSProviderDashboard.jsx';
import WSProviderProducts from '@/components/wholesale/WSProviderProducts.jsx';
import WSProviderOrders from '@/components/wholesale/WSProviderOrders.jsx';
import WSProviderConnections from '@/components/wholesale/WSProviderConnections.jsx';
import WSProviderCreditAccounts from '@/components/wholesale/WSProviderCreditAccounts.jsx';
import WSProviderPayments from '@/components/wholesale/WSProviderPayments.jsx';
import WSStockAlerts from '@/components/wholesale/WSStockAlerts.jsx';

export default function WholesaleProviderAdmin() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Find the wholesale provider this user belongs to
  const { data: myProvider, isLoading: providerLoading } = useQuery({
    queryKey: ['myWholesaleProvider', user?.email],
    queryFn: async () => {
      const all = await base44.entities.WholesaleProvider.filter({ status: 'active' });
      return all.find(p => p.admin_emails?.includes(user?.email)) || null;
    },
    enabled: !!user,
  });

  if (isLoading || providerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!myProvider) {
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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-center gap-4">
          {myProvider.logo_url ? (
            <img src={myProvider.logo_url} alt="logo" className="w-14 h-14 rounded-xl object-contain bg-white/20 p-1" />
          ) : (
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="flex items-start gap-3 flex-1">
            <div>
              <h1 className="text-3xl font-black tracking-tight">{myProvider.company_name}</h1>
              <p className="text-indigo-200 text-sm">{myProvider.description || 'Wholesale Supplier'} · Code: {myProvider.company_code}</p>
            </div>
            <PageInfoTooltip
              title="My Supplier Portal"
              description="As a wholesale supplier, manage your product catalog, process incoming orders from retail pharmacies, manage buyer connections, credit accounts, and payments."
              useCases={[
                "Products: Add, edit, or deactivate products in your wholesale catalog",
                "Orders: Review and process incoming orders from connected retail pharmacies",
                "Buyer Connections: Approve or reject connection requests from retail pharmacies",
                "Credit Accounts: View outstanding balances per buyer and payment history",
                "Payments: Record payments received and manage cheque clearance status",
                "Stock Alerts: Monitor products falling below reorder levels"
              ]}
              bestPractices={[
                "Keep product prices and availability up to date to avoid rejected orders",
                "Process orders within 24 hours — buyers see status in real-time",
                "Use cheque image upload when recording payments for audit trail",
                "Review Stock Alerts daily to prevent stockouts"
              ]}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border-2 border-slate-200 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" /> My Products
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
        </TabsList>

        <TabsContent value="dashboard"><WSProviderDashboard provider={myProvider} /></TabsContent>
        <TabsContent value="products"><WSProviderProducts provider={myProvider} /></TabsContent>
        <TabsContent value="orders"><WSProviderOrders provider={myProvider} /></TabsContent>
        <TabsContent value="connections"><WSProviderConnections provider={myProvider} /></TabsContent>
        <TabsContent value="credit"><WSProviderCreditAccounts provider={myProvider} /></TabsContent>
        <TabsContent value="payments"><WSProviderPayments provider={myProvider} /></TabsContent>
        <TabsContent value="stock_alerts"><WSStockAlerts provider={myProvider} /></TabsContent>
      </Tabs>
    </div>
  );
}