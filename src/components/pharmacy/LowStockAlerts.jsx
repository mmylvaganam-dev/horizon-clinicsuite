import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Package
} from 'lucide-react';
import { format } from 'date-fns';

export default function LowStockAlerts({ items, onFlagForReorder, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Categorize items
  const criticalStock = items.filter(item => item.quantity === 0);
  const lowStock = items.filter(
    item => item.quantity > 0 && item.quantity <= item.minimum_stock_level
  );
  const flaggedItems = items.filter(item => item.is_reorder_flag);

  const totalAlertItems = criticalStock.length + lowStock.length;

  if (totalAlertItems === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">All stock levels healthy</p>
              <p className="text-sm text-green-700">No items below minimum threshold</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Stock Alert</p>
                <p className="text-sm text-red-700 mt-1">
                  {criticalStock.length > 0 && (
                    <span>
                      <strong>{criticalStock.length}</strong> item{criticalStock.length !== 1 ? 's' : ''} out of stock
                      {lowStock.length > 0 && ` • `}
                    </span>
                  )}
                  {lowStock.length > 0 && (
                    <span>
                      <strong>{lowStock.length}</strong> item{lowStock.length !== 1 ? 's' : ''} below minimum
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Badge className="bg-red-600 text-white">{totalAlertItems} Alert{totalAlertItems !== 1 ? 's' : ''}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Critical Stock */}
      {criticalStock.length > 0 && (
        <Card className="border-red-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              Out of Stock ({criticalStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {criticalStock.map((item) => (
                <div key={item.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">{item.display_name}</p>
                    <div className="flex gap-2 mt-1">
                      {item.generic_name && (
                        <Badge variant="outline" className="text-xs">{item.generic_name}</Badge>
                      )}
                      <Badge className="bg-red-600 text-white text-xs">OUT OF STOCK</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onFlagForReorder(item)}
                    className={`flex-shrink-0 ${item.is_reorder_flag ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {item.is_reorder_flag ? '✓ Flagged' : 'Flag'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Low Stock ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStock.map((item) => {
                const percentOfMin = ((item.quantity / item.minimum_stock_level) * 100).toFixed(0);
                return (
                  <div key={item.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">{item.display_name}</p>
                      <div className="flex gap-2 mt-1 items-center">
                        {item.generic_name && (
                          <Badge variant="outline" className="text-xs">{item.generic_name}</Badge>
                        )}
                        <Badge className="bg-amber-600 text-white text-xs">
                          {item.quantity} of {item.minimum_stock_level}
                        </Badge>
                        <span className="text-xs text-amber-700 font-medium">{percentOfMin}% of min</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onFlagForReorder(item)}
                      className={`flex-shrink-0 ${item.is_reorder_flag ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                    >
                      {item.is_reorder_flag ? '✓ Flagged' : 'Flag'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flagged for Reorder */}
      {flaggedItems.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-blue-600" />
              Flagged for Reorder ({flaggedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {flaggedItems.map((item) => (
                <div key={item.id} className="p-3 bg-white border border-blue-200 rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">{item.display_name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-slate-600">Stock: {item.quantity}</span>
                      {item.reorder_quantity && (
                        <span className="text-xs text-slate-600">• Order: {item.reorder_quantity}</span>
                      )}
                      {item.last_reorder_date && (
                        <span className="text-xs text-blue-600">• Last: {format(new Date(item.last_reorder_date), 'd MMM')}</span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-blue-600 text-white flex-shrink-0">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}