import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, Download, FileText, Package, Users, DollarSign,
  TrendingUp, TrendingDown, RefreshCw, Search, Filter, Printer
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function exportCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(title, headers, rows, currency = '') {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 24);

  let y = 34;
  const colW = Math.floor(180 / headers.length);

  // Header row
  doc.setFillColor(30, 64, 175);
  doc.rect(14, y - 5, 182, 9, 'F');
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => doc.text(String(h), 15 + i * colW, y));
  doc.setTextColor(0, 0, 0);
  y += 10;

  rows.forEach((row, ri) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (ri % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 5, 182, 8, 'F'); }
    doc.setFontSize(8);
    row.forEach((v, i) => doc.text(String(v), 15 + i * colW, y));
    y += 9;
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ─── Sales Report ────────────────────────────────────────────────────────────
function SalesReport({ sales, saleLines, patients, stock, currency }) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffFilter, setStaffFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  const getPatientName = (ref) => {
    if (!ref) return 'Walk-in';
    const p = patients.find(p => p.id === ref);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };

  const staffList = useMemo(() => [...new Set(sales.map(s => s.created_by).filter(Boolean))], [sales]);

  const filtered = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.sale_date);
      const from = new Date(dateFrom); from.setHours(0,0,0);
      const to = new Date(dateTo); to.setHours(23,59,59);
      if (d < from || d > to) return false;
      if (staffFilter !== 'all' && s.created_by !== staffFilter) return false;
      if (customerFilter && !getPatientName(s.patient_ref).toLowerCase().includes(customerFilter.toLowerCase())) return false;
      if (productFilter) {
        const lines = saleLines.filter(l => l.sale_header_id === s.id);
        const hasProduct = lines.some(l => {
          const item = stock.find(i => i.id === l.stock_id);
          return (item?.display_name || l.product_name_cache || '').toLowerCase().includes(productFilter.toLowerCase());
        });
        if (!hasProduct) return false;
      }
      return true;
    });
  }, [sales, dateFrom, dateTo, staffFilter, productFilter, customerFilter]);

  const totalRevenue = filtered.reduce((s, x) => s + (x.total || 0), 0);
  const paidSales = filtered.filter(s => s.status === 'paid' || s.status === 'completed');
  const refundVoid = filtered.filter(s => s.status === 'refund' || s.status === 'void');

  // Daily chart data
  const dailyData = useMemo(() => {
    const map = {};
    filtered.filter(s => s.status === 'paid' || s.status === 'completed').forEach(s => {
      const d = format(new Date(s.sale_date), 'MM/dd');
      map[d] = (map[d] || 0) + (s.total || 0);
    });
    return Object.entries(map).sort().map(([date, total]) => ({ date, total }));
  }, [filtered]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Receipt#', 'Customer', 'Staff', 'Subtotal', 'Tax', 'Total', 'Status'];
    const rows = filtered.map(s => [
      format(new Date(s.sale_date), 'yyyy-MM-dd HH:mm'),
      s.sale_number || '',
      getPatientName(s.patient_ref),
      s.created_by || '',
      (s.subtotal || 0).toFixed(2),
      (s.tax_total || 0).toFixed(2),
      (s.total || 0).toFixed(2),
      s.status
    ]);
    exportCSV(`Sales_Report_${dateFrom}_${dateTo}.csv`, headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['Date', 'Receipt#', 'Customer', 'Total', 'Status'];
    const rows = filtered.map(s => [
      format(new Date(s.sale_date), 'MM/dd/yy HH:mm'),
      s.sale_number || '',
      getPatientName(s.patient_ref),
      `${currency} ${(s.total || 0).toFixed(2)}`,
      s.status
    ]);
    exportPDF(`Sales Report ${dateFrom} to ${dateTo}`, headers, rows, currency);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-slate-50">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Staff</label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffList.map(s => <SelectItem key={s} value={s}>{s.split('@')[0]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Customer</label>
              <Input placeholder="Search customer..." value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Product</label>
              <Input placeholder="Search product..." value={productFilter} onChange={e => setProductFilter(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Sales', value: filtered.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Revenue', value: `${currency} ${fmt(totalRevenue)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Paid', value: paidSales.length, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Refund/Void', value: refundVoid.length, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map(k => (
          <Card key={k.label} className={k.bg}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Daily Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => `${currency} ${fmt(v)}`} />
                <Bar dataKey="total" fill="#6366f1" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Export buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />CSV</Button>
        <Button variant="outline" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />PDF</Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-50 grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-600 border-b">
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Receipt</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Staff</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-1">Status</div>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-400">No sales match the filters</p>
          ) : filtered.map(s => (
            <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-2 text-sm hover:bg-slate-50">
              <div className="col-span-2 text-slate-600">{format(new Date(s.sale_date), 'dd MMM yy')}</div>
              <div className="col-span-2 font-mono text-xs">{s.sale_number || '-'}</div>
              <div className="col-span-3">{getPatientName(s.patient_ref)}</div>
              <div className="col-span-2 text-slate-500 text-xs">{(s.created_by || '').split('@')[0]}</div>
              <div className="col-span-2 font-semibold">{currency} {fmt(s.total)}</div>
              <div className="col-span-1">
                <Badge className={
                  s.status === 'paid' || s.status === 'completed' ? 'bg-emerald-100 text-emerald-700 text-xs' :
                  s.status === 'void' ? 'bg-rose-100 text-rose-700 text-xs' : 'bg-amber-100 text-amber-700 text-xs'
                }>{s.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Report ─────────────────────────────────────────────────────────
function InventoryReport({ stock, currency }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return stock.filter(item => {
      const matchSearch = !search || (item.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.barcode || '').includes(search);
      const isExpired = item.expire_date && new Date(item.expire_date) < new Date();
      const isLow = (item.quantity || 0) <= 10 && !isExpired;
      const isZero = (item.quantity || 0) === 0;
      if (filter === 'low') return isLow && matchSearch;
      if (filter === 'expired') return isExpired && matchSearch;
      if (filter === 'zero') return isZero && matchSearch;
      return matchSearch;
    });
  }, [stock, filter, search]);

  const totalValue = filtered.reduce((s, i) => s + ((i.unit_cost || 0) * (i.quantity || 0)), 0);
  const totalMRP = filtered.reduce((s, i) => s + ((i.mrp || 0) * (i.quantity || 0)), 0);
  const potentialProfit = totalMRP - totalValue;

  const handleExportCSV = () => {
    exportCSV('Inventory_Report.csv',
      ['Product', 'Barcode', 'Qty', 'Unit Cost', 'MRP', 'Stock Value', 'Potential Revenue', 'Expire Date', 'Status'],
      filtered.map(i => [
        i.display_name, i.barcode || '', i.quantity || 0,
        (i.unit_cost || 0).toFixed(2), (i.mrp || 0).toFixed(2),
        ((i.unit_cost || 0) * (i.quantity || 0)).toFixed(2),
        ((i.mrp || 0) * (i.quantity || 0)).toFixed(2),
        i.expire_date ? format(new Date(i.expire_date), 'yyyy-MM-dd') : '',
        i.quality_status || ''
      ])
    );
  };

  const handleExportPDF = () => {
    exportPDF('Inventory Valuation Report',
      ['Product', 'Qty', 'Cost', 'MRP', 'Stock Value'],
      filtered.map(i => [
        (i.display_name || '').substring(0, 25),
        i.quantity || 0,
        `${currency} ${(i.unit_cost || 0).toFixed(2)}`,
        `${currency} ${(i.mrp || 0).toFixed(2)}`,
        `${currency} ${((i.unit_cost || 0) * (i.quantity || 0)).toFixed(2)}`
      ])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search product or barcode..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low">Low Stock (≤10)</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="zero">Zero Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Items', value: filtered.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Stock Value (Cost)', value: `${currency} ${fmt(totalValue)}`, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Potential Revenue', value: `${currency} ${fmt(totalMRP)}`, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Potential Profit', value: `${currency} ${fmt(potentialProfit)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(k => (
          <Card key={k.label} className={k.bg}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />CSV</Button>
        <Button variant="outline" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />PDF</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-50 grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-600 border-b">
          <div className="col-span-4">Product</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit Cost</div>
          <div className="col-span-2 text-right">MRP</div>
          <div className="col-span-2 text-right">Stock Value</div>
          <div className="col-span-1">Status</div>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-400">No items found</p>
          ) : filtered.map(item => {
            const isExpired = item.expire_date && new Date(item.expire_date) < new Date();
            const isLow = (item.quantity || 0) <= 10 && !isExpired;
            return (
              <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 text-sm hover:bg-slate-50">
                <div className="col-span-4">
                  <p className="font-medium text-slate-900">{item.display_name}</p>
                  <p className="text-xs text-slate-400">{item.barcode}</p>
                </div>
                <div className={`col-span-1 text-right font-bold ${isLow ? 'text-amber-600' : isExpired ? 'text-rose-600' : ''}`}>{item.quantity || 0}</div>
                <div className="col-span-2 text-right text-slate-600">{currency} {fmt(item.unit_cost)}</div>
                <div className="col-span-2 text-right text-slate-600">{currency} {fmt(item.mrp)}</div>
                <div className="col-span-2 text-right font-semibold">{currency} {fmt((item.unit_cost || 0) * (item.quantity || 0))}</div>
                <div className="col-span-1">
                  {isExpired ? <Badge className="bg-rose-100 text-rose-700 text-xs">Expired</Badge>
                    : isLow ? <Badge className="bg-amber-100 text-amber-700 text-xs">Low</Badge>
                    : <Badge className="bg-emerald-100 text-emerald-700 text-xs">OK</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── User Activity Report ─────────────────────────────────────────────────────
function UserActivityReport({ sales, saleLines, users, currency }) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const filtered = useMemo(() => sales.filter(s => {
    const d = new Date(s.sale_date);
    const from = new Date(dateFrom); from.setHours(0,0,0);
    const to = new Date(dateTo); to.setHours(23,59,59);
    return d >= from && d <= to;
  }), [sales, dateFrom, dateTo]);

  const staffSummary = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const k = s.created_by || 'Unknown';
      if (!map[k]) map[k] = { staff: k, count: 0, revenue: 0, voids: 0 };
      map[k].count++;
      if (s.status === 'paid' || s.status === 'completed') map[k].revenue += (s.total || 0);
      if (s.status === 'void' || s.status === 'refund') map[k].voids++;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const handleExportCSV = () => {
    exportCSV('User_Activity_Report.csv',
      ['Staff', 'Total Sales', 'Revenue', 'Voids/Refunds', 'Avg Sale'],
      staffSummary.map(r => [
        r.staff, r.count, r.revenue.toFixed(2), r.voids,
        (r.count > 0 ? r.revenue / r.count : 0).toFixed(2)
      ])
    );
  };

  const handleExportPDF = () => {
    exportPDF('User Activity Summary',
      ['Staff', 'Sales', 'Revenue', 'Voids'],
      staffSummary.map(r => [r.staff.split('@')[0], r.count, `${currency} ${fmt(r.revenue)}`, r.voids])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-600 mb-1 block">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-600 mb-1 block">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Bar chart by staff */}
      {staffSummary.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue by Staff Member</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={staffSummary.slice(0, 10).map(r => ({ name: r.staff.split('@')[0], revenue: r.revenue }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => `${currency} ${fmt(v)}`} />
                <Bar dataKey="revenue" fill="#0d9488" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />CSV</Button>
        <Button variant="outline" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />PDF</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-50 grid grid-cols-5 gap-2 px-4 py-2 text-xs font-semibold text-slate-600 border-b">
          <div className="col-span-2">Staff Member</div>
          <div className="text-right">Sales</div>
          <div className="text-right">Revenue</div>
          <div className="text-right">Void/Refund</div>
        </div>
        <div className="divide-y">
          {staffSummary.length === 0 ? (
            <p className="text-center py-8 text-slate-400">No data for selected period</p>
          ) : staffSummary.map((r, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm hover:bg-slate-50">
              <div className="col-span-2">
                <p className="font-medium">{r.staff.split('@')[0]}</p>
                <p className="text-xs text-slate-400">{r.staff}</p>
              </div>
              <div className="text-right font-bold text-indigo-600">{r.count}</div>
              <div className="text-right font-bold text-emerald-600">{currency} {fmt(r.revenue)}</div>
              <div className="text-right font-bold text-rose-500">{r.voids}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Financial Summary Report ─────────────────────────────────────────────────
function FinancialReport({ sales, stock, currency }) {
  const [period, setPeriod] = useState('this_month');

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    if (period === 'this_month') return { dateFrom: startOfMonth(now), dateTo: now };
    if (period === 'last_month') return { dateFrom: startOfMonth(subMonths(now, 1)), dateTo: endOfMonth(subMonths(now, 1)) };
    if (period === 'last_3') return { dateFrom: startOfMonth(subMonths(now, 3)), dateTo: now };
    return { dateFrom: startOfMonth(now), dateTo: now };
  }, [period]);

  const filtered = useMemo(() => sales.filter(s => {
    const d = new Date(s.sale_date);
    return d >= dateFrom && d <= dateTo;
  }), [sales, dateFrom, dateTo]);

  const revenue = filtered.filter(s => s.status === 'paid' || s.status === 'completed').reduce((s, x) => s + (x.total || 0), 0);
  const refunds = filtered.filter(s => s.status === 'refund').reduce((s, x) => s + (x.total || 0), 0);
  const voids = filtered.filter(s => s.status === 'void').reduce((s, x) => s + (x.total || 0), 0);
  const taxCollected = filtered.filter(s => s.status === 'paid' || s.status === 'completed').reduce((s, x) => s + (x.tax_total || 0), 0);
  const stockValue = stock.reduce((s, i) => s + ((i.unit_cost || 0) * (i.quantity || 0)), 0);
  const potentialRevenue = stock.reduce((s, i) => s + ((i.mrp || 0) * (i.quantity || 0)), 0);

  // Monthly breakdown for chart
  const monthlyData = useMemo(() => {
    const map = {};
    sales.filter(s => s.status === 'paid' || s.status === 'completed').forEach(s => {
      const m = format(new Date(s.sale_date), 'MMM yy');
      map[m] = (map[m] || 0) + (s.total || 0);
    });
    return Object.entries(map).slice(-6).map(([month, revenue]) => ({ month, revenue }));
  }, [sales]);

  const handleExportCSV = () => {
    exportCSV('Financial_Summary.csv',
      ['Metric', 'Value'],
      [
        ['Gross Revenue', revenue.toFixed(2)],
        ['Total Refunds', refunds.toFixed(2)],
        ['Total Voids', voids.toFixed(2)],
        ['Net Revenue', (revenue - refunds).toFixed(2)],
        ['Tax Collected', taxCollected.toFixed(2)],
        ['Current Stock Value', stockValue.toFixed(2)],
        ['Potential Revenue (Stock)', potentialRevenue.toFixed(2)],
        ['Potential Profit (Stock)', (potentialRevenue - stockValue).toFixed(2)],
      ]
    );
  };

  const handleExportPDF = () => {
    exportPDF('Financial Summary Report',
      ['Metric', 'Value'],
      [
        ['Gross Revenue', `${currency} ${fmt(revenue)}`],
        ['Total Refunds', `${currency} ${fmt(refunds)}`],
        ['Total Voids', `${currency} ${fmt(voids)}`],
        ['Net Revenue', `${currency} ${fmt(revenue - refunds)}`],
        ['Tax Collected', `${currency} ${fmt(taxCollected)}`],
        ['Stock Value (Cost)', `${currency} ${fmt(stockValue)}`],
        ['Potential Revenue', `${currency} ${fmt(potentialRevenue)}`],
        ['Potential Profit', `${currency} ${fmt(potentialRevenue - stockValue)}`],
      ]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-500">{format(dateFrom, 'MMM d, yyyy')} — {format(dateTo, 'MMM d, yyyy')}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gross Revenue', value: `${currency} ${fmt(revenue)}`, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: TrendingUp },
          { label: 'Refunds', value: `${currency} ${fmt(refunds)}`, color: 'text-amber-700', bg: 'bg-amber-50', icon: TrendingDown },
          { label: 'Voids', value: `${currency} ${fmt(voids)}`, color: 'text-rose-700', bg: 'bg-rose-50', icon: TrendingDown },
          { label: 'Net Revenue', value: `${currency} ${fmt(revenue - refunds)}`, color: 'text-indigo-700', bg: 'bg-indigo-50', icon: DollarSign },
        ].map(k => (
          <Card key={k.label} className={k.bg}>
            <CardContent className="p-4 flex items-start gap-3">
              <k.icon className={`w-5 h-5 mt-1 ${k.color}`} />
              <div>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={`text-base font-bold mt-0.5 ${k.color}`}>{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Tax Collected', value: `${currency} ${fmt(taxCollected)}` },
          { label: 'Stock Value (Cost)', value: `${currency} ${fmt(stockValue)}` },
          { label: 'Potential Profit', value: `${currency} ${fmt(potentialRevenue - stockValue)}` },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {monthlyData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => `${currency} ${fmt(v)}`} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />CSV</Button>
        <Button variant="outline" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />PDF</Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();

  const { data: sales = [] } = useQuery({
    queryKey: ['reports_sales', selectedOrgId],
    queryFn: () => base44.entities.PharmacySaleHeader.filter(orgFilter, '-sale_date'),
    enabled: !!selectedOrgId,
  });

  const { data: saleLines = [] } = useQuery({
    queryKey: ['reports_lines', selectedOrgId],
    queryFn: () => base44.entities.PharmacySaleLine.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['reports_stock', selectedOrgId],
    queryFn: () => base44.entities.PharmacyStock.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['reports_patients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', selectedOrgId],
    queryFn: () => base44.entities.CompanyProfile.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const currency = companies[0]?.base_currency || 'LKR';

  if (!selectedOrgId) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-slate-300 mb-3 animate-spin" />
          <p className="text-slate-500">Select an organization to view reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-slate-500 mt-1">Generate, view, and export business reports</p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />Sales
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />Inventory
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Users className="w-4 h-4" />User Activity
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" />Sales Report</CardTitle></CardHeader>
            <CardContent>
              <SalesReport sales={sales} saleLines={saleLines} patients={patients} stock={stock} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" />Inventory Valuation Report</CardTitle></CardHeader>
            <CardContent>
              <InventoryReport stock={stock} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-teal-600" />User Activity Summary</CardTitle></CardHeader>
            <CardContent>
              <UserActivityReport sales={sales} saleLines={saleLines} users={users} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-600" />Financial Summary</CardTitle></CardHeader>
            <CardContent>
              <FinancialReport sales={sales} stock={stock} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}