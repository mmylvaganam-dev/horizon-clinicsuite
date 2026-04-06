import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ShoppingCart, Plus, Trash2, Search, Building2, ClipboardList,
  PackageCheck, FileText, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// URL param: ?org=<pharmacyOrgId>&institution=<institutionName>
export default function CreditBuyerPortal() {
  const params = new URLSearchParams(window.location.search);
  const pharmacyOrgId = params.get('org');
  const institutionParam = params.get('institution') || '';

  const queryClient = useQueryClient();

  const [institutionName, setInstitutionName] = useState(institutionParam);
  const [verified, setVerified] = useState(!!institutionParam);
  const [verifyInput, setVerifyInput] = useState(institutionParam);

  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderLines, setOrderLines] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  // Fetch pharmacy stock for item selection
  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['buyerPortalStock', pharmacyOrgId],
    queryFn: () => pharmacyOrgId
      ? base44.entities.PharmacyStock.filter({ organization_id: pharmacyOrgId })
      : [],
    enabled: !!pharmacyOrgId && verified,
  });

  // Fetch all purchase orders for this institution
  const { data: myOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['buyerPortalOrders', pharmacyOrgId, institutionName],
    queryFn: () => pharmacyOrgId
      ? base44.entities.PurchaseOrder.filter({ organization_id: pharmacyOrgId }, '-created_date')
      : [],
    enabled: !!pharmacyOrgId && verified && !!institutionName,
    select: (data) => data.filter(po =>
      po.notes?.includes('CREDIT_BUYER_ORDER') &&
      po.supplier_name === institutionName
    ),
  });

  // Fetch PO lines for all my orders
  const { data: allLines = [] } = useQuery({
    queryKey: ['buyerPortalPOLines', myOrders.map(o => o.id).join(',')],
    queryFn: () => base44.entities.PurchaseOrderLine.list(),
    enabled: myOrders.length > 0,
  });

  const stockItems = useMemo(() => {
    return pharmacyStock
      .filter(s => s.display_name || s.brand_name)
      .map(s => ({
        id: s.id,
        name: s.display_name || s.brand_name,
        price: s.unit_price || s.mrp || 0,
        sku: s.product_id || s.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pharmacyStock]);

  const filteredStockItems = useMemo(() => {
    if (!itemSearch) return stockItems;
    const q = itemSearch.toLowerCase();
    return stockItems.filter(i => i.name?.toLowerCase().includes(q));
  }, [stockItems, itemSearch]);

  const createOrderMutation = useMutation({
    mutationFn: async ({ lines, notes, deliveryDate }) => {
      const year = new Date().getFullYear();
      const poNumber = `CPO-${year}-${Date.now().toString().slice(-5)}`;
      const po = await base44.entities.PurchaseOrder.create({
        organization_id: pharmacyOrgId,
        po_number: poNumber,
        supplier_name: institutionName,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: deliveryDate || null,
        notes: `CREDIT_BUYER_ORDER|Institution: ${institutionName}|${notes || ''}`,
        status: 'draft',
      });
      for (const line of lines) {
        await base44.entities.PurchaseOrderLine.create({
          purchase_order_id: po.id,
          sku_code: line.sku,
          item_name: line.name,
          qty_ordered: line.qty,
          unit_cost: line.price,
          line_total: line.qty * line.price,
        });
      }
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerPortalOrders'] });
      queryClient.invalidateQueries({ queryKey: ['buyerPortalPOLines'] });
      setShowOrderDialog(false);
      setOrderLines([]);
      setOrderNotes('');
      setOrderDeliveryDate('');
      setItemSearch('');
      toast.success('Order submitted successfully!');
    },
    onError: (err) => toast.error(err.message),
  });

  const addLine = () => setOrderLines(prev => [...prev, { id: Date.now(), sku: '', name: '', qty: 1, price: 0 }]);
  const updateLine = (id, field, value) => setOrderLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  const removeLine = (id) => setOrderLines(prev => prev.filter(l => l.id !== id));

  const handleSubmit = () => {
    if (!orderLines.length || orderLines.some(l => !l.name)) {
      toast.error('Please add at least one item');
      return;
    }
    createOrderMutation.mutate({ lines: orderLines, notes: orderNotes, deliveryDate: orderDeliveryDate });
  };

  const openNewOrder = () => {
    setOrderLines([]);
    setOrderNotes('');
    setOrderDeliveryDate('');
    setItemSearch('');
    setShowOrderDialog(true);
  };

  const statusColors = {
    draft: 'bg-amber-100 text-amber-800',
    sent: 'bg-blue-100 text-blue-800',
    received: 'bg-emerald-100 text-emerald-800',
    closed: 'bg-slate-100 text-slate-600',
  };

  // ── No org param ──
  if (!pharmacyOrgId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Portal Link</h2>
          <p className="text-slate-600 text-sm">This portal link is missing required parameters. Please contact the pharmacy for the correct link.</p>
        </Card>
      </div>
    );
  }

  // ── Verify institution ──
  if (!verified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-6">
            <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-slate-900">Credit Buyer Portal</h2>
            <p className="text-slate-600 text-sm mt-1">Enter your institution name to access your account</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Institution Name</Label>
              <Input
                value={verifyInput}
                onChange={e => setVerifyInput(e.target.value)}
                placeholder="e.g. General Hospital Colombo"
                onKeyDown={e => e.key === 'Enter' && verifyInput.trim() && (setInstitutionName(verifyInput.trim()), setVerified(true))}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => { setInstitutionName(verifyInput.trim()); setVerified(true); }}
              disabled={!verifyInput.trim()}
            >
              Access Portal
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Credit Buyer Portal</h1>
              <p className="text-sm text-slate-500">{institutionName}</p>
            </div>
          </div>
          <Button onClick={openNewOrder}>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">{myOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{myOrders.filter(o => o.status === 'draft').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500 mb-1">Received</p>
              <p className="text-2xl font-bold text-emerald-600">{myOrders.filter(o => o.status === 'received').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500 mb-1">Order Value</p>
              <p className="text-lg font-bold text-blue-600">
                Rs. {myOrders.reduce((sum, po) => {
                  const lines = allLines.filter(l => l.purchase_order_id === po.id);
                  return sum + lines.reduce((s, l) => s + (l.line_total || 0), 0);
                }, 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              My Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="text-center py-8 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading orders...
              </div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No orders yet</p>
                <p className="text-slate-400 text-sm mt-1">Click "New Order" to place your first order</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map(po => {
                  const lines = allLines.filter(l => l.purchase_order_id === po.id);
                  const total = lines.reduce((s, l) => s + (l.line_total || 0), 0);
                  return (
                    <div key={po.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900 font-mono">{po.po_number}</p>
                          <p className="text-sm text-slate-500">
                            Placed: {format(new Date(po.order_date || po.created_date), 'd MMM yyyy')}
                            {po.expected_delivery && ` • Requested by: ${format(new Date(po.expected_delivery), 'd MMM yyyy')}`}
                          </p>
                          {po.notes?.split('|')[2] && (
                            <p className="text-xs text-slate-500 mt-1 italic">{po.notes.split('|')[2]}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[po.status] || 'bg-slate-100 text-slate-600'}>
                            {po.status === 'draft' ? 'Pending Review' : po.status === 'sent' ? 'Processing' : po.status === 'received' ? 'Fulfilled' : po.status}
                          </Badge>
                          <span className="font-bold text-slate-900">Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      {lines.length > 0 && (
                        <div className="bg-slate-50 rounded p-2 space-y-1">
                          {lines.map(line => (
                            <div key={line.id} className="flex justify-between text-sm">
                              <span className="text-slate-700">{line.item_name} × {line.qty_ordered}</span>
                              <span className="text-slate-600">Rs. {(line.line_total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
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

      {/* New Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              New Purchase Order — {institutionName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery / Required Date</Label>
                <Input type="date" value={orderDeliveryDate} onChange={e => setOrderDeliveryDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="e.g. urgent, monthly supply" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items *</Label>
                <Button size="sm" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>

              {orderLines.length > 0 && stockItems.length > 0 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input className="pl-9 text-sm" placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                </div>
              )}

              <div className="space-y-3">
                {orderLines.map(line => (
                  <Card key={line.id} className="p-3 bg-slate-50">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        {stockItems.length > 0 ? (
                          <Select
                            value={line.sku}
                            onValueChange={val => {
                              const item = stockItems.find(i => i.sku === val);
                              updateLine(line.id, 'sku', val);
                              updateLine(line.id, 'name', item?.name || val);
                              updateLine(line.id, 'price', item?.price || 0);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {filteredStockItems.map(item => (
                                <SelectItem key={item.sku} value={item.sku}>
                                  {item.name}
                                  {item.price > 0 && <span className="text-xs text-slate-400 ml-1">Rs.{item.price}</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Item name"
                            value={line.name}
                            onChange={e => updateLine(line.id, 'name', e.target.value)}
                          />
                        )}
                      </div>
                      <div className="w-20">
                        <Input
                          type="number" min="1" placeholder="Qty"
                          value={line.qty}
                          onChange={e => updateLine(line.id, 'qty', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </div>
                    {line.name && (
                      <p className="text-xs text-slate-500 mt-1">{line.name} × {line.qty}</p>
                    )}
                  </Card>
                ))}

                {orderLines.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-slate-400 text-sm">Click "Add Item" to start building your order</p>
                  </div>
                )}
              </div>

              {orderLines.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3 flex justify-between items-center">
                  <span className="font-medium text-blue-900">{orderLines.length} item{orderLines.length !== 1 ? 's' : ''}</span>
                  <span className="text-lg font-bold text-blue-900">
                    Rs. {orderLines.reduce((s, l) => s + (l.qty * l.price), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowOrderDialog(false)}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createOrderMutation.isPending || orderLines.length === 0}
              >
                {createOrderMutation.isPending ? 'Submitting...' : 'Submit Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}