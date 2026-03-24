import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, CheckCircle, Mail, Package, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WSStockAlerts({ provider }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['wsProducts', provider.id],
    queryFn: () => base44.entities.WholesaleProduct.filter({ provider_id: provider.id }),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const lowStockProducts = products.filter(p =>
    p.status === 'active' &&
    p.reorder_level != null &&
    p.stock_qty <= p.reorder_level
  );

  const outOfStock = lowStockProducts.filter(p => p.stock_qty === 0);
  const criticalStock = lowStockProducts.filter(p => p.stock_qty > 0 && p.stock_qty <= (p.reorder_level * 0.5));
  const lowStock = lowStockProducts.filter(p => p.stock_qty > (p.reorder_level * 0.5));

  const handleSendEmail = async () => {
    if (lowStockProducts.length === 0) {
      toast.success('All products are above reorder levels — no alerts to send!');
      return;
    }
    setSending(true);
    try {
      const recipientEmails = provider.admin_emails?.length > 0 ? provider.admin_emails : [user?.email];
      const itemLines = lowStockProducts.map(p =>
        `• ${p.name} (SKU: ${p.sku || 'N/A'}) — Stock: ${p.stock_qty} ${p.unit} | Reorder Level: ${p.reorder_level} ${p.unit}`
      ).join('\n');

      for (const email of recipientEmails) {
        if (!email) continue;
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `⚠️ Low Stock Alert — ${provider.company_name} (${lowStockProducts.length} items)`,
          body: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e293b;padding:24px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">⚠️ Wholesale Stock Alert</h1>
    <p style="color:#94a3b8;margin:4px 0 0">${provider.company_name}</p>
  </div>
  <div style="background:#fefce8;border:1px solid #fbbf24;padding:16px 24px">
    <p style="margin:0;color:#92400e;font-weight:bold">${lowStockProducts.length} product(s) have fallen below their reorder level</p>
  </div>
  <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0">
    <h2 style="color:#1e293b;font-size:16px;margin:0 0 16px">Products Requiring Attention</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#e2e8f0">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569">Product</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#475569">Current Stock</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#475569">Reorder Level</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#475569">Status</th>
        </tr>
      </thead>
      <tbody>
        ${lowStockProducts.map((p, i) => `
        <tr style="background:${i % 2 === 0 ? 'white' : '#f8fafc'}">
          <td style="padding:8px 12px;font-size:13px">
            <strong>${p.name}</strong><br/>
            <span style="color:#94a3b8;font-size:11px">SKU: ${p.sku || 'N/A'} | ${p.category}</span>
          </td>
          <td style="padding:8px 12px;text-align:center;font-weight:bold;color:${p.stock_qty === 0 ? '#dc2626' : '#d97706'}">${p.stock_qty} ${p.unit}</td>
          <td style="padding:8px 12px;text-align:center;color:#64748b">${p.reorder_level} ${p.unit}</td>
          <td style="padding:8px 12px;text-align:center">
            <span style="background:${p.stock_qty === 0 ? '#fee2e2' : '#fef3c7'};color:${p.stock_qty === 0 ? '#dc2626' : '#d97706'};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:bold">
              ${p.stock_qty === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
            </span>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div style="background:#f1f5f9;padding:16px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0;color:#64748b;font-size:12px">This alert was sent from Horizon ClinicSuite · Wholesale Pharma Module</p>
  </div>
</div>
          `,
        });
      }
      toast.success(`Alert email sent to ${recipientEmails.filter(Boolean).length} recipient(s)!`);
    } catch (e) {
      toast.error('Failed to send email alert: ' + e.message);
    }
    setSending(false);
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="space-y-6 mt-4">
      {/* Summary Banner */}
      <div className={`rounded-xl p-5 border-2 flex items-center justify-between flex-wrap gap-4 ${
        lowStockProducts.length === 0
          ? 'bg-green-50 border-green-200'
          : outOfStock.length > 0 ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'
      }`}>
        <div className="flex items-center gap-3">
          {lowStockProducts.length === 0
            ? <CheckCircle className="w-8 h-8 text-green-600" />
            : <AlertTriangle className={`w-8 h-8 ${outOfStock.length > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
          }
          <div>
            <p className={`font-bold text-lg ${lowStockProducts.length === 0 ? 'text-green-800' : outOfStock.length > 0 ? 'text-red-800' : 'text-yellow-800'}`}>
              {lowStockProducts.length === 0
                ? 'All products are well-stocked'
                : `${lowStockProducts.length} product(s) need restocking`}
            </p>
            {lowStockProducts.length > 0 && (
              <p className="text-sm text-slate-600">
                {outOfStock.length > 0 && `${outOfStock.length} out of stock · `}
                {criticalStock.length > 0 && `${criticalStock.length} critical · `}
                {lowStock.length > 0 && `${lowStock.length} low`}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries(['wsProducts', provider.id])}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSendEmail}
            disabled={sending}
          >
            <Mail className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Email Alert'}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Out of Stock', count: outOfStock.length, color: 'bg-red-100 text-red-700 border-red-200' },
          { label: 'Critical (≤50% reorder)', count: criticalStock.length, color: 'bg-orange-100 text-orange-700 border-orange-200' },
          { label: 'Low Stock', count: lowStock.length, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
        ].map(s => (
          <Card key={s.label} className={`border-2 ${s.color}`}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-black">{s.count}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert List */}
      {lowStockProducts.length > 0 && (
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" /> Products Below Reorder Level
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {lowStockProducts.map(p => {
                const pct = p.reorder_level > 0 ? Math.round((p.stock_qty / p.reorder_level) * 100) : 0;
                const isOut = p.stock_qty === 0;
                const isCritical = !isOut && p.stock_qty <= p.reorder_level * 0.5;
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-red-100' : isCritical ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                        <Package className={`w-5 h-5 ${isOut ? 'text-red-600' : isCritical ? 'text-orange-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.brand && `${p.brand} · `}{p.sku && `SKU: ${p.sku} · `}{p.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-black text-lg ${isOut ? 'text-red-600' : isCritical ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {p.stock_qty} <span className="text-sm font-normal text-slate-400">{p.unit}</span>
                        </p>
                        <p className="text-xs text-slate-400">Reorder at: {p.reorder_level} {p.unit}</p>
                      </div>
                      <Badge className={isOut ? 'bg-red-100 text-red-700' : isCritical ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}>
                        {isOut ? 'OUT OF STOCK' : isCritical ? 'CRITICAL' : 'LOW'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All products stock overview */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-700">All Products — Stock Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {products.filter(p => p.status === 'active').map(p => {
              const reorderLevel = p.reorder_level ?? 0;
              const pct = reorderLevel > 0 ? Math.min(100, Math.round((p.stock_qty / reorderLevel) * 100)) : 100;
              const isLow = p.stock_qty <= reorderLevel && reorderLevel > 0;
              return (
                <div key={p.id} className="px-5 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{p.name}</span>
                    <span className={`text-xs font-bold ${isLow ? 'text-red-600' : 'text-slate-500'}`}>
                      {p.stock_qty} / {reorderLevel || '—'} {p.unit}
                    </span>
                  </div>
                  {reorderLevel > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct <= 0 ? 'bg-red-500' : pct <= 50 ? 'bg-orange-400' : pct <= 100 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}