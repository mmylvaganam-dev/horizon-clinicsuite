import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Package } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function BatchesTab({ batches, locations, expiryDays = 90 }) {
  const getLocationName = (locationId) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Unknown';
  };

  const getExpiryStatus = (expiryDate) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { status: 'expired', color: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Expired' };
    if (days <= 30) return { status: 'critical', color: 'bg-red-100 text-red-700 border-red-200', label: `${days}d left` };
    if (days <= expiryDays) return { status: 'warning', color: 'bg-amber-100 text-amber-700 border-amber-200', label: `${days}d left` };
    return { status: 'ok', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: `${days}d left` };
  };

  const sortedBatches = [...batches].sort((a, b) => 
    new Date(a.expiry_date) - new Date(b.expiry_date)
  );

  const expiringBatches = sortedBatches.filter(b => {
    const days = differenceInDays(parseISO(b.expiry_date), new Date());
    return days >= 0 && days <= expiryDays;
  });

  const expiredBatches = sortedBatches.filter(b => 
    differenceInDays(parseISO(b.expiry_date), new Date()) < 0
  );

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(expiredBatches.length > 0 || expiringBatches.length > 0) && (
        <div className="space-y-3">
          {expiredBatches.length > 0 && (
            <Card className="bg-rose-50 border-rose-200 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <div>
                  <p className="font-medium text-rose-900">
                    {expiredBatches.length} expired batch{expiredBatches.length > 1 ? 'es' : ''}
                  </p>
                  <p className="text-sm text-rose-700">Remove from inventory immediately</p>
                </div>
              </div>
            </Card>
          )}
          {expiringBatches.length > 0 && (
            <Card className="bg-amber-50 border-amber-200 p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    {expiringBatches.length} batch{expiringBatches.length > 1 ? 'es' : ''} expiring within {expiryDays} days
                  </p>
                  <p className="text-sm text-amber-700">Plan for usage or disposal</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Batch List */}
      <div className="space-y-3">
        {sortedBatches.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No batches tracked</h3>
            <p className="text-slate-500 mt-1">Batches will appear here when stock is received</p>
          </Card>
        ) : (
          sortedBatches.map((batch) => {
            const expiryStatus = getExpiryStatus(batch.expiry_date);
            
            return (
              <Card key={batch.id} className={`p-5 ${expiryStatus.status === 'expired' ? 'bg-rose-50 border-rose-200' : expiryStatus.status === 'critical' ? 'bg-red-50 border-red-200' : expiryStatus.status === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{batch.item_name}</h3>
                      <Badge variant="outline" className="font-mono text-xs">
                        {batch.sku_code}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs bg-slate-100">
                        Batch: {batch.batch_number}
                      </Badge>
                      <Badge variant="outline" className={expiryStatus.color}>
                        {expiryStatus.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Location</p>
                        <p className="font-medium">{getLocationName(batch.location_id)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Quantity</p>
                        <p className="font-medium text-lg">{batch.qty_on_hand}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Expiry Date</p>
                        <p className="font-medium">{format(parseISO(batch.expiry_date), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Received</p>
                        <p className="font-medium">{format(new Date(batch.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}