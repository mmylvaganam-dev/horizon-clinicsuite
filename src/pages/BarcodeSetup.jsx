import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Barcode,
  Search,
  Edit,
  Save,
  X,
  Check,
  AlertCircle,
  Info,
  Printer,
  Wand2,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BarcodeSetup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editBarcode, setEditBarcode] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, barcode }) => base44.entities.PharmacyStock.update(id, { barcode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyStock'] });
      setEditingId(null);
      setEditBarcode('');
      toast.success('Barcode updated successfully');
    },
    onError: () => {
      toast.error('Failed to update barcode');
    }
  });

  const filteredStock = pharmacyStock.filter(item => {
    const query = searchQuery.toLowerCase();
    return item.display_name?.toLowerCase().includes(query) ||
           item.barcode?.toLowerCase().includes(query);
  });

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditBarcode(item.barcode || '');
  };

  const saveBarcode = (id) => {
    if (!editBarcode.trim()) {
      toast.error('Barcode cannot be empty');
      return;
    }
    updateMutation.mutate({ id, barcode: editBarcode });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBarcode('');
  };

  const stockWithBarcode = pharmacyStock.filter(item => item.barcode).length;
  const stockWithoutBarcode = pharmacyStock.filter(item => !item.barcode).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Barcode Management</h1>
          <p className="text-slate-600 mt-2">Manage product barcodes for inventory and sales</p>
        </div>
        <PageInfoTooltip
          title="Barcode Management"
          description="Set up and manage product barcodes for quick scanning during sales and inventory operations. Essential for efficient pharmacy operations."
          useCases={[
            "Add barcodes to new products",
            "Update existing product barcodes",
            "Link manufacturer barcodes to products",
            "Enable fast scanning during sales",
            "Improve inventory accuracy"
          ]}
          bestPractices={[
            "Add barcodes during initial stock setup",
            "Use manufacturer barcodes when available",
            "Scan to verify barcode before saving",
            "Keep barcodes unique per product/batch",
            "Test scanner with new barcodes",
            "Print barcode labels for unlabeled items"
          ]}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">With Barcode</p>
                <p className="text-3xl font-bold">{stockWithBarcode}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">Without Barcode</p>
                <p className="text-3xl font-bold">{stockWithoutBarcode}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <Barcode className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">Total Products</p>
                <p className="text-3xl font-bold">{pharmacyStock.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hardware Setup Guide */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Info className="w-5 h-5" />
            Barcode Scanner Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Recommended Hardware:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• <strong>USB Barcode Scanner:</strong> Honeywell Voyager 1200g, Zebra DS2208 (~$100-200)</li>
              <li>• <strong>Wireless Scanner:</strong> Zebra DS3608 (~$300-400)</li>
              <li>• <strong>Budget Option:</strong> Any USB HID barcode scanner (~$30-50)</li>
              <li>• <strong>Mobile App:</strong> Use your smartphone camera with barcode scanning apps</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Setup Steps:</h4>
            <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
              <li>Connect USB scanner to your computer (plug & play)</li>
              <li>Scanner works like a keyboard - scans appear in focused input field</li>
              <li>In Billing/Inventory screens, click on barcode search field</li>
              <li>Scan product barcode - it auto-fills and searches</li>
              <li>Press Enter or scanner will auto-submit</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Mobile Barcode Scanning:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• <strong>Android/iOS:</strong> Use built-in camera apps with barcode detection</li>
              <li>• Copy scanned barcode and paste into search field</li>
              <li>• <strong>Recommended Apps:</strong> Google Lens, QR & Barcode Scanner</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Configuration Note:</strong> Most USB barcode scanners work out-of-the-box without drivers. 
              They emulate keyboard input. Make sure scanner is set to add "Enter" after scan for auto-submit.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by product name or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Product Barcodes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredStock.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{item.display_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-slate-400" />
                        <Input
                          value={editBarcode}
                          onChange={(e) => setEditBarcode(e.target.value)}
                          placeholder="Enter or scan barcode"
                          className="w-64"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveBarcode(item.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <Barcode className="w-4 h-4 text-slate-400" />
                        {item.barcode ? (
                          <Badge variant="outline" className="font-mono">
                            {item.barcode}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-400 italic">No barcode</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingId === item.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => saveBarcode(item.id)}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(item)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredStock.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No products found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barcode Label Printing Guide */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Printer className="w-5 h-5" />
            Barcode Label Printing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-purple-800">
          <p><strong>Recommended Label Printers:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Zebra ZD410:</strong> Direct thermal, USB/Ethernet (~$250)</li>
            <li>• <strong>Brother QL-820NWB:</strong> Label printer with WiFi (~$200)</li>
            <li>• <strong>DYMO LabelWriter 450:</strong> Budget option (~$100)</li>
          </ul>
          <p className="mt-3"><strong>Label Specifications:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• Size: 40mm x 25mm or 50mm x 30mm</li>
            <li>• Format: EAN-13, Code-128, or QR Code</li>
            <li>• Include: Product name, barcode, price, expiry date</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}