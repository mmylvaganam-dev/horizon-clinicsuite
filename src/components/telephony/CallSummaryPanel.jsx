import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Tag, ListChecks, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const SENTIMENT_CONFIG = {
  positive: { color: 'bg-green-100 text-green-700', label: '😊 Positive' },
  neutral:  { color: 'bg-slate-100 text-slate-700', label: '😐 Neutral' },
  negative: { color: 'bg-red-100 text-red-700',   label: '😟 Negative' },
};

export default function CallSummaryPanel({ log, open, onClose, onUpdated }) {
  const [transcript, setTranscript] = useState(log?.transcript || '');
  const queryClient = useQueryClient();

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('telephonyCallSummarize', {
        call_log_id: log.id,
        transcript: transcript.trim() || undefined,
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('AI summary generated');
      queryClient.invalidateQueries({ queryKey: ['callLogs'] });
      if (onUpdated) onUpdated({ ...log, ...data });
    },
    onError: (err) => {
      toast.error('Failed: ' + err.message);
    },
  });

  if (!log) return null;

  const hasSummary = !!log.ai_summary;
  const sentiment = SENTIMENT_CONFIG[log.ai_sentiment] || SENTIMENT_CONFIG.neutral;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI Call Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call meta */}
          <div className="text-xs text-slate-500 flex gap-4 flex-wrap bg-slate-50 rounded-lg p-3">
            <span><span className="font-medium">From:</span> {log.from_number}</span>
            <span><span className="font-medium">To:</span> {log.to_number}</span>
            <span><span className="font-medium">Date:</span> {log.started_at ? format(new Date(log.started_at), 'MMM d, HH:mm') : '--'}</span>
            {log.duration_seconds > 0 && (
              <span><span className="font-medium">Duration:</span> {Math.floor(log.duration_seconds / 60)}m {log.duration_seconds % 60}s</span>
            )}
          </div>

          {/* Transcript input */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Call Transcript <span className="text-slate-400 font-normal">(optional — paste if available)</span>
            </label>
            <Textarea
              placeholder="Paste transcript here, or leave blank to summarize from call metadata…"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              rows={4}
              className="text-sm resize-none"
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={() => summarizeMutation.mutate()}
            disabled={summarizeMutation.isPending}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {summarizeMutation.isPending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> {hasSummary ? 'Re-generate Summary' : 'Generate AI Summary'}</>
            )}
          </Button>

          {/* Results */}
          {hasSummary && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {log.ai_generated_at ? `Generated ${format(new Date(log.ai_generated_at), 'MMM d, HH:mm')}` : ''}
                </span>
                {log.ai_sentiment && (
                  <Badge className={`text-xs ${sentiment.color}`}>{sentiment.label}</Badge>
                )}
              </div>

              {/* Summary */}
              <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-teal-700 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Summary
                </p>
                <p className="text-sm text-slate-700">{log.ai_summary}</p>
              </div>

              {/* Topics */}
              {log.ai_topics?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Key Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {log.ai_topics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-ups */}
              {log.ai_follow_ups?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <ListChecks className="w-3 h-3" /> Suggested Follow-ups
                  </p>
                  <ul className="space-y-1.5">
                    {log.ai_follow_ups.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!hasSummary && (
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              No summary yet. Paste a transcript above or click Generate to create a summary from call metadata.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}