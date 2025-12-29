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
import { FileText, AlertTriangle, CheckCircle, Search } from 'lucide-react';
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

export default function ReleaseQueue() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [releaseDialog, setReleaseDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [releaseNote, setReleaseNote] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Result.list('-result_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['releases'],
    queryFn: () => base44.entities.ReleaseToPatient.list(),
  });

  const releaseMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('releaseResult', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      setReleaseDialog(false);
      setSelectedResult(null);
      setReleaseNote('');
      toast.success('Result released to patient');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to release result');
    }
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const isReleased = (resultId) => {
    const release = releases.find(r => r.result_id === resultId);
    return release?.released || false;
  };

  const signedNotReleased = results.filter(r => 
    r.status === 'Signed' && !isReleased(r.id)
  );

  const filteredResults = signedNotReleased.filter(result => {
    const patientName = getPatientName(result.patient_id).toLowerCase();
    return patientName.includes(searchTerm.toLowerCase()) ||
           result.result_type?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleReleaseClick = (result) => {
    setSelectedResult(result);
    setReleaseDialog(true);
  };

  const handleRelease = () => {
    if (!selectedResult) return;

    releaseMutation.mutate({
      resultId: selectedResult.id,
      releaseNote: releaseNote
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Release Queue</h1>
        <p className="text-slate-500 mt-1">Signed results awaiting patient release</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Release</p>
              <p className="text-2xl font-bold">{signedNotReleased.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Released Today</p>
              <p className="text-2xl font-bold">
                {releases.filter(r => {
                  if (!r.released_at) return false;
                  const releaseDate = new Date(r.released_at);
                  const today = new Date();
                  return releaseDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Signed</p>
              <p className="text-2xl font-bold">
                {results.filter(r => r.status === 'Signed' || r.status === 'Released').length}
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

      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Release Policy</p>
            <p className="text-xs text-amber-700 mt-1">
              Results must be released individually. Bulk release is not permitted. Each release is audited.
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
          <h3 className="text-lg font-medium text-slate-900">Release queue is empty</h3>
          <p className="text-slate-500 mt-1">All signed results have been released</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result) => (
            <Card key={result.id} className="p-5 bg-white border-2 border-amber-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${resultTypeColors[result.result_type]} flex items-center justify-center flex-shrink-0`}>
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                      {result.status}
                    </Badge>
                    <Badge variant="outline">{result.result_type}</Badge>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      Awaiting Release
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-900">{getPatientName(result.patient_id)}</p>
                  <p className="text-sm text-slate-500">
                    Result Date: {result.result_date ? format(new Date(result.result_date), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                  {result.signed_by_email && (
                    <p className="text-xs text-slate-400 mt-1">
                      Signed by: {result.signed_by_email}
                    </p>
                  )}
                  {result.narrative_text && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{result.narrative_text}</p>
                  )}
                </div>
                <Button
                  onClick={() => handleReleaseClick(result)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Release to Patient
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={releaseDialog} onOpenChange={setReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Result to Patient</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Patient</p>
                <p className="font-semibold text-slate-900">{getPatientName(selectedResult.patient_id)}</p>
                <p className="text-sm text-slate-600 mt-2">Result Type</p>
                <p className="font-semibold text-slate-900">{selectedResult.result_type}</p>
              </div>
              <div>
                <Label>Release Note (Optional)</Label>
                <Textarea
                  value={releaseNote}
                  onChange={(e) => setReleaseNote(e.target.value)}
                  placeholder="Add any notes about this release..."
                  rows={3}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-xs text-amber-900">
                  ⚠️ This action will make the result visible to the patient via the patient portal and will be logged for audit purposes.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setReleaseDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRelease}
                  disabled={releaseMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {releaseMutation.isPending ? 'Releasing...' : 'Confirm Release'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}