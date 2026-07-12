import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingDown, Building2, BarChart3, Globe, Tag, ShoppingCart, Rocket } from 'lucide-react';
import DailyProcurementTab from '@/components/procurement/DailyProcurementTab';
import MedicineAnalyticsTab from '@/components/procurement/MedicineAnalyticsTab';
import SupplierComparisonTab from '@/components/procurement/SupplierComparisonTab';
import NegotiationIntelligenceTab from '@/components/procurement/NegotiationIntelligenceTab';
import MarketPricesTab from '@/components/procurement/MarketPricesTab';
import DealsManagerTab from '@/components/procurement/DealsManagerTab';
import SupplierOnboardingTab from '@/components/procurement/SupplierOnboardingTab';

export default function ProcurementIntelligence() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Procurement Intelligence</h1>
        <p className="text-slate-500 mt-1">
          Track supplier deals, compare wholesale prices across pharmacies, and build negotiation leverage for global supplier partnerships.
        </p>
      </div>

      <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600">
              <strong className="text-slate-900">Strategic Goal:</strong> Use aggregated procurement data across all your pharmacies
              to negotiate better deals with global suppliers, or identify high-volume medicines worth manufacturing locally.
              Every deal (buy 5 get 1 free, bulk discounts, special pricing) is captured at stock receipt and analyzed here.
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="daily">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-auto">
          <TabsTrigger value="daily" className="flex flex-col items-center gap-1 py-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs">Daily</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 py-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">Medicine Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex flex-col items-center gap-1 py-2">
            <Building2 className="w-4 h-4" />
            <span className="text-xs">Supplier Compare</span>
          </TabsTrigger>
          <TabsTrigger value="negotiation" className="flex flex-col items-center gap-1 py-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs">Negotiation</span>
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex flex-col items-center gap-1 py-2">
            <Tag className="w-4 h-4" />
            <span className="text-xs">Deal Presets</span>
          </TabsTrigger>
          <TabsTrigger value="market" className="flex flex-col items-center gap-1 py-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs">Market Prices</span>
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="flex flex-col items-center gap-1 py-2">
            <Rocket className="w-4 h-4" />
            <span className="text-xs">Supplier Onboarding</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily"><DailyProcurementTab /></TabsContent>
        <TabsContent value="analytics"><MedicineAnalyticsTab /></TabsContent>
        <TabsContent value="suppliers"><SupplierComparisonTab /></TabsContent>
        <TabsContent value="negotiation"><NegotiationIntelligenceTab /></TabsContent>
        <TabsContent value="deals"><DealsManagerTab /></TabsContent>
        <TabsContent value="market"><MarketPricesTab /></TabsContent>
        <TabsContent value="onboarding"><SupplierOnboardingTab /></TabsContent>
      </Tabs>
    </div>
  );
}