import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, FileSpreadsheet, AlertCircle, Plus, Stethoscope, Activity, Scan, Home, TestTube, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PricingCatalogs() {
  const queryClient = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState('SERVICES');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState('');
  const [formData, setFormData] = useState({});

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

  const { data: gpProfiles = [] } = useQuery({
    queryKey: ['gpProfiles'],
    queryFn: () => base44.entities.GPProfile.list(),
  });

  const { data: specialists = [] } = useQuery({
    queryKey: ['specialists'],
    queryFn: () => base44.entities.SpecialistProfile.list(),
  });

  const { data: radiologyServices = [] } = useQuery({
    queryKey: ['radiologyServices'],
    queryFn: () => base44.entities.RadiologyService.list(),
  });

  const { data: homeCareServices = [] } = useQuery({
    queryKey: ['homeCareServices'],
    queryFn: () => base44.entities.HomeCareServiceCatalog.list(),
  });

  const { data: labTests = [] } = useQuery({
    queryKey: ['labTests'],
    queryFn: () => base44.entities.LabTestCatalog.list(),
  });

  const { data: healthPackages = [] } = useQuery({
    queryKey: ['healthPackages'],
    queryFn: () => base44.entities.HealthPackage.list(),
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

  const createMutation = useMutation({
    mutationFn: async ({ type, data }) => {
      switch(type) {
        case 'gp':
          return await base44.entities.GPProfile.create(data);
        case 'specialist':
          return await base44.entities.SpecialistProfile.create(data);
        case 'radiology':
          return await base44.entities.RadiologyService.create(data);
        case 'homecare':
          return await base44.entities.HomeCareServiceCatalog.create(data);
        case 'lab':
          return await base44.entities.LabTestCatalog.create(data);
        case 'package':
          return await base44.entities.HealthPackage.create(data);
        default:
          throw new Error('Invalid type');
      }
    },
    onSuccess: (_, variables) => {
      toast.success('Entry created successfully');
      queryClient.invalidateQueries([`${variables.type}Profiles`]);
      queryClient.invalidateQueries([`${variables.type}Services`]);
      queryClient.invalidateQueries(['labTests']);
      queryClient.invalidateQueries(['healthPackages']);
      setShowAddDialog(false);
      setFormData({});
    },
    onError: (error) => {
      toast.error('Failed to create: ' + error.message);
    }
  });

  const handleAddNew = (type) => {
    setAddType(type);
    setFormData({});
    setShowAddDialog(true);
  };

  const handleFormSubmit = () => {
    if (addType === 'gp' || addType === 'specialist') {
      const total = (parseFloat(formData.consultation_fee) || 0) + (parseFloat(formData.hospital_fee) || 0);
      formData.total_fee = total;
    }
    
    if (user?.organization_id) {
      formData.organization_id = user.organization_id;
    }

    createMutation.mutate({ type: addType, data: formData });
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
          <div className="flex items-center justify-between">
            <CardTitle>Service Catalogs</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-2 border-green-200">
                  <CardContent className="pt-6">
                    <Stethoscope className="w-8 h-8 text-green-600 mb-2" />
                    <h3 className="font-semibold mb-1">GP Profiles</h3>
                    <p className="text-sm text-slate-600 mb-3">{gpProfiles.length} entries</p>
                    <Button size="sm" onClick={() => handleAddNew('gp')} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add GP
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200">
                  <CardContent className="pt-6">
                    <Activity className="w-8 h-8 text-purple-600 mb-2" />
                    <h3 className="font-semibold mb-1">Specialists</h3>
                    <p className="text-sm text-slate-600 mb-3">{specialists.length} entries</p>
                    <Button size="sm" onClick={() => handleAddNew('specialist')} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Specialist
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200">
                  <CardContent className="pt-6">
                    <Scan className="w-8 h-8 text-orange-600 mb-2" />
                    <h3 className="font-semibold mb-1">Radiology Services</h3>
                    <p className="text-sm text-slate-600 mb-3">{radiologyServices.length} entries</p>
                    <Button size="sm" onClick={() => handleAddNew('radiology')} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-pink-200">
                  <CardContent className="pt-6">
                    <Home className="w-8 h-8 text-pink-600 mb-2" />
                    <h3 className="font-semibold mb-1">Home Care Services</h3>
                    <p className="text-sm text-slate-600 mb-3">{homeCareServices.length} entries</p>
                    <Button size="sm" onClick={() => handleAddNew('homecare')} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-cyan-200">
                  <CardContent className="pt-6">
                    <TestTube className="w-8 h-8 text-cyan-600 mb-2" />
                    <h3 className="font-semibold mb-1">Lab Tests</h3>
                    <p className="text-sm text-slate-600 mb-3">{labTests.length} entries</p>
                    <Button size="sm" onClick={() => handleAddNew('lab')} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Test
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-rose-200">
                  <CardContent className="pt-6">
                    <Heart className="w-8 h-8 text-rose-600 mb-2" />
                    <h3 className="font-semibold mb-1">Health Packages</h3>
                    <p className="text-sm text-slate-600 mb-3">{healthPackages.length} entries</p>
                    <Button size="sm" onClick={() => handleAddNew('package')} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Package
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </TabsContent>
        </Tabs>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add {addType === 'gp' ? 'GP Profile' : 
                   addType === 'specialist' ? 'Specialist Profile' :
                   addType === 'radiology' ? 'Radiology Service' :
                   addType === 'homecare' ? 'Home Care Service' :
                   addType === 'lab' ? 'Lab Test' : 'Health Package'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {addType === 'gp' && (
              <>
                <div>
                  <Label>Doctor Name *</Label>
                  <Input value={formData.doctor_name || ''} onChange={(e) => setFormData({...formData, doctor_name: e.target.value})} />
                </div>
                <div>
                  <Label>Qualification</Label>
                  <Input value={formData.qualification || ''} onChange={(e) => setFormData({...formData, qualification: e.target.value})} />
                </div>
                <div>
                  <Label>Registration Number</Label>
                  <Input value={formData.registration_number || ''} onChange={(e) => setFormData({...formData, registration_number: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Doctor Fee *</Label>
                    <Input type="number" value={formData.consultation_fee || ''} onChange={(e) => setFormData({...formData, consultation_fee: e.target.value})} />
                  </div>
                  <div>
                    <Label>Hospital Fee *</Label>
                    <Input type="number" value={formData.hospital_fee || ''} onChange={(e) => setFormData({...formData, hospital_fee: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label>Available Days</Label>
                  <Input placeholder="Mon-Fri" value={formData.available_days || ''} onChange={(e) => setFormData({...formData, available_days: e.target.value})} />
                </div>
                <div>
                  <Label>Available Time</Label>
                  <Input placeholder="9am-5pm" value={formData.available_time || ''} onChange={(e) => setFormData({...formData, available_time: e.target.value})} />
                </div>
              </>
            )}

            {addType === 'specialist' && (
              <>
                <div>
                  <Label>Specialist Name *</Label>
                  <Input value={formData.specialist_name || ''} onChange={(e) => setFormData({...formData, specialist_name: e.target.value})} />
                </div>
                <div>
                  <Label>Specialty *</Label>
                  <Input placeholder="Cardiology, Neurology, etc." value={formData.specialty || ''} onChange={(e) => setFormData({...formData, specialty: e.target.value})} />
                </div>
                <div>
                  <Label>Qualification</Label>
                  <Input value={formData.qualification || ''} onChange={(e) => setFormData({...formData, qualification: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Doctor Fee *</Label>
                    <Input type="number" value={formData.consultation_fee || ''} onChange={(e) => setFormData({...formData, consultation_fee: e.target.value})} />
                  </div>
                  <div>
                    <Label>Hospital Fee *</Label>
                    <Input type="number" value={formData.hospital_fee || ''} onChange={(e) => setFormData({...formData, hospital_fee: e.target.value})} />
                  </div>
                </div>
              </>
            )}

            {addType === 'radiology' && (
              <>
                <div>
                  <Label>Service Type *</Label>
                  <Select value={formData.service_type || ''} onValueChange={(val) => setFormData({...formData, service_type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="X-Ray">X-Ray</SelectItem>
                      <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                      <SelectItem value="CT Scan">CT Scan</SelectItem>
                      <SelectItem value="MRI">MRI</SelectItem>
                      <SelectItem value="Mammography">Mammography</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Body Region *</Label>
                  <Input placeholder="Chest, Abdomen, etc." value={formData.region || ''} onChange={(e) => setFormData({...formData, region: e.target.value})} />
                </div>
                <div>
                  <Label>Service Name *</Label>
                  <Input value={formData.service_name || ''} onChange={(e) => setFormData({...formData, service_name: e.target.value})} />
                </div>
                <div>
                  <Label>Price *</Label>
                  <Input type="number" value={formData.price || ''} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </>
            )}

            {addType === 'homecare' && (
              <>
                <div>
                  <Label>Service Category *</Label>
                  <Select value={formData.service_category || ''} onValueChange={(val) => setFormData({...formData, service_category: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nursing_officer">Nursing Officer</SelectItem>
                      <SelectItem value="home_care_worker">Home Care Worker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service Type *</Label>
                  <Select value={formData.service_type || ''} onValueChange={(val) => setFormData({...formData, service_type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ng_tubing">NG Tubing</SelectItem>
                      <SelectItem value="urinary_catheter_insertion">Urinary Catheter Insertion</SelectItem>
                      <SelectItem value="iv_injection">IV Injection</SelectItem>
                      <SelectItem value="wound_care">Wound Care</SelectItem>
                      <SelectItem value="adl_support_day">ADL Support (Day)</SelectItem>
                      <SelectItem value="adl_support_night">ADL Support (Night)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service Name *</Label>
                  <Input value={formData.service_name || ''} onChange={(e) => setFormData({...formData, service_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Price per Visit</Label>
                    <Input type="number" value={formData.price_per_visit || ''} onChange={(e) => setFormData({...formData, price_per_visit: e.target.value})} />
                  </div>
                  <div>
                    <Label>Price per Hour</Label>
                    <Input type="number" value={formData.price_per_hour || ''} onChange={(e) => setFormData({...formData, price_per_hour: e.target.value})} />
                  </div>
                  <div>
                    <Label>Price per Day</Label>
                    <Input type="number" value={formData.price_per_day || ''} onChange={(e) => setFormData({...formData, price_per_day: e.target.value})} />
                  </div>
                </div>
              </>
            )}

            {addType === 'lab' && (
              <>
                <div>
                  <Label>Test Code *</Label>
                  <Input value={formData.test_code || ''} onChange={(e) => setFormData({...formData, test_code: e.target.value})} />
                </div>
                <div>
                  <Label>Test Name *</Label>
                  <Input value={formData.test_name || ''} onChange={(e) => setFormData({...formData, test_name: e.target.value})} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category || 'other'} onValueChange={(val) => setFormData({...formData, category: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hematology">Hematology</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="microbiology">Microbiology</SelectItem>
                      <SelectItem value="immunology">Immunology</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Specimen Type</Label>
                  <Input placeholder="Blood, Urine, etc." value={formData.specimen_type || ''} onChange={(e) => setFormData({...formData, specimen_type: e.target.value})} />
                </div>
                <div>
                  <Label>Price *</Label>
                  <Input type="number" value={formData.price || ''} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </>
            )}

            {addType === 'package' && (
              <>
                <div>
                  <Label>Package Code *</Label>
                  <Input value={formData.package_code || ''} onChange={(e) => setFormData({...formData, package_code: e.target.value})} />
                </div>
                <div>
                  <Label>Package Name *</Label>
                  <Input value={formData.package_name || ''} onChange={(e) => setFormData({...formData, package_name: e.target.value})} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                <div>
                  <Label>Total Price *</Label>
                  <Input type="number" value={formData.total_price || ''} onChange={(e) => setFormData({...formData, total_price: e.target.value})} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="e.g., Medical History requirement" value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleFormSubmit} disabled={createMutation.isPending}>
                Create Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}