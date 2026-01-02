import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast.error('Please upload an Excel file (.xlsx, .xls) or CSV file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // Upload the file
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResponse.file_url;

      // Extract data from the file
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

      const items = extractResponse.output?.items || extractResponse.output || [];
      
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
        expire_date: item.expire_date || null,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0,
        mrp: parseFloat(item.mrp) || 0,
        quality_status: item.quality_status?.toLowerCase() || 'usable',
        storage_status: item.storage_status || 'stored',
        supplier: item.supplier || ''
      }));

      await base44.entities.PharmacyStock.bulkCreate(itemsToInsert);

      queryClient.invalidateQueries({ queryKey: ['pharmacyStock'] });
      toast.success(`Successfully imported ${itemsToInsert.length} items`);
      setImportResult({ 
        status: 'success', 
        count: itemsToInsert.length,
        message: `${itemsToInsert.length} items imported successfully` 
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
    const csvContent = `Legacy Id,Barcode,Batch No,Display Name,Expire date,Quantity,Unit Price,Unit Cost,MRP,Quality Status,Storage Status,Purchased from supplier
DC0700017697,INV0000121685,5027428220,Resourse Diabetic Vanilla 400g,2027-01-17,1,6483,6483,7131.3,usable,stored,VANIKAA MEDICALS
DC0700017699,INV0000121682,43049510B1,S-26 GOLD Powder No2,2026-10-30,3,3153.15,3153.15,3500,usable,stored,VANIKAA MEDICALS`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pharmacy_stock_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Stock Import</h1>
        <p className="text-slate-500 mt-1">Upload Excel files to update inventory</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">Excel File Format</p>
              <p className="text-sm text-blue-700">
                Your Excel file should contain the following columns: Legacy Id, Barcode, Batch No, Display Name, 
                Expire date, Quantity, Unit Price, Unit Cost, MRP, Quality Status, Storage Status, Purchased from supplier
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-3">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Stock Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-slate-600 mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Stock Data
              </>
            )}
          </Button>

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
              <p className="text-slate-500">No stock items yet. Upload an Excel file to get started.</p>
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