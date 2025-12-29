import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function AdminExportApprovals() {
  const queryClient = useQueryClient();
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'

  const { data: pendingBundles = [], isLoading } = useQuery({
    queryKey: ['pendingExportBundles'],
    queryFn: async () => {
      const bundles = await base44.entities.ExportBundle.list('-requested_at');
      return bundles.filter(b => b.status === 'draft');
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ bundleId, action, notes }) => {
      const response = await base44.functions.invoke('reviewExportBundle', {
        bundleId,
        action,
        notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingExportBundles'] });
      setReviewDialog(false);
      setSelectedBundle(null);
      setReviewNotes('');
      setActionType(null);
    },
  });

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || 'Unknown';
  };

  const bundleTypeColors = {
    patient_records: 'from-blue-500 to-blue-600',
    lab_results: 'from-purple-500 to-purple-600',
    cardio_results: 'from-red-500 to-red-600',
    pft_results: 'from-cyan-500 to-cyan-600',
    billing_data: 'from-green-500 to-green-600',
    pharmacy_sales: 'from-amber-500 to-amber-600',
    full_backup: 'from-slate-500 to-slate-600',
    custom: 'from-indigo-500 to-indigo-600',
  };

  const handleReviewAction = (bundle, action) => {
    setSelectedBundle(bundle);
    setActionType(action);
    setReviewDialog(true);
  };

  const confirmReview = () => {
    if (!selectedBundle) return;
    reviewMutation.mutate({
      bundleId: selectedBundle.id,
      action: actionType,
      notes: reviewNotes
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Export Approval Queue</h1>
        <p className="text-slate-500 mt-1">Review and approve pending export requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{pendingBundles.length}</p>
            <p className="text-sm text-slate-600 mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : pendingBundles.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
          <p className="text-slate-500 mt-1">No pending export approvals</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingBundles.map((bundle) => (
            <Card key={bundle.id} className="p-5 bg-white border-0 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bundleTypeColors[bundle.bundle_type]} flex items-center justify-center flex-shrink-0`}>
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      Pending Approval
                    </Badge>
                    <Badge variant="outline">{bundle.bundle_type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="font-medium text-slate-900 mb-1">{getOrgName(bundle.organization_id)}</p>
                  <p className="text-sm text-slate-600 mb-2">
                    Period: {format(new Date(bundle.date_from), 'MMM d, yyyy')} - {format(new Date(bundle.date_to), 'MMM d, yyyy')}
                  </p>
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Export Reason:</p>
                    <p className="text-sm text-slate-900">{bundle.export_reason}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Requested by {bundle.requested_by_email}</span>
                    <span>•</span>
                    <span>{format(new Date(bundle.requested_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  {bundle.notes && (
                    <p className="text-sm text-slate-600 mt-2 italic">Notes: {bundle.notes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleReviewAction(bundle, 'approve')}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReviewAction(bundle, 'reject')}
                    variant="outline"
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                    size="sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Approve Export Request
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" />
                  Reject Export Request
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedBundle && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Bundle Type: <span className="font-medium text-slate-900">{selectedBundle.bundle_type}</span></p>
                <p className="text-sm text-slate-600">Organization: <span className="font-medium text-slate-900">{getOrgName(selectedBundle.organization_id)}</span></p>
                <p className="text-sm text-slate-600">Requester: <span className="font-medium text-slate-900">{selectedBundle.requested_by_email}</span></p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Add any notes about this approval...' : 'Explain why this export is being rejected...'}
                  rows={4}
                />
              </div>
              {actionType === 'reject' && !reviewNotes.trim() && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm">Rejection reason is required</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReview}
              disabled={reviewMutation.isPending || (actionType === 'reject' && !reviewNotes.trim())}
              className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}