import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/OrganizationProvider';
import { CheckCircle, XCircle, Clock, FileText, User, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SaleDeletionRequests() {
  const { selectedOrgId, user } = useOrganization();
  const [reviewNotes, setReviewNotes] = useState({});
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['deletionRequests', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return await base44.entities.SaleDeletionRequest.filter({ organization_id: selectedOrgId });
    },
    enabled: !!selectedOrgId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, saleHeaderId }) => {
      // Delete sale lines
      const lines = await base44.entities.PharmacySaleLine.filter({ sale_header_id: saleHeaderId });
      for (const line of lines) {
        await base44.entities.PharmacySaleLine.delete(line.id);
      }
      
      // Delete receipts
      const receipts = await base44.entities.PharmacyReceipt.filter({ sale_id: saleHeaderId });
      for (const receipt of receipts) {
        await base44.entities.PharmacyReceipt.delete(receipt.id);
      }
      
      // Delete sale header
      await base44.entities.PharmacySaleHeader.delete(saleHeaderId);
      
      // Update request
      await base44.entities.SaleDeletionRequest.update(requestId, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes[requestId] || 'Approved'
      });
    },
    onSuccess: () => {
      toast.success('✅ Sale deleted and request approved');
      queryClient.invalidateQueries(['deletionRequests']);
      queryClient.invalidateQueries(['pharmacySales']);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.SaleDeletionRequest.update(requestId, {
        status: 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes[requestId] || 'Rejected'
      });
    },
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries(['deletionRequests']);
    }
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">🗑️ Sale Deletion Requests</h1>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No pending deletion requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">{request.sale_number}</p>
                      <div className="flex gap-4 text-sm text-slate-600 mt-1">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${request.sale_amount?.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {request.requested_by_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-orange-500">Pending</Badge>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg mb-3">
                    <p className="text-sm font-medium text-slate-700">Reason:</p>
                    <p className="text-sm text-slate-600 mt-1">{request.reason}</p>
                  </div>

                  <Textarea
                    placeholder="Add review notes (optional)..."
                    value={reviewNotes[request.id] || ''}
                    onChange={(e) => setReviewNotes({...reviewNotes, [request.id]: e.target.value})}
                    className="mb-3"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate({ requestId: request.id, saleHeaderId: request.sale_header_id })}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve & Delete Sale
                    </Button>
                    <Button
                      onClick={() => rejectMutation.mutate(request.id)}
                      disabled={rejectMutation.isPending}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Request
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewed Requests History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Review History ({reviewedRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewedRequests.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No review history</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reviewedRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-bold">{request.sale_number}</p>
                    <div className="flex gap-3 text-sm text-slate-600 mt-1">
                      <span>${request.sale_amount?.toFixed(2)}</span>
                      <span>Requested by: {request.requested_by_name}</span>
                      <span>Reviewed by: {request.reviewed_by}</span>
                    </div>
                    {request.review_notes && (
                      <p className="text-sm text-slate-500 mt-1">Notes: {request.review_notes}</p>
                    )}
                  </div>
                  <Badge className={request.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}>
                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}