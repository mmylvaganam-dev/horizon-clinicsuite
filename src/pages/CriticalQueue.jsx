import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, AlertTriangle, CheckCircle, Search, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const resultTypeColors = {
  LAB: 'from-purple-500 to-purple-600',
  CARDIO: 'from-red-500 to-red-600',
  PFT: 'from-blue-500 to-blue-600',
  RADIOLOGY: 'from-indigo-500 to-indigo-600',
  PATHOLOGY: 'from-pink-500 to-pink-600',
  OTHER: 'from-slate-500 to-slate-600',
};

export default function CriticalQueue() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [ackDialog, setAckDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [ackNote, setAckNote] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Result.list('-result_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: resultFlags = [] } = useQuery({
    queryKey: ['resultFlags'],
    queryFn: () => base44.entities.ResultFlag.list(),
  });

  const { data: criticalAcks = [] } = useQuery({
    queryKey: ['criticalAcks'],
    queryFn: () => base44.entities.CriticalAck.list(),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();

      // Create acknowledgement
      const ack = await base44.entities.CriticalAck.create({
        result_id: data.resultId,
        acknowledged_by: user.id,
        acknowledged_by_email: user.email,
        acknowledged_at: new Date().toISOString(),
        ack_note: data.ackNote
      });

      // Get result for audit
      const resultList = await base44.entities.Result.filter({ id: data.resultId });
      const result = resultList[0];

      // Audit log
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: result?.organization_id || '',
        location_id: result?.location_id || '',
        patient_id: result?.patient_id || '',
        module: 'RESULTS',
        action: 'acknowledge_critical',
        record_type: 'Result',
        record_id: data.resultId,
        metadata: {
          ack_id: ack.id,
          ack_note: data.ackNote
        }
      });

      return ack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criticalAcks'] });
      setAckDialog(false);
      setSelectedResult(null);
      setAckNote('');
      toast.success('Critical result acknowledged');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to acknowledge result');
    }
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getCriticalFlags = (resultId) => {
    return resultFlags.filter(f => f.result_id === resultId && f.flag_type === 'critical');
  };

  const isAcknowledged = (resultId) => {
    return criticalAcks.some(ack => ack.result_id === resultId);
  };

  const criticalResults = results.filter(r => {
    const flags = getCriticalFlags(r.id);
    return flags.length > 0 && !isAcknowledged(r.id);
  });

  const filteredResults = criticalResults.filter(result => {
    const patientName = getPatientName(result.patient_id).toLowerCase();
    return patientName.includes(searchTerm.toLowerCase()) ||
           result.result_type?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAcknowledgeClick = (result) => {
    setSelectedResult(result);
    setAckDialog(true);
  };

  const handleAcknowledge = () => {
    if (!selectedResult) return;

    if (!ackNote.trim()) {
      toast.error('Acknowledgement note is required');
      return;
    }

    acknowledgeMutation.mutate({
      resultId: selectedResult.id,
      ackNote: ackNote
    });
  };

  const acknowledgedToday = criticalAcks.filter(ack => {
    if (!ack.acknowledged_at) return false;
    const ackDate = new Date(ack.acknowledged_at);
    const today = new Date();
    return ackDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Critical Results Queue</h1>
        <p className="text-slate-500 mt-1">Critical results requiring acknowledgement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-2 border-rose-200 bg-rose-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-rose-600">Pending Ack</p>
              <p className="text-2xl font-bold text-rose-900">{criticalResults.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Acked Today</p>
              <p className="text-2xl font-bold">{acknowledgedToday}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Critical</p>
              <p className="text-2xl font-bold">
                {results.filter(r => getCriticalFlags(r.id).length > 0).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by patient name or result type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="p-4 bg-rose-50 border-rose-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-900">Critical Result Policy</p>
            <p className="text-xs text-rose-700 mt-1">
              All critical results must be acknowledged individually with a note. Acknowledgement is required before the result can be marked as Closed/Filed. Every acknowledgement is audited.
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No pending critical results</h3>
          <p className="text-slate-500 mt-1">All critical results have been acknowledged</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result) => {
            const flags = getCriticalFlags(result.id);
            
            return (
              <Card key={result.id} className="p-5 bg-white border-2 border-rose-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${resultTypeColors[result.result_type]} flex items-center justify-center flex-shrink-0`}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        CRITICAL
                      </Badge>
                      <Badge variant="outline">{result.result_type}</Badge>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        {result.status}
                      </Badge>
                      {flags.map((flag) => (
                        <Badge key={flag.id} variant="outline" className="bg-amber-100 text-amber-700">
                          {flag.severity || 'High'}
                        </Badge>
                      ))}
                    </div>
                    <p className="font-semibold text-slate-900">{getPatientName(result.patient_id)}</p>
                    <p className="text-sm text-slate-500">
                      Result Date: {result.result_date ? format(new Date(result.result_date), 'MMM d, yyyy h:mm a') : 'N/A'}
                    </p>
                    {flags[0]?.flag_reason && (
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mt-2">
                        <p className="text-sm font-semibold text-rose-900 mb-1">Critical Finding:</p>
                        <p className="text-sm text-rose-700">{flags[0].flag_reason}</p>
                      </div>
                    )}
                    {result.narrative_text && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{result.narrative_text}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleAcknowledgeClick(result)}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    Acknowledge
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={ackDialog} onOpenChange={setAckDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Critical Result</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4 mt-4">
              <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <p className="font-semibold text-rose-900">Critical Result</p>
                </div>
                <p className="text-sm text-rose-700">Patient: {getPatientName(selectedResult.patient_id)}</p>
                <p className="text-sm text-rose-700">Type: {selectedResult.result_type}</p>
              </div>
              <div>
                <Label>Acknowledgement Note *</Label>
                <Textarea
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  placeholder="Document your acknowledgement (e.g., patient notified, follow-up scheduled...)"
                  rows={4}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-xs text-amber-900">
                  ⚠️ By acknowledging, you confirm you have reviewed this critical result and taken appropriate action. This action will be audited.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAckDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAcknowledge}
                  disabled={acknowledgeMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Confirm Acknowledgement'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}