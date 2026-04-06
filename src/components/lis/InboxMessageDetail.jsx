import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const statusColors = {
  pending: 'bg-slate-100 text-slate-700',
  parsed: 'bg-blue-100 text-blue-700',
  matched: 'bg-purple-100 text-purple-700',
  applied: 'bg-green-100 text-green-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const flagColors = { H: 'text-rose-600 font-bold', L: 'text-blue-600 font-bold', C: 'text-red-700 font-extrabold' };

export default function InboxMessageDetail({ open, onOpenChange, message, analyzerName, onApply, onReject, isApplying }) {
  if (!message) return null;

  const params = message.parsed_data?.parameters || [];
  const isFinal = ['applied', 'rejected'].includes(message.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Parsed Result — {analyzerName || 'Analyzer'}
            <Badge className={statusColors[message.status]}>{message.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Protocol</p>
              <p className="font-semibold uppercase">{message.message_type}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Specimen ID</p>
              <p className="font-semibold">{message.parsed_data?.specimen_id || 'Not matched'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Test Panel</p>
              <p className="font-semibold truncate">{message.parsed_data?.test_name || '—'}</p>
            </div>
          </div>

          {/* Parameters table */}
          {params.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Parameter</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Value</th>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Unit</th>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Ref Range</th>
                    <th className="text-center px-3 py-2 text-xs text-slate-500 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {params.map((p, i) => (
                    <tr key={i} className={p.abnormal_flag ? 'bg-rose-50' : 'bg-white'}>
                      <td className="px-3 py-2 font-medium text-slate-900">{p.name || p.code}</td>
                      <td className={`px-3 py-2 text-right font-mono ${flagColors[p.abnormal_flag] || 'text-slate-800'}`}>{p.value}</td>
                      <td className="px-3 py-2 text-slate-500">{p.unit}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs">{p.ref_range}</td>
                      <td className="px-3 py-2 text-center">
                        {p.abnormal_flag && (
                          <Badge className={p.abnormal_flag === 'H' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}>
                            {p.abnormal_flag}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 border rounded-lg">No parameters parsed</div>
          )}

          {/* Raw message */}
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">View raw message</summary>
            <pre className="mt-2 bg-slate-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-xs">{message.raw_message}</pre>
          </details>

          {/* Actions */}
          {!isFinal && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <div className="flex items-start gap-2 flex-1 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {message.status === 'parsed'
                  ? 'Specimen not matched. Link manually before applying.'
                  : 'Review parsed values before applying to patient record.'}
              </div>
              <Button variant="outline" className="text-rose-600 border-rose-300 hover:bg-rose-50" onClick={() => onReject(message.id)} disabled={isApplying}>
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => onApply(message.id)} disabled={isApplying || message.status === 'parsed'}>
                <CheckCircle className="w-4 h-4 mr-1" /> {isApplying ? 'Applying...' : 'Apply to Patient'}
              </Button>
            </div>
          )}
          {message.rejection_reason && (
            <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">
              <span className="font-medium">Rejection reason: </span>{message.rejection_reason}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}