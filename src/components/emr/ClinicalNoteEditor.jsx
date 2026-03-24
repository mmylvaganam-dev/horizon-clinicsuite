import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Save, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const NOTE_TYPES = [
  { value: 'SOAP', color: 'bg-purple-100 text-purple-700' },
  { value: 'Referral', color: 'bg-blue-100 text-blue-700' },
  { value: 'Lab Review', color: 'bg-green-100 text-green-700' },
  { value: 'Progress', color: 'bg-teal-100 text-teal-700' },
  { value: 'Discharge', color: 'bg-orange-100 text-orange-700' },
  { value: 'Procedure', color: 'bg-red-100 text-red-700' },
  { value: 'Consultation', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'Follow-up', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'General', color: 'bg-slate-100 text-slate-700' },
];

export function getNoteTypeBadgeClass(type) {
  return NOTE_TYPES.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-700';
}

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['clean']
  ]
};

export default function ClinicalNoteEditor({ patientId, open, onClose, editNote = null }) {
  const queryClient = useQueryClient();
  const isEditing = !!editNote;

  const [noteDate, setNoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [noteType, setNoteType] = useState('SOAP');
  const [content, setContent] = useState('');

  // Populate form when editing
  React.useEffect(() => {
    if (editNote) {
      setNoteDate(format(new Date(editNote.note_date), 'yyyy-MM-dd'));
      setNoteType(editNote.note_type || 'SOAP');
      setContent(editNote.rich_content || '');
    } else {
      setNoteDate(format(new Date(), 'yyyy-MM-dd'));
      setNoteType('SOAP');
      setContent('');
    }
  }, [editNote, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        return base44.entities.SOAPNote.update(editNote.id, {
          note_date: new Date(noteDate).toISOString(),
          note_type: noteType,
          rich_content: content,
          status: editNote.status === 'signed' ? 'amended' : editNote.status,
        });
      }
      const me = await base44.auth.me();
      return base44.entities.SOAPNote.create({
        patient_id: patientId,
        provider_id: me?.id || me?.email || 'unknown',
        provider_email: me?.email,
        note_date: new Date(noteDate).toISOString(),
        note_type: noteType,
        rich_content: content,
        status: 'draft',
        ai_generated: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientSOAP', patientId] });
      toast.success(isEditing ? 'Note updated' : 'Clinical note saved');
      setContent('');
      setNoteDate(format(new Date(), 'yyyy-MM-dd'));
      setNoteType('SOAP');
      onClose();
    },
    onError: () => toast.error('Failed to save note'),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            {isEditing ? 'Edit Clinical Note' : 'New Clinical Note'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Date + Type row */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <Label className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" /> Note Date
              </Label>
              <Input
                type="date"
                value={noteDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setNoteDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="mb-1 block">Note Type</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.color}`}>{t.value}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected type preview */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Tagged as:</span>
            <Badge className={`${getNoteTypeBadgeClass(noteType)} border-0`}>{noteType}</Badge>
            {noteDate !== format(new Date(), 'yyyy-MM-dd') && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Backdated</Badge>
            )}
          </div>

          {/* Rich text editor */}
          <div>
            <Label className="mb-1 block">Note Content</Label>
            <div className="border rounded-lg overflow-hidden">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={QUILL_MODULES}
                placeholder="Write your clinical note here..."
                style={{ minHeight: '280px' }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!content || content === '<p><br></p>' || saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}