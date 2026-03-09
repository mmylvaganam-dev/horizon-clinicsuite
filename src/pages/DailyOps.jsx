import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  DollarSign, 
  Package, 
  FileText, 
  AlertTriangle,
  XCircle,
  Building2,
  MapPin
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import { useOrganization } from '@/components/OrganizationProvider';

export default function DailyOps() {
  const { selectedOrgId: contextOrgId, isPlatformOwner } = useOrganization();
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [selectedLocationId, setSelectedLocationId] = useState('all');

  // Non-platform-owners are locked to their own org
  const effectiveOrgId = isPlatformOwner ? selectedOrgId : (contextOrgId || 'all');

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isPlatformOwner,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  // CRITICAL: Include selectedOrgId in query key AND filter parameter to isolate data by org
  const { data: pharmacySales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['pharmacySales', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId || selectedOrgId === 'all') {
        console.log('DailyOps - Fetching ALL orgs sales');
        return base44.entities.PharmacySaleHeader.list();
      }
      console.log('DailyOps - Fetching sales for org:', selectedOrgId);
      const result = await base44.entities.PharmacySaleHeader.filter({ organization_id: selectedOrgId });
      return result;
    },
    staleTime: 30000,
  });

  const { data: pharmacyStock = [], isLoading: loadingStock } = useQuery({
    queryKey: ['pharmacyStock', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId || selectedOrgId === 'all') {
        console.log('DailyOps - Fetching ALL orgs stock');
        return base44.entities.PharmacyStock.list();
      }
      console.log('DailyOps - Fetching stock for org:', selectedOrgId);
      const result = await base44.entities.PharmacyStock.filter({ organization_id: selectedOrgId });
      return result;
    },
    staleTime: 30000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId || selectedOrgId === 'all') {
        console.log('DailyOps - Fetching ALL orgs patients');
        return base44.entities.Patient.list();
      }
      console.log('DailyOps - Fetching patients for org:', selectedOrgId);
      const result = await base44.entities.Patient.filter({ organization_id: selectedOrgId });
      return result;
    },
    staleTime: 30000,
  });

  const filterByOrgAndLocation = (item) => {
    const orgMatch = selectedOrgId === 'all' || item.organization_id === selectedOrgId;
    const locMatch = selectedLocationId === 'all' || item.location_id === selectedLocationId;
    return orgMatch && locMatch;
  };

  const filteredLocations = selectedOrgId === 'all' 
    ? locations 
    : locations.filter(loc => loc.organization_id === selectedOrgId);

  // Today's sales - compare using Colombo date
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const todaySales = pharmacySales.filter(sale => {
    const rawDate = sale.sale_date || sale.created_date;
    if (!rawDate) return false;
    const saleDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(rawDate));
    return saleDate === today && filterByOrgAndLocation(sale);
  });

  const totalSalesAmount = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);

  // Low stock items (below 10 units)
  const lowStockItems = pharmacyStock.filter(stock => 
    (stock.quantity || 0) < 10 && filterByOrgAndLocation(stock)
  );

  // Sales by status
  const salesByStatus = {
    paid: todaySales.filter(s => s.status === 'paid').length,
    void: todaySales.filter(s => s.status === 'void').length,
    refund: todaySales.filter(s => s.status === 'refund').length,
  };

  // Quick metrics
  const totalPatients = patients.filter(filterByOrgAndLocation).length;
  const uniqueCustomersToday = new Set(todaySales.map(s => s.patient_ref)).size;

  const isLoading = loadingSales || loadingStock;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Operations</h1>
          <p className="text-slate-500 mt-1">Real-time operational metrics and alerts</p>
        </div>
        <PageInfoTooltip
          title="Daily Operations Dashboard"
          description="Monitor all critical operational metrics in one place. Track appointments, unpaid invoices, inventory alerts, lab results, and refunds across your organization in real-time."
          useCases={[
            "Start-of-day operational review",
            "Monitor outstanding tasks and alerts",
            "Track financial metrics (unpaid invoices)",
            "Review critical lab results requiring attention",
            "Check inventory levels and low stock items",
            "Filter by organization and location"
          ]}
          bestPractices={[
            "Review this dashboard at the beginning of each shift",
            "Address critical queue items immediately",
            "Follow up on unpaid invoices daily",
            "Monitor low stock items and reorder promptly",
            "Use filters to focus on specific locations",
            "Share urgent alerts with relevant staff"
          ]}
        />
      </div>

      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Building2 className="w-4 h-4 text-slate-400" />
            <Select value={selectedOrgId} onValueChange={(val) => {
              setSelectedOrgId(val);
              setSelectedLocationId('all');
            }}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <MapPin className="w-4 h-4 text-slate-400" />
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {filteredLocations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {Array.from({ length: 8 }).map((_, i) => (
           <Skeleton key={i} className="h-40 rounded-xl" />
         ))}
       </div>
      ) : (
       <>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Today's Sales */}
           <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-medium text-slate-600">Today's Sales</CardTitle>
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                   <DollarSign className="w-5 h-5 text-white" />
                 </div>
               </div>
             </CardHeader>
             <CardContent>
               <p className="text-3xl font-bold text-green-600 mb-2">{todaySales.length}</p>
               <p className="text-lg font-semibold text-slate-900">${totalSalesAmount.toFixed(2)}</p>
               <p className="text-xs text-slate-500 mt-2">transactions</p>
             </CardContent>
           </Card>

           {/* Customers Today */}
           <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-medium text-slate-600">Customers Today</CardTitle>
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                   <Calendar className="w-5 h-5 text-white" />
                 </div>
               </div>
             </CardHeader>
             <CardContent>
               <p className="text-3xl font-bold text-blue-600 mb-2">{uniqueCustomersToday}</p>
               <p className="text-sm text-slate-600">unique customers</p>
             </CardContent>
           </Card>

           {/* Low Stock Items */}
           <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-medium text-slate-600">Low Stock Items</CardTitle>
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                   <Package className="w-5 h-5 text-white" />
                 </div>
               </div>
             </CardHeader>
             <CardContent>
               <p className="text-3xl font-bold text-amber-600 mb-2">{lowStockItems.length}</p>
               <p className="text-sm text-slate-600">Below 10 units</p>
               {lowStockItems.length > 0 && (
                 <div className="mt-3 space-y-1">
                   {lowStockItems.slice(0, 2).map((item, i) => (
                     <div key={i} className="text-xs text-slate-500 flex items-center justify-between">
                       <span className="truncate">{item.display_name || item.brand_name}</span>
                       <Badge variant="outline" className="text-amber-700">{item.quantity || 0}</Badge>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </Card>

           {/* Total Inventory */}
           <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-medium text-slate-600">Inventory Items</CardTitle>
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                   <Package className="w-5 h-5 text-white" />
                 </div>
               </div>
             </CardHeader>
             <CardContent>
               <p className="text-3xl font-bold text-purple-600 mb-2">{pharmacyStock.filter(filterByOrgAndLocation).length}</p>
               <p className="text-sm text-slate-600">Total products in stock</p>
             </CardContent>
           </Card>
         </div>

         {/* Sales Status Breakdown */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {Object.entries(salesByStatus).map(([status, count]) => (
             <Card key={status} className="border-0 shadow-sm">
               <CardHeader className="pb-3">
                 <CardTitle className="text-sm font-medium text-slate-600 capitalize">{status} Transactions</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-2xl font-bold text-slate-900">{count}</p>
               </CardContent>
             </Card>
           ))}
         </div>
       </>
      )}
    </div>
  );
}