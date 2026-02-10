import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart,
  Printer,
  Eye,
  Calendar,
  DollarSign,
  User,
  Clock,
  Package,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

// Format currency with commas
const formatCurrency = (amount, currency = 'LKR') => {
  if (!amount && amount !== 0) return `${currency} 0.00`;
  return `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function TodaySalesDetails() {
  const navigate = useNavigate();
  const [reprintingId, setReprintingId] = useState(null);

  const { data: sales = [] } = useQuery({
    queryKey: ['pharmacySales'],
    queryFn: () => base44.entities.PharmacySale.list('-sale_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['pharmacyReceipts'],
    queryFn: () => base44.entities.PharmacyReceipt.list(),
  });

  const { data: saleItems = [] } = useQuery({
    queryKey: ['pharmacySaleItems'],
    queryFn: () => base44.entities.PharmacySaleItem.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies && companies.length > 0 ? (companies[0]?.base_currency || 'LKR') : 'LKR';

  const getPatientName = (patientId) => {
    if (!patientId) return 'Walk-in Customer';
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getReceiptNumber = (saleId) => {
    const receipt = receipts.find(r => r.sale_id === saleId);
    return receipt?.receipt_number || 'N/A';
  };

  // Filter only today's completed sales
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.sale_date);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString() && s.status === 'completed';
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const averageSale = todaySales.length > 0 ? (todayRevenue / todaySales.length) : 0;

  const handleReprintInvoice = async (sale) => {
    setReprintingId(sale.id);
    try {
      const response = await base44.functions.invoke('generatePharmacyInvoice', {
        saleId: sale.id
      });
      
      // Open the HTML in a new window/tab for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(response.data);
        printWindow.document.close();
        // Give browser time to render before printing
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      } else {
        alert('Please allow popups to print receipts');
      }
    } catch (error) {
      console.error('Failed to reprint invoice:', error);
      alert('Failed to reprint invoice: ' + error.message);
    } finally {
      setReprintingId(null);
    }
  };

  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const toggleDetails = (saleId) => {
    setExpandedSaleId(expandedSaleId === saleId ? null : saleId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl('PharmacyDashboard'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Today's Sales Details</h1>
            <p className="text-slate-500 mt-1">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <ShoppingCart className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Sales</p>
            <p className="text-3xl font-bold mt-1">{todaySales.length}</p>
            <p className="text-xs opacity-80 mt-1">Transactions today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Revenue</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(todayRevenue, currency)}</p>
            <p className="text-xs opacity-80 mt-1">Today's earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Average Sale</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(averageSale, currency)}</p>
            <p className="text-xs opacity-80 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Last Sale</p>
            <p className="text-3xl font-bold mt-1">
              {todaySales.length > 0 ? format(new Date(todaySales[0].sale_date), 'hh:mm a') : '--:--'}
            </p>
            <p className="text-xs opacity-80 mt-1">Most recent</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales List */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            All Sales Today ({todaySales.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {todaySales.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No sales recorded today yet</p>
              <Button 
                className="mt-4"
                onClick={() => navigate(createPageUrl('PharmacyBilling'))}
              >
                Make New Sale
              </Button>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {todaySales.map((sale, index) => {
                const receipt = receipts.find(r => r.sale_id === sale.id);
                const itemsForSale = saleItems.filter(item => item.sale_id === sale.id);
                const itemCount = itemsForSale.length;
                
                return (
                  <div key={sale.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-base px-3 py-1">
                            #{index + 1}
                          </Badge>
                          <Badge variant="outline" className="font-mono">
                            {getReceiptNumber(sale.id)}
                          </Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            {sale.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">Customer</p>
                              <p className="font-semibold text-slate-900">{getPatientName(sale.patient_id)}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">Time</p>
                              <p className="font-semibold text-slate-900">
                                {format(new Date(sale.sale_date), 'hh:mm:ss a')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-purple-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">Sold By</p>
                              <p className="font-semibold text-slate-900">
                                {sale.created_by_email?.split('@')[0] || 'Staff'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          </div>
                          {sale.payment_method && (
                            <Badge variant="outline">{sale.payment_method}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 ml-6">
                        <div className="text-right">
                          <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                          <p className="text-3xl font-bold text-slate-900">
                            {formatCurrency(sale.total, currency)}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReprintInvoice(sale)}
                            disabled={reprintingId === sale.id}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            {reprintingId === sale.id ? 'Printing...' : 'Reprint'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleDetails(sale.id)}
                            className="text-slate-600 hover:text-slate-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {expandedSaleId === sale.id ? 'Hide' : 'Details'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Items preview - shown when expanded */}
                    {expandedSaleId === sale.id && itemsForSale.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 mb-2">ITEMS SOLD:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {itemsForSale.map((item, idx) => (
                            <div key={idx} className="text-sm bg-slate-50 rounded p-2 flex justify-between items-center">
                              <span className="text-slate-700">{item.item_name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">x{item.quantity}</Badge>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrency(item.line_total, currency)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}