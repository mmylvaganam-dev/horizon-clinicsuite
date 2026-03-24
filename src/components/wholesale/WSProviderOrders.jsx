import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, ShoppingCart, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800' };
const PAY_COLORS = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', credit: 'bg-blue-100 text-blue-700' };

const TAX_RATE = 0.18; // 18% VAT

function generateWholesaleInvoicePDF(order, items, provider) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header background
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, W, 42, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(provider.company_name || 'Wholesale Supplier', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 220);
  if (provider.address) doc.text(provider.address, 14, 23);
  if (provider.email) doc.text(provider.email, 14, 29);
  if (provider.phone) doc.text(provider.phone, 14, 35);

  // INVOICE label
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', W - 14, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 220);
  doc.text(`Invoice #: ${order.order_number}`, W - 14, 23, { align: 'right' });
  doc.text(`Date: ${new Date(order.created_date).toLocaleDateString('en-GB')}`, W - 14, 29, { align: 'right' });
  doc.text(`Status: ${(order.status || '').toUpperCase()}`, W - 14, 35, { align: 'right' });

  y = 55;

  // Billed To
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 80, 100);
  doc.text(order.company_name || order.buyer_name || 'Retail Pharmacy', 14, y + 6);
  if (order.delivery_address) doc.text(order.delivery_address, 14, y + 12);
  y += 26;

  // Divider
  doc.setDrawColor(200, 210, 220);
  doc.line(14, y, W - 14, y);
  y += 6;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, W - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('PRODUCT', 17, y + 5.5);
  doc.text('QTY', 110, y + 5.5, { align: 'right' });
  doc.text('UNIT', 125, y + 5.5, { align: 'right' });
  doc.text('UNIT PRICE', 155, y + 5.5, { align: 'right' });
  doc.text('TOTAL', W - 17, y + 5.5, { align: 'right' });
  y += 10;

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 60, 80);
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, W - 28, 8, 'F');
    }
    doc.setFontSize(8);
    doc.text(item.product_name || '', 17, y + 5);
    doc.text(String(item.qty || 0), 110, y + 5, { align: 'right' });
    doc.text(item.unit || '', 125, y + 5, { align: 'right' });
    doc.text(`LKR ${(item.unit_price || 0).toLocaleString()}`, 155, y + 5, { align: 'right' });
    doc.text(`LKR ${(item.line_total || 0).toLocaleString()}`, W - 17, y + 5, { align: 'right' });
    y += 8;
    if (y > 260) { doc.addPage(); y = 20; }
  });

  y += 4;
  doc.setDrawColor(200, 210, 220);
  doc.line(14, y, W - 14, y);
  y += 6;

  // Totals block
  const subtotal = items.reduce((s, i) => s + (i.line_total || 0), 0);
  const taxAmt = subtotal * TAX_RATE;
  const grandTotal = subtotal + taxAmt;

  const totalsX = W - 80;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 80, 100);
  doc.text('Subtotal:', totalsX, y);
  doc.text(`LKR ${subtotal.toLocaleString()}`, W - 17, y, { align: 'right' });
  y += 7;
  doc.text(`VAT (${(TAX_RATE * 100).toFixed(0)}%):`, totalsX, y);
  doc.text(`LKR ${taxAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, W - 17, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(200, 210, 220);
  doc.line(totalsX, y, W - 14, y);
  y += 5;

  // Grand total highlight
  doc.setFillColor(30, 41, 59);
  doc.rect(totalsX - 2, y - 1, W - 14 - totalsX + 4, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', totalsX, y + 6.5);
  doc.text(`LKR ${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, W - 17, y + 6.5, { align: 'right' });
  y += 18;

  // Payment status & terms
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 80, 100);
  doc.text(`Payment Status: ${(order.payment_status || '').toUpperCase()}`, 14, y);
  if (provider.payment_terms_days) {
    doc.text(`Payment Terms: Net ${provider.payment_terms_days} days`, 14, y + 7);
  }
  y += 18;

  // Notes
  if (order.notes) {
    doc.setFontSize(8);
    doc.setTextColor(100, 120, 140);
    doc.text(`Notes: ${order.notes}`, 14, y);
    y += 10;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 170, 190);
  doc.text('Thank you for your business.', W / 2, 285, { align: 'center' });

  doc.save(`Invoice_${order.order_number}.pdf`);
}

export default function WSProviderOrders({ provider }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [generatingPdf, setGeneratingPdf] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ['wsOrders', provider.id],
    queryFn: () => base44.entities.WholesaleOrder.filter({ provider_id: provider.id }, '-created_date', 100),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['wsOrderItems', provider.id],
    queryFn: () => base44.entities.WholesaleOrderItem.filter({ provider_id: provider.id }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, payment_status, admin_notes }) => {
      return await base44.entities.WholesaleOrder.update(id, { status, payment_status, admin_notes });
    },
    onSuccess: () => { queryClient.invalidateQueries(['wsOrders', provider.id]); toast.success('Order updated!'); },
  });

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-slate-500 flex items-center">{filtered.length} orders</div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No orders found</p>
        </div>
      ) : filtered.map(order => {
        const items = allItems.filter(i => i.order_id === order.id);
        const expanded = expandedId === order.id;
        return (
          <Card key={order.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : order.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{order.order_number}</p>
                    <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                    <Badge className={PAY_COLORS[order.payment_status]}>{order.payment_status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{order.company_name} · {new Date(order.created_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-indigo-700">LKR {order.total?.toLocaleString()}</p>
                  {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {expanded && (
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                  {items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Items:</p>
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm py-1 border-b border-slate-50">
                          <span>{item.product_name} × {item.qty} {item.unit}</span>
                          <span className="font-semibold text-indigo-700">LKR {item.line_total?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {order.notes && <p className="text-xs text-slate-500 italic">Note: {order.notes}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Update Status</p>
                      <Select defaultValue={order.status} onValueChange={v => updateMutation.mutate({ id: order.id, status: v, payment_status: order.payment_status })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Payment Status</p>
                      <Select defaultValue={order.payment_status} onValueChange={v => updateMutation.mutate({ id: order.id, status: order.status, payment_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['unpaid', 'partial', 'paid', 'credit'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}