import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, FileText, FileSpreadsheet } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function Reports() {
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

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const invDate = inv.issued_at ? new Date(inv.issued_at) : null;
    if (!invDate) return false;
    
    const matchDate = invDate >= new Date(filters.startDate) && invDate <= new Date(filters.endDate);
    const matchLocation = !filters.locationId || inv.location_id === filters.locationId;
    
    return matchDate && matchLocation;
  });

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

    return {
      categories: categoryTotals,
      totalRevenue,
      totalTax,
      pharmacyRevenue,
      pharmacyTax,
      grandTotal: totalRevenue + totalTax + pharmacyRevenue + pharmacyTax
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

  const exportToPDF = async (reportType) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(reportType === 'revenue' ? 'Revenue Report' : 'AR Aging Report', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, 20, 30);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 20, 36);

    if (reportType === 'revenue') {
      const data = revenueByServiceLine();
      let y = 50;
      
      doc.setFontSize(12);
      doc.text('Revenue by Service Line', 20, y);
      y += 10;

      doc.setFontSize(10);
      Object.entries(data.categories).forEach(([category, vals]) => {
        doc.text(`${category}: $${vals.subtotal.toFixed(2)} (${vals.count} items)`, 25, y);
        y += 6;
      });

      y += 5;
      doc.text(`Pharmacy Revenue: $${data.pharmacyRevenue.toFixed(2)}`, 25, y);
      y += 6;
      doc.text(`Pharmacy Tax: $${data.pharmacyTax.toFixed(2)}`, 25, y);
      y += 10;
      
      doc.setFontSize(12);
      doc.text(`Grand Total: $${data.grandTotal.toFixed(2)}`, 20, y);
    } else {
      const data = arAging();
      let y = 50;

      doc.setFontSize(12);
      doc.text('Accounts Receivable Aging', 20, y);
      y += 10;

      doc.setFontSize(10);
      Object.entries(data.buckets).forEach(([bucket, vals]) => {
        doc.text(`${bucket} days: $${vals.total.toFixed(2)} (${vals.count} invoices)`, 25, y);
        y += 6;
      });

      y += 10;
      doc.setFontSize(12);
      doc.text(`Total Outstanding: $${data.totalOutstanding.toFixed(2)}`, 20, y);
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${format(new Date(), 'yyyyMMdd')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    // Audit log
    await base44.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      user_id: (await base44.auth.me()).id,
      user_email: (await base44.auth.me()).email,
      organization_id: filters.organizationId || '',
      location_id: filters.locationId || '',
      patient_id: '',
      module: 'REPORTS',
      action: 'export_pdf',
      record_type: 'Report',
      record_id: '',
      metadata: {
        report_type: reportType,
        format: 'pdf',
        date_range: `${filters.startDate} to ${filters.endDate}`
      }
    });

    toast.success('PDF exported!');
  };

  const exportToCSV = async (reportType) => {
    let csvContent = '';

    if (reportType === 'revenue') {
      const data = revenueByServiceLine();
      csvContent = 'Category,Subtotal,Count\n';
      Object.entries(data.categories).forEach(([category, vals]) => {
        csvContent += `${category},${vals.subtotal.toFixed(2)},${vals.count}\n`;
      });
      csvContent += `\nPharmacy Revenue,${data.pharmacyRevenue.toFixed(2)}\n`;
      csvContent += `Pharmacy Tax,${data.pharmacyTax.toFixed(2)}\n`;
      csvContent += `Grand Total,${data.grandTotal.toFixed(2)}\n`;
    } else {
      const data = arAging();
      csvContent = 'Age Bucket,Count,Total\n';
      Object.entries(data.buckets).forEach(([bucket, vals]) => {
        csvContent += `${bucket},${vals.count},${vals.total.toFixed(2)}\n`;
      });
      csvContent += `\nTotal Outstanding,,${data.totalOutstanding.toFixed(2)}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Audit log
    await base44.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      user_id: (await base44.auth.me()).id,
      user_email: (await base44.auth.me()).email,
      organization_id: filters.organizationId || '',
      location_id: filters.locationId || '',
      patient_id: '',
      module: 'REPORTS',
      action: 'export_csv',
      record_type: 'Report',
      record_id: '',
      metadata: {
        report_type: reportType,
        format: 'csv',
        date_range: `${filters.startDate} to ${filters.endDate}`
      }
    });

    toast.success('CSV exported!');
  };

  const revenueData = revenueByServiceLine();
  const agingData = arAging();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">Financial reports and analytics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
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

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue by Service Line</TabsTrigger>
          <TabsTrigger value="aging">AR Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4 mt-6">
          <div className="flex justify-end gap-2">
            <Button onClick={() => exportToPDF('revenue')} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => exportToCSV('revenue')} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

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
                    <p className="text-lg font-bold text-teal-600">${vals.subtotal.toFixed(2)}</p>
                  </div>
                ))}
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <div>
                      <p className="font-semibold">Pharmacy Sales</p>
                      <p className="text-sm text-slate-500">Subtotal + Tax</p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      ${(revenueData.pharmacyRevenue + revenueData.pharmacyTax).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded text-white">
                    <p className="text-lg font-bold">Grand Total</p>
                    <p className="text-2xl font-bold">${revenueData.grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4 mt-6">
          <div className="flex justify-end gap-2">
            <Button onClick={() => exportToPDF('aging')} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => exportToCSV('aging')} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(agingData.buckets).map(([bucket, vals]) => (
              <Card key={bucket}>
                <CardContent className="p-6">
                  <p className="text-sm text-slate-500 mb-1">{bucket} days</p>
                  <p className="text-2xl font-bold text-slate-900">${vals.total.toFixed(2)}</p>
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
                          <p className="font-semibold text-amber-600">${inv.balance.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded text-white">
                  <p className="text-lg font-bold">Total Outstanding</p>
                  <p className="text-2xl font-bold">${agingData.totalOutstanding.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}