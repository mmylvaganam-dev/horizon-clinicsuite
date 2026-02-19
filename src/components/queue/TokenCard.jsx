import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhoneCall, CheckCircle2, SkipForward, RotateCcw, Clock } from 'lucide-react';
import { format } from 'date-fns';

const priorityColors = {
  normal: '',
  urgent: 'border-l-4 border-l-red-500',
  elderly: 'border-l-4 border-l-amber-500',
};

const priorityBadge = {
  normal: null,
  urgent: <Badge className="bg-red-100 text-red-700 text-xs">🔴 Urgent</Badge>,
  elderly: <Badge className="bg-amber-100 text-amber-700 text-xs">🟡 Elderly</Badge>,
};

const statusColors = {
  waiting: 'bg-blue-50',
  called: 'bg-amber-50',
  serving: 'bg-teal-50',
  completed: 'bg-slate-50',
  skipped: 'bg-rose-50',
  no_show: 'bg-red-50',
};

export default function TokenCard({ token, onCall, onServe, onComplete, onSkip, onRecall, compact = false }) {
  return (
    <div className={`p-3 rounded-xl border bg-white ${priorityColors[token.priority]} ${statusColors[token.status]} transition-all`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-slate-800 font-mono min-w-[72px]">
            {token.token_number}
          </div>
          <div>
            <p className="font-medium text-sm text-slate-800 leading-tight">{token.patient_name || 'Walk-in'}</p>
            <p className="text-xs text-slate-400">{token.patient_mobile || '—'}</p>
          </div>
          {priorityBadge[token.priority]}
        </div>
        {!compact && (
          <div className="flex gap-1">
            {token.status === 'waiting' && (
              <Button size="sm" variant="outline" className="text-teal-700 border-teal-300 hover:bg-teal-50" onClick={onCall}>
                <PhoneCall className="w-3.5 h-3.5 mr-1" /> Call
              </Button>
            )}
            {token.status === 'called' && (
              <>
                <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50" onClick={onServe}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Serving
                </Button>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-amber-600" onClick={onSkip}>
                  <SkipForward className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {token.status === 'serving' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onComplete}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Done
              </Button>
            )}
            {token.status === 'skipped' && (
              <Button size="sm" variant="outline" className="text-slate-600" onClick={onRecall}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Recall
              </Button>
            )}
            {token.status === 'completed' && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {token.completed_at ? format(new Date(token.completed_at), 'HH:mm') : ''}
              </span>
            )}
          </div>
        )}
      </div>
      {token.notes && <p className="text-xs text-slate-500 mt-2 pl-0 italic">{token.notes}</p>}
    </div>
  );
}