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
  RotateCw,
  Trash2,
  Printer
} from 'lucide-react';
import { formatSL } from '@/components/utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MedicineReturnDialog from '../components/pharmacy/MedicineReturnDialog';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(formatSL(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(formatSL(new Date(), 'yyyy-MM-dd'));
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [liveSales, setLiveSales] = useState([]);
  const { orgFilter, selectedOrgId } = useOrgFiltered();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['pharmacySaleHeaders', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) {
        console.log('PharmacyDashboard - No org selected, returning empty sales');
        return [];
      }
      console.log('PharmacyDashboard - Fetching sales for org:', selectedOrgId);
      const allSales = await base44.entities.PharmacySaleHeader.filter(orgFilter, '-sale_date');
      console.log('PharmacyDashboard - Got sales:', allSales.length, 'for org:', selectedOrgId);
      return allSales;
    },
    enabled: !!selectedOrgId,
    // CRITICAL: Refetch immediately when org changes, don't use stale cache
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Real-time subscription to catch new sales immediately
  React.useEffect(() => {
    if (!selectedOrgId) return;
    
    const unsubscribe = base44.entities.PharmacySaleHeader.subscribe((event) => {
      // CRITICAL: Only invalidate if event belongs to this org, ignore other orgs
      if (event.data?.organization_id === selectedOrgId) {
        console.log('📊 Real-time sale update:', event.type, event.data.sale_number, 'org:', event.data.organization_id);
        queryClient.invalidateQueries({ queryKey: ['pharmacySaleHeaders', selectedOrgId] });
        queryClient.invalidateQueries({ queryKey: ['pharmacySaleLines', selectedOrgId] });
      } else {
        console.log('⚠️ Ignoring event for different org:', event.data?.organization_id, 'current:', selectedOrgId);
      }
    });
    
    return unsubscribe;
  }, [selectedOrgId, queryClient]);

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
      // Fetch all lines then filter in-memory by matching sale headers (org-scoped via sales query)
      // This handles both old records (no org_id) and new records (with org_id)
      return base44.entities.PharmacySaleLine.list('-created_date', 1000);
    },
    enabled: !!selectedOrgId,
  });

  const currency = companies && companies.length > 0 ? (companies[0]?.base_currency || 'LKR') : 'LKR';

  const fmt = (amount) => (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  // Profit calculation helpers
  // Uses unit_cost saved at time of sale (new lines), falls back to current stock cost
  const getSaleProfit = (saleId) => {
    const lines = saleLines.filter(l => l.sale_header_id === saleId);
    return lines.reduce((sum, line) => {
      const costPerUnit = line.unit_cost > 0
        ? line.unit_cost
        : (pharmacyStock.find(s => s.id === line.stock_id)?.unit_cost || 0);
      const cost = costPerUnit * (line.qty || 0);
      return sum + ((line.line_total || 0) - cost);
    }, 0);
  };

  const filteredProfit = filteredSales
    .filter(s => s.status === 'paid' || s.status === 'completed')
    .reduce((sum, s) => sum + getSaleProfit(s.id), 0);

  const filteredRevenue = filteredSales
    .filter(s => s.status === 'paid' || s.status === 'completed')
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const profitMarginPct = filteredRevenue > 0
    ? ((filteredProfit / filteredRevenue) * 100).toFixed(1)
    : '0.0';

  // Stats
  const todaySales = sales.filter(s => {
    if (!s.sale_date) return false;
    const todayStr = formatSL(new Date(), 'yyyy-MM-dd');
    const saleDateStr = formatSL(new Date(s.sale_date), 'yyyy-MM-dd');
    return saleDateStr === todayStr;
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const todayProfit = todaySales
    .filter(s => s.status === 'paid' || s.status === 'completed')
    .reduce((sum, s) => sum + getSaleProfit(s.id), 0);
  const todayMargin = todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : '0.0';

  
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

  const handleMedicineReturn = async (sale) => {
    const items = saleLines.filter(line => line.sale_header_id === sale.id);
    console.log('🔵 Opening return dialog with sale:', sale.id, 'items:', items.length);
    console.log('🔵 Items being passed:', items);
    setSelectedSale({ ...sale, items });
    setShowReturnDialog(true);
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;

    try {
      // Get all items from this sale
      const items = saleLines.filter(line => line.sale_header_id === saleToDelete.id);
      
      // Restore stock for each item
      for (const item of items) {
        if (item.stock_id) {
          const stockItem = pharmacyStock.find(s => s.id === item.stock_id);
          if (stockItem) {
            await base44.entities.PharmacyStock.update(item.stock_id, {
              quantity: (stockItem.quantity || 0) + item.qty
            });
          }
        }
      }

      // Mark sale as void
      await base44.entities.PharmacySaleHeader.update(saleToDelete.id, {
        status: 'void',
        notes: (saleToDelete.notes || '') + ` [DELETED on ${new Date().toISOString()} - Stock restored]`
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['pharmacySaleHeaders', selectedOrgId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacyStock', selectedOrgId] });
      
      toast.success('Sale deleted and stock restored');
      setShowDeleteDialog(false);
      setSaleToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete sale');
    }
  };

  const handleReprintInvoice = async (sale) => {
    try {
      const response = await base44.functions.invoke('generatePharmacyInvoice', { saleId: sale.id });
      const htmlContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('Please allow pop-ups to print');
        return;
      }
      
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        toast.success('Invoice ready to print');
      }, 500);
    } catch (error) {
      console.error('Reprint failed:', error);
      toast.error('Failed to generate invoice');
    }
  };

  if (!selectedOrgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="w-8 h-8 mx-auto text-teal-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Loading Pharmacy Dashboard</h2>
          <p className="text-slate-600 text-sm">Please select an organization from the top right</p>
        </Card>
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-700">Sales & Operations</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate(createPageUrl('PharmacyBilling'))} className="bg-indigo-600 hover:bg-indigo-700">
              <ShoppingCart className="w-3 h-3 mr-1" />
              New Sale
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('TodaySalesDetails'))}>
              <Eye className="w-3 h-3 mr-1" />
              Today's Sales ({todaySales.length})
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('PharmacyInventory'))}>
              <Package className="w-3 h-3 mr-1" />
              Stock Items
            </Button>
            {lowStockCount > 0 && (
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => navigate(createPageUrl('PharmacyInventory'))}>
                <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
                Low Stock <Badge className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0">{lowStockCount}</Badge>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { const tab = document.querySelector('[data-value="salesforce"]'); if (tab) tab.click(); }}>
              <FileText className="w-3 h-3 mr-1" />
              Recent Sales
            </Button>
          </div>
        </div>
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
                    title="View all today's sales"
                  >
                    <Eye className="w-3 h-3 mr-1" />
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
                    title="Create a new sale"
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    New Sale
                  </Button>
                </div>
              </div>
              <p className="text-sm opacity-90">Today's Sales</p>
              <p className="text-3xl font-bold mt-1">{todaySales.length} Sales</p>
              <p className="text-lg font-semibold mt-1">{currency} {fmt(todayRevenue)}</p>
              
              {todaySales.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20 space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-white/10">
                  {todaySales.slice(0, 5).map((sale) => {
                    const items = saleLines.filter(line => line.sale_header_id === sale.id);
                    return (
                      <div key={sale.id} className="text-xs bg-white/10 rounded p-2 hover:bg-white/20 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold">{getPatientName(sale.patient_ref)}</span>
                          <span className="font-bold">{currency} {fmt(sale.total)}</span>
                        </div>
                        <div className="flex justify-between items-center text-white/80">
                          <span>{items.length} items • {formatSL(new Date(sale.sale_date), 'h:mm a')}</span>
                          <span>{sale.created_by?.split('@')[0] || 'Staff'}</span>
                        </div>
                      </div>
                    );
                  })}
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
              <p className="text-3xl font-bold mt-1">{currency} {fmt(pharmacyStock.reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0))}</p>
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
              <p className="text-3xl font-bold mt-1">{currency} {fmt(pharmacyStock.reduce((sum, item) => sum + ((item.mrp || 0) * (item.quantity || 0)), 0))}</p>
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
              <p className="text-3xl font-bold mt-1">{currency} {fmt(pharmacyStock.reduce((sum, item) => sum + ((item.mrp || 0) * (item.quantity || 0)), 0) - pharmacyStock.reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0))}</p>
              <p className="text-xs opacity-80 mt-1">Expected profit margin</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-8 h-8 mb-2 opacity-80 flex items-center justify-center font-bold text-lg">%</div>
              <p className="text-sm opacity-90">Today's Gross Profit</p>
              <p className="text-3xl font-bold mt-1">{currency} {fmt(todayProfit)}</p>
              <p className="text-xs opacity-80 mt-1">Margin: {todayMargin}% on today's sales</p>
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
                Recent Sales
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
                  title="Filter by status, amount range"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filter
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEasyView(!easyView)}
                  className={easyView ? 'bg-indigo-50 border-indigo-300' : ''}
                  title="Toggle simplified view"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Easy View
                </Button>
                <Button variant="outline" title="Export sales data to Excel">
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

              {/* Filtered Summary Bar */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-indigo-700 font-medium">Sales:</span>
                  <span className="text-sm font-bold text-indigo-900">{filteredSales.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 font-medium">Revenue:</span>
                  <span className="text-sm font-bold text-emerald-900">
                    {currency} {fmt(filteredRevenue)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-100 rounded-md px-3 py-1 border border-emerald-300">
                  <span className="text-sm text-emerald-700 font-medium">Gross Profit:</span>
                  <span className="text-sm font-bold text-emerald-900">{currency} {fmt(filteredProfit)}</span>
                  <span className="text-xs bg-emerald-700 text-white rounded-full px-2 py-0.5 font-bold">{profitMarginPct}%</span>
                </div>
                {filteredSales.filter(s => s.status === 'refund' || s.status === 'void').length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-rose-500 font-medium">Void/Refund:</span>
                    <span className="text-sm font-bold text-rose-700">
                      {currency} {fmt(filteredSales.filter(s => s.status === 'refund' || s.status === 'void').reduce((sum, s) => sum + (s.total || 0), 0))}
                    </span>
                  </div>
                )}
              </div>

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
                              {sale.sale_date ? formatSL(new Date(sale.sale_date), 'dd/MM/yyyy') : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {sale.sale_date ? formatSL(new Date(sale.sale_date), 'h:mm a') : 'N/A'}
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
                              {currency} {fmt(sale.total)}
                            </p>
                          </div>
                          <div className="col-span-1">
                            <Badge className={statusColors[sale.status]}>
                              {sale.status}
                            </Badge>
                          </div>
                          <div className="col-span-2 flex justify-end gap-1">
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleViewDetails(sale)}
                             title="View sale details and items"
                           >
                             <Eye className="w-3 h-3 mr-1" />
                             View
                           </Button>
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleReprintInvoice(sale)}
                             title="Print invoice"
                           >
                             <Printer className="w-3 h-3 mr-1" />
                             Print
                           </Button>
                           {(sale.status === 'paid' || sale.status === 'completed') && (
                             <>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                 onClick={() => handleMedicineReturn(sale)}
                                 title="Return items from this sale"
                               >
                                 <RotateCw className="w-3 h-3 mr-1" />
                                 Return
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                 onClick={() => {
                                   setSaleToDelete(sale);
                                   setShowDeleteDialog(true);
                                 }}
                                 title="Delete sale and restore stock"
                               >
                                 <Trash2 className="w-3 h-3 mr-1" />
                                 Delete
                               </Button>
                             </>
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
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pending Refunds</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-rose-50 border-rose-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-rose-600 mb-1">Awaiting Refund</p>
                      <p className="text-2xl font-bold text-rose-700">
                        {sales.filter(s => s.status === 'refund').length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-amber-600 mb-1">Refund Amount</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {currency} {fmt(sales.filter(s => s.status === 'refund').reduce((sum, s) => sum + (s.total || 0), 0))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-600 mb-1">Avg. Refund</p>
                      <p className="text-2xl font-bold text-slate-700">
                        {currency} {fmt(sales.filter(s => s.status === 'refund').length > 0 ? (sales.filter(s => s.status === 'refund').reduce((sum, s) => sum + (s.total || 0), 0) / sales.filter(s => s.status === 'refund').length) : 0)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {sales.filter(s => s.status === 'refund').length === 0 ? (
                  <Card className="p-12 text-center">
                    <RefreshCw className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No pending refunds</p>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sales.filter(s => s.status === 'refund').map(sale => (
                      <Card key={sale.id} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{getReceiptNumber(sale)}</p>
                            <p className="text-sm text-slate-500">{getPatientName(sale.patient_ref)} • {formatSL(new Date(sale.sale_date), 'MMM d, yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-600">{currency} {fmt(sale.total)}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="med-return">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Return Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-blue-600 mb-1">Total Transactions</p>
                      <p className="text-2xl font-bold text-blue-700">{sales.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-emerald-600 mb-1">Completed Sales</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {sales.filter(s => s.status === 'paid' || s.status === 'completed').length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-rose-50 border-rose-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-rose-600 mb-1">Void/Return Rate</p>
                      <p className="text-2xl font-bold text-rose-700">
                        {sales.length > 0 ? ((sales.filter(s => s.status === 'void' || s.status === 'refund').length / sales.length) * 100).toFixed(1) : '0'}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 text-sm">Voided Sales</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sales.filter(s => s.status === 'void').length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No void sales</p>
                      ) : (
                        sales.filter(s => s.status === 'void').slice(0, 5).map(sale => (
                          <div key={sale.id} className="flex justify-between text-sm pb-2 border-b">
                            <span className="text-slate-700">{getReceiptNumber(sale)}</span>
                            <span className="font-semibold">{currency} {fmt(sale.total)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 text-sm">Today's Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Sales:</span>
                        <span className="font-bold">{todaySales.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Revenue:</span>
                        <span className="font-bold text-emerald-600">{currency} {fmt(todayRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Void/Return:</span>
                        <span className="font-bold text-rose-600">
                          {todaySales.filter(s => s.status === 'void' || s.status === 'refund').length}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Medicine Return Dialog */}
      {showReturnDialog && (
        <MedicineReturnDialog
          open={showReturnDialog}
          onOpenChange={setShowReturnDialog}
          sale={selectedSale}
          saleItems={selectedSale ? (selectedSale.items || []) : []}
          currency={currency}
          user={user}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Sale
            </DialogTitle>
          </DialogHeader>
          
          {saleToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-2">
                  You are about to delete this sale:
                </p>
                <div className="space-y-1 text-sm">
                  <p><strong>Receipt:</strong> {getReceiptNumber(saleToDelete)}</p>
                  <p><strong>Customer:</strong> {getPatientName(saleToDelete.patient_ref)}</p>
                  <p><strong>Amount:</strong> {currency} {fmt(saleToDelete.total)}</p>
                  <p><strong>Date:</strong> {formatSL(new Date(saleToDelete.sale_date), 'MMM d, yyyy')}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ✓ Stock quantities will be automatically restored
                </p>
              </div>

              <p className="text-sm text-slate-600">
                This action will mark the sale as void and restore all sold items back to inventory.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteSale}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                    <p className="font-semibold">{formatSL(new Date(selectedSale.sale_date), 'MMM d, yyyy h:mm a')}</p>
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
              <h3 className="font-semibold mb-3">Items Sold</h3>
              <div className="space-y-2">
                {selectedSale.items && selectedSale.items.length > 0 ? (
                  selectedSale.items.map((item, idx) => {
                    // Get the stock item details
                    const stockItem = pharmacyStock.find(s => s.id === item.stock_id);
                    const displayName = stockItem?.display_name || item.product_name_cache || 'Unknown Item';

                    return (
                      <div key={idx} className="flex justify-between items-center py-2 border-b">
                        <div className="flex-1">
                          <p className="font-medium">{displayName}</p>
                          <p className="text-sm text-slate-500">
                            Qty: {item.qty} × {currency} {fmt(item.unit_price)}
                            {stockItem?.unit_cost ? <span className="ml-2 text-slate-400">(Cost: {currency} {fmt(stockItem.unit_cost)})</span> : null}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{currency} {fmt(item.line_total)}</p>
                          {(item.unit_cost > 0 || stockItem?.unit_cost) ? (
                            <p className="text-xs text-emerald-600 font-medium">
                              Profit: {currency} {fmt((item.line_total || 0) - ((item.unit_cost > 0 ? item.unit_cost : stockItem?.unit_cost || 0) * item.qty))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 text-center py-4">No items found</p>
                )}
              </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{currency} {fmt(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span className="font-semibold">{currency} {fmt(selectedSale.tax_total)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-indigo-600">{currency} {fmt(selectedSale.total)}</span>
                </div>
                {(() => {
                  const profit = getSaleProfit(selectedSale.id);
                  const margin = selectedSale.total > 0 ? ((profit / selectedSale.total) * 100).toFixed(1) : '0.0';
                  return (
                    <div className="flex justify-between text-base font-bold pt-2 border-t bg-emerald-50 rounded-lg px-3 py-2">
                      <span className="text-emerald-700">Gross Profit:</span>
                      <span className="text-emerald-700">{currency} {fmt(profit)} <span className="text-xs bg-emerald-700 text-white rounded-full px-2 py-0.5 ml-1">{margin}%</span></span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => handleReprintInvoice(selectedSale)} title="Print invoice again">
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