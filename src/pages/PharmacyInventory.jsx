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
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Edit,
  History,
  Calendar
} from 'lucide-react';
import BatchesTab from '../components/inventory/BatchesTab';
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

export default function PharmacyInventory() {
  const queryClient = useQueryClient();
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);

  const [receiveForm, setReceiveForm] = useState({
    locationId: '',
    skuCode: '',
    itemName: '',
    qty: 0,
    unitCost: 0,
    batchNumber: '',
    expiryDate: '',
    reason: ''
  });

  const [expiryAlertDays, setExpiryAlertDays] = useState(90);

  const [adjustForm, setAdjustForm] = useState({
    qty: 0,
    reason: ''
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['inventoryBalances'],
    queryFn: () => base44.entities.InventoryBalance.list('-updated_at'),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['inventoryTxns'],
    queryFn: () => base44.entities.InventoryTxn.list('-created_at', 100),
  });

  const { data: drugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.DrugCatalog.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['stockBatches'],
    queryFn: () => base44.entities.StockBatch.list('-expiry_date'),
  });

  const receiveInventoryMutation = useMutation({
    mutationFn: (data) => {
      // Use batch receive if batch info provided
      if (data.batchNumber && data.expiryDate) {
        return base44.functions.invoke('receiveBatch', data);
      }
      return base44.functions.invoke('receiveInventory', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBalances'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTxns'] });
      queryClient.invalidateQueries({ queryKey: ['stockBatches'] });
      setShowReceiveDialog(false);
      setReceiveForm({ locationId: '', skuCode: '', itemName: '', qty: 0, unitCost: 0, batchNumber: '', expiryDate: '', reason: '' });
      toast.success('Inventory received successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to receive inventory');
    }
  });

  const adjustInventoryMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('adjustInventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBalances'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTxns'] });
      setShowAdjustDialog(false);
      setSelectedBalance(null);
      setAdjustForm({ qty: 0, reason: '' });
      toast.success('Inventory adjusted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to adjust inventory');
    }
  });

  const lowStockItems = balances.filter(item => 
    item.reorder_level > 0 && item.on_hand_qty <= item.reorder_level
  );

  const handleReceiveInventory = () => {
    if (!receiveForm.locationId || !receiveForm.skuCode || !receiveForm.itemName || receiveForm.qty <= 0) {
      toast.error('Please fill all required fields');
      return;
    }
    
    // If batch tracking, require batch number and expiry
    if (receiveForm.batchNumber || receiveForm.expiryDate) {
      if (!receiveForm.batchNumber || !receiveForm.expiryDate) {
        toast.error('Both batch number and expiry date required for batch tracking');
        return;
      }
    }
    
    receiveInventoryMutation.mutate(receiveForm);
  };

  const handleAdjustInventory = () => {
    if (!adjustForm.reason.trim()) {
      toast.error('Please provide a reason for adjustment');
      return;
    }
    adjustInventoryMutation.mutate({
      balanceId: selectedBalance.id,
      qty: adjustForm.qty,
      reason: adjustForm.reason
    });
  };

  const getLocationName = (locationId) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Unknown';
  };

  const txnTypeColors = {
    receive: 'bg-emerald-100 text-emerald-700',
    sale: 'bg-blue-100 text-blue-700',
    dispense: 'bg-purple-100 text-purple-700',
    adjust: 'bg-amber-100 text-amber-700',
    transfer: 'bg-slate-100 text-slate-700'
  };

  const txnTypeIcons = {
    receive: TrendingUp,
    sale: TrendingDown,
    dispense: TrendingDown,
    adjust: Edit,
    transfer: Package
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Inventory</h1>
          <p className="text-slate-500 mt-1">Stock balances and transaction tracking</p>
        </div>
        <Button onClick={() => setShowReceiveDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Receive Stock
        </Button>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
              </p>
              <p className="text-sm text-amber-700">Review and restock items marked with low stock</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stock">
            <Package className="w-4 h-4 mr-2" />
            Pharmacy Stock ({pharmacyStock.length})
          </TabsTrigger>
          <TabsTrigger value="balances">
            <Package className="w-4 h-4 mr-2" />
            Stock Balances
          </TabsTrigger>
          <TabsTrigger value="batches">
            <Calendar className="w-4 h-4 mr-2" />
            Batches & Expiry
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <History className="w-4 h-4 mr-2" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          {pharmacyStock.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No pharmacy stock</h3>
              <p className="text-slate-500 mt-1">Import stock data from Stock Import page</p>
            </Card>
          ) : (
            pharmacyStock.map((item) => {
              const isExpired = item.quality_status === 'expired';
              const isExpiringSoon = item.expire_date && new Date(item.expire_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
              
              return (
                <Card key={item.id} className={`p-5 ${isExpired ? 'bg-rose-50 border-rose-200' : isExpiringSoon ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{item.display_name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.barcode}
                        </Badge>
                        {isExpired && (
                          <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {!isExpired && isExpiringSoon && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Expiring Soon
                          </Badge>
                        )}
                        <Badge className={item.quality_status === 'usable' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                          {item.quality_status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Batch No</p>
                          <p className="font-medium">{item.batch_no}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Quantity</p>
                          <p className="font-medium text-lg">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Unit Cost</p>
                          <p className="font-medium">{item.unit_cost?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">MRP</p>
                          <p className="font-medium">{item.mrp?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expiry Date</p>
                          <p className="font-medium">{item.expire_date ? format(new Date(item.expire_date), 'MMM d, yyyy') : 'N/A'}</p>
                        </div>
                      </div>
                      {item.supplier && (
                        <p className="text-xs text-slate-500 mt-2">Supplier: {item.supplier}</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="balances" className="space-y-3">
          {balances.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No inventory balances</h3>
              <p className="text-slate-500 mt-1">Start by receiving stock</p>
            </Card>
          ) : (
            balances.map((balance) => {
              const isLowStock = balance.reorder_level > 0 && balance.on_hand_qty <= balance.reorder_level;
              
              return (
                <Card key={balance.id} className={`p-5 ${isLowStock ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{balance.item_name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {balance.sku_code}
                        </Badge>
                        {isLowStock && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Location</p>
                          <p className="font-medium">{getLocationName(balance.location_id)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">On Hand</p>
                          <p className="font-medium text-lg">{balance.on_hand_qty}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Reorder Level</p>
                          <p className="font-medium">{balance.reorder_level || 'Not set'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Unit Cost</p>
                          <p className="font-medium">${balance.unit_cost?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBalance(balance);
                        setShowAdjustDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Adjust
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="batches">
          <BatchesTab batches={batches} locations={locations} expiryDays={expiryAlertDays} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-3">
          {transactions.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No transactions recorded</h3>
            </Card>
          ) : (
            transactions.map((txn) => {
              const Icon = txnTypeIcons[txn.txn_type] || Package;
              
              return (
                <Card key={txn.id} className="p-4 bg-white">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${txnTypeColors[txn.txn_type]} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={txnTypeColors[txn.txn_type]}>
                          {txn.txn_type}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {txn.sku_code}
                        </Badge>
                        <span className={`font-semibold ${txn.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {txn.qty > 0 ? '+' : ''}{txn.qty}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900">{txn.item_name}</p>
                      <p className="text-sm text-slate-500">
                        {txn.previous_qty} → {txn.new_qty} units
                      </p>
                      {txn.reason && (
                        <p className="text-sm text-slate-600 mt-1">{txn.reason}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {format(new Date(txn.created_at), 'MMM d, yyyy h:mm a')} by {txn.created_by_email}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Receive Stock Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Location *</Label>
              <Select value={receiveForm.locationId} onValueChange={(val) => setReceiveForm({...receiveForm, locationId: val})}>
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
              <Label>Drug/Item *</Label>
              <Select 
                value={receiveForm.skuCode} 
                onValueChange={(val) => {
                  const drug = drugs.find(d => d.drug_code === val);
                  setReceiveForm({
                    ...receiveForm, 
                    skuCode: val,
                    itemName: drug?.drug_name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select drug" />
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
            <div>
              <Label>Item Name *</Label>
              <Input
                value={receiveForm.itemName}
                onChange={(e) => setReceiveForm({...receiveForm, itemName: e.target.value})}
                placeholder="Item name"
              />
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={receiveForm.qty}
                onChange={(e) => setReceiveForm({...receiveForm, qty: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Unit Cost</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={receiveForm.unitCost}
                onChange={(e) => setReceiveForm({...receiveForm, unitCost: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Batch Number (Optional)</Label>
              <Input
                value={receiveForm.batchNumber}
                onChange={(e) => setReceiveForm({...receiveForm, batchNumber: e.target.value})}
                placeholder="e.g., LOT-2025-001"
              />
            </div>
            <div>
              <Label>Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={receiveForm.expiryDate}
                onChange={(e) => setReceiveForm({...receiveForm, expiryDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={receiveForm.reason}
                onChange={(e) => setReceiveForm({...receiveForm, reason: e.target.value})}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleReceiveInventory} disabled={receiveInventoryMutation.isPending}>
                {receiveInventoryMutation.isPending ? 'Processing...' : 'Receive Stock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock: {selectedBalance?.item_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Current Quantity</p>
              <p className="text-2xl font-bold text-slate-900">{selectedBalance?.on_hand_qty}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">SKU: {selectedBalance?.sku_code}</p>
            </div>
            <div>
              <Label>Adjustment Quantity *</Label>
              <Input
                type="number"
                value={adjustForm.qty}
                onChange={(e) => setAdjustForm({...adjustForm, qty: parseFloat(e.target.value) || 0})}
                placeholder="Use + for increase, - for decrease"
              />
              <p className="text-xs text-slate-500 mt-1">
                New quantity will be: {(selectedBalance?.on_hand_qty || 0) + adjustForm.qty}
              </p>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})}
                placeholder="Reason for adjustment (required)"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAdjustDialog(false);
                setAdjustForm({ qty: 0, reason: '' });
              }}>
                Cancel
              </Button>
              <Button onClick={handleAdjustInventory} disabled={adjustInventoryMutation.isPending}>
                {adjustInventoryMutation.isPending ? 'Processing...' : 'Confirm Adjustment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}