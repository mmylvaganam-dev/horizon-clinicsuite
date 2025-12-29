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
  History
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

export default function PharmacyInventory() {
  const queryClient = useQueryClient();
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [receiveForm, setReceiveForm] = useState({
    locationId: '',
    drugId: '',
    quantity: 0,
    unitCost: 0,
    reason: ''
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    reason: ''
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list('-updated_at'),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: () => base44.entities.StockMovement.list('-created_at', 100),
  });

  const { data: drugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.DrugCatalog.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const receiveStockMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('receiveStock', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setShowReceiveDialog(false);
      setReceiveForm({ locationId: '', drugId: '', quantity: 0, unitCost: 0, reason: '' });
      toast.success('Stock received successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to receive stock');
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('adjustStock', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setShowAdjustDialog(false);
      setSelectedItem(null);
      setAdjustForm({ quantity: 0, reason: '' });
      toast.success('Stock adjusted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to adjust stock');
    }
  });

  const lowStockItems = inventory.filter(item => 
    item.reorder_level > 0 && item.on_hand_qty <= item.reorder_level
  );

  const handleReceiveStock = () => {
    if (!receiveForm.locationId || !receiveForm.drugId || receiveForm.quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }
    receiveStockMutation.mutate(receiveForm);
  };

  const handleAdjustStock = () => {
    if (!adjustForm.reason.trim()) {
      toast.error('Please provide a reason for adjustment');
      return;
    }
    adjustStockMutation.mutate({
      inventoryItemId: selectedItem.id,
      quantity: adjustForm.quantity,
      reason: adjustForm.reason
    });
  };

  const getLocationName = (locationId) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Unknown';
  };

  const movementTypeColors = {
    receive: 'bg-emerald-100 text-emerald-700',
    sale: 'bg-blue-100 text-blue-700',
    adjust: 'bg-amber-100 text-amber-700',
    transfer: 'bg-purple-100 text-purple-700'
  };

  const movementTypeIcons = {
    receive: TrendingUp,
    sale: TrendingDown,
    adjust: Edit,
    transfer: Package
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Inventory</h1>
          <p className="text-slate-500 mt-1">Stock management and tracking</p>
        </div>
        <Button onClick={() => setShowReceiveDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Receive Stock
        </Button>
      </div>

      {/* Low Stock Alert */}
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
            Stock Levels
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="w-4 h-4 mr-2" />
            Movement History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          {inventory.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No inventory items</h3>
              <p className="text-slate-500 mt-1">Start by receiving stock</p>
            </Card>
          ) : (
            inventory.map((item) => {
              const isLowStock = item.reorder_level > 0 && item.on_hand_qty <= item.reorder_level;
              
              return (
                <Card key={item.id} className={`p-5 ${isLowStock ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{item.drug_name}</h3>
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
                          <p className="font-medium">{getLocationName(item.location_id)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">On Hand</p>
                          <p className="font-medium text-lg">{item.on_hand_qty}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Reorder Level</p>
                          <p className="font-medium">{item.reorder_level || 'Not set'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Unit Cost</p>
                          <p className="font-medium">${item.unit_cost?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
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

        <TabsContent value="movements" className="space-y-3">
          {movements.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No movements recorded</h3>
            </Card>
          ) : (
            movements.map((movement) => {
              const Icon = movementTypeIcons[movement.movement_type] || Package;
              const inventoryItem = inventory.find(i => i.id === movement.inventory_item_id);
              
              return (
                <Card key={movement.id} className="p-4 bg-white">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${movementTypeColors[movement.movement_type]} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={movementTypeColors[movement.movement_type]}>
                          {movement.movement_type}
                        </Badge>
                        <span className={`font-semibold ${movement.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900">{inventoryItem?.drug_name || 'Unknown Item'}</p>
                      <p className="text-sm text-slate-500">
                        {movement.previous_qty} → {movement.new_qty} units
                      </p>
                      {movement.reason && (
                        <p className="text-sm text-slate-600 mt-1">{movement.reason}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {format(new Date(movement.created_at), 'MMM d, yyyy h:mm a')} by {movement.created_by_email}
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
              <Label>Drug *</Label>
              <Select value={receiveForm.drugId} onValueChange={(val) => setReceiveForm({...receiveForm, drugId: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select drug" />
                </SelectTrigger>
                <SelectContent>
                  {drugs.map(drug => (
                    <SelectItem key={drug.id} value={drug.id}>{drug.drug_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={receiveForm.quantity}
                onChange={(e) => setReceiveForm({...receiveForm, quantity: parseFloat(e.target.value) || 0})}
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
              <Button onClick={handleReceiveStock} disabled={receiveStockMutation.isPending}>
                {receiveStockMutation.isPending ? 'Processing...' : 'Receive Stock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock: {selectedItem?.drug_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Current Quantity</p>
              <p className="text-2xl font-bold text-slate-900">{selectedItem?.on_hand_qty}</p>
            </div>
            <div>
              <Label>Adjustment Quantity *</Label>
              <Input
                type="number"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({...adjustForm, quantity: parseFloat(e.target.value) || 0})}
                placeholder="Use + for increase, - for decrease"
              />
              <p className="text-xs text-slate-500 mt-1">
                New quantity will be: {(selectedItem?.on_hand_qty || 0) + adjustForm.quantity}
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
                setAdjustForm({ quantity: 0, reason: '' });
              }}>
                Cancel
              </Button>
              <Button onClick={handleAdjustStock} disabled={adjustStockMutation.isPending}>
                {adjustStockMutation.isPending ? 'Processing...' : 'Confirm Adjustment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}