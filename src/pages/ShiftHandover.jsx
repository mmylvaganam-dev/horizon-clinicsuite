import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  FileText, 
  Upload, 
  Download,
  Clock,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Package,
  Activity,
  TestTube,
  Home,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function ShiftHandover() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [activeSection, setActiveSection] = useState('PHARMACY_STOCK');
  const [uploadingFile, setUploadingFile] = useState(false);

  const [shiftForm, setShiftForm] = useState({
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    shift_name: 'Morning',
    shift_start_time: '08:00',
    shift_end_time: '16:00',
    incoming_nurse_ref: '',
    outgoing_nurse_ref: '',
    duty_doctor_ref: '',
    opd_status: 'NIL',
    lab_status: 'NIL',
    notes: ''
  });

  const [itemForm, setItemForm] = useState({
    section_code: 'PHARMACY_STOCK',
    item_text: '',
    priority: 'medium',
    status: 'open',
    assigned_to_staff_ref: '',
    patient_ref: '',
    patient_name_cache: ''
  });

  const [cashSnapshots, setCashSnapshots] = useState([]);

  const { data: shiftLogs = [] } = useQuery({
    queryKey: ['shiftLogs'],
    queryFn: () => base44.entities.ShiftLog.list('-shift_date'),
  });

  const { data: shiftLogItems = [] } = useQuery({
    queryKey: ['shiftLogItems'],
    queryFn: () => base44.entities.ShiftLogItem.list('-created_at'),
  });

  const { data: cashSnapshotsData = [] } = useQuery({
    queryKey: ['shiftCashSnapshots'],
    queryFn: () => base44.entities.ShiftCashSnapshot.list(),
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['shiftLogAttachments'],
    queryFn: () => base44.entities.ShiftLogAttachment.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies[0]?.base_currency || 'LKR';

  const createShiftMutation = useMutation({
    mutationFn: async (data) => {
      const shift = await base44.entities.ShiftLog.create(data.shiftData);
      
      // Create cash snapshots
      for (const snapshot of data.cashSnapshots) {
        await base44.entities.ShiftCashSnapshot.create({
          ...snapshot,
          shift_log_ref: shift.id
        });
      }
      
      return shift;
    },
    onSuccess: (shift) => {
      queryClient.invalidateQueries({ queryKey: ['shiftLogs'] });
      queryClient.invalidateQueries({ queryKey: ['shiftCashSnapshots'] });
      setShowCreateDialog(false);
      setSelectedShift(shift);
      toast.success('Shift log created!');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftLogItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLogItems'] });
      setShowItemDialog(false);
      setItemForm({
        section_code: 'PHARMACY_STOCK',
        item_text: '',
        priority: 'medium',
        status: 'open',
        assigned_to_staff_ref: '',
        patient_ref: '',
        patient_name_cache: ''
      });
      toast.success('Item added!');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftLogItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLogItems'] });
      toast.success('Item updated!');
    },
  });

  const handleCreateShift = () => {
    if (!shiftForm.shift_date) {
      toast.error('Please select shift date');
      return;
    }

    createShiftMutation.mutate({
      shiftData: shiftForm,
      cashSnapshots: cashSnapshots
    });
  };

  const handleAddItem = () => {
    if (!selectedShift) {
      toast.error('Please select a shift first');
      return;
    }

    if (!itemForm.item_text.trim()) {
      toast.error('Please enter item text');
      return;
    }

    createItemMutation.mutate({
      ...itemForm,
      shift_log_ref: selectedShift.id
    });
  };

  const handleFileUpload = async (e) => {
    if (!selectedShift) {
      toast.error('Please select a shift first');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.ShiftLogAttachment.create({
        shift_log_ref: selectedShift.id,
        file_url_or_storage_ref: file_url,
        file_type: file.type.includes('pdf') ? 'pdf' : 'image',
        uploaded_by: (await base44.auth.me()).email,
        uploaded_at: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['shiftLogAttachments'] });
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const generatePDF = (shift) => {
    const doc = new jsPDF();
    const items = shiftLogItems.filter(item => item.shift_log_ref === shift.id);
    const snapshots = cashSnapshotsData.filter(s => s.shift_log_ref === shift.id);

    // Header
    doc.setFontSize(18);
    doc.text('SHIFT HANDOVER LOG', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(shift.shift_date), 'dd MMM yyyy')}`, 20, 30);
    doc.text(`Shift: ${shift.shift_name} (${shift.shift_start_time} - ${shift.shift_end_time})`, 20, 36);
    
    doc.text(`Incoming Nurse: ${shift.incoming_nurse_ref || 'N/A'}`, 20, 46);
    doc.text(`Outgoing Nurse: ${shift.outgoing_nurse_ref || 'N/A'}`, 20, 52);
    doc.text(`Duty Doctor: ${shift.duty_doctor_ref || 'N/A'}`, 20, 58);
    
    doc.text(`OPD: ${shift.opd_status}`, 150, 46);
    doc.text(`LAB: ${shift.lab_status}`, 150, 52);

    // Cash Summary
    let y = 70;
    doc.setFontSize(12);
    doc.text('CASH SUMMARY', 20, y);
    y += 8;

    doc.setFontSize(10);
    const streams = ['CLINIC_CASH', 'PHARMACY_CASH'];
    streams.forEach(stream => {
      const opening = snapshots.find(s => s.stream_code === stream && s.snapshot_type === 'OPENING_BALANCE');
      const takeover = snapshots.find(s => s.stream_code === stream && s.snapshot_type === 'TAKEOVER');
      const handover = snapshots.find(s => s.stream_code === stream && s.snapshot_type === 'HANDOVER');
      
      doc.text(`${stream}:`, 25, y);
      doc.text(`Opening: ${currency} ${opening?.amount || 0}`, 35, y + 5);
      doc.text(`Takeover: ${currency} ${takeover?.amount || 0}`, 35, y + 10);
      doc.text(`Handover: ${currency} ${handover?.amount || 0}`, 35, y + 15);
      y += 20;
    });

    // Items by Section
    y += 5;
    doc.setFontSize(12);
    doc.text('SHIFT ITEMS', 20, y);
    y += 8;

    const sections = [...new Set(items.map(i => i.section_code))];
    sections.forEach(section => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.text(section.replace(/_/g, ' '), 20, y);
      y += 6;

      doc.setFontSize(9);
      const sectionItems = items.filter(i => i.section_code === section);
      sectionItems.forEach(item => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`• ${item.item_text} [${item.status}]`, 25, y);
        y += 5;
      });
      y += 3;
    });

    // Signatures
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    y += 10;
    doc.setFontSize(10);
    doc.text('_____________________', 20, y);
    doc.text('Outgoing Signature', 20, y + 5);
    
    doc.text('_____________________', 120, y);
    doc.text('Incoming Signature', 120, y + 5);

    doc.save(`shift_handover_${shift.shift_date}.pdf`);
    toast.success('PDF generated!');
  };

  const getStaffName = (ref) => {
    const member = staff.find(s => s.id === ref);
    return member ? member.full_name : ref;
  };

  const sections = [
    { code: 'PHARMACY_STOCK', label: 'Pharmacy & Stock', icon: Package },
    { code: 'FRONTDESK_CASH', label: 'Front Desk & Cash', icon: DollarSign },
    { code: 'PATIENT_COMM', label: 'Patient Communication', icon: Users },
    { code: 'EQUIPMENT_FACILITY', label: 'Equipment & Facility', icon: Activity },
    { code: 'SPECIAL_NOTE', label: 'Special Notes', icon: AlertCircle },
    { code: 'HOMECARE', label: 'Home Care', icon: Home },
    { code: 'OPD', label: 'OPD', icon: FileText },
    { code: 'LAB', label: 'Laboratory', icon: TestTube }
  ];

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-rose-100 text-rose-700'
  };

  const statusColors = {
    open: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-emerald-100 text-emerald-700',
    deferred: 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Shift Handover Book</h1>
          <p className="text-slate-500 mt-1">Digital shift handover log with attachment support</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Shift Log
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift Logs List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Shifts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shiftLogs.map((shift) => (
              <Card
                key={shift.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                  selectedShift?.id === shift.id ? 'border-2 border-blue-500' : ''
                }`}
                onClick={() => setSelectedShift(shift)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{shift.shift_name}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(shift.shift_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {shift.shift_start_time} - {shift.shift_end_time}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>In: {getStaffName(shift.incoming_nurse_ref)}</p>
                  <p>Out: {getStaffName(shift.outgoing_nurse_ref)}</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge className="text-xs">{shift.opd_status}</Badge>
                  <Badge className="text-xs">{shift.lab_status}</Badge>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Shift Details */}
        <Card className="lg:col-span-2">
          {!selectedShift ? (
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Select a shift to view details</p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedShift.shift_name} - {format(new Date(selectedShift.shift_date), 'dd MMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.location.href = `/homecarebatchmanagement?shiftLogId=${selectedShift.id}&date=${selectedShift.shift_date}`;
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Home Care Batch
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => generatePDF(selectedShift)}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print A4
                    </Button>
                    <label>
                      <Button size="sm" variant="outline" disabled={uploadingFile} asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingFile ? 'Uploading...' : 'Attach Scan'}
                        </span>
                      </Button>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cash Summary */}
                <Card className="bg-slate-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Cash Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {['CLINIC_CASH', 'PHARMACY_CASH'].map(stream => {
                        const snapshots = cashSnapshotsData.filter(
                          s => s.shift_log_ref === selectedShift.id && s.stream_code === stream
                        );
                        const opening = snapshots.find(s => s.snapshot_type === 'OPENING_BALANCE');
                        const takeover = snapshots.find(s => s.snapshot_type === 'TAKEOVER');
                        const handover = snapshots.find(s => s.snapshot_type === 'HANDOVER');

                        return (
                          <div key={stream} className="space-y-2">
                            <p className="font-semibold text-sm">{stream.replace('_', ' ')}</p>
                            <div className="text-xs space-y-1">
                              <p>Opening: {currency} {opening?.amount || 0}</p>
                              <p>Takeover: {currency} {takeover?.amount || 0}</p>
                              <p>Handover: {currency} {handover?.amount || 0}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Sections */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Shift Items</h3>
                    <Button size="sm" onClick={() => setShowItemDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <Tabs value={activeSection} onValueChange={setActiveSection}>
                    <TabsList className="grid grid-cols-4 mb-4">
                      {sections.slice(0, 4).map(section => (
                        <TabsTrigger key={section.code} value={section.code} className="text-xs">
                          {section.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <TabsList className="grid grid-cols-4 mb-4">
                      {sections.slice(4).map(section => (
                        <TabsTrigger key={section.code} value={section.code} className="text-xs">
                          {section.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {sections.map(section => (
                      <TabsContent key={section.code} value={section.code} className="space-y-3">
                        {shiftLogItems
                          .filter(item => item.shift_log_ref === selectedShift.id && item.section_code === section.code)
                          .map(item => (
                            <Card key={item.id} className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <p className="flex-1">{item.item_text}</p>
                                <div className="flex gap-2">
                                  <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>
                                  <Badge className={statusColors[item.status]}>{item.status}</Badge>
                                </div>
                              </div>
                              {item.patient_name_cache && (
                                <p className="text-xs text-slate-600">Patient: {item.patient_name_cache}</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newStatus = item.status === 'done' ? 'open' : 'done';
                                    updateItemMutation.mutate({ id: item.id, data: { status: newStatus } });
                                  }}
                                >
                                  {item.status === 'done' ? 'Reopen' : 'Mark Done'}
                                </Button>
                              </div>
                            </Card>
                          ))}
                        {shiftLogItems.filter(
                          item => item.shift_log_ref === selectedShift.id && item.section_code === section.code
                        ).length === 0 && (
                          <p className="text-center text-slate-500 py-8">No items in this section</p>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                {/* Attachments */}
                {attachments.filter(a => a.shift_log_ref === selectedShift.id).length > 0 && (
                  <Card className="bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-base">Attached Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {attachments
                          .filter(a => a.shift_log_ref === selectedShift.id)
                          .map(att => (
                            <a
                              key={att.id}
                              href={att.file_url_or_storage_ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline"
                            >
                              <Download className="w-4 h-4" />
                              {att.file_type} - {format(new Date(att.uploaded_at), 'dd MMM HH:mm')}
                            </a>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Create Shift Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Shift Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Shift Date *</Label>
                <Input
                  type="date"
                  value={shiftForm.shift_date}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Shift Name *</Label>
                <Select value={shiftForm.shift_name} onValueChange={(val) => setShiftForm({ ...shiftForm, shift_name: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={shiftForm.shift_start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={shiftForm.shift_end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Incoming Nurse</Label>
                <Select value={shiftForm.incoming_nurse_ref} onValueChange={(val) => setShiftForm({ ...shiftForm, incoming_nurse_ref: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Outgoing Nurse</Label>
                <Select value={shiftForm.outgoing_nurse_ref} onValueChange={(val) => setShiftForm({ ...shiftForm, outgoing_nurse_ref: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duty Doctor</Label>
                <Select value={shiftForm.duty_doctor_ref} onValueChange={(val) => setShiftForm({ ...shiftForm, duty_doctor_ref: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>OPD Status</Label>
                <Select value={shiftForm.opd_status} onValueChange={(val) => setShiftForm({ ...shiftForm, opd_status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIL">NIL</SelectItem>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                    <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>LAB Status</Label>
                <Select value={shiftForm.lab_status} onValueChange={(val) => setShiftForm({ ...shiftForm, lab_status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIL">NIL</SelectItem>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                    <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Cash Snapshots (Opening/Takeover/Handover)</Label>
              <div className="space-y-3 mt-2">
                {['CLINIC_CASH', 'PHARMACY_CASH'].map(stream => (
                  <Card key={stream} className="p-3 bg-slate-50">
                    <p className="font-semibold text-sm mb-2">{stream.replace('_', ' ')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['OPENING_BALANCE', 'TAKEOVER', 'HANDOVER'].map(type => (
                        <Input
                          key={type}
                          type="number"
                          placeholder={type.replace('_', ' ')}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setCashSnapshots(prev => {
                              const filtered = prev.filter(s => !(s.stream_code === stream && s.snapshot_type === type));
                              return [...filtered, { stream_code: stream, snapshot_type: type, amount: value, currency }];
                            });
                          }}
                        />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={shiftForm.notes}
                onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateShift} disabled={createShiftMutation.isPending}>
                {createShiftMutation.isPending ? 'Creating...' : 'Create Shift Log'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shift Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Section *</Label>
              <Select value={itemForm.section_code} onValueChange={(val) => setItemForm({ ...itemForm, section_code: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.code} value={section.code}>{section.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Item Description *</Label>
              <Textarea
                value={itemForm.item_text}
                onChange={(e) => setItemForm({ ...itemForm, item_text: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={itemForm.priority} onValueChange={(val) => setItemForm({ ...itemForm, priority: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={itemForm.status} onValueChange={(val) => setItemForm({ ...itemForm, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Assigned To (Optional)</Label>
              <Select value={itemForm.assigned_to_staff_ref} onValueChange={(val) => setItemForm({ ...itemForm, assigned_to_staff_ref: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Link to Patient (Optional)</Label>
              <Select
                value={itemForm.patient_ref}
                onValueChange={(val) => {
                  const patient = patients.find(p => p.id === val);
                  setItemForm({
                    ...itemForm,
                    patient_ref: val,
                    patient_name_cache: patient ? `${patient.first_name} ${patient.last_name}` : ''
                  });
                }}
              >
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

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={createItemMutation.isPending}>
                {createItemMutation.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}