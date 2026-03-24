import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Mail, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import toast from 'react-hot-toast';

export default function LowStockWidget({ selectedOrgId, orgFilter }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sendingAlert, setSendingAlert] = useState(false);

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['lowStockWidget', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.PharmacyStock.filter(orgFilter, 'quantity');
    },
    enabled: !!selectedOrgId,
    refetchInterval: 60000,
  });

  const lowStockItems = stock.filter(item => {
    if (item.quality_status && item.quality_status !== 'usable') return false;
    const minLevel = item.minimum_stock_level ?? 5;
    return item.quantity <= minLevel;
  });

  const outOfStock = lowStockItems.filter(i => i.quantity === 0);
  const belowMin = lowStockItems.filter(i => i.quantity > 0);

  const flagMutation = useMutation({
    mutationFn: (item) => base44.entities.PharmacyStock.update(item.id, {
      is_reorder_flag: true,
      last_reorder_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowStockWidget', selectedOrgId] });
    },
  });

  const handleSendAlert = async () => {
    setSendingAlert(true);
    try {
      const res = await base44.functions.invoke('checkLowStock', { organization_id: selectedOrgId });
      const { alerted, emails_sent } = res.data;
      if (emails_sent > 0) {
        toast.success(`Alert sent! ${alerted} items reported to ${emails_sent} admin(s).`);
      } else {
        toast.success(`Alert processed — ${alerted} items flagged. (No admin emails configured)`);
      }
      queryClient.invalidateQueries({ queryKey: ['lowStockWidget', selectedOrgId] });
    } catch (err) {
      toast.error('Failed to send alert');
    } finally {
      setSendingAlert(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
            <CheckCircle className="w-5 h-5" />
            Stock Levels Healthy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-emerald-700">All items are above their reorder thresholds.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${outOfStock.length > 0 ? 'border-red-400' : 'border-amber-400'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${outOfStock.length > 0 ? 'text-red-600' : 'text-amber-600'}`} />
            Restock Needed
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={outOfStock.length > 0 ? 'bg-red-600' : 'bg-amber-600'}>
              {lowStockItems.length} items
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-1">
          {outOfStock.length > 0 && (
            <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
              {outOfStock.length} out of stock
            </span>
          )}
          {belowMin.length > 0 && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {belowMin.length} below minimum
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Item list — show top 5 */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {lowStockItems.slice(0, 8).map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                item.quantity === 0
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{item.display_name}</p>
                <p className="text-xs text-slate-500">
                  Qty: <strong className={item.quantity === 0 ? 'text-red-700' : 'text-amber-700'}>{item.quantity}</strong>
                  {' '}/ min: {item.minimum_stock_level ?? 5}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {item.quantity === 0 && (
                  <Badge className="bg-red-600 text-white text-xs px-1.5 py-0">Out</Badge>
                )}
                {!item.is_reorder_flag ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                    onClick={() => flagMutation.mutate(item)}
                    disabled={flagMutation.isPending}
                  >
                    Flag
                  </Button>
                ) : (
                  <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0">Flagged</Badge>
                )}
              </div>
            </div>
          ))}
          {lowStockItems.length > 8 && (
            <p className="text-xs text-center text-slate-500 pt-1">
              +{lowStockItems.length - 8} more items
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={handleSendAlert}
            disabled={sendingAlert}
          >
            {sendingAlert ? (
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Mail className="w-3 h-3 mr-1" />
            )}
            {sendingAlert ? 'Sending...' : 'Email Alert'}
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-amber-600 hover:bg-amber-700"
            onClick={() => navigate(createPageUrl('StockMonitoring'))}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}