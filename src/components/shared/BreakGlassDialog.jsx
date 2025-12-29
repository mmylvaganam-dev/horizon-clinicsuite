import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BreakGlassDialog({ open, onOpenChange, patientId, onSuccess }) {
  const [reason, setReason] = useState('');

  const breakGlassMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();

      const breakGlassLog = await base44.entities.BreakGlassLog.create({
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: data.patientId,
        reason: data.reason,
        started_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: data.patientId,
        module: 'SECURITY',
        action: 'break_glass_access',
        record_type: 'BreakGlassLog',
        record_id: breakGlassLog.id,
        metadata: {
          reason: data.reason,
          emergency: true,
          high_priority: true
        }
      });

      return breakGlassLog;
    },
    onSuccess: (result) => {
      toast.success('Emergency access granted');
      setReason('');
      onSuccess?.(result);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to grant access');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    if (!confirm('⚠️ EMERGENCY ACCESS: This action will be logged and audited. Continue?')) {
      return;
    }

    breakGlassMutation.mutate({ patientId, reason });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-red-500">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-red-900">Break-Glass Emergency Access</DialogTitle>
              <p className="text-sm text-red-600 mt-1">This action will be logged and audited</p>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>Warning:</strong> Break-glass access is for emergency situations only. 
              All access will be logged and reviewed. Misuse may result in disciplinary action.
            </p>
          </div>
          <div>
            <Label className="text-red-900">Emergency Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the emergency situation requiring immediate access..."
              rows={4}
              required
              className="border-red-300 focus:ring-red-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={breakGlassMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {breakGlassMutation.isPending ? 'Granting...' : 'Grant Emergency Access'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}