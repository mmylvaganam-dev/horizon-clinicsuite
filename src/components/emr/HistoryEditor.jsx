import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Check, X, Plus } from 'lucide-react';

export function HistorySection({ title, value, fieldKey, patientId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (text) => base44.entities.Patient.update(patientId, { [fieldKey]: text }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      onSaved && onSaved(updated);
      setEditing(false);
    },
  });

  const handleEdit = () => {
    setDraft(value || '');
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {!editing && (
          <Button size="sm" variant="outline" onClick={handleEdit}>
            {value ? <><Pencil className="w-3.5 h-3.5 mr-1" />Edit</> : <><Plus className="w-3.5 h-3.5 mr-1" />Add</>}
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saveMutation.isPending}>
              <X className="w-3.5 h-3.5 mr-1" />Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => saveMutation.mutate(draft)}
              disabled={saveMutation.isPending}
            >
              <Check className="w-3.5 h-3.5 mr-1" />{saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder={`Enter ${title}…`}
            className="resize-none"
            autoFocus
          />
        ) : value ? (
          <div className="p-4 bg-slate-50 rounded-lg whitespace-pre-wrap text-slate-900 text-sm">{value}</div>
        ) : (
          <p className="text-sm text-slate-400 italic">Not documented yet — click Add to record.</p>
        )}
      </CardContent>
    </Card>
  );
}