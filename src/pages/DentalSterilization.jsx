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
import { 
  Plus,
  CheckCircle,
  XCircle,
  Printer,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function DentalSterilization() {
  const queryClient = useQueryClient();
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [batchForm, setBatchForm] = useState({
    batch_datetime: new Date().toISOString(),
    autoclave_id: '',
    cycle_type: 'steam',
    operator_staff_ref: '',
    indicator_result: 'pass',
    notes: ''
  });

  const [itemForm, setItemForm] = useState({
    tray_name: '',
    instrument_notes: ''
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['sterilizationBatches'],
    queryFn: () => base44.entities.SterilizationBatch.list('-batch_datetime'),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['sterilizationItems'],
    queryFn: () => base44.entities.SterilizationItem.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const createBatchMutation = useMutation({
    mutationFn: (data) => base44.entities.SterilizationBatch.create(data),
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ['sterilizationBatches'] });
      setSelectedBatch(batch);
      setShowBatchDialog(false);
      setShowItemDialog(true);
      toast.success('Batch created!');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.SterilizationItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sterilizationItems'] });
      setItemForm({ tray_name: '', instrument_notes: '' });
      toast.success('Item added!');
    },
  });

  const releaseItemMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.SterilizationItem.update(id, {
      released_for_use: true,
      released_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sterilizationItems'] });
      toast.success('Item released!');
    },
  });

  const generateBatchPDF = (batch) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('STERILIZATION BATCH LOG', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Batch ID: ${batch.id}`, 20, 30);
    doc.text(`Date: ${format(new Date(batch.batch_datetime), 'dd MMM yyyy HH:mm')}`, 20, 36);

    const operator = staff.find(s => s.id === batch.operator_staff_ref);
    if (operator) {
      doc.text(`Operator: ${operator.name}`, 20, 42);
    }

    let y = 55;
    doc.setFontSize(12);
    doc.text('BATCH DETAILS', 20, y);
    y += 8;

    doc.setFontSize(10);
    if (batch.autoclave_id) {
      doc.text(`Autoclave: ${batch.autoclave_id}`, 25, y);
      y += 6;
    }
    doc.text(`Cycle Type: ${batch.cycle_type}`, 25, y);
    y += 6;
    
    const resultColor = batch.indicator_result === 'pass' ? [0, 128, 0] : [255, 0, 0];
    doc.setTextColor(...resultColor);
    doc.setFont(undefined, 'bold');
    doc.text(`Indicator Result: ${batch.indicator_result.toUpperCase()}`, 25, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y += 15;

    const batchItems = items.filter(item => item.batch_ref === batch.id);
    if (batchItems.length > 0) {
      doc.setFontSize(12);
      doc.text('STERILIZED ITEMS', 20, y);
      y += 8;

      doc.setFontSize(10);
      batchItems.forEach((item, idx) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${idx + 1}. ${item.tray_name}`, 25, y);
        y += 6;
        if (item.instrument_notes) {
          doc.setFontSize(9);
          doc.text(`   ${item.instrument_notes}`, 28, y);
          y += 5;
          doc.setFontSize(10);
        }
        y += 2;
      });
    }

    doc.save(`sterilization_batch_${batch.id}.pdf`);
    toast.success('PDF generated!');
  };

  const getStaffName = (staffRef) => {
    const member = staff.find(s => s.id === staffRef);
    return member?.name || 'Unknown';
  };

  const filteredBatches = batches.filter(batch => {
    const batchDate = new Date(batch.batch_datetime).toISOString().split('T')[0];
    return batchDate === selectedDate;
  });

  const failedBatches = batches.filter(b => b.indicator_result === 'fail');
  const todayBatches = batches.filter(b => {
    const batchDate = new Date(b.batch_datetime).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return batchDate === today;
  });

  const statusColors = {
    pass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    fail: 'bg-rose-100 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sterilization Tracking</h1>
          <p className="text-slate-500 mt-1">Autoclave batch logging and instrument tracking</p>
        </div>
        <Button onClick={() => setShowBatchDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Today's Batches</p>
            <p className="text-3xl font-bold mt-1">{todayBatches.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Batches</p>
            <p className="text-3xl font-bold mt-1">{batches.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <XCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Failed Batches</p>
            <p className="text-3xl font-bold mt-1">{failedBatches.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Items Sterilized</p>
            <p className="text-3xl font-bold mt-1">{items.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div>
              <Label className="text-xs mb-2 block">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed Batches Alert */}
      {failedBatches.length > 0 && (
        <Card className="bg-rose-50 border-rose-300 border-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />
              <div>
                <p className="font-bold text-rose-900 text-lg">STERILIZATION FAILURE</p>
                <p className="text-sm text-rose-700 mt-1">
                  {failedBatches.length} batch(es) failed sterilization indicator test
                </p>
                <div className="mt-2 space-y-1">
                  {failedBatches.slice(0, 3).map(batch => (
                    <p key={batch.id} className="text-xs text-rose-800">
                      • {format(new Date(batch.batch_datetime), 'MMM d, yyyy HH:mm')} - 
                      Operator: {getStaffName(batch.operator_staff_ref)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batches List */}
      <div className="space-y-3">
        {filteredBatches.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No batches for selected date</h3>
            <p className="text-slate-500 mt-1">Create a sterilization batch</p>
          </Card>
        ) : (
          filteredBatches.map((batch) => {
            const batchItems = items.filter(item => item.batch_ref === batch.id);
            const releasedItems = batchItems.filter(item => item.released_for_use).length;

            return (
              <Card key={batch.id} className={`p-5 border-2 ${statusColors[batch.indicator_result]}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[batch.indicator_result]}>
                        {batch.indicator_result === 'pass' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {batch.indicator_result}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        {format(new Date(batch.batch_datetime), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Operator</p>
                        <p className="font-medium">{getStaffName(batch.operator_staff_ref)}</p>
                      </div>
                      {batch.autoclave_id && (
                        <div>
                          <p className="text-slate-500">Autoclave</p>
                          <p className="font-medium">{batch.autoclave_id}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-500">Cycle Type</p>
                        <p className="font-medium">{batch.cycle_type}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Items</p>
                        <p className="font-medium">{batchItems.length} ({releasedItems} released)</p>
                      </div>
                    </div>
                    {batch.notes && (
                      <p className="text-sm text-slate-600 mt-2">{batch.notes}</p>
                    )}

                    {/* Items in this batch */}
                    {batchItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {batchItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-white/50 p-2 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.tray_name}</p>
                              {item.instrument_notes && (
                                <p className="text-xs text-slate-600">{item.instrument_notes}</p>
                              )}
                            </div>
                            {item.released_for_use ? (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Released
                              </Badge>
                            ) : batch.indicator_result === 'pass' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => releaseItemMutation.mutate({ id: item.id })}
                              >
                                Release
                              </Button>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-700">Cannot Release</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBatch(batch);
                        setShowItemDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateBatchPDF(batch)}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* New Batch Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Sterilization Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Batch Date & Time</Label>
              <Input
                type="datetime-local"
                value={batchForm.batch_datetime.substring(0, 16)}
                onChange={(e) => setBatchForm({ ...batchForm, batch_datetime: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Autoclave ID</Label>
                <Input
                  value={batchForm.autoclave_id}
                  onChange={(e) => setBatchForm({ ...batchForm, autoclave_id: e.target.value })}
                  placeholder="e.g., AC-001"
                />
              </div>
              <div>
                <Label>Cycle Type</Label>
                <Select value={batchForm.cycle_type} onValueChange={(val) => setBatchForm({ ...batchForm, cycle_type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="steam">Steam</SelectItem>
                    <SelectItem value="dry_heat">Dry Heat</SelectItem>
                    <SelectItem value="chemical">Chemical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Operator *</Label>
              <Select value={batchForm.operator_staff_ref} onValueChange={(val) => setBatchForm({ ...batchForm, operator_staff_ref: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Indicator Result *</Label>
              <Select value={batchForm.indicator_result} onValueChange={(val) => setBatchForm({ ...batchForm, indicator_result: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={batchForm.notes}
                onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBatchDialog(false)}>Cancel</Button>
              <Button onClick={() => createBatchMutation.mutate(batchForm)}>
                Create Batch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sterilized Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Tray Name *</Label>
              <Input
                value={itemForm.tray_name}
                onChange={(e) => setItemForm({ ...itemForm, tray_name: e.target.value })}
                placeholder="e.g., Basic Tray 1, Surgical Set A"
              />
            </div>
            <div>
              <Label>Instrument Notes</Label>
              <Textarea
                value={itemForm.instrument_notes}
                onChange={(e) => setItemForm({ ...itemForm, instrument_notes: e.target.value })}
                rows={2}
                placeholder="List instruments in tray"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowItemDialog(false)}>Done</Button>
              <Button
                onClick={() => {
                  if (selectedBatch) {
                    createItemMutation.mutate({
                      ...itemForm,
                      batch_ref: selectedBatch.id
                    });
                  }
                }}
              >
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}