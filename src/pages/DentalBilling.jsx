import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  DollarSign,
  Package,
  Beaker,
  FileText,
  Printer,
  Upload,
  Edit,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function DentalBilling() {
  const queryClient = useQueryClient();
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showLabCaseDialog, setShowLabCaseDialog] = useState(false);
  const [editingFee, setEditingFee] = useState(null);

  const [feeForm, setFeeForm] = useState({
    procedure_code: '',
    procedure_name: '',
    default_fee: 0,
    estimated_minutes: 0
  });

  const [inventoryForm, setInventoryForm] = useState({
    item_name: '',
    sku: '',
    unit: 'piece',
    reorder_level: 10,
    current_stock: 0,
    cost_per_unit: 0
  });

  const [labCaseForm, setLabCaseForm] = useState({
    patient_ref: '',
    lab_vendor_name: '',
    lab_case_type: '',
    tooth_number: '',
    impression_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    cost_to_clinic: 0,
    charge_to_patient: 0,
    status: 'sent'
  });

  const { data: feeSchedule = [] } = useQuery({
    queryKey: ['dentalFeeSchedule'],
    queryFn: () => base44.entities.DentalFeeSchedule.filter({ active: true }),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['dentalInventoryItems'],
    queryFn: () => base44.entities.DentalInventoryItem.filter({ active: true }),
  });

  const { data: inventoryTxns = [] } = useQuery({
    queryKey: ['dentalInventoryTxns'],
    queryFn: () => base44.entities.DentalInventoryTxn.list('-created_at', 50),
  });

  const { data: labCases = [] } = useQuery({
    queryKey: ['dentalLabCases'],
    queryFn: () => base44.entities.DentalLabCase.list('-created_at'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies[0]?.base_currency || 'USD';

  const createFeeMutation = useMutation({
    mutationFn: (data) => editingFee 
      ? base44.entities.DentalFeeSchedule.update(editingFee.id, data)
      : base44.entities.DentalFeeSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalFeeSchedule'] });
      setShowFeeDialog(false);
      setEditingFee(null);
      setFeeForm({ procedure_code: '', procedure_name: '', default_fee: 0, estimated_minutes: 0 });
      toast.success(editingFee ? 'Fee updated!' : 'Fee added!');
    },
  });

  const createInventoryMutation = useMutation({
    mutationFn: (data) => base44.entities.DentalInventoryItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalInventoryItems'] });
      setShowInventoryDialog(false);
      setInventoryForm({ item_name: '', sku: '', unit: 'piece', reorder_level: 10, current_stock: 0, cost_per_unit: 0 });
      toast.success('Inventory item added!');
    },
  });

  const createLabCaseMutation = useMutation({
    mutationFn: (data) => base44.entities.DentalLabCase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalLabCases'] });
      setShowLabCaseDialog(false);
      toast.success('Lab case created!');
    },
  });

  const updateLabStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DentalLabCase.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalLabCases'] });
      toast.success('Status updated!');
    },
  });

  const generateLabOrderPDF = (labCase) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('DENTAL LAB ORDER', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Case ID: ${labCase.id}`, 20, 30);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 20, 36);

    let y = 50;
    doc.setFontSize(12);
    doc.text('LAB VENDOR', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(labCase.lab_vendor_name, 25, y);
    y += 15;

    doc.setFontSize(12);
    doc.text('PATIENT INFORMATION', 20, y);
    y += 8;
    doc.setFontSize(10);
    const patient = patients.find(p => p.id === labCase.patient_ref);
    if (patient) {
      doc.text(`Patient: ${patient.first_name} ${patient.last_name}`, 25, y);
      y += 6;
    }
    y += 10;

    doc.setFontSize(12);
    doc.text('CASE DETAILS', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Case Type: ${labCase.lab_case_type}`, 25, y);
    y += 6;
    if (labCase.tooth_number) {
      doc.text(`Tooth #: ${labCase.tooth_number}`, 25, y);
      y += 6;
    }
    doc.text(`Impression Date: ${format(new Date(labCase.impression_date), 'dd MMM yyyy')}`, 25, y);
    y += 6;
    if (labCase.due_date) {
      doc.text(`Due Date: ${format(new Date(labCase.due_date), 'dd MMM yyyy')}`, 25, y);
      y += 6;
    }
    y += 10;

    if (labCase.notes) {
      doc.setFontSize(12);
      doc.text('NOTES', 20, y);
      y += 8;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(labCase.notes, 170);
      doc.text(lines, 25, y);
    }

    doc.save(`lab_order_${labCase.id}.pdf`);
    toast.success('PDF generated!');
  };

  const getPatientName = (patientRef) => {
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const lowStockItems = inventoryItems.filter(item => 
    item.current_stock <= (item.reorder_level || 0)
  );

  const statusColors = {
    sent: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    received: 'bg-emerald-100 text-emerald-700',
    delivered: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-rose-100 text-rose-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dental Billing & Operations</h1>
          <p className="text-slate-500 mt-1">Fee schedules, inventory, and lab work management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Fee Schedule Items</p>
            <p className="text-3xl font-bold mt-1">{feeSchedule.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <Package className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Inventory Items</p>
            <p className="text-3xl font-bold mt-1">{inventoryItems.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Low Stock</p>
            <p className="text-3xl font-bold mt-1">{lowStockItems.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <Beaker className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Lab Cases</p>
            <p className="text-3xl font-bold mt-1">
              {labCases.filter(c => c.status === 'sent' || c.status === 'in_progress').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fees">
            <DollarSign className="w-4 h-4 mr-2" />
            Fee Schedule ({feeSchedule.length})
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventory ({inventoryItems.length})
          </TabsTrigger>
          <TabsTrigger value="lab">
            <Beaker className="w-4 h-4 mr-2" />
            Lab Cases ({labCases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingFee(null);
              setShowFeeDialog(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Fee
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {feeSchedule.map((fee) => (
              <Card key={fee.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">{fee.procedure_code}</Badge>
                      {fee.estimated_minutes > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {fee.estimated_minutes} min
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900">{fee.procedure_name}</h3>
                    <p className="text-2xl font-bold text-teal-600 mt-2">
                      {currency} {fee.default_fee.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFee(fee);
                      setFeeForm({
                        procedure_code: fee.procedure_code,
                        procedure_name: fee.procedure_name,
                        default_fee: fee.default_fee,
                        estimated_minutes: fee.estimated_minutes || 0
                      });
                      setShowFeeDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
            {feeSchedule.length === 0 && (
              <Card className="p-12 text-center">
                <DollarSign className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No fee schedule items</h3>
                <p className="text-slate-500 mt-1">Add procedure codes and fees</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowInventoryDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {lowStockItems.length > 0 && (
            <Card className="bg-amber-50 border-amber-300 border-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-bold text-amber-900 text-lg">LOW STOCK ALERT</p>
                    <p className="text-sm text-amber-700 mt-1">
                      {lowStockItems.length} item(s) at or below reorder level
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3">
            {inventoryItems.map((item) => {
              const isLowStock = item.current_stock <= (item.reorder_level || 0);
              
              return (
                <Card key={item.id} className={`p-5 ${isLowStock ? 'bg-amber-50 border-amber-200 border-2' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{item.item_name}</h3>
                        {item.sku && <Badge variant="outline">{item.sku}</Badge>}
                        {isLowStock && (
                          <Badge className="bg-amber-100 text-amber-700">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Current Stock</p>
                          <p className={`font-bold text-xl ${isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                            {item.current_stock} {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Reorder Level</p>
                          <p className="font-medium">{item.reorder_level || 0} {item.unit}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Cost/Unit</p>
                          <p className="font-medium">{currency} {(item.cost_per_unit || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Stock Value</p>
                          <p className="font-bold text-teal-600">
                            {currency} {((item.current_stock || 0) * (item.cost_per_unit || 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="lab" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowLabCaseDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Lab Case
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {labCases.map((labCase) => (
              <Card key={labCase.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[labCase.status]}>{labCase.status}</Badge>
                      <Badge variant="outline">{labCase.lab_case_type}</Badge>
                      {labCase.tooth_number && (
                        <Badge variant="outline">Tooth #{labCase.tooth_number}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900">{getPatientName(labCase.patient_ref)}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Lab: {labCase.lab_vendor_name}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                      <div>
                        <p className="text-slate-500">Impression</p>
                        <p className="font-medium">{format(new Date(labCase.impression_date), 'MMM d')}</p>
                      </div>
                      {labCase.due_date && (
                        <div>
                          <p className="text-slate-500">Due</p>
                          <p className="font-medium">{format(new Date(labCase.due_date), 'MMM d')}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-500">Lab Cost</p>
                        <p className="font-medium">{currency} {(labCase.cost_to_clinic || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {labCase.status !== 'delivered' && labCase.status !== 'cancelled' && (
                      <Select
                        value={labCase.status}
                        onValueChange={(val) => updateLabStatusMutation.mutate({ id: labCase.id, status: val })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="outline" size="sm" onClick={() => generateLabOrderPDF(labCase)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {labCases.length === 0 && (
              <Card className="p-12 text-center">
                <Beaker className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No lab cases</h3>
                <p className="text-slate-500 mt-1">Create lab work orders</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Fee Dialog */}
      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Edit Fee' : 'Add Fee Schedule Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Procedure Code *</Label>
              <Input
                value={feeForm.procedure_code}
                onChange={(e) => setFeeForm({ ...feeForm, procedure_code: e.target.value })}
                placeholder="e.g., D0150"
              />
            </div>
            <div>
              <Label>Procedure Name *</Label>
              <Input
                value={feeForm.procedure_name}
                onChange={(e) => setFeeForm({ ...feeForm, procedure_name: e.target.value })}
                placeholder="e.g., Comprehensive Oral Evaluation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Fee *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={feeForm.default_fee}
                  onChange={(e) => setFeeForm({ ...feeForm, default_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Est. Minutes</Label>
                <Input
                  type="number"
                  value={feeForm.estimated_minutes}
                  onChange={(e) => setFeeForm({ ...feeForm, estimated_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowFeeDialog(false);
                setEditingFee(null);
              }}>
                Cancel
              </Button>
              <Button onClick={() => createFeeMutation.mutate(feeForm)}>
                {editingFee ? 'Update' : 'Add'} Fee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Inventory Dialog */}
      <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Item Name *</Label>
              <Input
                value={inventoryForm.item_name}
                onChange={(e) => setInventoryForm({ ...inventoryForm, item_name: e.target.value })}
                placeholder="e.g., Composite Resin"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <Input
                  value={inventoryForm.sku}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, sku: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit *</Label>
                <Input
                  value={inventoryForm.unit}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                  placeholder="piece/ml/box"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  value={inventoryForm.current_stock}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, current_stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={inventoryForm.reorder_level}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, reorder_level: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Cost per Unit</Label>
              <Input
                type="number"
                step="0.01"
                value={inventoryForm.cost_per_unit}
                onChange={(e) => setInventoryForm({ ...inventoryForm, cost_per_unit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowInventoryDialog(false)}>Cancel</Button>
              <Button onClick={() => createInventoryMutation.mutate(inventoryForm)}>
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lab Case Dialog */}
      <Dialog open={showLabCaseDialog} onOpenChange={setShowLabCaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Lab Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient *</Label>
                <Select value={labCaseForm.patient_ref} onValueChange={(val) => setLabCaseForm({ ...labCaseForm, patient_ref: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lab Vendor *</Label>
                <Input
                  value={labCaseForm.lab_vendor_name}
                  onChange={(e) => setLabCaseForm({ ...labCaseForm, lab_vendor_name: e.target.value })}
                  placeholder="Lab name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Case Type *</Label>
                <Input
                  value={labCaseForm.lab_case_type}
                  onChange={(e) => setLabCaseForm({ ...labCaseForm, lab_case_type: e.target.value })}
                  placeholder="Crown/Denture/Aligner"
                />
              </div>
              <div>
                <Label>Tooth Number</Label>
                <Input
                  value={labCaseForm.tooth_number}
                  onChange={(e) => setLabCaseForm({ ...labCaseForm, tooth_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Impression Date</Label>
                <Input
                  type="date"
                  value={labCaseForm.impression_date}
                  onChange={(e) => setLabCaseForm({ ...labCaseForm, impression_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={labCaseForm.due_date}
                  onChange={(e) => setLabCaseForm({ ...labCaseForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost to Clinic</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={labCaseForm.cost_to_clinic}
                  onChange={(e) => setLabCaseForm({ ...labCaseForm, cost_to_clinic: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Charge to Patient</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={labCaseForm.charge_to_patient}
                  onChange={(e) => setLabCaseForm({ ...labCaseForm, charge_to_patient: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowLabCaseDialog(false)}>Cancel</Button>
              <Button onClick={() => createLabCaseMutation.mutate(labCaseForm)}>
                Create Lab Case
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}