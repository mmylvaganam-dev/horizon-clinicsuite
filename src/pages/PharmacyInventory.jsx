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
  Calendar,
  DollarSign,
  TrendingDown as Loss
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
  const [showEditStockDialog, setShowEditStockDialog] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [editStockForm, setEditStockForm] = useState({
    quantity: 0,
    unit_cost: 0,
    mrp: 0,
    reason: ''
  });

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
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [criticalStockThreshold, setCriticalStockThreshold] = useState(5);

  const [adjustForm, setAdjustForm] = useState({
    qty: 0,
    reason: ''
  });

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showZeroStockOnly, setShowZeroStockOnly] = useState(false);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);

  const { data: balances = [] } = useQuery({
    queryKey: ['inventoryBalances'],
    queryFn: () => base44.entities.InventoryBalance.list('-updated_at'),
  });

  const { data: pharmacyStock = [], refetch: refetchPharmacyStock } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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

  // Auto-select first location if only one exists
  React.useEffect(() => {
    if (locations.length === 1 && !receiveForm.locationId) {
      setReceiveForm(prev => ({ ...prev, locationId: locations[0].id }));
    }
  }, [locations, receiveForm.locationId]);

  const { data: batches = [] } = useQuery({
    queryKey: ['stockBatches'],
    queryFn: () => base44.entities.StockBatch.list('-expiry_date'),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies[0]?.base_currency || 'LKR';

  // Calculate stock metrics
  const totalStockValue = pharmacyStock.reduce((sum, item) => 
    sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0
  );

  const totalPotentialRevenue = pharmacyStock.reduce((sum, item) => 
    sum + ((item.mrp || 0) * (item.quantity || 0)), 0
  );

  const totalPotentialProfit = totalPotentialRevenue - totalStockValue;
  const profitMargin = totalStockValue > 0 ? ((totalPotentialProfit / totalStockValue) * 100) : 0;

  // Filter low stock items from pharmacy stock
  const lowStockPharmacyItems = pharmacyStock.filter(item => 
    item.quantity > 0 && item.quantity <= lowStockThreshold && item.quality_status === 'usable'
  );

  const criticalStockItems = pharmacyStock.filter(item => 
    item.quantity > 0 && item.quantity <= criticalStockThreshold && item.quality_status === 'usable'
  );

  const expiredItems = pharmacyStock.filter(item =>
    item.expire_date && new Date(item.expire_date) < new Date() && item.quality_status !== 'expired'
  );

  const expiringItems = pharmacyStock.filter(item =>
    item.expire_date && 
    new Date(item.expire_date) > new Date() &&
    new Date(item.expire_date) <= new Date(Date.now() + expiryAlertDays * 24 * 60 * 60 * 1000) &&
    item.quality_status === 'usable'
  );

  const zeroStockItems = pharmacyStock.filter(item => item.quantity === 0);

  const displayedStock = showExpiredOnly ? expiredItems : 
                         showExpiringOnly ? expiringItems :
                         showZeroStockOnly ? zeroStockItems : 
                         showLowStockOnly ? lowStockPharmacyItems : 
                         pharmacyStock;

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

  const updateStockMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PharmacyStock.update(data.id, {
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        mrp: data.mrp
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyStock'] });
      refetchPharmacyStock();
      setShowEditStockDialog(false);
      setSelectedStock(null);
      setEditStockForm({ quantity: 0, unit_cost: 0, mrp: 0, reason: '' });
      toast.success('Stock updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update stock');
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

  const handleUpdateStock = () => {
    if (editStockForm.quantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }
    updateStockMutation.mutate({
      id: selectedStock.id,
      quantity: editStockForm.quantity,
      unit_cost: editStockForm.unit_cost,
      mrp: editStockForm.mrp
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

      {criticalStockItems.length > 0 && (
        <Card className="bg-rose-50 border-rose-300 border-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />
              <div>
                <p className="font-bold text-rose-900 text-lg">CRITICAL STOCK ALERT</p>
                <p className="text-sm text-rose-700 mt-1">
                  {criticalStockItems.length} item(s) at critical level (≤{criticalStockThreshold} units)
                </p>
                <div className="mt-2 space-y-1">
                  {criticalStockItems.slice(0, 3).map(item => (
                    <p key={item.id} className="text-xs text-rose-800">
                      • {item.display_name}: <strong>{item.quantity} units left</strong>
                    </p>
                  ))}
                  {criticalStockItems.length > 3 && (
                    <p className="text-xs text-rose-700">+ {criticalStockItems.length - 3} more items</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {expiredItems.length > 0 && (
        <Card className="bg-red-50 border-red-300 border-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-bold text-red-900 text-lg">EXPIRED ITEMS</p>
                <p className="text-sm text-red-700 mt-1">
                  {expiredItems.length} item(s) have expired - remove from usable stock
                </p>
                <div className="mt-2 space-y-1">
                  {expiredItems.slice(0, 3).map(item => (
                    <p key={item.id} className="text-xs text-red-800">
                      • {item.display_name}: Expired {item.expire_date ? format(new Date(item.expire_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  ))}
                  {expiredItems.length > 3 && (
                    <p className="text-xs text-red-700">+ {expiredItems.length - 3} more items</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {expiringItems.length > 0 && (
        <Card className="bg-orange-50 border-orange-300 border-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-6 h-6 text-orange-600" />
              <div>
                <p className="font-bold text-orange-900 text-lg">EXPIRING SOON</p>
                <p className="text-sm text-orange-700 mt-1">
                  {expiringItems.length} item(s) expiring within {expiryAlertDays} days
                </p>
                <div className="mt-2 space-y-1">
                  {expiringItems.slice(0, 3).map(item => (
                    <p key={item.id} className="text-xs text-orange-800">
                      • {item.display_name}: Expires {item.expire_date ? format(new Date(item.expire_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  ))}
                  {expiringItems.length > 3 && (
                    <p className="text-xs text-orange-700">+ {expiringItems.length - 3} more items</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Alert Thresholds</p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Critical Stock (≤ units)</Label>
              <Input
                type="number"
                min="1"
                value={criticalStockThreshold}
                onChange={(e) => setCriticalStockThreshold(parseInt(e.target.value) || 5)}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Low Stock (≤ units)</Label>
              <Input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)}
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Expiry Warning (days)</Label>
              <Input
                type="number"
                min="1"
                value={expiryAlertDays}
                onChange={(e) => setExpiryAlertDays(parseInt(e.target.value) || 90)}
                className="mt-1 h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Total Stock Value</p>
            <p className="text-3xl font-bold mt-1">{currency} {totalStockValue.toFixed(2)}</p>
            <p className="text-xs opacity-80 mt-1">{pharmacyStock.length} items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Potential Revenue</p>
            <p className="text-3xl font-bold mt-1">{currency} {totalPotentialRevenue.toFixed(2)}</p>
            <p className="text-xs opacity-80 mt-1">If all sold at MRP</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Potential Profit</p>
            <p className="text-3xl font-bold mt-1">{currency} {totalPotentialProfit.toFixed(2)}</p>
            <p className="text-xs opacity-80 mt-1">{profitMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`bg-gradient-to-br ${criticalStockItems.length > 0 ? 'from-rose-500 to-rose-600' : lowStockPharmacyItems.length > 0 ? 'from-amber-500 to-amber-600' : 'from-slate-500 to-slate-600'} text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform`}
          onClick={() => {
            setShowLowStockOnly(!showLowStockOnly);
            setShowZeroStockOnly(false);
            setShowExpiredOnly(false);
            setShowExpiringOnly(false);
          }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className={`w-8 h-8 opacity-80 ${criticalStockItems.length > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <p className="text-sm opacity-90">
              {criticalStockItems.length > 0 ? 'Critical Stock' : 'Low Stock Items'}
            </p>
            <p className="text-3xl font-bold mt-1">
              {criticalStockItems.length > 0 ? criticalStockItems.length : lowStockPharmacyItems.length}
            </p>
            <p className="text-xs opacity-80 mt-1">
              {criticalStockItems.length > 0 && `${criticalStockItems.length} critical, `}
              {lowStockPharmacyItems.length} low
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => {
            setShowZeroStockOnly(!showZeroStockOnly);
            setShowLowStockOnly(false);
            setShowExpiredOnly(false);
            setShowExpiringOnly(false);
          }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Zero Stock Items</p>
            <p className="text-3xl font-bold mt-1">{zeroStockItems.length}</p>
            <p className="text-xs opacity-80 mt-1">Out of stock</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => {
            setShowExpiredOnly(!showExpiredOnly);
            setShowZeroStockOnly(false);
            setShowLowStockOnly(false);
            setShowExpiringOnly(false);
          }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Expired Items</p>
            <p className="text-3xl font-bold mt-1">{expiredItems.length}</p>
            <p className="text-xs opacity-80 mt-1">Remove from stock</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => {
            setShowExpiringOnly(!showExpiringOnly);
            setShowZeroStockOnly(false);
            setShowLowStockOnly(false);
            setShowExpiredOnly(false);
          }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Expiring Soon</p>
            <p className="text-3xl font-bold mt-1">{expiringItems.length}</p>
            <p className="text-xs opacity-80 mt-1">Within {expiryAlertDays} days</p>
          </CardContent>
        </Card>
      </div>

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
          {showExpiredOnly && expiredItems.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      Showing {expiredItems.length} EXPIRED items
                    </p>
                    <p className="text-xs text-red-700">
                      These items have expired and should be removed from usable stock
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowExpiredOnly(false)}>
                  Show All
                </Button>
              </CardContent>
            </Card>
          )}
          {showExpiringOnly && expiringItems.length > 0 && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      Showing {expiringItems.length} items expiring within {expiryAlertDays} days
                    </p>
                    <p className="text-xs text-orange-700">
                      Plan to sell or use these items before expiry
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowExpiringOnly(false)}>
                  Show All
                </Button>
              </CardContent>
            </Card>
          )}
          {showZeroStockOnly && zeroStockItems.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      Showing {zeroStockItems.length} items with ZERO stock
                    </p>
                    <p className="text-xs text-red-700">
                      These items are out of stock and need to be reordered
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowZeroStockOnly(false)}>
                  Show All
                </Button>
              </CardContent>
            </Card>
          )}
          {showLowStockOnly && (criticalStockItems.length > 0 || lowStockPharmacyItems.length > 0) && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900">
                      Showing {criticalStockItems.length + lowStockPharmacyItems.length} items below threshold
                    </p>
                    <p className="text-xs text-amber-700">
                      {criticalStockItems.length} critical (≤{criticalStockThreshold}), {lowStockPharmacyItems.length} low (≤{lowStockThreshold})
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowLowStockOnly(false)}>
                  Show All
                </Button>
              </CardContent>
            </Card>
          )}
          
          {displayedStock.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">
                {showExpiredOnly ? 'No expired items' : 
                 showExpiringOnly ? 'No items expiring soon' :
                 showZeroStockOnly ? 'No zero stock items' : 
                 showLowStockOnly ? 'No low stock items' : 
                 'No pharmacy stock'}
              </h3>
              <p className="text-slate-500 mt-1">
                {showExpiredOnly ? 'All items are within expiry date' :
                 showExpiringOnly ? `No items expiring within ${expiryAlertDays} days` :
                 showZeroStockOnly ? 'All items have stock available' : 
                 showLowStockOnly ? 'All items are above 10 units' : 
                 'Import stock data from Stock Import page'}
              </p>
            </Card>
          ) : (
            displayedStock.map((item) => {
              const isZeroStock = item.quantity === 0;
              const isCritical = item.quantity > 0 && item.quantity <= criticalStockThreshold;
              const isLowStock = item.quantity > criticalStockThreshold && item.quantity <= lowStockThreshold;
              const isExpired = item.quality_status === 'expired';
              const isExpiringSoon = item.expire_date && new Date(item.expire_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
              
              const itemValue = (item.unit_cost || 0) * (item.quantity || 0);
              const itemRevenue = (item.mrp || 0) * (item.quantity || 0);
              const itemProfit = itemRevenue - itemValue;
              const itemProfitPercent = itemValue > 0 ? ((itemProfit / itemValue) * 100) : 0;

              return (
                <Card key={item.id} className={`p-5 ${isZeroStock ? 'bg-red-100 border-red-400 border-2' : isExpired ? 'bg-red-50 border-red-300 border-2' : isCritical ? 'bg-rose-50 border-rose-300 border-2' : isExpiringSoon ? 'bg-orange-50 border-orange-200' : isLowStock ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{item.display_name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.barcode}
                        </Badge>
                        {isZeroStock && (
                          <Badge variant="outline" className="bg-red-200 text-red-900 border-red-300 font-bold">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            OUT OF STOCK
                          </Badge>
                        )}
                        {isCritical && !isZeroStock && (
                          <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            CRITICAL ({item.quantity} left)
                          </Badge>
                        )}
                        {isLowStock && !isCritical && !isZeroStock && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
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
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Batch No</p>
                          <p className="font-medium">{item.batch_no}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Quantity</p>
                          <p className={`font-bold text-xl ${isZeroStock ? 'text-red-700' : isCritical ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                            {item.quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Unit Cost</p>
                          <p className="font-medium">{currency} {item.unit_cost?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">MRP</p>
                          <p className="font-medium text-emerald-600">{currency} {item.mrp?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Stock Value</p>
                          <p className="font-medium">{currency} {itemValue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Profit Margin</p>
                          <p className="font-medium text-teal-600">{itemProfitPercent.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-slate-500">Potential Revenue</p>
                          <p className="font-medium text-emerald-600">{currency} {itemRevenue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Potential Profit</p>
                          <p className="font-medium text-teal-600">{currency} {itemProfit.toFixed(2)}</p>
                        </div>
                      </div>
                      {item.expire_date && (
                        <p className="text-xs text-slate-500 mt-2">
                          Expiry: {item.expire_date && !isNaN(new Date(item.expire_date)) ? format(new Date(item.expire_date), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      )}
                      {item.supplier && (
                        <p className="text-xs text-slate-500">Supplier: {item.supplier}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStock(item);
                          setEditStockForm({
                            quantity: item.quantity,
                            unit_cost: item.unit_cost || 0,
                            mrp: item.mrp || 0,
                            reason: ''
                          });
                          setShowEditStockDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
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
                          <p className="font-medium">{currency} {balance.unit_cost?.toFixed(2) || '0.00'}</p>
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
                        {txn.created_at && !isNaN(new Date(txn.created_at)) ? format(new Date(txn.created_at), 'MMM d, yyyy h:mm a') : 'N/A'} by {txn.created_by_email}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Location *</Label>
              {locations.length === 0 ? (
                <p className="text-sm text-red-600 mt-2">No locations found. Please create a location first in Admin → Locations.</p>
              ) : (
                <Select value={receiveForm.locationId} onValueChange={(val) => setReceiveForm({...receiveForm, locationId: val})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name} - {loc.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Drug/Item *</Label>
              {drugs.length === 0 ? (
                <p className="text-sm text-amber-600 mt-2">No products found. Import products first from Pharmacy → Product Import.</p>
              ) : (
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
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select drug from catalog" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {drugs.map(drug => (
                      <SelectItem key={drug.id} value={drug.drug_code}>
                        {drug.drug_name} ({drug.drug_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReceiveInventory} 
                disabled={receiveInventoryMutation.isPending || locations.length === 0}
              >
                {receiveInventoryMutation.isPending ? 'Processing...' : 'Receive Stock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Stock Dialog */}
      <Dialog open={showEditStockDialog} onOpenChange={setShowEditStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock: {selectedStock?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Current Details</p>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <p className="text-xs text-slate-500">Quantity</p>
                  <p className="text-lg font-bold text-slate-900">{selectedStock?.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Unit Cost</p>
                  <p className="text-lg font-bold text-slate-900">{currency} {selectedStock?.unit_cost}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">MRP</p>
                  <p className="text-lg font-bold text-slate-900">{currency} {selectedStock?.mrp}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-mono">Barcode: {selectedStock?.barcode}</p>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="0"
                value={editStockForm.quantity}
                onChange={(e) => setEditStockForm({...editStockForm, quantity: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Unit Cost *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editStockForm.unit_cost}
                onChange={(e) => setEditStockForm({...editStockForm, unit_cost: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>MRP (Selling Price) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editStockForm.mrp}
                onChange={(e) => setEditStockForm({...editStockForm, mrp: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowEditStockDialog(false);
                setEditStockForm({ quantity: 0, unit_cost: 0, mrp: 0, reason: '' });
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStock} disabled={updateStockMutation.isPending}>
                {updateStockMutation.isPending ? 'Updating...' : 'Update Stock'}
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