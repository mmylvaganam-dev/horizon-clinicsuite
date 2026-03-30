import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, Building2, Link, DollarSign, MessageSquare } from 'lucide-react';
import WSMarketplaceBrowse from '@/components/wholesale/WSMarketplaceBrowse.jsx';
import WSBuyerOrderDetails from '@/components/wholesale/WSBuyerOrderDetails.jsx';
import WSMyConnections from '@/components/wholesale/WSMyConnections.jsx';
import WSBuyerPaymentsOverview from '@/components/wholesale/WSBuyerPaymentsOverview.jsx';
import WSDirectRequest from '@/components/wholesale/WSDirectRequest.jsx';
import { useOrganization } from '@/components/OrganizationProvider';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';

export default function WholesaleMarketplace() {
  const { selectedOrgId } = useOrganization();
  const [activeTab, setActiveTab] = useState('browse');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  // Count pending connections
  const { data: myConnections = [] } = useQuery({
    queryKey: ['wsMyConnections', selectedOrgId],
    queryFn: () => base44.entities.WholesaleConnection.filter({ buyer_organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const activeConnections = myConnections.filter(c => c.status === 'active');
  const pendingConnections = myConnections.filter(c => c.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Building2 className="w-10 h-10" />
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-black">Wholesale Pharma Marketplace</h1>
              <p className="text-indigo-200 text-sm">Browse wholesale suppliers, place bulk orders, and manage your supplier connections</p>
            </div>
            <PageInfoTooltip
              title="Wholesale Pharma Marketplace"
              description="As a retail pharmacy buyer — browse your connected wholesale suppliers, place bulk orders, manage supplier connections, and track payments."
              useCases={[
                "Browse & Order: browse a connected supplier's product catalog and add items to cart",
                "My Orders: track all your wholesale purchase orders and their delivery status",
                "My Suppliers: view and manage your wholesale supplier connections and credit balances",
                "Payments: view all payments submitted to suppliers and track cheque status"
              ]}
              bestPractices={[
                "Connect to a supplier first from the My Suppliers tab before you can order",
                "Check your credit balance before placing a large order",
                "Submit payment via the Payments tab — include cheque image for faster clearance",
                "View Account Statement from My Suppliers to see outstanding balance"
              ]}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-indigo-200">Active Suppliers</p>
            <p className="font-black text-xl">{activeConnections.length}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-indigo-200">Pending Approvals</p>
            <p className="font-black text-xl text-yellow-300">{pendingConnections.length}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border-2 border-slate-200 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="browse" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" /> Browse & Order
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Truck className="w-4 h-4" /> My Orders
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <Link className="w-4 h-4" /> My Suppliers
            {pendingConnections.length > 0 && (
              <span className="ml-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full px-1.5">{pendingConnections.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="request" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Request Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse"><WSMarketplaceBrowse orgId={selectedOrgId} user={user} connections={myConnections} /></TabsContent>
        <TabsContent value="orders"><WSBuyerOrderDetails orgId={selectedOrgId} /></TabsContent>
        <TabsContent value="connections"><WSMyConnections orgId={selectedOrgId} connections={myConnections} /></TabsContent>
        <TabsContent value="payments"><WSBuyerPaymentsOverview orgId={selectedOrgId} connections={activeConnections} user={user} /></TabsContent>
        <TabsContent value="request"><WSDirectRequest orgId={selectedOrgId} user={user} connections={myConnections} /></TabsContent>
      </Tabs>
    </div>
  );
}