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

export default function DailyOps() {
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [selectedLocationId, setSelectedLocationId] = useState('all');

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: pharmacySales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['pharmacySales'],
    queryFn: () => base44.entities.PharmacySaleHeader.list(),
  });

  const { data: pharmacyStock = [], isLoading: loadingStock } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const filterByOrgAndLocation = (item) => {
    const orgMatch = selectedOrgId === 'all' || item.organization_id === selectedOrgId;
    const locMatch = selectedLocationId === 'all' || item.location_id === selectedLocationId;
    return orgMatch && locMatch;
  };

  const filteredLocations = selectedOrgId === 'all' 
    ? locations 
    : locations.filter(loc => loc.organization_id === selectedOrgId);

  // Today's sales
  const today = new Date().toISOString().split('T')[0];
  const todaySales = pharmacySales.filter(sale => {
    const saleDate = sale.sale_date ? sale.sale_date.split('T')[0] : sale.created_date?.split('T')[0];
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Appointments Today */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Appointments Today</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900 mb-4">{todayAppointments.length}</p>
                <div className="space-y-2">
                  {Object.entries(appointmentsByStatus).map(([status, count]) => (
                    count > 0 && (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 capitalize">{status}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unpaid Invoices */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Unpaid Invoices</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-rose-600 mb-2">{unpaidInvoices.length}</p>
                <p className="text-lg font-semibold text-slate-900">
                  ${unpaidAmount.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-2">Total outstanding</p>
              </CardContent>
            </Card>

            {/* Low Stock */}
            <Card className="border-0 shadow-sm">
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
                <p className="text-sm text-slate-600">Items below 10 units</p>
                {lowStockItems.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {lowStockItems.slice(0, 3).map((item, i) => (
                      <div key={i} className="text-xs text-slate-500 flex items-center justify-between">
                        <span className="truncate">{item.item_name || item.sku_code}</span>
                        <Badge variant="outline" className="text-amber-700">{item.on_hand_qty}</Badge>
                      </div>
                    ))}
                    {lowStockItems.length > 3 && (
                      <p className="text-xs text-slate-400 mt-1">+{lowStockItems.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Pending Results */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Pending Results</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600">Entered</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">{enteredResults}</Badge>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600">Reviewed</span>
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-700">{reviewedResults}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Signed (Unreleased)</span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700">{signedUnreleasedResults}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Queue */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Critical Queue</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600 mb-2">{criticalResults.length}</p>
                <p className="text-sm text-slate-600">Unacknowledged critical results</p>
                {criticalResults.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs font-semibold text-red-900">Requires immediate attention</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refunds/Voids Today */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Refunds/Voids Today</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900 mb-2">{todayRefunds.length}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Invoice refunds</span>
                    <Badge variant="outline">{invoiceRefunds.filter(r => {
                      const refundDate = r.created_at?.split('T')[0] || r.created_date?.split('T')[0];
                      return refundDate === today;
                    }).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Sale refunds</span>
                    <Badge variant="outline">{saleRefunds.filter(r => {
                      const refundDate = r.created_at?.split('T')[0] || r.created_date?.split('T')[0];
                      return refundDate === today;
                    }).length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}