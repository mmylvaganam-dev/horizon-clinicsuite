import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PricingCatalogs() {
  const queryClient = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState('SERVICES');
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.ServiceCatalog.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.ProductCatalog.list(),
  });

  const { data: importJobs = [] } = useQuery({
    queryKey: ['importJobs'],
    queryFn: () => base44.entities.ImportJob.list('-created_date', 10),
  });

  const uploadImportMutation = useMutation({
    mutationFn: async (data) => {
      const { data: uploadResult } = await base44.integrations.Core.UploadFile({ file: data.file });
      
      const job = await base44.entities.ImportJob.create({
        organization_id: user.organization_id || '',
        import_type: data.import_type,
        file_ref: uploadResult.file_url,
        uploaded_by: user.id,
        uploaded_by_email: user.email,
        uploaded_at: new Date().toISOString(),
        status: 'uploaded',
        summary_json: {}
      });

      // Call backend function to process import
      const response = await base44.functions.invoke('processBulkImport', {
        import_job_id: job.id,
        import_type: data.import_type
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success('Import uploaded and validated');
      queryClient.invalidateQueries(['importJobs']);
      setShowImport(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error('Import failed: ' + error.message);
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    uploadImportMutation.mutate({
      file: selectedFile,
      import_type: importType
    });
  };

  const downloadTemplate = (type) => {
    let headers = '';
    let filename = '';
    
    if (type === 'SERVICES') {
      headers = 'service_code,service_name,category,default_price,currency,tax_rule_code,active\n';
      headers += 'GP_CONSULT,GP Consultation,CONSULT_GP,50,USD,,true\n';
      headers += 'ECG_TEST,ECG Test,TEST,75,USD,,true';
      filename = 'service_catalog_template.csv';
    } else if (type === 'PHARMACY_PRODUCTS') {
      headers = 'product_code,barcode_value,product_name,strength,form,pack_size,cost_price,sale_price,currency,tax_rule_code,active\n';
      headers += 'PARA500,123456789012,Paracetamol,500mg,Tablet,10s,5.00,8.00,USD,,true\n';
      headers += 'AMOXI250,123456789013,Amoxicillin,250mg,Capsule,12s,10.00,15.00,USD,,true';
      filename = 'product_catalog_template.csv';
    } else if (type === 'USERS') {
      headers = 'full_name,email,phone,role_codes,location_codes,status\n';
      headers += 'John Doe,john@example.com,+1234567890,CLINIC_ADMIN_STAFF,LOC001,active\n';
      headers += 'Jane Smith,jane@example.com,+1234567891,"PHYSICIAN,CLINIC_ADMIN_STAFF",LOC001,active';
      filename = 'users_template.csv';
    }

    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pricing & Catalogs</h1>
        <p className="text-slate-500 mt-1">Manage service pricing and bulk imports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Services</p>
                <p className="text-2xl font-bold">{services.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Imports</p>
                <p className="text-2xl font-bold">{importJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg space-y-3">
              <h3 className="font-semibold">Service Catalog</h3>
              <p className="text-sm text-slate-600">Import consultation, test, and imaging prices</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadTemplate('SERVICES')}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Button size="sm" onClick={() => { setImportType('SERVICES'); setShowImport(true); }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h3 className="font-semibold">Product Catalog</h3>
              <p className="text-sm text-slate-600">Import pharmacy products and prices</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadTemplate('PHARMACY_PRODUCTS')}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Button size="sm" onClick={() => { setImportType('PHARMACY_PRODUCTS'); setShowImport(true); }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h3 className="font-semibold">Users</h3>
              <p className="text-sm text-slate-600">Bulk import users with roles</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadTemplate('USERS')}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Button size="sm" onClick={() => { setImportType('USERS'); setShowImport(true); }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Bulk Import Process</p>
                  <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                    <li>Download the CSV template</li>
                    <li>Fill in your data (existing codes will be updated)</li>
                    <li>Upload the file - validation runs automatically</li>
                    <li>Review preview and fix any errors</li>
                    <li>Click Apply to save changes</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {importJobs.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No imports yet</p>
          ) : (
            <div className="space-y-2">
              {importJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{job.import_type}</p>
                    <p className="text-sm text-slate-500">
                      By {job.uploaded_by_email} • {new Date(job.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    job.status === 'applied' ? 'bg-emerald-100 text-emerald-700' :
                    job.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                    job.status === 'preview_ready' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload {importType} File</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select CSV or Excel file</label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="mt-2"
              />
              {selectedFile && (
                <p className="text-sm text-teal-600 mt-2">Selected: {selectedFile.name}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploadImportMutation.isPending}>
                Upload & Validate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}