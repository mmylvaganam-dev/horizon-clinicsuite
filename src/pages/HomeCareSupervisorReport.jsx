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
import { Shield, Plus, Calendar, CheckCircle, Star } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function HomeCareSupervisorReport() {
  const queryClient = useQueryClient();
  const { orgFilter, withOrgId, selectedOrgId } = useOrgFiltered();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    patient_name: '',
    supervisor_name: '',
    staff_member_name: '',
    report_date: new Date().toISOString().split('T')[0],
    care_quality_rating: '4',
    staff_performance: 'satisfactory',
    compliance_issues: '',
    action_items: '',
    notes: '',
    sign_off: false,
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['supervisorReports', selectedOrgId],
    queryFn: () => base44.entities.HomeCareReport.filter({ ...orgFilter, report_type: 'supervisor' }, '-report_date', 100),
    enabled: !!selectedOrgId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeCareReport.create(withOrgId({ ...data, report_type: 'supervisor' })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisorReports'] });
      setDialogOpen(false);
      setForm({ patient_name: '', supervisor_name: '', staff_member_name: '', report_date: new Date().toISOString().split('T')[0], care_quality_rating: '4', staff_performance: 'satisfactory', compliance_issues: '', action_items: '', notes: '', sign_off: false });
      toast.success('Supervisor report submitted');
    },
    onError: () => toast.error('Failed to submit report'),
  });

  const perfColors = { excellent: 'bg-green-100 text-green-700', satisfactory: 'bg-teal-100 text-teal-700', 'needs-improvement': 'bg-amber-100 text-amber-700', unsatisfactory: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supervisor Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Care quality and staff performance sign-off by supervisors</p>
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
            <Shield className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No supervisor reports yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <Card key={r.id} className={r.sign_off ? 'border-green-300' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.patient_name}</p>
                    <p className="text-sm text-slate-500">Supervisor: {r.supervisor_name} · Staff: {r.staff_member_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {r.staff_performance && <Badge className={perfColors[r.staff_performance] || 'bg-slate-100 text-slate-700'}>{r.staff_performance}</Badge>}
                    {r.sign_off && <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Signed Off</Badge>}
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{r.report_date ? format(new Date(r.report_date), 'dd MMM yyyy') : ''}</span>
                  </div>
                </div>
                {r.care_quality_rating && (
                  <div className="flex items-center gap-1 mt-2">
                    {Array.from({ length: parseInt(r.care_quality_rating) || 0 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">Care Quality</span>
                  </div>
                )}
                {r.notes && <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Notes: </span>{r.notes}</p>}
                {r.compliance_issues && <p className="mt-1 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded"><span className="font-medium">Compliance Issues: </span>{r.compliance_issues}</p>}
                {r.action_items && <p className="mt-1 text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded"><span className="font-medium">Action Items: </span>{r.action_items}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Supervisor Report</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Patient Name</Label><Input value={form.patient_name} onChange={e => setForm(p => ({ ...p, patient_name: e.target.value }))} placeholder="Patient full name" /></div>
              <div><Label>Supervisor Name</Label><Input value={form.supervisor_name} onChange={e => setForm(p => ({ ...p, supervisor_name: e.target.value }))} placeholder="Your name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Staff Member Reviewed</Label><Input value={form.staff_member_name} onChange={e => setForm(p => ({ ...p, staff_member_name: e.target.value }))} placeholder="Staff name" /></div>
              <div><Label>Report Date</Label><Input type="date" value={form.report_date} onChange={e => setForm(p => ({ ...p, report_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Care Quality Rating (1–5)</Label>
                <Select value={form.care_quality_rating} onValueChange={v => setForm(p => ({ ...p, care_quality_rating: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1','2','3','4','5'].map(n => <SelectItem key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Staff Performance</Label>
                <Select value={form.staff_performance} onValueChange={v => setForm(p => ({ ...p, staff_performance: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="needs-improvement">Needs Improvement</SelectItem>
                    <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes / Observations</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Overall observations about care quality..." rows={2} /></div>
            <div><Label>Compliance Issues</Label><Textarea value={form.compliance_issues} onChange={e => setForm(p => ({ ...p, compliance_issues: e.target.value }))} placeholder="Any protocol breaches or compliance concerns..." rows={2} /></div>
            <div><Label>Action Items</Label><Textarea value={form.action_items} onChange={e => setForm(p => ({ ...p, action_items: e.target.value }))} placeholder="Follow-up tasks or corrective actions required..." rows={2} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="signoff" checked={form.sign_off} onChange={e => setForm(p => ({ ...p, sign_off: e.target.checked }))} className="w-4 h-4 rounded" />
              <Label htmlFor="signoff" className="cursor-pointer">Sign off on this care period</Label>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700" disabled={!form.patient_name || !form.supervisor_name || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
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