import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatSL } from '@/components/utils/dateUtils';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';

const statusColors = {
  'Entered': 'bg-blue-100 text-blue-700',
  'Reviewed': 'bg-amber-100 text-amber-700',
  'Verified': 'bg-purple-100 text-purple-700',
  'Signed': 'bg-green-100 text-green-700',
  'Released': 'bg-emerald-100 text-emerald-700'
};

export default function LISResults() {
  const queryClient = useQueryClient();
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: results = [] } = useQuery({
    queryKey: ['labResults', selectedOrgId],
    queryFn: () => base44.entities.Result.filter({ result_type: 'LAB', ...orgFilter }),
    enabled: !!selectedOrgId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const correctResultMutation = useMutation({
    mutationFn: async ({ resultId, correction }) => {
      await base44.entities.Result.update(resultId, {
        correction_history: `[${new Date().toISOString()}] ${currentUser.email}: ${correction}`
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: selectedResult.organization_id,
        location_id: selectedResult.location_id,
        patient_id: selectedResult.patient_id,
        module: 'LIS',
        action: 'correct_result',
        record_type: 'Result',
        record_id: resultId,
        metadata: { correction }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labResults'] });
      setCorrectionDialogOpen(false);
      setSelectedResult(null);
      toast.success('Result correction logged');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lab Results</h1>
        <p className="text-slate-500 mt-1">Result entry, review, and correction</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No lab results yet</p>
          ) : (
            <div className="space-y-2">
              {results.map(result => {
                const patient = patients.find(p => p.id === result.patient_id);
                return (
                  <div key={result.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-slate-900">
                            {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                          </p>
                          {result.is_critical && (
                            <Badge className="bg-rose-100 text-rose-700">CRITICAL</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          {result.test_name || 'Lab Result'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Result Date: {formatSL(new Date(result.result_date), 'MMM d, yyyy h:mm a')}
                        </p>
                        {result.correction_history && (
                          <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                            <p className="text-xs text-amber-800">
                              <span className="font-semibold">Correction:</span> {result.correction_history}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[result.status] || 'bg-slate-100 text-slate-700'}>
                          {result.status}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedResult(result);
                            setCorrectionDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Result Correction</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              correctResultMutation.mutate({
                resultId: selectedResult.id,
                correction: formData.get('correction')
              });
            }} className="space-y-4">
              <div>
                <Label>Correction Notes *</Label>
                <Textarea 
                  name="correction" 
                  required 
                  placeholder="Describe the correction and reason..."
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full">Log Correction</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}