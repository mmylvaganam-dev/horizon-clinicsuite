import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Sparkles, Loader2, Mic, Calendar, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ClinicalNoteEditor, { getNoteTypeBadgeClass } from '@/components/emr/ClinicalNoteEditor';

function SOAPNoteRow({ note }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium">{format(new Date(note.note_date), 'MMM d, yyyy')}</span>
          {note.note_type && (
            <Badge className={`${getNoteTypeBadgeClass(note.note_type)} border-0 text-xs`}>{note.note_type}</Badge>
          )}
          <Badge className={note.status === 'signed' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
            {note.status}
          </Badge>
          {note.ai_generated && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">AI</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs h-7">
          {expanded ? 'Collapse' : 'View'}
        </Button>
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState('text'); // 'text' or 'pdf'
  const [transcript, setTranscript] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [noteDate, setNoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [generating, setGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const queryClient = useQueryClient();

  const { data: soapNotes = [] } = useQuery({
    queryKey: ['patientSOAP', patientId],
    queryFn: () => base44.entities.SOAPNote.filter({ patient_id: patientId }),
  });

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast.success('Listening...');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = () => {
      toast.error('Recognition error');
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setMediaRecorder(recognition);
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success('Stopped');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(response.file_url);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const generateFromPDF = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      
      // Use AI to extract text from PDF and generate SOAP note
      const prompt = `Extract clinical information from this uploaded PDF and structure it as a SOAP note. Return JSON with fields: subjective, objective, assessment, plan, icd10_codes (array)`;
      
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [uploadedFile],
        response_json_schema: {
          type: "object",
          properties: {
            subjective: { type: "string" },
            objective: { type: "string" },
            assessment: { type: "string" },
            plan: { type: "string" },
            icd10_codes: { type: "array", items: { type: "string" } }
          }
        }
      });

      const response = await base44.functions.invoke('generateSOAPNote', {
        patient_id: patientId,
        voice_transcript: `PDF extracted: ${JSON.stringify(aiResponse)}`,
        note_date: noteDate
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientSOAP', patientId] });
      setDialogOpen(false);
      setTranscript('');
      setUploadedFile(null);
      setGenerating(false);
      toast.success('SOAP note generated from PDF');
    },
    onError: () => {
      setGenerating(false);
      toast.error('Failed to generate note');
    }
  });

  const generateFromText = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateSOAPNote', {
        patient_id: patientId,
        voice_transcript: transcript,
        note_date: noteDate
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientSOAP', patientId] });
      setDialogOpen(false);
      setTranscript('');
      toast.success('SOAP note generated');
    },
  });

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
            <SOAPNoteRow key={note.id} note={note} />
          ))}
        </div>
      )}

      <ClinicalNoteEditor
        patientId={patientId}
        open={noteEditorOpen}
        onClose={() => setNoteEditorOpen(false)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate SOAP Note</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Backdating */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1 flex items-center gap-3">
                <Label className="text-sm font-medium text-amber-800 whitespace-nowrap">Note Date:</Label>
                <Input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="h-8 text-sm border-amber-300 bg-white w-auto"
                />
              </div>
              {noteDate !== format(new Date(), 'yyyy-MM-dd') && (
                <span className="text-xs text-amber-700 font-medium">Backdated</span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant={uploadMode === 'text' ? 'default' : 'outline'}
                onClick={() => setUploadMode('text')}
                className="flex-1"
              >
                Text Input
              </Button>
              <Button
                variant={uploadMode === 'pdf' ? 'default' : 'outline'}
                onClick={() => setUploadMode('pdf')}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>

            {uploadMode === 'text' ? (
              <>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="flex-1"
                  >
                    <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                    {isRecording ? 'Stop Recording' : 'Record Audio'}
                  </Button>
                </div>
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Click 'Record Audio' to record, or type clinical notes..."
                  rows={10}
                />
                <Button
                  onClick={() => generateFromText.mutate()}
                  disabled={!transcript || generateFromText.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {generateFromText.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate SOAP Note
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload">
                    <Button asChild variant="outline">
                      <span>Choose PDF File</span>
                    </Button>
                  </label>
                  {uploadedFile && (
                    <p className="text-sm text-emerald-600 mt-2">File uploaded successfully</p>
                  )}
                </div>
                <Button
                  onClick={() => generateFromPDF.mutate()}
                  disabled={!uploadedFile || generating}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting & Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate from PDF
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}