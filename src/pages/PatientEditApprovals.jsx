import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, User, FileEdit, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PatientEditApprovals() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['patientEditRequests'],
    queryFn: () => base44.entities.PatientEditRequest.list('-requested_date'),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, action, notes }) => {
      const request = requests.find(r => r.id === requestId);
      
      // Update the request status
      await base44.entities.PatientEditRequest.update(requestId, {
        status: action,
        reviewed_by: user.id,
        reviewed_by_name: user.full_name,
        reviewed_date: new Date().toISOString(),
        review_notes: notes
      });

      // If approved, apply the changes to the patient
      if (action === 'approved') {
        await base44.entities.Patient.update(request.patient_id, request.requested_changes);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['patientEditRequests']);
      queryClient.invalidateQueries(['patients']);
      toast.success(`Request ${variables.action === 'approved' ? 'approved' : 'rejected'}`);
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setReviewNotes('');
    },
    onError: () => {
      toast.error('Failed to process request');
    }
  });

  const handleReview = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setShowReviewDialog(true);
  };

  const handleSubmitReview = () => {
    if (!selectedRequest) return;
    
    approveMutation.mutate({
      requestId: selectedRequest.id,
      action: reviewAction,
      notes: reviewNotes
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  const renderFieldChanges = (currentData, changes) => {
    const changedFields = Object.keys(changes).filter(key => 
      JSON.stringify(currentData?.[key]) !== JSON.stringify(changes[key])
    );

    return (
      <div className="space-y-2">
        {changedFields.map(field => (
          <div key={field} className="grid grid-cols-3 gap-2 text-sm">
            <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span>
            <span className="text-slate-500 line-through">{currentData?.[field] || '(empty)'}</span>
            <span className="text-green-600 font-semibold">→ {changes[field] || '(empty)'}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-400 animate-spin" />
          <p className="text-slate-600 mt-4">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Edit Approvals</h1>
          <p className="text-slate-600 mt-1">Review and approve patient information edit requests</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <Badge className="bg-orange-100 text-orange-700">{pendingRequests.length} Pending</Badge>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Requests</h2>
          <div className="space-y-4">
            {pendingRequests.map(request => (
              <Card key={request.id} className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <FileEdit className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Patient Edit Request</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          Requested by <strong>{request.requested_by_name}</strong>
                          {request.requested_date && (
                            <> on {format(new Date(request.requested_date), 'MMM d, yyyy h:mm a')}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.reason && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-slate-700 mb-1">Reason:</p>
                      <p className="text-sm text-slate-600">{request.reason}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Requested Changes:</p>
                    <div className="bg-white border rounded-lg p-3">
                      {renderFieldChanges(request.current_data, request.requested_changes)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReview(request, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview(request, 'rejected')}
                      variant="destructive"
                      disabled={approveMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendingRequests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium text-slate-900">No pending requests</p>
            <p className="text-sm text-slate-600 mt-1">All patient edit requests have been reviewed</p>
          </CardContent>
        </Card>
      )}

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Reviews</h2>
          <div className="space-y-3">
            {reviewedRequests.slice(0, 10).map(request => (
              <Card key={request.id} className="bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          Request by {request.requested_by_name}
                        </p>
                        <Badge className={
                          request.status === 'approved' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        Reviewed by {request.reviewed_by_name} on{' '}
                        {request.reviewed_date && format(new Date(request.reviewed_date), 'MMM d, yyyy')}
                      </p>
                      {request.review_notes && (
                        <p className="text-xs text-slate-500 mt-1">Note: {request.review_notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' ? 'Approve' : 'Reject'} Edit Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-2">Requested Changes:</p>
              {selectedRequest && renderFieldChanges(selectedRequest.current_data, selectedRequest.requested_changes)}
            </div>

            <div>
              <Label>Review Notes (Optional)</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about your decision..."
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                className={reviewAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={reviewAction === 'rejected' ? 'destructive' : 'default'}
                disabled={approveMutation.isPending}
              >
                {reviewAction === 'approved' ? 'Approve' : 'Reject'} Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}