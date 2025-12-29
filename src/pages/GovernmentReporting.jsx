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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Download, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function GovernmentReporting() {
  const queryClient = useQueryClient();
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [typeForm, setTypeForm] = useState({
    country_code: '',
    name: '',
    description: '',
    spec_json: '{}'
  });
  const [runForm, setRunForm] = useState({
    report_type_id: '',
    period_start: '',
    period_end: ''
  });
  const [submissionForm, setSubmissionForm] = useState({
    method: '',
    reference: '',
    notes: ''
  });

  const { data: reportTypes = [] } = useQuery({
    queryKey: ['governmentReportTypes'],
    queryFn: () => base44.entities.GovernmentReportType.list('-created_at'),
  });

  const { data: reportRuns = [] } = useQuery({
    queryKey: ['governmentReportRuns'],
    queryFn: () => base44.entities.GovernmentReportRun.list('-generated_at'),
  });

  const { data: submissionLogs = [] } = useQuery({
    queryKey: ['governmentSubmissionLogs'],
    queryFn: () => base44.entities.GovernmentSubmissionLog.list('-submitted_at'),
  });

  const createTypeMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      let specJson;
      try {
        specJson = JSON.parse(data.spec_json);
      } catch (e) {
        throw new Error('Invalid JSON in spec_json');
      }

      const reportType = await base44.entities.GovernmentReportType.create({
        country_code: data.country_code,
        name: data.name,
        description: data.description,
        spec_json: specJson,
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: user.id
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'GOVERNMENT_REPORTING',
        action: 'create_report_type',
        record_type: 'GovernmentReportType',
        record_id: reportType.id,
        metadata: { country_code: data.country_code, name: data.name }
      });

      return reportType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governmentReportTypes'] });
      resetTypeForm();
      toast.success('Report type created!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      
      let specJson;
      try {
        specJson = JSON.parse(data.spec_json);
      } catch (e) {
        throw new Error('Invalid JSON in spec_json');
      }

      const reportType = await base44.entities.GovernmentReportType.update(id, {
        country_code: data.country_code,
        name: data.name,
        description: data.description,
        spec_json: specJson
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'GOVERNMENT_REPORTING',
        action: 'update_report_type',
        record_type: 'GovernmentReportType',
        record_id: id,
        metadata: { country_code: data.country_code, name: data.name }
      });

      return reportType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governmentReportTypes'] });
      resetTypeForm();
      toast.success('Report type updated!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateGovernmentReport', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governmentReportRuns'] });
      setShowRunDialog(false);
      resetRunForm();
      toast.success('Report generated!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const submitReportMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();

      const submission = await base44.entities.GovernmentSubmissionLog.create({
        report_run_id: selectedRun.id,
        submitted_at: new Date().toISOString(),
        submitted_by: user.id,
        submitted_by_email: user.email,
        method: data.method,
        reference: data.reference,
        notes: data.notes
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'GOVERNMENT_REPORTING',
        action: 'submit_report',
        record_type: 'GovernmentSubmissionLog',
        record_id: submission.id,
        metadata: {
          report_run_id: selectedRun.id,
          report_type: selectedRun.report_type_name,
          method: data.method,
          reference: data.reference
        }
      });

      return submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governmentSubmissionLogs'] });
      setShowSubmissionDialog(false);
      setSelectedRun(null);
      setSubmissionForm({ method: '', reference: '', notes: '' });
      toast.success('Submission logged!');
    }
  });

  const resetTypeForm = () => {
    setTypeForm({ country_code: '', name: '', description: '', spec_json: '{}' });
    setEditingType(null);
    setShowTypeDialog(false);
  };

  const resetRunForm = () => {
    setRunForm({ report_type_id: '', period_start: '', period_end: '' });
  };

  const handleEditType = (type) => {
    setEditingType(type);
    setTypeForm({
      country_code: type.country_code,
      name: type.name,
      description: type.description || '',
      spec_json: JSON.stringify(type.spec_json, null, 2)
    });
    setShowTypeDialog(true);
  };

  const handleSaveType = () => {
    if (!typeForm.country_code || !typeForm.name || !typeForm.spec_json) {
      toast.error('Please fill required fields');
      return;
    }

    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, data: typeForm });
    } else {
      createTypeMutation.mutate(typeForm);
    }
  };

  const handleGenerateReport = () => {
    if (!runForm.report_type_id || !runForm.period_start || !runForm.period_end) {
      toast.error('Please fill all fields');
      return;
    }
    generateReportMutation.mutate(runForm);
  };

  const handleLogSubmission = () => {
    if (!submissionForm.method) {
      toast.error('Please enter submission method');
      return;
    }
    submitReportMutation.mutate(submissionForm);
  };

  const getSubmissionsForRun = (runId) => {
    return submissionLogs.filter(log => log.report_run_id === runId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Government Reporting</h1>
        <p className="text-slate-500 mt-1">Manage regulatory reports and submissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Report Types</p>
              <p className="text-2xl font-bold">{reportTypes.filter(t => t.is_active).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Download className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Generated Reports</p>
              <p className="text-2xl font-bold">{reportRuns.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Send className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Submissions</p>
              <p className="text-2xl font-bold">{submissionLogs.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">Report Types</TabsTrigger>
          <TabsTrigger value="runs">Generated Reports</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowTypeDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Report Type
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {reportTypes.map((type) => (
              <Card key={type.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        {type.country_code}
                      </Badge>
                      <Badge variant="outline" className={type.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-900">{type.name}</p>
                    {type.description && (
                      <p className="text-sm text-slate-600 mt-1">{type.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEditType(type)}>
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="runs" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowRunDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {reportRuns.map((run) => {
              const submissions = getSubmissionsForRun(run.id);
              return (
                <Card key={run.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{run.report_type_name}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Period: {format(new Date(run.period_start), 'MMM d, yyyy')} - {format(new Date(run.period_end), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Generated: {format(new Date(run.generated_at), 'MMM d, yyyy h:mm a')} by {run.generated_by_email}
                      </p>
                      {submissions.length > 0 && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            Submitted {submissions.length}x
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {run.output_file_ref && (
                        <Button variant="outline" size="sm" onClick={() => window.open(run.output_file_ref, '_blank')}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRun(run);
                          setShowSubmissionDialog(true);
                        }}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Log Submission
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-3 mt-6">
          {submissionLogs.map((log) => {
            const run = reportRuns.find(r => r.id === log.report_run_id);
            return (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{run?.report_type_name || 'Unknown'}</p>
                    <p className="text-sm text-slate-600 mt-1">Method: {log.method}</p>
                    {log.reference && (
                      <p className="text-sm text-slate-600">Reference: {log.reference}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted: {format(new Date(log.submitted_at), 'MMM d, yyyy h:mm a')} by {log.submitted_by_email}
                    </p>
                    {log.notes && (
                      <p className="text-sm text-slate-500 mt-2">{log.notes}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Report Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Report Type' : 'New Report Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country Code *</Label>
                <Input
                  value={typeForm.country_code}
                  onChange={(e) => setTypeForm({ ...typeForm, country_code: e.target.value })}
                  placeholder="e.g., US, UK, SA"
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Report name"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Report description"
              />
            </div>
            <div>
              <Label>Specification (JSON) *</Label>
              <Textarea
                value={typeForm.spec_json}
                onChange={(e) => setTypeForm({ ...typeForm, spec_json: e.target.value })}
                placeholder='{"entities": ["Patient", "Appointment"], "aggregations": ["count"]}'
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetTypeForm}>Cancel</Button>
              <Button onClick={handleSaveType}>
                {editingType ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Report Type *</Label>
              <select
                className="w-full p-2 border rounded"
                value={runForm.report_type_id}
                onChange={(e) => setRunForm({ ...runForm, report_type_id: e.target.value })}
              >
                <option value="">Select report type</option>
                {reportTypes.filter(t => t.is_active).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.country_code})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start *</Label>
                <Input
                  type="date"
                  value={runForm.period_start}
                  onChange={(e) => setRunForm({ ...runForm, period_start: e.target.value })}
                />
              </div>
              <div>
                <Label>Period End *</Label>
                <Input
                  type="date"
                  value={runForm.period_end}
                  onChange={(e) => setRunForm({ ...runForm, period_end: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRunDialog(false)}>Cancel</Button>
              <Button onClick={handleGenerateReport} disabled={generateReportMutation.isPending}>
                {generateReportMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Submission Dialog */}
      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Submission Method *</Label>
              <Input
                value={submissionForm.method}
                onChange={(e) => setSubmissionForm({ ...submissionForm, method: e.target.value })}
                placeholder="e.g., Portal, Email, API"
              />
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input
                value={submissionForm.reference}
                onChange={(e) => setSubmissionForm({ ...submissionForm, reference: e.target.value })}
                placeholder="Confirmation or tracking number"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={submissionForm.notes}
                onChange={(e) => setSubmissionForm({ ...submissionForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSubmissionDialog(false)}>Cancel</Button>
              <Button onClick={handleLogSubmission} disabled={submitReportMutation.isPending}>
                Log Submission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}