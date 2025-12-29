import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  ShoppingBag, 
  FileText, 
  Building2,
  PackageCheck
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Procurement() {
  const queryClient = useQueryClient();
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    email: '',
    address: ''
  });

  const [poForm, setPOForm] = useState({
    locationId: '',
    supplierName: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    notes: ''
  });

  const [poLines, setPOLines] = useState([]);
  const [receiveLines, setReceiveLines] = useState([]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_at'),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_at'),
  });

  const { data: poLines: allPOLines = [] } = useQuery({
    queryKey: ['purchaseOrderLines'],
    queryFn: () => base44.entities.PurchaseOrderLine.list(),
  });

  const { data: drugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.DrugCatalog.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create({
      ...data,
      created_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setShowSupplierDialog(false);
      setSupplierForm({ name: '', contact: '', email: '', address: '' });
      toast.success('Supplier created!');
    }
  });

  const createPOMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createPurchaseOrder', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderLines'] });
      setShowPODialog(false);
      setPOLines([]);
      setPOForm({ locationId: '', supplierName: '', orderDate: new Date().toISOString().split('T')[0], expectedDelivery: '', notes: '' });
      toast.success('Purchase order created!');
    }
  });

  const receiveGoodsMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('receiveGoods', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBalances'] });
      queryClient.invalidateQueries({ queryKey: ['stockBatches'] });
      setShowReceiveDialog(false);
      setSelectedPO(null);
      setReceiveLines([]);
      toast.success('Goods received!');
    }
  });

  const addPOLine = () => {
    setPOLines([...poLines, {
      id: Date.now(),
      sku_code: '',
      item_name: '',
      qty_ordered: 0,
      unit_cost: 0
    }]);
  };

  const updatePOLine = (id, field, value) => {
    setPOLines(poLines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const removePOLine = (id) => {
    setPOLines(poLines.filter(line => line.id !== id));
  };

  const handleCreatePO = () => {
    if (!poForm.locationId || !poForm.supplierName || poLines.length === 0) {
      toast.error('Please fill required fields and add at least one line');
      return;
    }

    createPOMutation.mutate({
      poData: {
        organization_id: '',
        location_id: poForm.locationId,
        supplier_name: poForm.supplierName,
        order_date: poForm.orderDate,
        expected_delivery: poForm.expectedDelivery || null,
        notes: poForm.notes
      },
      lines: poLines.map(({ id, ...line }) => line)
    });
  };

  const openReceiveDialog = (po) => {
    const lines = allPOLines.filter(l => l.purchase_order_id === po.id);
    setSelectedPO(po);
    setReceiveLines(lines.map(line => ({
      ...line,
      qty_received: line.qty_ordered,
      batch_number: '',
      expiry_date: ''
    })));
    setShowReceiveDialog(true);
  };

  const handleReceiveGoods = () => {
    receiveGoodsMutation.mutate({
      purchaseOrderId: selectedPO.id,
      receivedLines: receiveLines
    });
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    received: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-500'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Procurement</h1>
        <p className="text-slate-500 mt-1">Supplier and purchase order management</p>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <FileText className="w-4 h-4 mr-2" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Building2 className="w-4 h-4 mr-2" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowPODialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Purchase Order
            </Button>
          </div>

          <div className="space-y-3">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="p-5 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {po.po_number}
                      </Badge>
                      <Badge variant="outline" className={statusColors[po.status]}>
                        {po.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-900">{po.supplier_name}</p>
                    <p className="text-sm text-slate-500">
                      Order: {format(new Date(po.order_date || po.created_at), 'MMM d, yyyy')}
                      {po.expected_delivery && ` • Expected: ${format(new Date(po.expected_delivery), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  {po.status === 'sent' && (
                    <Button size="sm" onClick={() => openReceiveDialog(po)}>
                      <PackageCheck className="w-4 h-4 mr-2" />
                      Receive
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowSupplierDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} className="p-5 bg-white">
                <h3 className="font-semibold text-slate-900 mb-2">{supplier.name}</h3>
                <div className="space-y-1 text-sm text-slate-600">
                  {supplier.contact && <p>Contact: {supplier.contact}</p>}
                  {supplier.email && <p>Email: {supplier.email}</p>}
                  {supplier.address && <p className="text-xs text-slate-500">{supplier.address}</p>}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Supplier Dialog */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Contact</Label>
              <Input
                value={supplierForm.contact}
                onChange={(e) => setSupplierForm({...supplierForm, contact: e.target.value})}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => createSupplierMutation.mutate(supplierForm)}>
                Add Supplier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location *</Label>
                <Select value={poForm.locationId} onValueChange={(val) => setPOForm({...poForm, locationId: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supplier *</Label>
                <Select value={poForm.supplierName} onValueChange={(val) => setPOForm({...poForm, supplierName: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(sup => (
                      <SelectItem key={sup.id} value={sup.name}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={poForm.orderDate}
                  onChange={(e) => setPOForm({...poForm, orderDate: e.target.value})}
                />
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={poForm.expectedDelivery}
                  onChange={(e) => setPOForm({...poForm, expectedDelivery: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={poForm.notes}
                onChange={(e) => setPOForm({...poForm, notes: e.target.value})}
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Order Lines *</Label>
                <Button size="sm" onClick={addPOLine}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line
                </Button>
              </div>
              
              <div className="space-y-3">
                {poLines.map((line) => (
                  <Card key={line.id} className="p-4 bg-slate-50">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label>Item</Label>
                          <Select 
                            value={line.sku_code} 
                            onValueChange={(val) => {
                              const drug = drugs.find(d => d.drug_code === val);
                              updatePOLine(line.id, 'sku_code', val);
                              updatePOLine(line.id, 'item_name', drug?.drug_name || '');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {drugs.map(drug => (
                                <SelectItem key={drug.id} value={drug.drug_code}>
                                  {drug.drug_name} ({drug.drug_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePOLine(line.id)}
                          className="mt-6"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={line.qty_ordered}
                            onChange={(e) => updatePOLine(line.id, 'qty_ordered', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Unit Cost</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_cost}
                            onChange={(e) => updatePOLine(line.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPODialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePO} disabled={createPOMutation.isPending}>
                {createPOMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive Goods Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Goods - {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {receiveLines.map((line, idx) => (
              <Card key={idx} className="p-4 bg-slate-50">
                <p className="font-medium mb-3">{line.item_name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ordered</Label>
                    <Input value={line.qty_ordered} readOnly className="bg-white" />
                  </div>
                  <div>
                    <Label>Received *</Label>
                    <Input
                      type="number"
                      min="0"
                      max={line.qty_ordered}
                      value={line.qty_received}
                      onChange={(e) => {
                        const updated = [...receiveLines];
                        updated[idx].qty_received = parseFloat(e.target.value) || 0;
                        setReceiveLines(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Batch Number</Label>
                    <Input
                      value={line.batch_number}
                      onChange={(e) => {
                        const updated = [...receiveLines];
                        updated[idx].batch_number = e.target.value;
                        setReceiveLines(updated);
                      }}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={line.expiry_date}
                      onChange={(e) => {
                        const updated = [...receiveLines];
                        updated[idx].expiry_date = e.target.value;
                        setReceiveLines(updated);
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleReceiveGoods} disabled={receiveGoodsMutation.isPending}>
                {receiveGoodsMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}