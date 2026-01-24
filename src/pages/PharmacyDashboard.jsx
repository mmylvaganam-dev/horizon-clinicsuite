import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const { data: sales = [] } = useQuery({
    queryKey: ['pharmacySales'],
    queryFn: () => base44.entities.PharmacySale.list('-sale_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['pharmacyReceipts'],
    queryFn: () => base44.entities.PharmacyReceipt.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies[0]?.base_currency || 'LKR';

  const getPatientName = (patientId) => {
    if (!patientId) return 'Walk-in Customer';
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getReceiptNumber = (saleId) => {
    const receipt = receipts.find(r => r.sale_id === saleId);
    return receipt?.receipt_number || 'N/A';
  };

  // Filter sales by date and search
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59);

    const dateMatch = saleDate >= fromDate && saleDate <= toDate;
    
    const searchMatch = searchQuery === '' || 
      getPatientName(sale.patient_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getReceiptNumber(sale.id).toLowerCase().includes(searchQuery.toLowerCase());

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
    return saleDate.toDateString() === today.toDateString() && s.status === 'completed';
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  
  const lowStockCount = pharmacyStock.filter(item => 
    item.quantity <= 10 && item.quality_status === 'usable'
  ).length;

  const expiredCount = pharmacyStock.filter(item =>
    item.expire_date && new Date(item.expire_date) < new Date()
  ).length;

  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    refunded: 'bg-amber-100 text-amber-700 border-amber-200',
    voided: 'bg-rose-100 text-rose-700 border-rose-200'
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
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate(createPageUrl('PharmacyBilling'))}
          >
            <CardContent className="p-6">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-sm opacity-90">Today's Sales</p>
              <p className="text-3xl font-bold mt-1">{todaySales.length}</p>
              <p className="text-xs opacity-80 mt-1">{currency} {todayRevenue.toFixed(2)}</p>
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
              <div className="w-8 h-8 mb-2 opacity-80 flex items-center justify-center font-bold text-lg">LKR</div>
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
              <div className="w-8 h-8 mb-2 opacity-80 flex items-center justify-center font-bold text-lg">LKR</div>
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
              <div className="w-8 h-8 mb-2 opacity-80 flex items-center justify-center font-bold text-lg">LKR</div>
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
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                            <SelectItem value="voided">Voided</SelectItem>
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
                              {getReceiptNumber(sale.id)}
                            </Badge>
                          </div>
                          <div className="col-span-3">
                            <p className="text-sm font-medium text-slate-900">
                              {getPatientName(sale.patient_id)}
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
                           {sale.status === 'completed' && (
                             <>
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={() => navigate(createPageUrl('PharmacyPOS'))}
                               >
                                 In Progress
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="text-amber-600 hover:text-amber-700"
                                 onClick={() => navigate(createPageUrl('PharmacyPOS'))}
                               >
                                 <RefreshCw className="w-3 h-3 mr-1" />
                                 Refund
                               </Button>
                             </>
                           )}
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => navigate(createPageUrl('PharmacyPOS'))}
                           >
                             <FileText className="w-3 h-3 mr-1" />
                             View
                           </Button>
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
                  {sales.filter(s => s.status === 'refunded').slice(0, 5).map(sale => (
                    <Card key={sale.id} className="p-4 text-left">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{getReceiptNumber(sale.id)}</p>
                          <p className="text-sm text-slate-500">{getPatientName(sale.patient_id)}</p>
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
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Medicine return processing</p>
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
    </div>
  );
}