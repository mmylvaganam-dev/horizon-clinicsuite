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
  Building2,
  Truck,
  PackageX,
  CheckSquare,
  Calendar,
  Printer,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function PharmacyOperations() {
  const queryClient = useQueryClient();
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedShiftLog, setSelectedShiftLog] = useState('');

  const [vendorForm, setVendorForm] = useState({
    vendor_name: '',
    rep_name: '',
    rep_phone: '',
    rep_email: '',
    notes: ''
  });

  const [visitForm, setVisitForm] = useState({
    vendor_ref: '',
    vendor_name_cache: '',
    visit_date: format(new Date(), 'yyyy-MM-dd'),
    visit_note: '',
    status: 'planned'
  });

  const [returnForm, setReturnForm] = useState({
    vendor_ref: '',
    vendor_name_cache: '',
    pickup_date: format(new Date(), 'yyyy-MM-dd'),
    returns_summary_text: '',
    status: 'planned',
    notes: ''
  });

  const [taskForm, setTaskForm] = useState({
    task_text: '',
    due_date: '',
    priority: 'medium',
    status: 'open'
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendorProfiles'],
    queryFn: () => base44.entities.VendorProfileLight.filter({ active: true }),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['vendorVisits'],
    queryFn: () => base44.entities.PharmacyVendorVisit.list('-visit_date'),
  });

  const { data: returns = [] } = useQuery({
    queryKey: ['returnsPickups'],
    queryFn: () => base44.entities.PharmacyReturnsPickup.list('-pickup_date'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['stockTasks'],
    queryFn: () => base44.entities.PharmacyStockTask.list('-created_at'),
  });

  const { data: shiftLogs = [] } = useQuery({
    queryKey: ['shiftLogs'],
    queryFn: () => base44.entities.ShiftLog.list('-shift_date'),
  });

  const createVendorMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorProfileLight.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProfiles'] });
      setShowVendorDialog(false);
      setVendorForm({ vendor_name: '', rep_name: '', rep_phone: '', rep_email: '', notes: '' });
      toast.success('Vendor added!');
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (data) => base44.entities.PharmacyVendorVisit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorVisits'] });
      setShowVisitDialog(false);
      toast.success('Visit scheduled!');
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: (data) => base44.entities.PharmacyReturnsPickup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returnsPickups'] });
      setShowReturnDialog(false);
      toast.success('Returns pickup scheduled!');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.PharmacyStockTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockTasks'] });
      setShowTaskDialog(false);
      setTaskForm({ task_text: '', due_date: '', priority: 'medium', status: 'open' });
      toast.success('Task created!');
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PharmacyStockTask.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockTasks'] });
      toast.success('Task updated!');
    },
  });

  const addToShiftLogMutation = useMutation({
    mutationFn: async ({ type, record, shiftLogId }) => {
      let itemText = '';
      let relatedRefType = '';

      if (type === 'visit') {
        itemText = `Vendor Visit: ${record.vendor_name_cache} - ${format(new Date(record.visit_date), 'MMM d, yyyy')} - ${record.visit_note || 'New order discussion'}`;
        relatedRefType = 'PharmacyVendorVisit';
      } else if (type === 'return') {
        itemText = `Returns Pickup: ${record.vendor_name_cache} - ${format(new Date(record.pickup_date), 'MMM d, yyyy')} - ${record.returns_summary_text || 'Returns will be collected'}`;
        relatedRefType = 'PharmacyReturnsPickup';
      } else if (type === 'task') {
        itemText = `Stock Task: ${record.task_text}`;
        relatedRefType = 'PharmacyStockTask';
      }

      await base44.entities.ShiftLogItem.create({
        shift_log_ref: shiftLogId,
        section_code: 'PHARMACY_STOCK',
        item_text: itemText,
        priority: record.priority || 'medium',
        status: 'open',
        related_ref_type: relatedRefType,
        related_ref_id: record.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLogItems'] });
      toast.success('Added to Shift Log!');
    },
  });

  const generateVisitPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('VENDOR VISIT SCHEDULE', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 20, 30);

    let y = 45;
    visits.forEach((visit, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${visit.vendor_name_cache}`, 20, y);
      y += 6;

      doc.setFontSize(9);
      doc.text(`Date: ${format(new Date(visit.visit_date), 'dd MMM yyyy')}`, 25, y);
      y += 5;
      doc.text(`Status: ${visit.status.toUpperCase()}`, 25, y);
      y += 5;
      if (visit.visit_note) {
        doc.text(`Note: ${visit.visit_note}`, 25, y);
        y += 5;
      }
      y += 3;
    });

    doc.save(`vendor_visits_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('PDF generated!');
  };

  const generateReturnsPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('RETURNS PICKUP SCHEDULE', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 20, 30);

    let y = 45;
    returns.forEach((ret, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${ret.vendor_name_cache}`, 20, y);
      y += 6;

      doc.setFontSize(9);
      doc.text(`Pickup Date: ${format(new Date(ret.pickup_date), 'dd MMM yyyy')}`, 25, y);
      y += 5;
      doc.text(`Status: ${ret.status.toUpperCase()}`, 25, y);
      y += 5;
      if (ret.returns_summary_text) {
        doc.text(`Summary: ${ret.returns_summary_text}`, 25, y);
        y += 5;
      }
      y += 3;
    });

    doc.save(`returns_pickup_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('PDF generated!');
  };

  const statusColors = {
    planned: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-purple-100 text-purple-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
    ready: 'bg-amber-100 text-amber-700',
    picked_up: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700',
    open: 'bg-blue-100 text-blue-700',
    done: 'bg-emerald-100 text-emerald-700',
    deferred: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Operations</h1>
          <p className="text-slate-500 mt-1">Vendor visits, returns pickup, and stock tasks</p>
        </div>
        <Button onClick={() => setShowVendorDialog(true)} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Shift Log Selector */}
      <Card className="bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="font-semibold">Link to Shift Log:</Label>
            <Select value={selectedShiftLog} onValueChange={setSelectedShiftLog}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select shift log" />
              </SelectTrigger>
              <SelectContent>
                {shiftLogs.map(log => (
                  <SelectItem key={log.id} value={log.id}>
                    {log.shift_name} - {format(new Date(log.shift_date), 'dd MMM yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="visits" className="space-y-6">
        <TabsList>
          <TabsTrigger value="visits">
            <Truck className="w-4 h-4 mr-2" />
            Vendor Visits ({visits.length})
          </TabsTrigger>
          <TabsTrigger value="returns">
            <PackageX className="w-4 h-4 mr-2" />
            Returns Pickup ({returns.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="w-4 h-4 mr-2" />
            Stock Tasks ({tasks.filter(t => t.status === 'open').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          <div className="flex justify-between items-center">
            <Button onClick={() => setShowVisitDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Visit
            </Button>
            <Button variant="outline" onClick={generateVisitPDF}>
              <Printer className="w-4 h-4 mr-2" />
              Print Visit Sheet
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {visits.map((visit) => (
              <Card key={visit.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{visit.vendor_name_cache}</h3>
                      <Badge className={statusColors[visit.status]}>{visit.status}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(visit.visit_date), 'EEEE, MMM d, yyyy')}
                      </p>
                      {visit.visit_note && <p className="text-slate-700">{visit.visit_note}</p>}
                    </div>
                  </div>
                  {selectedShiftLog && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addToShiftLogMutation.mutate({ type: 'visit', record: visit, shiftLogId: selectedShiftLog })}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add to Shift Log
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <div className="flex justify-between items-center">
            <Button onClick={() => setShowReturnDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Pickup
            </Button>
            <Button variant="outline" onClick={generateReturnsPDF}>
              <Printer className="w-4 h-4 mr-2" />
              Print Returns Sheet
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {returns.map((ret) => (
              <Card key={ret.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{ret.vendor_name_cache}</h3>
                      <Badge className={statusColors[ret.status]}>{ret.status}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Pickup: {format(new Date(ret.pickup_date), 'EEEE, MMM d, yyyy')}
                      </p>
                      {ret.returns_summary_text && (
                        <p className="text-slate-700">{ret.returns_summary_text}</p>
                      )}
                      {ret.notes && <p className="text-xs text-slate-500">{ret.notes}</p>}
                    </div>
                  </div>
                  {selectedShiftLog && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addToShiftLogMutation.mutate({ type: 'return', record: ret, shiftLogId: selectedShiftLog })}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add to Shift Log
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Button onClick={() => setShowTaskDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>

          <div className="grid grid-cols-1 gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[task.status]}>{task.status}</Badge>
                      <Badge variant="outline">{task.priority}</Badge>
                      {task.due_date && (
                        <span className="text-xs text-slate-500">
                          Due: {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900">{task.task_text}</p>
                  </div>
                  <div className="flex gap-2">
                    {task.status !== 'done' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatusMutation.mutate({ id: task.id, status: 'done' })}
                      >
                        Mark Done
                      </Button>
                    )}
                    {selectedShiftLog && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToShiftLogMutation.mutate({ type: 'task', record: task, shiftLogId: selectedShiftLog })}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Add to Shift Log
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Vendor Dialog */}
      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Vendor Name *</Label>
              <Input
                value={vendorForm.vendor_name}
                onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Rep Name</Label>
              <Input
                value={vendorForm.rep_name}
                onChange={(e) => setVendorForm({ ...vendorForm, rep_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rep Phone</Label>
                <Input
                  value={vendorForm.rep_phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, rep_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Rep Email</Label>
                <Input
                  value={vendorForm.rep_email}
                  onChange={(e) => setVendorForm({ ...vendorForm, rep_email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={vendorForm.notes}
                onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowVendorDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => createVendorMutation.mutate(vendorForm)}>
                Add Vendor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Visit Dialog */}
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Vendor Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Vendor *</Label>
              <Select
                value={visitForm.vendor_ref}
                onValueChange={(val) => {
                  const vendor = vendors.find(v => v.id === val);
                  setVisitForm({
                    ...visitForm,
                    vendor_ref: val,
                    vendor_name_cache: vendor?.vendor_name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vendor_name} {v.rep_name && `- ${v.rep_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visit Date *</Label>
              <Input
                type="date"
                value={visitForm.visit_date}
                onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Visit Note</Label>
              <Textarea
                value={visitForm.visit_note}
                onChange={(e) => setVisitForm({ ...visitForm, visit_note: e.target.value })}
                placeholder="e.g., New order discussion, remind about tomorrow's order"
                rows={3}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={visitForm.status} onValueChange={(val) => setVisitForm({ ...visitForm, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowVisitDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => createVisitMutation.mutate(visitForm)}>
                Schedule Visit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Returns Pickup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Vendor *</Label>
              <Select
                value={returnForm.vendor_ref}
                onValueChange={(val) => {
                  const vendor = vendors.find(v => v.id === val);
                  setReturnForm({
                    ...returnForm,
                    vendor_ref: val,
                    vendor_name_cache: vendor?.vendor_name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pickup Date *</Label>
              <Input
                type="date"
                value={returnForm.pickup_date}
                onChange={(e) => setReturnForm({ ...returnForm, pickup_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Returns Summary</Label>
              <Textarea
                value={returnForm.returns_summary_text}
                onChange={(e) => setReturnForm({ ...returnForm, returns_summary_text: e.target.value })}
                placeholder="e.g., Returns will be collected, expired items ready for pickup"
                rows={2}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={returnForm.status} onValueChange={(val) => setReturnForm({ ...returnForm, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => createReturnMutation.mutate(returnForm)}>
                Schedule Pickup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Task Description *</Label>
              <Textarea
                value={taskForm.task_text}
                onChange={(e) => setTaskForm({ ...taskForm, task_text: e.target.value })}
                placeholder="e.g., Check the to-do list – updated"
                rows={3}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={taskForm.priority} onValueChange={(val) => setTaskForm({ ...taskForm, priority: val })}>
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
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => createTaskMutation.mutate(taskForm)}>
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}