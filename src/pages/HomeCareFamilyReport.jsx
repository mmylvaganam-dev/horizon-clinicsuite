import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import HCSearchSelect from '@/components/homecare/HCSearchSelect';

const EMPTY_FORM = {
  patient_name: '',
  submitted_by: '',
  relationship: '',
  report_date: new Date().toISOString().split('T')[0],
  period_type: 'daily',
  overall_status: 'satisfactory',
  notes: '',
  concerns: '',
};

export default function HomeCareFamilyReport() {
  const queryClient = useQueryClient();
  const { orgFilter, withOrgId, selectedOrgId } = useOrgFiltered();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // ── Live data ─────────────────────────────────────────────────────────────
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['familyReports', selectedOrgId],
    queryFn: () => base44.entities.HomeCareReport.filter({ ...orgFilter, report_type: 'family' }, '-report_date', 100),
    enabled: !!selectedOrgId,
  });

  const { data: hcCases = [] } = useQuery({
    queryKey: ['homeCareCasesForReport', selectedOrgId],
    queryFn: () => base44.entities.HomeCareCase.filter({}),
    enabled: !!selectedOrgId,
  });

  const { data: emrPatients = [] } = useQuery({
    queryKey: ['patientsForHCReport', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter(selectedOrgId ? { organization_id: selectedOrgId } : {}),
    enabled: !!selectedOrgId,
  });

  // ── Build patient options ──────────────────────────────────────────────────
  const patientOptions = [
    ...hcCases.filter(c => c.patient_name_cache).map(c => ({ label: c.patient_name_cache, sub: 'HC Case' })),
    ...emrPatients.map(p => ({ label: `${p.first_name} ${p.last_name}`, sub: p.phn || p.mrn || '' })),
  ].reduce((acc, o) => {
    if (!acc.find(x => x.label === o.label)) acc.push(o);
    return acc;
  }, []);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareReport.create(withOrgId({ ...data, report_type: 'family' })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyReports'] });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('Family report submitted');
    },
    onError: (e) => toast.error(e?.message || 'Failed to submit report'),
  });

  const statusColors = {
    satisfactory: 'bg-green-100 text-green-700',
    'needs-attention': 'bg-amber-100 text-amber-700',
    concerning: 'bg-red-100 text-red-700',
  };
  const periodColors = { daily: 'bg-blue-100 text-blue-700', weekly: 'bg-purple-100 text-purple-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Daily and weekly updates submitted by patient family members</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />New Report
        </Button>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Loading reports...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No family reports yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.patient_name}</p>
                    <p className="text-sm text-slate-500">By: {r.submitted_by}{r.relationship ? ` (${r.relationship})` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {r.period_type && <Badge className={periodColors[r.period_type] || 'bg-slate-100 text-slate-700'}>{r.period_type}</Badge>}
                    {r.overall_status && <Badge className={statusColors[r.overall_status] || 'bg-slate-100 text-slate-700'}>{r.overall_status}</Badge>}
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{r.report_date ? format(new Date(r.report_date), 'dd MMM yyyy') : ''}</span>
                  </div>
                </div>
                {r.notes && <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Notes: </span>{r.notes}</p>}
                {r.concerns && <p className="mt-1 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded"><span className="font-medium">Concerns: </span>{r.concerns}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Family Report</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Patient Name</Label>
                <HCSearchSelect
                  value={form.patient_name}
                  onChange={v => setForm(p => ({ ...p, patient_name: v }))}
                  options={patientOptions}
                  placeholder="Search patient..."
                />
              </div>
              <div>
                <Label>Submitted By (Family Member)</Label>
                <Input value={form.submitted_by} onChange={e => setForm(p => ({ ...p, submitted_by: e.target.value }))} placeholder="Your name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Relationship to Patient</Label>
                <Input value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} placeholder="e.g. Son, Daughter" />
              </div>
              <div>
                <Label>Report Date</Label>
                <Input type="date" value={form.report_date} onChange={e => setForm(p => ({ ...p, report_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Report Period</Label>
                <Select value={form.period_type} onValueChange={v => setForm(p => ({ ...p, period_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Overall Status</Label>
                <Select value={form.overall_status} onValueChange={v => setForm(p => ({ ...p, overall_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="needs-attention">Needs Attention</SelectItem>
                    <SelectItem value="concerning">Concerning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Update / Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="How is the patient doing? Any changes noticed..." rows={3} /></div>
            <div><Label>Concerns or Requests</Label><Textarea value={form.concerns} onChange={e => setForm(p => ({ ...p, concerns: e.target.value }))} placeholder="Any specific concerns or requests for the care team..." rows={2} /></div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" disabled={!form.patient_name || !form.submitted_by || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
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