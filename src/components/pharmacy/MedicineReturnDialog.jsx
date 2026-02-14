import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MedicineReturnDialog({ open, onOpenChange, sale, saleItems, currency, user }) {
  const queryClient = useQueryClient();
  const [returnType, setReturnType] = useState('customer');
  const [selectedItems, setSelectedItems] = useState([]);
  const [returnReason, setReturnReason] = useState('defective');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');

  // Debug log to see what we're receiving
  React.useEffect(() => {
    if (open) {
      console.log('🔵 MedicineReturnDialog opened with:', {
        sale,
        saleItemsCount: saleItems?.length,
        saleItems: saleItems
      });
    }
  }, [open, sale, saleItems]);

  const returnMutation = useMutation({
    mutationFn: async (data) => {
      const returnItems = selectedItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: parseInt(item.return_qty),
        unit_price: item.unit_price,
        reason: item.reason,
        batch_no: item.batch_no
      }));

      const totalAmount = returnItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      const returnRecord = await base44.entities.MedicineReturn.create({
        organization_id: user?.organization_id || '',
        return_type: returnType,
        return_date: new Date().toISOString(),
        sale_id: returnType === 'customer' ? sale?.id : null,
        patient_id: returnType === 'customer' ? sale?.patient_id : null,
        supplier_id: returnType === 'vendor' ? supplierId : null,
        items: returnItems,
        subtotal: totalAmount,
        discount_amount: 0,
        total_amount: totalAmount,
        reason: returnReason,
        notes,
        status: 'pending',
        processed_by: user?.id
      });

      // Update inventory - add back the returned items to stock
      for (const item of returnItems) {
        try {
          // Fetch current stock by product_id
          const currentStock = await base44.entities.PharmacyStock.filter({ 
            id: item.product_id,
            organization_id: user?.organization_id 
          });
          
          if (currentStock && currentStock.length > 0) {
            const stock = currentStock[0];
            const newQuantity = (stock.quantity || 0) + item.quantity;
            
            // Update stock quantity
            await base44.entities.PharmacyStock.update(stock.id, {
              quantity: newQuantity
            });
            
            console.log(`✅ Stock updated for ${item.product_name}: +${item.quantity} (New total: ${newQuantity})`);
          } else {
            console.warn(`⚠️ Stock not found for product ${item.product_id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to update stock for ${item.product_name}:`, error);
        }
      }

      return returnRecord;
    },
    onSuccess: (returnRecord) => {
      queryClient.invalidateQueries(['medicineReturns']);
      queryClient.invalidateQueries(['pharmacySales']);
      queryClient.invalidateQueries(['pharmacyStock']);
      toast.success('Medicine return created successfully');
      
      // Print the return slip
      handlePrintReturn(returnRecord);
      
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create medicine return');
    }
  });

  const handlePrintReturn = (returnRecord) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    const itemsHTML = returnRecord.items.map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.product_name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${currency} ${item.unit_price.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${currency} ${(item.quantity * item.unit_price).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medicine Return Slip</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h2 { margin: 0; }
          .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f5f5f5; padding: 10px; text-align: left; border: 1px solid #ddd; }
          .total-row { font-weight: bold; font-size: 16px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>MEDICINE RETURN SLIP</h2>
          <p style="margin: 5px 0;">Return Type: <strong>${returnType.toUpperCase()}</strong></p>
        </div>
        
        <div class="info-row">
          <span>Return #: <strong>${returnRecord.return_number || returnRecord.id}</strong></span>
          <span>Date: <strong>${new Date(returnRecord.return_date).toLocaleDateString()}</strong></span>
        </div>
        
        ${returnType === 'customer' ? `
          <div class="info-row">
            <span>Original Receipt: <strong>${sale?.id || 'N/A'}</strong></span>
          </div>
        ` : ''}
        
        <div class="info-row">
          <span>Reason: <strong>${returnReason}</strong></span>
        </div>
        
        ${notes ? `<div class="info-row"><span>Notes: <strong>${notes}</strong></span></div>` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding: 10px; border: 1px solid #ddd;">TOTAL:</td>
              <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">${currency} ${returnRecord.total_amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is an official medicine return slip</p>
          <p>Processed on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const addItem = (saleItem) => {
    const productId = saleItem.stock_id || saleItem.product_id;
    if (!productId) {
      toast.error('Invalid item - no product ID');
      return;
    }
    
    if (selectedItems.some(item => item.product_id === productId)) {
      toast.error('Item already added');
      return;
    }
    
    const newItem = {
      product_id: productId,
      product_name: saleItem.product_name_cache || saleItem.product_name || 'Unknown',
      unit_price: saleItem.unit_price || 0,
      batch_no: saleItem.batch_no || '',
      return_qty: 1,
      max_qty: saleItem.qty || saleItem.quantity || 1,
      reason: returnReason
    };
    
    console.log('🟢 Adding item to return:', newItem);
    setSelectedItems([...selectedItems, newItem]);
    toast.success('Item added to return');
  };

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter(item => item.product_id !== productId));
  };

  const updateItemQty = (productId, qty) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(1, Math.min(parseInt(qty) || 1, item.max_qty));
        return { ...item, return_qty: newQty };
      }
      return item;
    }));
  };

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.return_qty * item.unit_price), 0);

  const resetForm = () => {
    setSelectedItems([]);
    setReturnReason('defective');
    setNotes('');
    setSupplierId('');
    setReturnType('customer');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medicine Return</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Return Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Return Type *</Label>
              <Select value={returnType} onValueChange={setReturnType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer Return (Refund)</SelectItem>
                  <SelectItem value="vendor">Vendor Return (Get Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {returnType === 'vendor' && (
              <div>
                <Label>Supplier *</Label>
                <Input
                  placeholder="Enter supplier name/ID"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Available Items to Return */}
          {returnType === 'customer' && saleItems && saleItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Available Items to Return</h4>
                <div className="space-y-2">
                  {saleItems.map((item, idx) => {
                   const productId = item.stock_id || item.product_id;
                   const productName = item.product_name_cache || item.product_name || 'Unknown Product';
                   const qty = item.qty || item.quantity || 0;
                   const price = item.unit_price || 0;
                   const isAlreadyAdded = selectedItems.some(si => si.product_id === productId);

                   return (
                     <div key={productId || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                       <div className="flex-1">
                         <p className="font-medium text-sm">{productName}</p>
                         <p className="text-xs text-slate-600">Qty: {qty} • {currency} {price.toFixed(2)}</p>
                       </div>
                       {isAlreadyAdded ? (
                         <Badge className="bg-emerald-600 text-white">Added</Badge>
                       ) : (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => addItem(item)}
                         >
                           <Plus className="w-3 h-3 mr-1" />
                           Add
                         </Button>
                       )}
                     </div>
                   );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Items for Return */}
          {selectedItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Items Being Returned</h4>
                <div className="space-y-3">
                  {selectedItems.map(item => (
                    <div key={item.product_id} className="p-3 border rounded-lg bg-amber-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.product_name}</p>
                          <p className="text-xs text-slate-600">Unit Price: {currency} {item.unit_price.toFixed(2)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.product_id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Quantity (Max: {item.max_qty})</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.max_qty}
                            value={item.return_qty}
                            onChange={(e) => updateItemQty(item.product_id, e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Reason</Label>
                          <Select value={item.reason} onValueChange={(reason) => {
                            setSelectedItems(selectedItems.map(si =>
                              si.product_id === item.product_id ? { ...si, reason } : si
                            ));
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="defective">Defective</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                              <SelectItem value="wrong_item">Wrong Item</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-2 text-right text-sm font-medium">
                        Subtotal: {currency} {(item.return_qty * item.unit_price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Return Amount:</span>
                    <span className="text-lg font-bold text-indigo-600">{currency} {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Reason & Notes */}
          <div>
            <Label>Return Reason *</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="defective">Defective Product</SelectItem>
                <SelectItem value="expired">Expired Batch</SelectItem>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="quality_issue">Quality Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => returnMutation.mutate({})}
              disabled={selectedItems.length === 0 || returnMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              Process & Print Return
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}