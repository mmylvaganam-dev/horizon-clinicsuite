import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Activity,
  Users,
  Package,
  TestTube,
  Stethoscope,
  BarChart3
} from 'lucide-react';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Reports() {
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    organizationId: '',
    locationId: ''
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoiceLines'],
    queryFn: () => base44.entities.InvoiceLine.list(),
  });

  const { data: pharmacySales = [] } = useQuery({
    queryKey: ['pharmacySales'],
    queryFn: () => base44.entities.PharmacySale.list(),
  });

  const { data: homeCareServices = [] } = useQuery({
    queryKey: ['homeCareServices'],
    queryFn: () => base44.entities.HomeCareService.list('-service_date'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-timestamp', 1000),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list(),
  });

  const currency = companies[0]?.base_currency || 'LKR';

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    switch(range) {
      case 'today':
        setFilters({...filters, startDate: format(today, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd')});
        break;
      case 'last_7_days':
        setFilters({...filters, startDate: format(subDays(today, 7), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd')});
        break;
      case 'this_month':
        setFilters({...filters, startDate: format(startOfMonth(today), 'yyyy-MM-dd'), endDate: format(endOfMonth(today), 'yyyy-MM-dd')});
        break;
      case 'this_year':
        setFilters({...filters, startDate: format(startOfYear(today), 'yyyy-MM-dd'), endDate: format(endOfYear(today), 'yyyy-MM-dd')});
        break;
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const invDate = inv.issued_at ? new Date(inv.issued_at) : null;
    if (!invDate) return false;
    
    const matchDate = invDate >= new Date(filters.startDate) && invDate <= new Date(filters.endDate);
    const matchLocation = !filters.locationId || inv.location_id === filters.locationId;
    
    return matchDate && matchLocation;
  });

  const getServiceWiseData = () => {
    const labRevenue = filteredInvoices
      .filter(i => i.status === 'paid' && i.invoice_type === 'LAB')
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const gpRevenue = filteredInvoices
      .filter(i => i.status === 'paid' && i.invoice_type === 'GP_CONSULTATION')
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const specialistRevenue = filteredInvoices
      .filter(i => i.status === 'paid' && i.invoice_type === 'SPECIALIST_CONSULTATION')
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const pharmacyTotal = pharmacySales
      .filter(s => s.status === 'completed' && s.sale_date >= filters.startDate && s.sale_date <= filters.endDate)
      .reduce((sum, s) => sum + (s.total || 0), 0);

    const homeCareTotal = homeCareServices
      .filter(h => h.service_date >= filters.startDate && h.service_date <= filters.endDate)
      .reduce((sum, h) => sum + (h.amount || 0), 0);

    return [
      { name: 'Pharmacy', value: pharmacyTotal, icon: Package, color: '#3b82f6' },
      { name: 'Home Care', value: homeCareTotal, icon: Users, color: '#10b981' },
      { name: 'Laboratory', value: labRevenue, icon: TestTube, color: '#8b5cf6' },
      { name: 'GP', value: gpRevenue, icon: Stethoscope, color: '#f59e0b' },
      { name: 'Specialist', value: specialistRevenue, icon: Activity, color: '#ec4899' }
    ];
  };

  const getDailyData = () => {
    const days = {};
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      days[dateStr] = { date: format(d, 'MMM d'), pharmacy: 0, homeCare: 0, lab: 0, gp: 0, specialist: 0 };
    }

    pharmacySales.filter(s => s.status === 'completed').forEach(s => {
      if (days[s.sale_date]) days[s.sale_date].pharmacy += s.total || 0;
    });

    homeCareServices.forEach(s => {
      if (days[s.service_date]) days[s.service_date].homeCare += s.amount || 0;
    });

    invoices.forEach(i => {
      const date = i.issued_at ? i.issued_at.split('T')[0] : null;
      if (date && days[date] && i.status === 'paid') {
        if (i.invoice_type === 'LAB') days[date].lab += i.total || 0;
        if (i.invoice_type === 'GP_CONSULTATION') days[date].gp += i.total || 0;
        if (i.invoice_type === 'SPECIALIST_CONSULTATION') days[date].specialist += i.total || 0;
      }
    });

    return Object.values(days);
  };

  // Revenue by Service Line
  const revenueByServiceLine = () => {
    const categoryTotals = {};
    let totalRevenue = 0;
    let totalTax = 0;

    filteredInvoices.forEach(inv => {
      if (inv.status === 'paid') {
        const lines = invoiceLines.filter(line => line.invoice_id === inv.id);
        
        lines.forEach(line => {
          const category = line.category || 'other';
          if (!categoryTotals[category]) {
            categoryTotals[category] = { subtotal: 0, count: 0 };
          }
          categoryTotals[category].subtotal += line.line_total;
          categoryTotals[category].count += 1;
        });

        totalRevenue += inv.subtotal;
        totalTax += inv.tax;
      }
    });

    // Pharmacy sales
    const filteredPharmacySales = pharmacySales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      const matchDate = saleDate >= new Date(filters.startDate) && saleDate <= new Date(filters.endDate);
      const matchLocation = !filters.locationId || sale.location_id === filters.locationId;
      return matchDate && matchLocation && sale.status === 'completed';
    });

    const pharmacyRevenue = filteredPharmacySales.reduce((sum, sale) => sum + sale.subtotal, 0);
    const pharmacyTax = filteredPharmacySales.reduce((sum, sale) => sum + sale.tax, 0);

    // Home care revenue
    const filteredHomeCare = homeCareServices.filter(hc => {
      const serviceDate = new Date(hc.service_date);
      const matchDate = serviceDate >= new Date(filters.startDate) && serviceDate <= new Date(filters.endDate);
      return matchDate;
    });

    const homeCareRevenue = filteredHomeCare.reduce((sum, hc) => sum + (hc.amount || 0), 0);

    return {
      categories: categoryTotals,
      totalRevenue,
      totalTax,
      pharmacyRevenue,
      pharmacyTax,
      homeCareRevenue,
      grandTotal: totalRevenue + totalTax + pharmacyRevenue + pharmacyTax + homeCareRevenue
    };
  };

  // AR Aging
  const arAging = () => {
    const today = new Date();
    const buckets = {
      '0-30': { count: 0, total: 0, invoices: [] },
      '31-60': { count: 0, total: 0, invoices: [] },
      '61-90': { count: 0, total: 0, invoices: [] },
      '90+': { count: 0, total: 0, invoices: [] }
    };

    filteredInvoices.forEach(inv => {
      if (inv.status === 'issued' && inv.balance > 0) {
        const daysOld = differenceInDays(today, parseISO(inv.issued_at));
        let bucket;
        
        if (daysOld <= 30) bucket = '0-30';
        else if (daysOld <= 60) bucket = '31-60';
        else if (daysOld <= 90) bucket = '61-90';
        else bucket = '90+';

        buckets[bucket].count += 1;
        buckets[bucket].total += inv.balance;
        buckets[bucket].invoices.push({
          number: inv.invoice_number,
          patient: inv.patient_name,
          balance: inv.balance,
          daysOld
        });
      }
    });

    const totalOutstanding = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);

    return { buckets, totalOutstanding };
  };

  const revenueData = revenueByServiceLine();
  const agingData = arAging();
  const serviceWiseData = getServiceWiseData();
  const dailyData = getDailyData();

  const filteredServiceData = serviceFilter === 'all' 
    ? serviceWiseData 
    : serviceWiseData.filter(d => d.name.toLowerCase().includes(serviceFilter.toLowerCase()));

  const totalServiceRevenue = serviceWiseData.reduce((sum, s) => sum + s.value, 0);
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Revenue Reports & Analytics</h1>
        <p className="text-slate-500 mt-1">Service-wise revenue analysis with visual insights</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Service</Label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="home care">Home Care</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                  <SelectItem value="gp">GP Consultation</SelectItem>
                  <SelectItem value="specialist">Specialist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Period</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                  setDateRange('custom');
                }}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value });
                  setDateRange('custom');
                }}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Select 
                value={filters.locationId} 
                onValueChange={(val) => setFilters({ ...filters, locationId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Revenue</p>
            <p className="text-3xl font-bold mt-1">{currency} {totalServiceRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Services</p>
            <p className="text-3xl font-bold mt-1">{serviceWiseData.filter(s => s.value > 0).length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Period</p>
            <p className="text-sm font-bold mt-1">
              {format(new Date(filters.startDate), 'MMM d')} - {format(new Date(filters.endDate), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Service Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily Trend</TabsTrigger>
          <TabsTrigger value="charts">Visual Charts</TabsTrigger>
          <TabsTrigger value="details">Revenue Details</TabsTrigger>
          <TabsTrigger value="aging">AR Aging</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServiceData.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.name} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="w-5 h-5" style={{ color: service.color }} />
                      {service.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold" style={{ color: service.color }}>
                      {currency} {service.value.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      {totalServiceRevenue > 0 ? ((service.value / totalServiceRevenue) * 100).toFixed(1) : 0}% of total
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pharmacy" stroke="#3b82f6" name="Pharmacy" strokeWidth={2} />
                  <Line type="monotone" dataKey="homeCare" stroke="#10b981" name="Home Care" strokeWidth={2} />
                  <Line type="monotone" dataKey="lab" stroke="#8b5cf6" name="Laboratory" strokeWidth={2} />
                  <Line type="monotone" dataKey="gp" stroke="#f59e0b" name="GP" strokeWidth={2} />
                  <Line type="monotone" dataKey="specialist" stroke="#ec4899" name="Specialist" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviceWiseData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${((entry.value / totalServiceRevenue) * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {serviceWiseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceWiseData.filter(d => d.value > 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6">
                      {serviceWiseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(revenueData.categories).map(([category, vals]) => (
                  <div key={category} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <div>
                      <p className="font-semibold capitalize">{category}</p>
                      <p className="text-sm text-slate-500">{vals.count} items</p>
                    </div>
                    <p className="text-lg font-bold text-teal-600">{currency} {vals.subtotal.toFixed(2)}</p>
                  </div>
                ))}
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <div>
                      <p className="font-semibold">Pharmacy Sales</p>
                      <p className="text-sm text-slate-500">Subtotal + Tax</p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {currency} {(revenueData.pharmacyRevenue + revenueData.pharmacyTax).toFixed(2)}
                    </p>
                  </div>
                </div>

                {revenueData.homeCareRevenue > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded">
                      <div>
                        <p className="font-semibold">Home Care Services</p>
                        <p className="text-sm text-slate-500">Total charges</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">
                        {currency} {revenueData.homeCareRevenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded text-white">
                    <p className="text-lg font-bold">Grand Total</p>
                    <p className="text-2xl font-bold">{currency} {revenueData.grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(agingData.buckets).map(([bucket, vals]) => (
              <Card key={bucket}>
                <CardContent className="p-6">
                  <p className="text-sm text-slate-500 mb-1">{bucket} days</p>
                  <p className="text-2xl font-bold text-slate-900">{currency} {vals.total.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{vals.count} invoices</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(agingData.buckets).map(([bucket, vals]) => (
                  vals.invoices.length > 0 && (
                    <div key={bucket}>
                      <h3 className="font-semibold text-slate-900 mb-2">{bucket} days</h3>
                      {vals.invoices.map((inv, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded mb-2">
                          <div>
                            <p className="font-medium">{inv.number}</p>
                            <p className="text-sm text-slate-500">{inv.patient || 'Walk-in'} • {inv.daysOld} days old</p>
                          </div>
                          <p className="font-semibold text-amber-600">{currency} {inv.balance.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded text-white">
                  <p className="text-lg font-bold">Total Outstanding</p>
                  <p className="text-2xl font-bold">{currency} {agingData.totalOutstanding.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <Activity className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-sm opacity-90">Total Activities</p>
                <p className="text-3xl font-bold mt-1">
                  {auditLogs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= new Date(filters.startDate) && logDate <= new Date(filters.endDate);
                  }).length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <Package className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-sm opacity-90">Pharmacy Sales</p>
                <p className="text-3xl font-bold mt-1">
                  {pharmacySales.filter(s => {
                    const saleDate = new Date(s.sale_date);
                    return saleDate >= new Date(filters.startDate) && saleDate <= new Date(filters.endDate) && s.status === 'completed';
                  }).length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <Calendar className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-sm opacity-90">Appointments</p>
                <p className="text-3xl font-bold mt-1">
                  {appointments.filter(apt => {
                    const aptDate = new Date(apt.appointment_date);
                    return aptDate >= new Date(filters.startDate) && aptDate <= new Date(filters.endDate);
                  }).length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <Users className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-sm opacity-90">Home Care Services</p>
                <p className="text-3xl font-bold mt-1">
                  {homeCareServices.filter(hc => {
                    const serviceDate = new Date(hc.service_date);
                    return serviceDate >= new Date(filters.startDate) && serviceDate <= new Date(filters.endDate);
                  }).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {auditLogs
                  .filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= new Date(filters.startDate) && logDate <= new Date(filters.endDate);
                  })
                  .slice(0, 100)
                  .map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded hover:bg-slate-100">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-900">{log.description || `${log.action_type} on ${log.entity_type}`}</p>
                          <p className="text-xs text-slate-500">
                            {log.module} • {log.user_name || log.user_email} • {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity by Module</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(
                  auditLogs
                    .filter(log => {
                      const logDate = new Date(log.timestamp);
                      return logDate >= new Date(filters.startDate) && logDate <= new Date(filters.endDate);
                    })
                    .reduce((acc, log) => {
                      acc[log.module] = (acc[log.module] || 0) + 1;
                      return acc;
                    }, {})
                ).map(([module, count]) => ({ module, count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="module" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}