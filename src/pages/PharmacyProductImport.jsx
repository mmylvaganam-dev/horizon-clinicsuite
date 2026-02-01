import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PharmacyProductImport() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Auto-detect delimiter: check if first line has more tabs or commas
    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';

    const headers = lines[0].split(delimiter).map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter);
      if (values.length > 1 && values.some(v => v.trim())) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        data.push(row);
      }
    }
    return data;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);
        
        const results = {
          total: rows.length,
          success: 0,
          failed: 0,
          errors: []
        };

        for (const row of rows) {
          try {
            // Parse strength value
            let strengthValue = null;
            let strengthUnit = row['Strength Unit'] || '';
            
            if (row['Strength']) {
              const strengthStr = String(row['Strength']).trim();
              strengthValue = parseFloat(strengthStr);
              if (isNaN(strengthValue)) {
                strengthValue = null;
              }
            }

            // Parse expiry date
            let expiryDate = null;
            if (row['Expiry Date']) {
              const dateStr = row['Expiry Date'].trim();
              if (dateStr && dateStr !== '') {
                expiryDate = dateStr;
              }
            }

            // Create display name
            const displayName = row['Brand Name'] || row['Generic Name'] || 'Unknown Product';
            
            const productData = {
              organization_id: user?.organization_id || '',
              brand_name: row['Brand Name'] || '',
              generic_name: row['Generic Name'] || '',
              display_name: displayName,
              service_category: row['Service Category'] || '',
              class_of_medicine: row['Class Of Medicine'] || '',
              dosage_form: row['Dosage Form'] || '',
              package_type: row['Package Type'] || '',
              strength: strengthValue,
              strength_unit: strengthUnit,
              expire_date: expiryDate,
              quantity: 0,
              unit_price: 0,
              unit_cost: 0,
              mrp: 0,
              quality_status: 'usable',
              storage_status: 'stored'
            };

            await base44.entities.PharmacyStock.create(productData);
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              product: row['Brand Name'] || row['Generic Name'],
              error: error.message
            });
          }
        }

        setImportResults(results);
        queryClient.invalidateQueries(['pharmacyStock']);
        
        if (results.success > 0) {
          toast.success(`Successfully imported ${results.success} products`);
        }
        if (results.failed > 0) {
          toast.error(`Failed to import ${results.failed} products`);
        }
      } catch (error) {
        toast.error(`Import failed: ${error.message}`);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = `Brand Name\tGeneric Name\tService Category\tClass Of Medicine\tDosage Form\tPackage Type\tStrength\tStrength Unit\tExpiry Date
Sample Drug\tSample Generic\tDrug\tAntibiotics\tTablet\tBox\t500\tmg\t2027-12-31
Sample Syrup\tSample Active\tDrug\tPaediatric\tSyrup\tBottle\t100\tml\t2028-06-30`;
    
    const blob = new Blob([template], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pharmacy_products_template.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Pharmacy Product Import</h1>
        <p className="text-slate-600 mt-2">Bulk import pharmaceutical products with complete details</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Import Instructions</p>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• Download the template file and fill in your product data</li>
                <li>• Required columns: Brand Name, Generic Name, Service Category, Class Of Medicine, Dosage Form, Package Type, Strength, Strength Unit, Expiry Date</li>
                <li>• Use TAB-separated format (copy from Excel and paste in text editor)</li>
                <li>• Expiry Date format: YYYY-MM-DD (e.g., 2027-12-31)</li>
                <li>• After import, you can update pricing and quantities individually</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Download Template</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Download the template file with the correct format and column headers
            </p>
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileChange}
              disabled={importing}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
              </div>
            )}
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Import Products'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold text-slate-900">{importResults.total}</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-emerald-600">Success</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{importResults.success}</p>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <p className="text-sm text-rose-600">Failed</p>
                </div>
                <p className="text-2xl font-bold text-rose-600">{importResults.failed}</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Errors
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importResults.errors.map((err, idx) => (
                    <div key={idx} className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                      <p className="font-medium text-rose-900">{err.product}</p>
                      <p className="text-sm text-rose-700">{err.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Next Steps</p>
              <ul className="text-sm text-amber-800 mt-1 space-y-1">
                <li>• Go to Pharmacy Inventory to set prices (unit_price, unit_cost, mrp)</li>
                <li>• Update stock quantities when you receive inventory</li>
                <li>• Assign barcodes in Barcode Setup page</li>
                <li>• Review and verify all imported product data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}