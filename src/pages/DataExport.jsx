import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Package, FileText, Loader2, Database, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';

const bundleTypeColors = {
  patient_records: 'from-blue-500 to-blue-600',
  lab_results: 'from-purple-500 to-purple-600',
  cardio_results: 'from-red-500 to-red-600',
  pft_results: 'from-teal-500 to-teal-600',
  billing_data: 'from-green-500 to-green-600',
  pharmacy_sales: 'from-amber-500 to-amber-600',
  full_backup: 'from-slate-700 to-slate-800',
  custom: 'from-indigo-500 to-indigo-600',
};

export default function DataExport() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    organization_id: '',
    location_id: '',
    bundle_type: 'patient_records',
    date_from: '',
    date_to: '',
    notes: '',
    export_reason: ''
  });

  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: bundles = [], isLoading: loadingBundles } = useQuery({
    queryKey: ['exportBundles'],
    queryFn: () => base44.entities.ExportBundle.list('-requested_at'),
  });

  const generateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createExportRequest', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportBundles'] });
      toast.success('Export request submitted for approval');
      setOpen(false);
      setFormData({
        organization_id: '',
        location_id: '',
        bundle_type: 'patient_records',
        date_from: '',
        date_to: '',
        notes: '',
        export_reason: ''
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit export request');
    },
  });

  const handleGenerate = () => {
    if (!formData.organization_id || !formData.date_from || !formData.date_to) {
      toast.error('Organization and date range are required');
      return;
    }
    if (!formData.export_reason.trim()) {
      toast.error('Export reason is required for audit compliance');
      return;
    }

    generateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Data Export</h1>
          <p className="text-slate-500 mt-1">Generate organization-scoped export bundles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Download className="w-4 h-4 mr-2" />
              Generate Export
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Export Bundle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Organization *</Label>
                <Select 
                  value={formData.organization_id} 
                  onValueChange={(value) => setFormData({...formData, organization_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bundle Type</Label>
                <Select 
                  value={formData.bundle_type} 
                  onValueChange={(value) => setFormData({...formData, bundle_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient_records">Patient Records</SelectItem>
                    <SelectItem value="lab_results">Lab Results</SelectItem>
                    <SelectItem value="cardio_results">Cardio Results</SelectItem>
                    <SelectItem value="pft_results">PFT Results</SelectItem>
                    <SelectItem value="billing_data">Billing Data</SelectItem>
                    <SelectItem value="pharmacy_sales">Pharmacy Sales</SelectItem>
                    <SelectItem value="full_backup">Full Backup</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date From *</Label>
                  <Input 
                    type="date" 
                    value={formData.date_from}
                    onChange={(e) => setFormData({...formData, date_from: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Date To *</Label>
                  <Input 
                    type="date" 
                    value={formData.date_to}
                    onChange={(e) => setFormData({...formData, date_to: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Export Reason (Required) *</Label>
                <Textarea 
                  value={formData.export_reason}
                  onChange={(e) => setFormData({...formData, export_reason: e.target.value})}
                  placeholder="Provide a detailed reason for this export request (audit requirement)..."
                  rows={3}
                />
                {!formData.export_reason.trim() && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Export reason is required for audit compliance
                  </p>
                )}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional notes about this export..."
                  rows={2}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Database className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Organization-Scoped Export</p>
                    <p className="text-sm text-amber-700 mt-1">
                      This export will only include data from the selected organization. 
                      No cross-organization data will be included. All patient records included 
                      will be logged in the audit trail.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loadingBundles ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No export bundles yet</h3>
          <p className="text-slate-500 mt-1">Generate your first export bundle to get started</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {bundles.map((bundle) => {
            const org = organizations.find(o => o.id === bundle.organization_id);
            
            return (
              <Card key={bundle.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bundleTypeColors[bundle.bundle_type]} flex items-center justify-center flex-shrink-0`}>
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="capitalize">
                        {bundle.bundle_type.replace(/_/g, ' ')}
                      </Badge>
                      {org && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {org.name}
                        </Badge>
                      )}
                      {bundle.status && (
                        <Badge 
                          variant="outline" 
                          className={
                            bundle.status === 'generated' ? 'bg-emerald-100 text-emerald-700' :
                            bundle.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            bundle.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }
                        >
                          {bundle.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      Period: {format(new Date(bundle.date_from), 'MMM d, yyyy')} - {format(new Date(bundle.date_to), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-slate-600">
                      Requested by: {bundle.requested_by_email} • {format(new Date(bundle.requested_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {bundle.status === 'generated' && bundle.generated_at && (
                      <p className="text-sm text-emerald-600">
                        Generated: {format(new Date(bundle.generated_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {bundle.status === 'approved' && bundle.approved_at && (
                      <p className="text-sm text-blue-600">
                        Approved by: {bundle.approved_by_email} • {format(new Date(bundle.approved_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                    {bundle.summary_json && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {bundle.summary_json.total_patients > 0 && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700">
                            {bundle.summary_json.total_patients} patients
                          </Badge>
                        )}
                        {bundle.summary_json.total_records > 0 && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700">
                            {bundle.summary_json.total_records} records
                          </Badge>
                        )}
                      </div>
                    )}
                    {bundle.notes && (
                      <p className="text-sm text-slate-500 mt-2 italic">{bundle.notes}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}