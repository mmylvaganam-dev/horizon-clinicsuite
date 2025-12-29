import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

export default function ExportDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  requireReason = true,
  title = "Export Data",
  description = "This export action will be audited."
}) {
  const [reason, setReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return;
    }

    setIsExporting(true);
    try {
      await onConfirm(reason);
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {requireReason && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-900">Export Reason Required</p>
                    <p className="text-sm text-amber-800 mt-1">{description}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Reason for Export <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  placeholder="Enter a detailed reason for this export..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </div>
            </>
          )}

          {!requireReason && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">{description}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isExporting || (requireReason && !reason.trim())}
            >
              {isExporting ? 'Exporting...' : 'Confirm Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}