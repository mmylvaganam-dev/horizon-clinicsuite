import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function PharmacyOrderRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch pending purchase orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders', 'pending'],
    queryFn: async () => {
      const allOrders = await base44.entities.PurchaseOrder.filter({ status: 'sent' });
      return allOrders;
    },
  });

  // Fetch order lines for detail view
  const { data: orderLines = [] } = useQuery({
    queryKey: ['purchaseOrderLines', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const lines = await base44.entities.PurchaseOrderLine.filter({ po_id: selectedOrder.id });
      return lines;
    },
    enabled: !!selectedOrder,
  });

  // Approve and convert to sale
  const approveMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await base44.functions.invoke('convertPOToSale', { po_id: orderId });
      return response.data;
    },
    onSuccess: () => {
      toast({ description: 'Order approved and converted to credit sale' });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast({ description: `Error: ${error.message}`, variant: 'destructive' });
    },
  });

  const totalCost = orderLines.reduce((sum, line) => sum + (line.unit_price * line.quantity), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Order Requests</h1>
        <p className="text-slate-600 mt-1">Review and approve institution purchase orders</p>
      </div>

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <Card className="bg-slate-50">
            <CardContent className="p-8 text-center text-slate-600">
              No pending orders at this time.
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{order.supplier_name}</h3>
                    <p className="text-sm text-slate-600 mt-1">PO #{order.po_number}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Clock className="w-3 h-3 mr-1" /> Pending Review
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-slate-600">Order Date</p>
                    <p className="font-semibold text-slate-900">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Expected Delivery</p>
                    <p className="font-semibold text-slate-900">{order.expected_delivery || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Created By</p>
                    <p className="font-semibold text-slate-900 truncate">{order.created_by_email}</p>
                  </div>
                </div>

                {order.notes && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-600">Notes</p>
                    <p className="text-sm text-slate-900">{order.notes}</p>
                  </div>
                )}

                <Dialog open={selectedOrder?.id === order.id} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedOrder(order)}
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Order Details - {order.po_number}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Supplier</p>
                          <p className="font-semibold text-slate-900">{order.supplier_name}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Status</p>
                          <p className="font-semibold text-slate-900">Pending Approval</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-slate-900 mb-3">Items</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
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
                          <p className="text-lg font-bold text-slate-900">Total Cost</p>
                          <p className="text-2xl font-bold text-blue-600">${totalCost.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setSelectedOrder(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          className="flex-1 bg-teal-600 hover:bg-teal-700"
                          onClick={() => approveMutation.mutate(order.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {approveMutation.isPending ? 'Processing...' : 'Approve & Convert to Sale'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}