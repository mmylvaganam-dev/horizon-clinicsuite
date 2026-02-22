import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, Users, CreditCard, BarChart3, Lock, TrendingUp, AlertTriangle } from 'lucide-react';
import WSProductCatalog from '@/components/wholesale/WSProductCatalog';
import WSOrders from '@/components/wholesale/WSOrders';
import WSCreditAccounts from '@/components/wholesale/WSCreditAccounts';
import WSPayments from '@/components/wholesale/WSPayments';
import WSDashboard from '@/components/wholesale/WSDashboard';
import WSCompanyInfoBar from '@/components/wholesale/WSCompanyInfoBar';

// PLATFORM OWNER ONLY — these emails can access Premier Wholesale
const WHOLESALE_ADMINS = [
  'mmylvaganam@premierhealthcanada.ca',
  'mylvaganam@premierhealthcanada.ca',
];

export default function PremierWholesale() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const isAllowed = WHOLESALE_ADMINS.includes(user?.email) || user?.email === user?.email && false;

  // Check access: only platform owner + assigned users
  if (!WHOLESALE_ADMINS.includes(user?.email)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="w-12 h-12 text-red-600" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900">Restricted Access</h1>
          <p className="text-slate-500 mt-2 text-lg">Premier Wholesale Pharma is a private module.</p>
          <p className="text-slate-400 mt-1">Contact the platform owner to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Premier Wholesale Pharma</h1>
                <p className="text-indigo-200 text-sm font-medium">Medicines • Medical Equipment • Surgical Supplies — A to Z</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/30 rounded-xl px-4 py-2">
            <Lock className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-bold text-yellow-200">PLATFORM OWNER ONLY</span>
          </div>
        </div>
        <p className="text-indigo-200 mt-3 text-sm max-w-2xl">
          Central wholesale hub — supply medicines and equipment to all pharmacies and clinics on the platform. 
          Control pricing, manage orders, extend credit, and monitor every supply chain transaction across the country.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="bg-white border-2 border-slate-200 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="catalog" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" /> Product Catalog
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="credit" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Credit Accounts
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><WSDashboard /></TabsContent>
        <TabsContent value="catalog"><WSProductCatalog /></TabsContent>
        <TabsContent value="orders"><WSOrders /></TabsContent>
        <TabsContent value="credit"><WSCreditAccounts /></TabsContent>
        <TabsContent value="payments"><WSPayments /></TabsContent>
      </Tabs>
    </div>
  );
}