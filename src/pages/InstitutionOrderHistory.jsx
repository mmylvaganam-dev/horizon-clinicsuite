import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Download, FileText, Clock, CheckCircle, Truck } from 'lucide-react';
import InstitutionAuthGate from '@/components/institutions/InstitutionAuthGate';

const statusConfig = {
  draft: { icon: Clock, label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  sent: { icon: Clock, label: 'Pending Review', color: 'bg-blue-100 text-blue-700' },
  approved: { icon: CheckCircle, label: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { icon: AlertCircle, label: 'Rejected', color: 'bg-red-100 text-red-700' },
  received: { icon: CheckCircle, label: 'Received', color: 'bg-green-100 text-green-700' },
  shipped: { icon: Truck, label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
  closed: { icon: CheckCircle, label: 'Closed', color: 'bg-slate-100 text-slate-700' },
};

export default function InstitutionOrderHistory() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
  });

  // Fetch institution for current user
  const { data: institution } = useQuery({
    queryKey: ['userInstitution', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const response = await base44.functions.invoke('getInstitutionForUser');
      return response.data.institution_id ? 
        await base44.entities.Institution.get(response.data.institution_id) : 
        null;
    },
    enabled: !!user?.email,
  });

  // Fetch purchase orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['institutionOrders', institution?.id],
    queryFn: async () => {
      if (!institution?.id) return [];
      const allOrders = await base44.entities.PurchaseOrder.filter({ 
        organization_id: institution.organization_id 
      });
      return allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    enabled: !!institution?.id,
  });

  // Fetch order lines for detail view
  const { data: orderLines = [] } = useQuery({
    queryKey: ['orderLines', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return [];
      const lines = await base44.entities.PurchaseOrderLine.filter({ po_id: selectedOrder.id });
      return lines;
    },
    enabled: !!selectedOrder?.id,
  });

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  const totalCost = orderLines.reduce((sum, line) => sum + (line.unit_price * line.quantity), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  }

  return (
    <InstitutionAuthGate authorized={!!institution} message="You do not have access to view order history">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Order History</h1>
          <p className="text-slate-600 mt-1">View your purchase orders and digital receipts</p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
          >
            All Orders ({orders.length})
          </Button>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <Button 
              key={key}
              variant={filterStatus === key ? 'default' : 'outline'}
              onClick={() => setFilterStatus(key)}
              size="sm"
            >
              {label} ({orders.filter(o => o.status === key).length})
            </Button>
          ))}
        </div>

        {/* Orders List */}
        <div className="grid gap-4">
          {filteredOrders.length === 0 ? (
            <Card className="bg-slate-50">
              <CardContent className="p-8 text-center text-slate-600">
                No orders found.
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const statusInfo = statusConfig[order.status] || statusConfig.draft;
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900">PO #{order.po_number}</h3>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{order.supplier_name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                      <div>
                        <p className="text-slate-600">Order Date</p>
                        <p className="font-semibold text-slate-900">{new Date(order.order_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Expected Delivery</p>
                        <p className="font-semibold text-slate-900">{order.expected_delivery || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Notes</p>
                        <p className="font-semibold text-slate-900 truncate">{order.notes || '—'}</p>
                      </div>
                    </div>

                    {order.rejection_reason && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700 font-semibold">Rejection Reason</p>
                        <p className="text-sm text-red-700">{order.rejection_reason}</p>
                      </div>
                    )}

                    <Dialog open={selectedOrder?.id === order.id} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                          className="w-full"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Details & Receipt
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order Details - PO #{order.po_number}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b">
                            <div>
                              <p className="text-slate-600">Order Date</p>
                              <p className="font-semibold text-slate-900">{new Date(order.order_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Status</p>
                              <Badge className={statusConfig[order.status].color}>
                                {statusConfig[order.status].label}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-slate-600">Supplier</p>
                              <p className="font-semibold text-slate-900">{order.supplier_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Expected Delivery</p>
                              <p className="font-semibold text-slate-900">{order.expected_delivery || 'N/A'}</p>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Items</h4>
                            <div className="space-y-2">
                              {orderLines.map((line) => (
                                <div key={line.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900">{line.product_name}</p>
                                    <p className="text-xs text-slate-600">Qty: {line.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-900">${(line.unit_price * line.quantity).toFixed(2)}</p>
                                    <p className="text-xs text-slate-600">${line.unit_price.toFixed(2)} ea</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                              <p className="text-lg font-bold text-slate-900">Total</p>
                              <p className="text-2xl font-bold text-blue-600">${totalCost.toFixed(2)}</p>
                            </div>
                          </div>

                          <Button className="w-full gap-2 bg-teal-600 hover:bg-teal-700">
                            <Download className="w-4 h-4" />
                            Download Receipt
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </InstitutionAuthGate>
  );
}