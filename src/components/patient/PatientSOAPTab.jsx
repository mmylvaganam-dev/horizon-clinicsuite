import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, PenLine, Pencil, Archive, Wand2, Sparkles } from 'lucide-react';
import VoiceTranscriber from '@/components/emr/VoiceTranscriber';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ClinicalNoteEditor, { getNoteTypeBadgeClass } from '@/components/emr/ClinicalNoteEditor';

function SOAPNoteRow({ note, onEdit, onArchive }) {
  const [expanded, setExpanded] = React.useState(false);
  const isArchived = note.status === 'archived';
  return (
    <div className={`p-3 rounded-lg border bg-white ${isArchived ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium">{format(new Date(note.note_date), 'MMM d, yyyy')}</span>
          {note.note_type && (
            <Badge className={`${getNoteTypeBadgeClass(note.note_type)} border-0 text-xs`}>{note.note_type}</Badge>
          )}
          <Badge className={
            note.status === 'signed' ? 'bg-emerald-100 text-emerald-700 border-0' :
            note.status === 'archived' ? 'bg-slate-100 text-slate-500 border-0' :
            note.status === 'amended' ? 'bg-blue-100 text-blue-700 border-0' :
            'bg-amber-100 text-amber-700 border-0'
          }>
            {note.status}
          </Badge>
          {note.ai_generated && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">AI</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isArchived && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onEdit(note)} className="text-xs h-7 text-slate-600 hover:text-teal-700" title="Edit note">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onArchive(note)} className="text-xs h-7 text-slate-600 hover:text-red-600" title="Archive note">
                <Archive className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs h-7">
            {expanded ? 'Collapse' : 'View'}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-3 pt-2 border-t mt-2">
          {note.rich_content ? (
            <div
              className="text-sm text-slate-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: note.rich_content }}
            />
          ) : (
            <>
              {note.subjective && <div><p className="text-xs font-semibold text-teal-700 mb-1 uppercase">Subjective:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.subjective}</p></div>}
              {note.objective && <div><p className="text-xs font-semibold text-teal-700 mb-1 uppercase">Objective:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.objective}</p></div>}
              {note.assessment && <div><p className="text-xs font-semibold text-teal-700 mb-1 uppercase">Assessment:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.assessment}</p></div>}
              {note.plan && <div><p className="text-xs font-semibold text-teal-700 mb-1 uppercase">Plan:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.plan}</p></div>}
            </>
          )}
          {note.icd10_codes && note.icd10_codes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-teal-700 mb-1 uppercase">ICD-10 Codes:</p>
              <div className="flex flex-wrap gap-1">
                {note.icd10_codes.map((code, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">{code}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!expanded && (
        <div className="text-sm text-slate-500 truncate">
          {note.rich_content
            ? note.rich_content.replace(/<[^>]+>/g, '').substring(0, 100) + (note.rich_content.length > 100 ? '...' : '')
            : note.subjective?.substring(0, 100) || ''}
        </div>
      )}
    </div>
  );
}

export default function PatientSOAPTab({ patientId }) {
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: soapNotes = [] } = useQuery({
    queryKey: ['patientSOAP', patientId],
    queryFn: () => base44.entities.SOAPNote.filter({ patient_id: patientId }, '-note_date'),
    enabled: !!patientId,
  });

  const archiveMutation = useMutation({
    mutationFn: (note) => base44.entities.SOAPNote.update(note.id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientSOAP', patientId] });
      toast.success('Note archived');
    },
  });

  const handleEdit = (note) => {
    setEditingNote(note);
    setNoteEditorOpen(true);
  };

  const handleArchive = (note) => {
    if (window.confirm('Archive this note? It will be hidden from the active list.')) {
      archiveMutation.mutate(note);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Clinical Notes</h3>
        <div className="flex gap-2">
          <Button onClick={() => setNoteEditorOpen(true)} size="sm" variant="outline">
            <PenLine className="w-4 h-4 mr-2" />
            New Note
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
        </div>
      </div>

      {soapNotes.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No SOAP notes yet</p>
      ) : (
        <div className="space-y-2">
          {soapNotes.map((note) => (
            <SOAPNoteRow key={note.id} note={note} onEdit={handleEdit} onArchive={handleArchive} />
          ))}
        </div>
      )}

      <ClinicalNoteEditor
        patientId={patientId}
        open={noteEditorOpen}
        editNote={editingNote}
        onClose={() => { setNoteEditorOpen(false); setEditingNote(null); }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              AI Voice-to-SOAP Transcriber
            </DialogTitle>
          </DialogHeader>
          <VoiceTranscriber
            patientId={patientId}
            onNoteSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['patientSOAP', patientId] });
              setDialogOpen(false);
              toast.success('SOAP note filed to EMR');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}