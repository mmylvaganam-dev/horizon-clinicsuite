import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Printer,
  Calendar,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function DailyClose() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedClose, setSelectedClose] = useState(null);
  const [autoCalculateDate, setAutoCalculateDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLocation, setSelectedLocation] = useState('');

  const [closeForm, setCloseForm] = useState({
    business_date: format(new Date(), 'yyyy-MM-dd'),
    location_id: '',
    shift_log_ref: '',
    frontdesk_sales_total: 0,
    pharmacy_sales_total: 0,
    other_sales_total: 0,
    total_sales: 0,
    counted_cash_total: 0,
    expected_cash_total: 0,
    variance: 0,
    deposit_amount: 0,
    deposit_reference: '',
    notes: ''
  });

  const { data: dailyCloses = [] } = useQuery({
    queryKey: ['dailyCloses'],
    queryFn: () => base44.entities.DailyClose.list('-business_date'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: pharmacySales = [] } = useQuery({
    queryKey: ['pharmacySales'],
    queryFn: () => base44.entities.PharmacySale.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: shiftLogs = [] } = useQuery({
    queryKey: ['shiftLogs'],
    queryFn: () => base44.entities.ShiftLog.list('-shift_date'),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies[0]?.base_currency || 'LKR';

  const calculateTotals = (date, locationId) => {
    const dateStr = date;

    // Front desk sales (paid invoices)
    const frontdeskSales = invoices.filter(inv => {
      const invDate = inv.issued_at ? inv.issued_at.split('T')[0] : null;
      const matchDate = invDate === dateStr;
      const matchLocation = !locationId || inv.location_id === locationId;
      return matchDate && matchLocation && inv.status === 'paid';
    });

    const frontdeskTotal = frontdeskSales.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Pharmacy sales
    const pharmacySalesFiltered = pharmacySales.filter(sale => {
      const matchDate = sale.sale_date === dateStr;
      const matchLocation = !locationId || sale.location_id === locationId;
      return matchDate && matchLocation && sale.status === 'completed';
    });

    const pharmacyTotal = pharmacySalesFiltered.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const total = frontdeskTotal + pharmacyTotal;

    return {
      frontdesk_sales_total: frontdeskTotal,
      pharmacy_sales_total: pharmacyTotal,
      other_sales_total: 0,
      total_sales: total,
      expected_cash_total: total
    };
  };

  const handleAutoCalculate = () => {
    const totals = calculateTotals(autoCalculateDate, selectedLocation);
    setCloseForm({
      ...closeForm,
      business_date: autoCalculateDate,
      location_id: selectedLocation,
      ...totals
    });
    toast.success('Totals calculated!');
  };

  const createCloseMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.DailyClose.create({
        ...data,
        prepared_by: user.email,
        prepared_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyCloses'] });
      setShowCreateDialog(false);
      setCloseForm({
        business_date: format(new Date(), 'yyyy-MM-dd'),
        location_id: '',
        shift_log_ref: '',
        frontdesk_sales_total: 0,
        pharmacy_sales_total: 0,
        other_sales_total: 0,
        total_sales: 0,
        counted_cash_total: 0,
        expected_cash_total: 0,
        variance: 0,
        deposit_amount: 0,
        deposit_reference: '',
        notes: ''
      });
      toast.success('Daily close created!');
    },
  });

  const generatePDF = (close) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('DAILY CLOSE REPORT', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Business Date: ${format(new Date(close.business_date), 'dd MMM yyyy')}`, 20, 30);
    
    const location = locations.find(l => l.id === close.location_id);
    if (location) {
      doc.text(`Location: ${location.name}`, 20, 36);
    }

    doc.text(`Prepared: ${format(new Date(close.prepared_at), 'dd MMM yyyy HH:mm')}`, 20, 42);
    doc.text(`Prepared By: ${close.prepared_by}`, 20, 48);

    // Sales Summary
    let y = 60;
    doc.setFontSize(12);
    doc.text('SALES SUMMARY', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Front Desk Sales:`, 25, y);
    doc.text(`${currency} ${close.frontdesk_sales_total.toFixed(2)}`, 120, y);
    y += 7;

    doc.text(`Pharmacy Sales:`, 25, y);
    doc.text(`${currency} ${close.pharmacy_sales_total.toFixed(2)}`, 120, y);
    y += 7;

    if (close.other_sales_total > 0) {
      doc.text(`Other Sales:`, 25, y);
      doc.text(`${currency} ${close.other_sales_total.toFixed(2)}`, 120, y);
      y += 7;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL SALES:`, 25, y);
    doc.text(`${currency} ${close.total_sales.toFixed(2)}`, 120, y);
    doc.setFont(undefined, 'normal');
    y += 15;

    // Cash Reconciliation
    doc.setFontSize(12);
    doc.text('CASH RECONCILIATION', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Expected Cash:`, 25, y);
    doc.text(`${currency} ${close.expected_cash_total.toFixed(2)}`, 120, y);
    y += 7;

    doc.text(`Counted Cash:`, 25, y);
    doc.text(`${currency} ${close.counted_cash_total.toFixed(2)}`, 120, y);
    y += 7;

    const varianceColor = close.variance === 0 ? 'black' : close.variance > 0 ? 'green' : 'red';
    doc.setTextColor(varianceColor === 'green' ? 0 : varianceColor === 'red' ? 255 : 0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`Variance:`, 25, y);
    doc.text(`${currency} ${close.variance.toFixed(2)}`, 120, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    y += 15;

    // Deposit
    if (close.deposit_amount > 0) {
      doc.setFontSize(12);
      doc.text('DEPOSIT', 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.text(`Deposit Amount:`, 25, y);
      doc.text(`${currency} ${close.deposit_amount.toFixed(2)}`, 120, y);
      y += 7;

      if (close.deposit_reference) {
        doc.text(`Reference: ${close.deposit_reference}`, 25, y);
        y += 7;
      }
      y += 10;
    }

    // Notes
    if (close.notes) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text('NOTES', 20, y);
      y += 8;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(close.notes, 170);
      doc.text(lines, 25, y);
      y += lines.length * 5 + 10;
    }

    // Signature lines
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    y += 10;
    doc.setFontSize(10);
    doc.text('_____________________', 20, y);
    doc.text('Prepared By', 20, y + 5);
    
    doc.text('_____________________', 120, y);
    doc.text('Verified By', 120, y + 5);

    doc.save(`daily_close_${close.business_date}.pdf`);
    toast.success('PDF generated!');
  };

  const getLocationName = (locationId) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'All Locations';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Close</h1>
          <p className="text-slate-500 mt-1">End-of-day cash reconciliation and deposit tracking</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Daily Close
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Today's Expected</p>
            <p className="text-3xl font-bold mt-1">
              {currency} {calculateTotals(format(new Date(), 'yyyy-MM-dd'), '').total_sales.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Closed Days</p>
            <p className="text-3xl font-bold mt-1">{dailyCloses.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Deposits</p>
            <p className="text-3xl font-bold mt-1">
              {currency} {dailyCloses.reduce((sum, c) => sum + (c.deposit_amount || 0), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Variances</p>
            <p className="text-3xl font-bold mt-1">
              {dailyCloses.filter(c => Math.abs(c.variance || 0) > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Close Records */}
      <div className="grid grid-cols-1 gap-4">
        {dailyCloses.map((close) => {
          const hasVariance = Math.abs(close.variance || 0) > 0.01;
          const varianceType = close.variance > 0 ? 'over' : 'short';

          return (
            <Card key={close.id} className={`p-5 ${hasVariance ? 'border-2 border-amber-300 bg-amber-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-lg text-slate-900">
                      {format(new Date(close.business_date), 'EEEE, MMM d, yyyy')}
                    </h3>
                    <Badge variant="outline">{getLocationName(close.location_id)}</Badge>
                    {hasVariance && (
                      <Badge className={`${close.variance > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {currency} {Math.abs(close.variance).toFixed(2)} {varianceType}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-slate-500">Front Desk Sales</p>
                      <p className="font-bold text-slate-900">{currency} {close.frontdesk_sales_total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Pharmacy Sales</p>
                      <p className="font-bold text-slate-900">{currency} {close.pharmacy_sales_total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total Sales</p>
                      <p className="font-bold text-teal-600 text-lg">{currency} {close.total_sales.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Deposit</p>
                      <p className="font-bold text-emerald-600">{currency} {(close.deposit_amount || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Expected Cash</p>
                      <p className="font-medium">{currency} {close.expected_cash_total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Counted Cash</p>
                      <p className="font-medium">{currency} {close.counted_cash_total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Variance</p>
                      <p className={`font-bold ${close.variance > 0 ? 'text-emerald-600' : close.variance < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {currency} {close.variance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {close.deposit_reference && (
                    <p className="text-xs text-slate-600 mt-2">Deposit Ref: {close.deposit_reference}</p>
                  )}
                  {close.notes && (
                    <p className="text-sm text-slate-700 mt-2 italic">{close.notes}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    Prepared by {close.prepared_by} at {format(new Date(close.prepared_at), 'dd MMM HH:mm')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generatePDF(close)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print A4
                </Button>
              </div>
            </Card>
          );
        })}

        {dailyCloses.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No daily close records</h3>
            <p className="text-slate-500 mt-1">Create your first daily close report</p>
          </Card>
        )}
      </div>

      {/* Create Daily Close Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Daily Close</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Auto Calculate Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Auto Calculate Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={autoCalculateDate}
                      onChange={(e) => setAutoCalculateDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
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
                <Button onClick={handleAutoCalculate} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Calculate Totals
                </Button>
              </CardContent>
            </Card>

            {/* Manual Entry */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Date *</Label>
                <Input
                  type="date"
                  value={closeForm.business_date}
                  onChange={(e) => setCloseForm({ ...closeForm, business_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Link to Shift Log (Optional)</Label>
                <Select
                  value={closeForm.shift_log_ref}
                  onValueChange={(val) => setCloseForm({ ...closeForm, shift_log_ref: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftLogs.map(log => (
                      <SelectItem key={log.id} value={log.id}>
                        {log.shift_name} - {format(new Date(log.shift_date), 'dd MMM')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Sales Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Front Desk Sales</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={closeForm.frontdesk_sales_total}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCloseForm({
                          ...closeForm,
                          frontdesk_sales_total: val,
                          total_sales: val + closeForm.pharmacy_sales_total + closeForm.other_sales_total,
                          expected_cash_total: val + closeForm.pharmacy_sales_total + closeForm.other_sales_total
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Pharmacy Sales</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={closeForm.pharmacy_sales_total}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCloseForm({
                          ...closeForm,
                          pharmacy_sales_total: val,
                          total_sales: closeForm.frontdesk_sales_total + val + closeForm.other_sales_total,
                          expected_cash_total: closeForm.frontdesk_sales_total + val + closeForm.other_sales_total
                        });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Other Sales</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeForm.other_sales_total}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCloseForm({
                        ...closeForm,
                        other_sales_total: val,
                        total_sales: closeForm.frontdesk_sales_total + closeForm.pharmacy_sales_total + val,
                        expected_cash_total: closeForm.frontdesk_sales_total + closeForm.pharmacy_sales_total + val
                      });
                    }}
                  />
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-slate-600">Total Sales</p>
                  <p className="text-2xl font-bold text-teal-600">{currency} {closeForm.total_sales.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Cash Reconciliation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Expected Cash</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={closeForm.expected_cash_total}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCloseForm({
                          ...closeForm,
                          expected_cash_total: val,
                          variance: closeForm.counted_cash_total - val
                        });
                      }}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label>Counted Cash</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={closeForm.counted_cash_total}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCloseForm({
                          ...closeForm,
                          counted_cash_total: val,
                          variance: val - closeForm.expected_cash_total
                        });
                      }}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-slate-600">Variance</p>
                  <p className={`text-2xl font-bold ${
                    closeForm.variance > 0 ? 'text-emerald-600' : 
                    closeForm.variance < 0 ? 'text-rose-600' : 'text-slate-600'
                  }`}>
                    {currency} {closeForm.variance.toFixed(2)}
                  </p>
                  {closeForm.variance !== 0 && (
                    <p className="text-xs text-slate-500">
                      {closeForm.variance > 0 ? 'Cash over' : 'Cash short'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Deposit Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Deposit Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closeForm.deposit_amount}
                    onChange={(e) => setCloseForm({ ...closeForm, deposit_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Deposit Reference/Slip #</Label>
                  <Input
                    value={closeForm.deposit_reference}
                    onChange={(e) => setCloseForm({ ...closeForm, deposit_reference: e.target.value })}
                    placeholder="Bank slip number"
                  />
                </div>
              </CardContent>
            </Card>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={closeForm.notes}
                onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes or explanations"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createCloseMutation.mutate(closeForm)}
                disabled={createCloseMutation.isPending}
              >
                {createCloseMutation.isPending ? 'Creating...' : 'Create Daily Close'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}