import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  TrendingDown,
  Package,
  Search,
  Settings,
  AlertCircle,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import LowStockAlerts from '@/components/pharmacy/LowStockAlerts';

export default function StockMonitoring() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [showThresholdDialog, setShowThresholdDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newMinimum, setNewMinimum] = useState('');
  const [newReorderQty, setNewReorderQty] = useState('');

  // Fetch pharmacy stock
  const { data: pharmacyStock = [], isLoading } = useQuery({
    queryKey: ['pharmacyStockMonitoring', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.PharmacyStock.filter(orgFilter, 'quantity');
    },
    enabled: !!selectedOrgId,
  });

  // Filter items with issues
  const itemsWithAlerts = pharmacyStock.filter(item =>
    item.quality_status === 'usable' &&
    item.quantity <= (item.minimum_stock_level || 5)
  );

  // Search filtering
  const filteredAlertItems = itemsWithAlerts.filter(item =>
    item.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.includes(searchQuery)
  );

  // Stats
  const criticalCount = itemsWithAlerts.filter(item => item.quantity === 0).length;
  const lowStockCount = itemsWithAlerts.filter(item => item.quantity > 0 && item.quantity <= item.minimum_stock_level).length;
  const flaggedCount = pharmacyStock.filter(item => item.is_reorder_flag).length;

  // Flag for reorder mutation
  const flagReorderMutation = useMutation({
    mutationFn: async (item) => {
      return base44.entities.PharmacyStock.update(item.id, {
        is_reorder_flag: !item.is_reorder_flag,
        last_reorder_date: !item.is_reorder_flag ? new Date().toISOString() : item.last_reorder_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyStockMonitoring'] });
      toast.success('Item flag updated');
    },
    onError: () => {
      toast.error('Failed to update flag');
    }
  });

  // Update minimum threshold mutation
  const updateThresholdMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem || !newMinimum) throw new Error('Missing required fields');
      return base44.entities.PharmacyStock.update(selectedItem.id, {
        minimum_stock_level: parseFloat(newMinimum),
        reorder_quantity: newReorderQty ? parseFloat(newReorderQty) : selectedItem.reorder_quantity
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyStockMonitoring'] });
      setShowThresholdDialog(false);
      setSelectedItem(null);
      setNewMinimum('');
      setNewReorderQty('');
      toast.success('Threshold updated');
    },
    onError: () => {
      toast.error('Failed to update threshold');
    }
  });

  const handleSetThreshold = (item) => {
    setSelectedItem(item);
    setNewMinimum(item.minimum_stock_level?.toString() || '5');
    setNewReorderQty(item.reorder_quantity?.toString() || '');
    setShowThresholdDialog(true);
  };

  if (!selectedOrgId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Organization Selected</h2>
          <p className="text-slate-600">Please select an organization to continue.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-600" />
              Stock Monitoring
            </h1>
            <p className="text-slate-600 mt-1">Monitor stock levels and manage low-stock alerts</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">Out of Stock</p>
                <p className="text-3xl font-bold text-red-700">{criticalCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-amber-600 font-medium">Low Stock</p>
                <p className="text-3xl font-bold text-amber-700">{lowStockCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-blue-600 font-medium">Flagged for Reorder</p>
                <p className="text-3xl font-bold text-blue-700">{flaggedCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 font-medium">Total Products</p>
                <p className="text-3xl font-bold text-slate-900">{pharmacyStock.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Stock Alerts
          </h2>
          <LowStockAlerts
            items={filteredAlertItems}
            onFlagForReorder={(item) => flagReorderMutation.mutate(item)}
            isLoading={isLoading}
          />
        </div>

        {/* Low Stock Items Detailed List */}
        {itemsWithAlerts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Items Below Threshold
              </h2>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="text-left p-3 font-semibold">Product</th>
                        <th className="text-center p-3 font-semibold">Current</th>
                        <th className="text-center p-3 font-semibold">Minimum</th>
                        <th className="text-center p-3 font-semibold">Reorder Qty</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                        <th className="text-center p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlertItems.map((item) => {
                        const percentOfMin = item.minimum_stock_level ? ((item.quantity / item.minimum_stock_level) * 100).toFixed(0) : 'N/A';
                        return (
                          <tr key={item.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-slate-900">{item.display_name}</p>
                                {item.generic_name && (
                                  <p className="text-xs text-slate-600 mt-1">{item.generic_name}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className={item.quantity === 0 ? 'bg-red-600' : 'bg-amber-600'}>
                                {item.quantity}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-medium">
                              {item.minimum_stock_level || 5}
                            </td>
                            <td className="p-3 text-center text-slate-600">
                              {item.reorder_quantity || '-'}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {item.quantity === 0 ? (
                                  <Badge className="bg-red-600 text-white">Out</Badge>
                                ) : (
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-colors ${
                                        item.quantity === 0 ? 'bg-red-600' : 'bg-amber-600'
                                      }`}
                                      style={{ width: `${Math.min(percentOfMin, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                                {item.is_reorder_flag && (
                                  <Badge className="bg-blue-600 text-white text-xs">Flagged</Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetThreshold(item)}
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Set
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => flagReorderMutation.mutate(item)}
                                className={item.is_reorder_flag ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}
                                disabled={flagReorderMutation.isPending}
                              >
                                {item.is_reorder_flag ? '✓' : 'Flag'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Threshold Settings Dialog */}
      <Dialog open={showThresholdDialog} onOpenChange={setShowThresholdDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Minimum Stock Threshold</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border">
                <p className="text-sm text-slate-600 mb-1">Product</p>
                <p className="font-semibold text-slate-900">{selectedItem.display_name}</p>
                <p className="text-xs text-slate-600 mt-2">Current Stock: {selectedItem.quantity}</p>
              </div>

              <div>
                <Label className="text-sm">Minimum Stock Level *</Label>
                <Input
                  type="number"
                  value={newMinimum}
                  onChange={(e) => setNewMinimum(e.target.value)}
                  placeholder="e.g., 10"
                  className="mt-1"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-slate-600 mt-1">Alert when stock falls below this quantity</p>
              </div>

              <div>
                <Label className="text-sm">Reorder Quantity (Optional)</Label>
                <Input
                  type="number"
                  value={newReorderQty}
                  onChange={(e) => setNewReorderQty(e.target.value)}
                  placeholder="e.g., 50"
                  className="mt-1"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-slate-600 mt-1">Standard quantity to order when reordering</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowThresholdDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateThresholdMutation.mutate()}
                  disabled={!newMinimum || updateThresholdMutation.isPending}
                  className="flex-1"
                >
                  {updateThresholdMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}