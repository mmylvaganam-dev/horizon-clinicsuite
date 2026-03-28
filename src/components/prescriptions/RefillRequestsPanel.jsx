import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Pill, Clock, User, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function RefillRequestsPanel({ patientId, onApproved }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewNotes, setReviewNotes] = useState({});

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['refillRequests', patientId, statusFilter],
    queryFn: () => {
      const filter = statusFilter === 'all' ? {} : { status: statusFilter };
      if (patientId) filter.patient_id = patientId;
      return base44.entities.PrescriptionRenewalRequest.filter(filter, '-created_date', 50);
    },
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes, originalRxId, requestData }) => {
      const updatePayload = {
        status: action === 'approve' ? 'approved' : 'denied',
        reviewed_by: user?.email || '',
        reviewed_at: new Date().toISOString(),
        pharmacist_notes: notes || '',
      };

      await base44.entities.PrescriptionRenewalRequest.update(id, updatePayload);

      // If approved, auto-create a new prescription
      if (action === 'approve' && requestData) {
        const newRx = await base44.entities.Prescription.create({
          patient_id: requestData.patient_id,
          prescriber_id: user?.id || user?.email,
          drug_name: requestData.drug_name,
          strength: requestData.strength || '',
          dosage_form: requestData.dosage_form || '',
          directions: requestData.directions || '',
          quantity: requestData.quantity_requested || requestData.original_quantity || 0,
          refills: 0,
          status: 'Verified',
          prescribed_date: new Date().toISOString(),
          notes: `Auto-generated from refill request. ${notes || ''}`.trim(),
        });
        await base44.entities.PrescriptionRenewalRequest.update(id, { new_prescription_id: newRx.id });
      }
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' ? 'Refill approved & prescription created' : 'Refill request denied');
      queryClient.invalidateQueries({ queryKey: ['refillRequests'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      onApproved?.();
    },
    onError: () => toast.error('Failed to process refill request'),
  });

  const handleReview = (req, action) => {
    reviewMutation.mutate({
      id: req.id,
      action,
      notes: reviewNotes[req.id] || '',
      requestData: req,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading && <div className="text-center py-12 text-slate-400">Loading refill requests...</div>}

      {!isLoading && requests.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No {statusFilter !== 'all' ? statusFilter : ''} refill requests</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map(req => (
          <Card key={req.id} className="border border-slate-200 shadow-none">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span className="font-semibold text-slate-900">{req.drug_name}</span>
                    {req.strength && <span className="text-slate-500 text-sm">{req.strength}</span>}
                    <Badge className={
                      req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      req.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-rose-100 text-rose-800'
                    }>
                      {req.status}
                    </Badge>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                    {req.patient_name && (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.patient_name}</span>
                    )}
                    {req.requested_by && <span>Requested by: {req.requested_by}</span>}
                    {req.quantity_requested && <span>Qty Requested: <strong className="text-slate-700">{req.quantity_requested}</strong></span>}
                    {req.original_quantity && <span>Original Qty: {req.original_quantity}</span>}
                    {req.requested_via && <span>Via: {req.requested_via}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(req.created_date), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>

                  {req.directions && (
                    <p className="text-sm text-slate-600 mt-1">{req.directions}</p>
                  )}

                  {req.patient_notes && (
                    <p className="text-sm text-slate-500 italic mt-1">Patient note: "{req.patient_notes}"</p>
                  )}

                  {(req.status === 'approved' || req.status === 'denied') && req.pharmacist_notes && (
                    <p className="text-sm text-slate-500 mt-1 border-t pt-2">
                      <span className="font-medium">Review notes: </span>{req.pharmacist_notes}
                    </p>
                  )}
                  {req.reviewed_by && (
                    <p className="text-xs text-slate-400 mt-1">
                      Reviewed by {req.reviewed_by} on {format(new Date(req.reviewed_at), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              </div>

              {req.status === 'pending' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Textarea
                    placeholder="Review notes (optional)..."
                    rows={2}
                    className="text-sm"
                    value={reviewNotes[req.id] || ''}
                    onChange={e => setReviewNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(req, 'approve')}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve & Create Rx
                    </Button>
                    <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(req, 'deny')}>
                      <XCircle className="w-3.5 h-3.5" />
                      Deny
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}