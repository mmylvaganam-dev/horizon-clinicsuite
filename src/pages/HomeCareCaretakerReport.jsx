import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Plus, User, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function HomeCareCaretakerReport() {
  const queryClient = useQueryClient();
  const { orgFilter, withOrgId, selectedOrgId } = useOrgFiltered();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    patient_name: '',
    caretaker_name: '',
    report_date: new Date().toISOString().split('T')[0],
    activities_completed: '',
    patient_condition: 'stable',
    observations: '',
    concerns: '',
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['caretakerReports', selectedOrgId],
    queryFn: () => base44.entities.HomeCareReport.filter({ ...orgFilter, report_type: 'caretaker' }, '-report_date', 100),
    enabled: !!selectedOrgId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareReport.create(withOrgId({ ...data, report_type: 'caretaker' })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caretakerReports'] });
      setDialogOpen(false);
      setForm({ patient_name: '', caretaker_name: '', report_date: new Date().toISOString().split('T')[0], activities_completed: '', patient_condition: 'stable', observations: '', concerns: '' });
      toast.success('Caretaker report submitted');
    },
    onError: () => toast.error('Failed to submit report'),
  });

  const conditionColors = { stable: 'bg-green-100 text-green-700', improving: 'bg-teal-100 text-teal-700', declining: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Caretaker Daily Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Daily care activity logs submitted by caretakers</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Loading reports...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No caretaker reports yet. Submit the first daily report.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{r.patient_name}</p>
                      <p className="text-sm text-slate-500">Caretaker: {r.caretaker_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.patient_condition && <Badge className={conditionColors[r.patient_condition] || 'bg-slate-100 text-slate-700'}>{r.patient_condition}</Badge>}
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{r.report_date ? format(new Date(r.report_date), 'dd MMM yyyy') : ''}</span>
                  </div>
                </div>
                {r.activities_completed && <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Activities: </span>{r.activities_completed}</p>}
                {r.observations && <p className="mt-1 text-sm text-slate-600"><span className="font-medium">Observations: </span>{r.observations}</p>}
                {r.concerns && <p className="mt-1 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded"><span className="font-medium">Concerns: </span>{r.concerns}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Caretaker Daily Report</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Patient Name</Label><Input value={form.patient_name} onChange={e => setForm(p => ({ ...p, patient_name: e.target.value }))} placeholder="Patient full name" /></div>
              <div><Label>Caretaker Name</Label><Input value={form.caretaker_name} onChange={e => setForm(p => ({ ...p, caretaker_name: e.target.value }))} placeholder="Your name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Report Date</Label><Input type="date" value={form.report_date} onChange={e => setForm(p => ({ ...p, report_date: e.target.value }))} /></div>
              <div>
                <Label>Patient Condition</Label>
                <Select value={form.patient_condition} onValueChange={v => setForm(p => ({ ...p, patient_condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="improving">Improving</SelectItem>
                    <SelectItem value="declining">Declining</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Activities Completed</Label><Textarea value={form.activities_completed} onChange={e => setForm(p => ({ ...p, activities_completed: e.target.value }))} placeholder="e.g. Bathing, medication, mobility exercises..." rows={2} /></div>
            <div><Label>Observations</Label><Textarea value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} placeholder="Patient mood, appetite, sleep quality..." rows={2} /></div>
            <div><Label>Concerns / Escalations</Label><Textarea value={form.concerns} onChange={e => setForm(p => ({ ...p, concerns: e.target.value }))} placeholder="Any issues requiring supervisor or medical attention..." rows={2} /></div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" disabled={!form.patient_name || !form.caretaker_name || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}