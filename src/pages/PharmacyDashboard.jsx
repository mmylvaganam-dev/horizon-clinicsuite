import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  FileText,
  RefreshCw,
  Calendar,
  Search,
  Filter,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCw
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MedicineReturnDialog from '../components/pharmacy/MedicineReturnDialog';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [easyView, setEasyView] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { orgFilter, selectedOrgId } = useOrgFiltered();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['pharmacySaleHeaders', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.PharmacySaleHeader.filter(orgFilter, '-sale_date');
    },
    enabled: !!selectedOrgId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.Patient.filter(orgFilter);
    },
    enabled: !!selectedOrgId,
  });

  const { data: pharmacyStock = [], isLoading: stockLoading } = useQuery({
    queryKey: ['pharmacyStock', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      console.log('PharmacyDashboard - Fetching stock for org:', selectedOrgId);
      const result = await base44.entities.PharmacyStock.filter(orgFilter, '-created_date');
      console.log('PharmacyDashboard - Got stock:', result.length, 'items');
      return result;
    },
    enabled: !!selectedOrgId,
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['pharmacyReceipts', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.PharmacyReceipt.filter(orgFilter);
    },
    enabled: !!selectedOrgId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.CompanyProfile.filter(orgFilter);
    },
    enabled: !!selectedOrgId,
  });

  const { data: saleLines = [] } = useQuery({
    queryKey: ['pharmacySaleLines', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.PharmacySaleLine.filter(orgFilter);
    },
    enabled: !!selectedOrgId,
  });

  const currency = companies && companies.length > 0 ? (companies[0]?.base_currency || 'LKR') : 'LKR';

  const getPatientName = (patientRef) => {
    if (!patientRef) return 'Walk-in Customer';
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getReceiptNumber = (sale) => {
    return sale?.sale_number || 'N/A';
  };

  // Filter sales by date and search
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59);

    const dateMatch = saleDate >= fromDate && saleDate <= toDate;
    
    const searchMatch = searchQuery === '' || 
      getPatientName(sale.patient_ref).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getReceiptNumber(sale).toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatch = statusFilter === 'all' || sale.status === statusFilter;
    
    const amountMatch = (!minAmount || (sale.total || 0) >= parseFloat(minAmount)) &&
                        (!maxAmount || (sale.total || 0) <= parseFloat(maxAmount));

    return dateMatch && searchMatch && statusMatch && amountMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  // Stats
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.sale_date);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString() && (s.status === 'paid' || s.status === 'completed');
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  
  const lowStockCount = pharmacyStock.filter(item => 
    item.quantity <= 10 && item.quality_status === 'usable'
  ).length;

  const expiredCount = pharmacyStock.filter(item =>
    item.expire_date && new Date(item.expire_date) < new Date()
  ).length;

  const statusColors = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    refund: 'bg-amber-100 text-amber-700 border-amber-200',
    void: 'bg-rose-100 text-rose-700 border-rose-200'
  };

  const handleViewDetails = (sale) => {
    const items = saleLines.filter(line => line.sale_header_id === sale.id);
    setSelectedSale({ ...sale, items });
    setShowDetailsDialog(true);
  };

  const handleReprintInvoice = async (sale) => {
    try {
      const response = await base44.functions.invoke('generatePharmacyInvoice', { saleId: sale.id });
      const printWindow = window.open('', '_blank');
      printWindow.document.write(response.data);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error('Reprint failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Dashboard</h1>
          <p className="text-slate-500 mt-1">Sales, orders, and inventory management</p>
        </div>
      </div>

      {/* Stats Cards - Sales & Operations */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Sales & Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all"
            onClick={() => navigate(createPageUrl('TodaySalesDetails'))}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ShoppingCart className="w-8 h-8 opacity-80" />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl('TodaySalesDetails'));
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    View All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl('PharmacyBilling'));
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    New Sale
                  </Button>
                </div>
              </div>
              <p className="text-sm opacity-90">Today's Sales</p>
              <p className="text-3xl font-bold mt-1">{todaySales.length} Sales</p>
              <p className="text-lg font-semibold mt-1">{currency} {todayRevenue.toFixed(2)}</p>
              
              {todaySales.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20 space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-white/10">
                  {todaySales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="text-xs bg-white/10 rounded p-2 hover:bg-white/20 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold">{getPatientName(sale.patient_ref)}</span>
                        <span className="font-bold">{currency} {sale.total?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-white/80">
                        <span>{format(new Date(sale.sale_date), 'hh:mm a')}</span>
                        <span>{sale.created_by?.split('@')[0] || 'Staff'}</span>
                      </div>
                    </div>
                  ))}
                  {todaySales.length > 5 && (
                    <div className="text-center pt-2">
                      <span className="text-xs text-white/60">+{todaySales.length - 5} more sales</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(createPageUrl('PharmacyInventory'))}
          >
            <CardContent className="p-6">
              <Package className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-sm opacity-90">Stock Items</p>
              <p className="text-3xl font-bold mt-1">{pharmacyStock.length}</p>
              <p className="text-xs opacity-80 mt-1">Total inventory</p>
            </CardContent>
          </Card>

          <Card 
            className={`bg-gradient-to-br ${lowStockCount > 0 ? 'from-amber-500 to-amber-600' : 'from-slate-500 to-slate-600'} text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform`}
            onClick={() => navigate(createPageUrl('PharmacyInventory'))}
          >
            <CardContent className="p-6">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-sm opacity-90">Low Stock</p>
              <p className="text-3xl font-bold mt-1">{lowStockCount}</p>
              <p className="text-xs opacity-80 mt-1">Items need reorder</p>
            </CardContent>
          </Card>

          <Card 
            className={`bg-gradient-to-br ${expiredCount > 0 ? 'from-rose-500 to-rose-600' : 'from-slate-500 to-slate-600'} text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform`}
            onClick={() => navigate(createPageUrl('PharmacyInventory'))}
          >
            <CardContent className="p-6">
              <Calendar className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-sm opacity-90">Expired Items</p>
              <p className="text-3xl font-bold mt-1">{expiredCount}</p>
              <p className="text-xs opacity-80 mt-1">Remove from stock</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(createPageUrl('PharmacyInventory'))}
          >
            <CardContent className="p-6">
              <div className="w-8 h-8 mb-2 opacity-80 flex items-center justify-center font-bold text-lg">{currency}</div>
              <p className="text-sm opacity-90">Total Stock Value</p>
              <p className="text-3xl font-bold mt-1">{currency} {pharmacyStock.reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0).toFixed(2)}</p>
              <p className="text-xs opacity-80 mt-1">Current inventory cost</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(createPageUrl('PharmacyInventory'))}
          >
            <CardContent className="p-6">
              <div className="w-8 h-8 mb-2 opacity-80 flex items-center justify-center font-bold text-lg">{currency}</div>
              <p className="text-sm opacity-90">Potential Revenue</p>
              <p className="text-3xl font-bold mt-1">{currency} {pharmacyStock.reduce((sum, item) => sum + ((item.mrp || 0) * (item.quantity || 0)), 0).toFixed(2)}</p>
              <p className="text-xs opacity-80 mt-1">If all sold at MRP</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(createPageUrl('PharmacyInventory'))}
          >
            <CardContent className="p-6">
              <div className="w-8 h-8 mb-2 opacity-80 flex items-center justify-center font-bold text-lg">{currency}</div>
              <p className="text-sm opacity-90">Potential Profit</p>
              <p className="text-3xl font-bold mt-1">{currency} {(pharmacyStock.reduce((sum, item) => sum + ((item.mrp || 0) * (item.quantity || 0)), 0) - pharmacyStock.reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0)).toFixed(2)}</p>
              <p className="text-xs opacity-80 mt-1">Expected profit margin</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Card className="border-0 shadow-lg">
        <Tabs defaultValue="salesforce" className="w-full">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3">
            <TabsList className="bg-transparent border-b border-white/20 w-full justify-start rounded-none">
              <TabsTrigger value="salesforce" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Salesforce
              </TabsTrigger>
              <TabsTrigger value="order" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Order
              </TabsTrigger>
              <TabsTrigger value="stock" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Stock
              </TabsTrigger>
              <TabsTrigger value="stock-taking" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Stock Taking
              </TabsTrigger>
              <TabsTrigger value="bill-card" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Bill Card
              </TabsTrigger>
              <TabsTrigger value="refund" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Refund
              </TabsTrigger>
              <TabsTrigger value="med-return" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Med. Return
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-6">
            <TabsContent value="salesforce" className="mt-0 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by name or receipt..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                  className={showAdvancedFilter ? 'bg-indigo-50 border-indigo-300' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filter
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEasyView(!easyView)}
                  className={easyView ? 'bg-indigo-50 border-indigo-300' : ''}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Easy View
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilter && (
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="refund">Refund</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Min Amount</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={minAmount}
                          onChange={(e) => setMinAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Max Amount</label>
                        <Input
                          type="number"
                          placeholder="999999.00"
                          value={maxAmount}
                          onChange={(e) => setMaxAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setStatusFilter('all');
                          setMinAmount('');
                          setMaxAmount('');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sales List */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 border-b px-4 py-3">
                  <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-slate-700">
                    <div className="col-span-2">Date & Time</div>
                    <div className="col-span-2">Receipt #</div>
                    <div className="col-span-3">Customer</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                </div>

                <div className="divide-y">
                  {paginatedSales.length === 0 ? (
                    <div className="p-12 text-center">
                      <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500">No sales found for selected criteria</p>
                    </div>
                  ) : (
                    paginatedSales.map((sale) => (
                      <div key={sale.id} className="px-4 py-4 hover:bg-slate-50 transition-colors">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-slate-900">
                              {sale.sale_date ? format(new Date(sale.sale_date), 'dd MMM, yyyy') : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {sale.sale_date ? format(new Date(sale.sale_date), 'hh:mm a') : 'N/A'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <Badge variant="outline" className="font-mono">
                              {getReceiptNumber(sale)}
                            </Badge>
                          </div>
                          <div className="col-span-3">
                            <p className="text-sm font-medium text-slate-900">
                              {getPatientName(sale.patient_ref)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-lg font-bold text-slate-900">
                              {currency} {sale.total?.toFixed(2)}
                            </p>
                          </div>
                          <div className="col-span-1">
                            <Badge className={statusColors[sale.status]}>
                              {sale.status}
                            </Badge>
                          </div>
                          <div className="col-span-2 flex justify-end gap-2">
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleViewDetails(sale)}
                           >
                             <Eye className="w-3 h-3 mr-1" />
                             View
                           </Button>
                           {(sale.status === 'paid' || sale.status === 'completed') && (
                             <Button 
                               size="sm" 
                               variant="outline" 
                               className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                               onClick={() => {
                                 setSelectedSale(sale);
                                 setShowReturnDialog(true);
                               }}
                             >
                               <RotateCw className="w-3 h-3 mr-1" />
                               Return
                             </Button>
                           )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pagination */}
              {filteredSales.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-slate-600">
                    Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredSales.length)} of {filteredSales.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="order">
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">Order management coming soon</p>
                <Button onClick={() => navigate(createPageUrl('PharmacyPOS'))}>
                  Go to Point of Sale
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="stock">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Stock Overview</h3>
                  <Button onClick={() => navigate(createPageUrl('PharmacyInventory'))}>
                    View Full Inventory
                  </Button>
                </div>
                {pharmacyStock.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 mb-4">No stock items found</p>
                    <Button onClick={() => navigate(createPageUrl('PharmacyStockImport'))}>
                      Import Stock Data
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pharmacyStock.slice(0, 9).map((item) => (
                      <Card key={item.id} className="p-4">
                        <h4 className="font-semibold text-sm">{item.display_name}</h4>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline">{item.barcode}</Badge>
                          <span className="font-bold text-lg">{item.quantity || 0}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {currency} {(item.mrp || 0).toFixed(2)} • {item.quality_status || 'N/A'}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stock-taking">
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">Physical inventory counting</p>
                <Button onClick={() => navigate(createPageUrl('PharmacyStockTaking'))}>
                  Go to Stock Taking
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bill-card">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">Bill card reports and tracking</p>
                <Button onClick={() => navigate(createPageUrl('PharmacyBillCardReports'))}>
                  View Bill Card Reports
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="refund">
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">Refund processing</p>
                <div className="space-y-3 max-w-lg mx-auto">
                 {sales.filter(s => s.status === 'refund').slice(0, 5).map(sale => (
                    <Card key={sale.id} className="p-4 text-left">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{getReceiptNumber(sale)}</p>
                          <p className="text-sm text-slate-500">{getPatientName(sale.patient_ref)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-rose-600">{currency} {sale.total?.toFixed(2)}</p>
                          <Badge className="bg-rose-100 text-rose-700 mt-1">Refunded</Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="med-return">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Medicine Returns</h3>
                  <Button 
                    onClick={() => {
                      setSelectedSale(null);
                      setShowReturnDialog(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    New Return
                  </Button>
                </div>
                
                <Card className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">Click "New Return" to process medicine returns</p>
                  <p className="text-sm text-slate-400">Supports customer refunds and vendor credits</p>
                </Card>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Quick Actions - Standard Workflow */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-blue-200 bg-blue-50"
            onClick={() => navigate(createPageUrl('PharmacyBilling'))}
          >
            <ShoppingCart className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">1. New Sale</h3>
            <p className="text-sm text-slate-600">Point of Sale</p>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-emerald-200 bg-emerald-50"
            onClick={() => navigate(createPageUrl('PharmacyInventory'))}
          >
            <Package className="w-8 h-8 text-emerald-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">2. Check Stock</h3>
            <p className="text-sm text-slate-600">View inventory</p>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-purple-200 bg-purple-50"
            onClick={() => navigate(createPageUrl('PharmacyStockImport'))}
          >
            <FileText className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">3. Import Stock</h3>
            <p className="text-sm text-slate-600">Bulk stock entry</p>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-amber-200 bg-amber-50"
            onClick={() => navigate(createPageUrl('PharmacyOperations'))}
          >
            <TrendingUp className="w-8 h-8 text-amber-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">4. Operations</h3>
            <p className="text-sm text-slate-600">Daily tasks</p>
          </Card>
        </div>
      </div>

      {/* Medicine Return Dialog */}
      <MedicineReturnDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        sale={selectedSale}
        saleItems={selectedSale ? (selectedSale.items || []) : []}
        currency={currency}
        user={user}
      />

      {/* Sale Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">Receipt #</p>
                    <p className="font-semibold">{getReceiptNumber(selectedSale)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Date</p>
                    <p className="font-semibold">{format(new Date(selectedSale.sale_date), 'PPP p')}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Customer</p>
                    <p className="font-semibold">{getPatientName(selectedSale.patient_ref)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Status</p>
                    <Badge className={statusColors[selectedSale.status]}>{selectedSale.status}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-slate-500">Qty: {item.quantity} × {currency} {item.unit_price?.toFixed(2)}</p>
                        </div>
                        <p className="font-bold">{currency} {item.total_price?.toFixed(2)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4">No items found</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{currency} {selectedSale.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span className="font-semibold">{currency} {selectedSale.tax_total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-indigo-600">{currency} {selectedSale.total?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => handleReprintInvoice(selectedSale)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Reprint Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}