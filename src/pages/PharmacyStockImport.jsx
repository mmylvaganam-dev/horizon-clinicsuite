import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download, Database, History, RotateCcw, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function PharmacyStockImport() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date', 100),
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ['stockSnapshots'],
    queryFn: () => base44.entities.StockSnapshot.list('-snapshot_date', 10),
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      const isValid = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
      if (isValid) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      }
    }
  };

  const handleUpload = async (replaceMode = false) => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // Create snapshot before replacing if in replace mode
      if (replaceMode && stockItems.length > 0) {
        const totalValue = stockItems.reduce((sum, item) => 
          sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0
        );
        
        await base44.entities.StockSnapshot.create({
          organization_id: user?.organization_id,
          snapshot_date: new Date().toISOString(),
          snapshot_data: stockItems,
          total_items: stockItems.length,
          total_value: totalValue,
          notes: 'Automatic backup before stock replacement'
        });
        toast.success('Backup created');
      }
      let items = [];

      // Check if it's an Excel file
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        // Read Excel file directly
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map Excel columns to our schema
        items = jsonData.map(row => ({
          legacy_id: row['Legacy Id'] || row['legacy_id'] || '',
          barcode: row['Barcode'] || row['barcode'] || '',
          batch_no: row['Batch No'] || row['batch_no'] || '',
          display_name: row['Display Name'] || row['display_name'] || '',
          generic_name: row['Generic name'] || row['generic_name'] || '',
          expire_date: row['Expire date'] || row['expire_date'] || null,
          quantity: parseFloat(row['Quantity'] || row['quantity'] || 0),
          unit_price: parseFloat(row['Unit Price'] || row['unit_price'] || 0),
          unit_cost: parseFloat(row['Unit Cost'] || row['unit_cost'] || 0),
          mrp: parseFloat(row['MRP'] || row['mrp'] || 0),
          quality_status: (row['Quality status'] || row['quality_status'] || 'usable').toLowerCase(),
          storage_status: row['Storage Status'] || row['storage_status'] || 'stored',
          supplier: row['Purchased from supplier'] || row['supplier'] || ''
        }));
      } else {
        // CSV - use AI extraction
        const uploadResponse = await base44.integrations.Core.UploadFile({ file });
        const fileUrl = uploadResponse.file_url;

        const extractResponse = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    legacy_id: { type: "string" },
                    barcode: { type: "string" },
                    batch_no: { type: "string" },
                    display_name: { type: "string" },
                    generic_name: { type: "string" },
                    expire_date: { type: "string" },
                    quantity: { type: "number" },
                    unit_price: { type: "number" },
                    unit_cost: { type: "number" },
                    mrp: { type: "number" },
                    quality_status: { type: "string" },
                    storage_status: { type: "string" },
                    supplier: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (extractResponse.status === 'error') {
          toast.error('Failed to extract data: ' + extractResponse.details);
          setImportResult({ status: 'error', message: extractResponse.details });
          return;
        }

        items = extractResponse.output?.items || extractResponse.output || [];
      }
      
      if (!Array.isArray(items) || items.length === 0) {
        toast.error('No valid data found in the file');
        setImportResult({ status: 'error', message: 'No valid data found' });
        return;
      }

      // Bulk insert into database
      const itemsToInsert = items.map(item => ({
        organization_id: user?.organization_id || '',
        legacy_id: item.legacy_id || '',
        barcode: item.barcode || '',
        batch_no: item.batch_no || '',
        display_name: item.display_name || '',
        generic_name: item.generic_name || '',
        expire_date: item.expire_date || null,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0,
        mrp: parseFloat(item.mrp) || 0,
        quality_status: item.quality_status?.toLowerCase() || 'usable',
        storage_status: item.storage_status || 'stored',
        supplier: item.supplier || ''
      }));

      if (replaceMode) {
        // Delete all existing stock first
        for (const item of stockItems) {
          await base44.entities.PharmacyStock.delete(item.id);
        }
        toast.success('Old stock cleared');
      }

      await base44.entities.PharmacyStock.bulkCreate(itemsToInsert);

      queryClient.invalidateQueries({ queryKey: ['pharmacyStock'] });
      queryClient.invalidateQueries({ queryKey: ['stockSnapshots'] });
      toast.success(`Successfully ${replaceMode ? 'replaced' : 'imported'} ${itemsToInsert.length} items`);
      setImportResult({ 
        status: 'success', 
        count: itemsToInsert.length,
        message: `${itemsToInsert.length} items ${replaceMode ? 'replaced' : 'imported'} successfully` 
      });
      setFile(null);

    } catch (error) {
      toast.error('Import failed: ' + error.message);
      setImportResult({ status: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Legacy Id': 'DC0700017697',
        'Barcode': 'INV0000121685',
        'Batch No': '5027428220',
        'Display Name': 'Resourse Diabetic Vanilla 400g',
        'Generic name': 'Nutritional Supplement',
        'Expire date': '2027-01-17',
        'Quantity': 1,
        'Unit Price': 6483,
        'Unit Cost': 6483,
        'MRP': 7131.3,
        'Quality status': 'usable',
        'Storage Status': 'stored',
        'Purchased from supplier': 'VANIKAA MEDICALS'
      },
      {
        'Legacy Id': 'DC0700017699',
        'Barcode': 'INV0000121682',
        'Batch No': '43049510B1',
        'Display Name': 'S-26 GOLD Powder No2',
        'Generic name': 'Infant Formula',
        'Expire date': '2026-10-30',
        'Quantity': 3,
        'Unit Price': 3153.15,
        'Unit Cost': 3153.15,
        'MRP': 3500,
        'Quality status': 'usable',
        'Storage Status': 'stored',
        'Purchased from supplier': 'VANIKAA MEDICALS'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Template');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Legacy Id
      { wch: 15 }, // Barcode
      { wch: 12 }, // Batch No
      { wch: 30 }, // Display Name
      { wch: 20 }, // Generic name
      { wch: 12 }, // Expire date
      { wch: 10 }, // Quantity
      { wch: 12 }, // Unit Price
      { wch: 12 }, // Unit Cost
      { wch: 12 }, // MRP
      { wch: 15 }, // Quality status
      { wch: 15 }, // Storage Status
      { wch: 25 }  // Purchased from supplier
    ];

    XLSX.writeFile(workbook, 'pharmacy_stock_template.xlsx');
    toast.success('Template downloaded');
  };

  const downloadCurrentStock = () => {
    if (stockItems.length === 0) {
      toast.error('No stock data to export');
      return;
    }

    const exportData = stockItems.map(item => ({
      'Legacy Id': item.legacy_id || '',
      'Barcode': item.barcode || '',
      'Batch No': item.batch_no || '',
      'Display Name': item.display_name || '',
      'Generic name': item.generic_name || '',
      'Expire date': item.expire_date || '',
      'Quantity': item.quantity || 0,
      'Unit Price': item.unit_price || 0,
      'Unit Cost': item.unit_cost || 0,
      'MRP': item.mrp || 0,
      'Quality status': item.quality_status || 'usable',
      'Storage Status': item.storage_status || 'stored',
      'Purchased from supplier': item.supplier || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Data');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 20 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 25 }
    ];

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `pharmacy_stock_${today}.xlsx`);
    toast.success(`Exported ${exportData.length} items`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Stock Import</h1>
        <p className="text-slate-500 mt-1">Upload CSV files to update inventory</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 mb-2">Excel/CSV File Format</p>
              <p className="text-sm text-blue-700 mb-3">
                Your file should contain these columns: Legacy Id, Barcode, Batch No, Display Name, Generic name,
                Expire date, Quantity, Unit Price, Unit Cost, MRP, Quality status, Storage Status, Purchased from supplier
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="bg-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadCurrentStock}
                  disabled={stockItems.length === 0}
                  className="bg-white"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Export Current Stock
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upload Stock Data</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <Info className="w-5 h-5 text-blue-600" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900">Excel Workbook Format Required</h4>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="font-medium">Accepted Formats:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>.xlsx</strong> - Excel Workbook (recommended)</li>
                      <li><strong>.xls</strong> - Excel 97-2003</li>
                      <li><strong>.csv</strong> - Comma-separated values</li>
                    </ul>
                    
                    <p className="font-medium mt-3">Required Columns:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Legacy Id</li>
                      <li>Barcode</li>
                      <li>Batch No</li>
                      <li>Display Name</li>
                      <li>Generic name</li>
                      <li>Expire date (YYYY-MM-DD)</li>
                      <li>Quantity</li>
                      <li>Unit Price</li>
                      <li>Unit Cost</li>
                      <li>MRP</li>
                      <li>Quality status (usable/expired/damaged)</li>
                      <li>Storage Status</li>
                      <li>Purchased from supplier</li>
                    </ul>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
                      <p className="text-xs text-blue-900">
                        <strong>💡 Tip:</strong> Download the template below to see the correct format
                      </p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-slate-600 mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => handleUpload(false)} 
              disabled={!file || uploading}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Add to Stock
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => {
                if (window.confirm('This will REPLACE all existing stock with the uploaded data. A backup will be created first. Continue?')) {
                  handleUpload(true);
                }
              }} 
              disabled={!file || uploading}
              className="flex-1 bg-rose-600 hover:bg-rose-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Replacing...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Replace All Stock
                </>
              )}
            </Button>
          </div>

          {importResult && (
            <div className={`p-4 rounded-lg border ${
              importResult.status === 'success' 
                ? 'bg-emerald-50 border-emerald-200' 
                : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-start gap-3">
                {importResult.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold ${
                    importResult.status === 'success' ? 'text-emerald-900' : 'text-rose-900'
                  }`}>
                    {importResult.status === 'success' ? 'Import Successful' : 'Import Failed'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    importResult.status === 'success' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {importResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Stock History Snapshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(snapshot.snapshot_date), 'dd MMM yyyy, HH:mm')}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {snapshot.total_items} items • Total Value: LKR {snapshot.total_value?.toFixed(2)}
                    </p>
                    {snapshot.notes && (
                      <p className="text-xs text-slate-500 mt-1">{snapshot.notes}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      if (window.confirm('Restore stock from this snapshot? Current stock will be backed up first.')) {
                        try {
                          setUploading(true);
                          
                          // Create backup of current stock
                          if (stockItems.length > 0) {
                            const totalValue = stockItems.reduce((sum, item) => 
                              sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0
                            );
                            
                            await base44.entities.StockSnapshot.create({
                              organization_id: user?.organization_id,
                              snapshot_date: new Date().toISOString(),
                              snapshot_data: stockItems,
                              total_items: stockItems.length,
                              total_value: totalValue,
                              notes: 'Backup before restore from ' + format(new Date(snapshot.snapshot_date), 'dd MMM yyyy HH:mm')
                            });
                          }
                          
                          // Delete current stock
                          for (const item of stockItems) {
                            await base44.entities.PharmacyStock.delete(item.id);
                          }
                          
                          // Restore from snapshot
                          await base44.entities.PharmacyStock.bulkCreate(snapshot.snapshot_data);
                          
                          queryClient.invalidateQueries({ queryKey: ['pharmacyStock'] });
                          queryClient.invalidateQueries({ queryKey: ['stockSnapshots'] });
                          toast.success('Stock restored from snapshot!');
                        } catch (error) {
                          toast.error('Failed to restore: ' + error.message);
                        } finally {
                          setUploading(false);
                        }
                      }
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Items ({stockItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            </div>
          ) : stockItems.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No stock items yet. Upload a CSV file to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stockItems.slice(0, 20).map((item) => (
                <div key={item.id} className="p-3 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{item.display_name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                        <span>Barcode: {item.barcode}</span>
                        <span>•</span>
                        <span>Batch: {item.batch_no}</span>
                        <span>•</span>
                        <span>Qty: {item.quantity}</span>
                        <span>•</span>
                        <span>MRP: {item.mrp}</span>
                        {item.expire_date && (
                          <>
                            <span>•</span>
                            <span>Exp: {new Date(item.expire_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      {item.supplier && (
                        <p className="text-xs text-slate-500 mt-1">Supplier: {item.supplier}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge className={
                        item.quality_status === 'usable' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-rose-100 text-rose-700'
                      }>
                        {item.quality_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}