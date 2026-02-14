import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Sparkles, Mic, Loader2, Save, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

export default function SOAPNotes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [generatedNote, setGeneratedNote] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [noteType, setNoteType] = useState('general');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: soapNotes = [], isLoading } = useQuery({
    queryKey: ['soapNotes'],
    queryFn: () => base44.entities.SOAPNote.list('-note_date'),
  });

  const generateNoteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateSOAPNote', data);
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedNote(data.soapNote);
      setGenerating(false);
      queryClient.invalidateQueries({ queryKey: ['soapNotes'] });
      toast.success('SOAP note generated with AI');
    },
    onError: (error) => {
      setGenerating(false);
      toast.error(error.message || 'Failed to generate note');
    },
  });

  const signNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      await base44.entities.SOAPNote.update(noteId, {
        status: 'signed',
        signed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soapNotes'] });
      toast.success('Note signed');
      setDialogOpen(false);
      setGeneratedNote(null);
      setVoiceTranscript('');
      setSelectedPatient('');
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // Upload audio file
        toast.loading('Uploading and transcribing audio...');
        try {
          const uploadResponse = await base44.integrations.Core.UploadFile({ file: audioBlob });
          
          // Transcribe audio using AI
          const transcriptResponse = await base44.integrations.Core.InvokeLLM({
            prompt: 'Transcribe this medical audio recording. Return only the transcription text without any additional formatting or labels.',
            file_urls: [uploadResponse.file_url]
          });
          
          setVoiceTranscript(transcriptResponse);
          toast.success('Audio transcribed successfully');
        } catch (error) {
          toast.error('Failed to transcribe audio');
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const handleGenerateNote = () => {
    if (!selectedPatient || !voiceTranscript) {
      toast.error('Please select patient and enter clinical information');
      return;
    }

    setGenerating(true);
    generateNoteMutation.mutate({
      patient_id: selectedPatient,
      voice_transcript: voiceTranscript,
      note_type: noteType
    });
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const statusColors = {
    draft: 'bg-amber-100 text-amber-700',
    finalized: 'bg-blue-100 text-blue-700',
    signed: 'bg-emerald-100 text-emerald-700',
    amended: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">SOAP Notes</h1>
          <p className="text-slate-500 mt-1">AI-powered clinical documentation</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Note with AI
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent SOAP Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : soapNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No SOAP notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {soapNotes.map((note) => (
                <Card key={note.id} className="p-4 border-2">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{getPatientName(note.patient_id)}</h3>
                        <Badge className={statusColors[note.status]}>{note.status}</Badge>
                        {note.ai_generated && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {format(new Date(note.note_date), 'MMM d, yyyy h:mm a')} • {note.provider_email}
                      </p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">S:</span> {note.subjective?.substring(0, 100)}...
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">A:</span> {note.assessment?.substring(0, 100)}...
                        </div>
                        {note.icd10_codes && note.icd10_codes.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {note.icd10_codes.map((code, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{code}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Powered SOAP Note Generator
            </DialogTitle>
          </DialogHeader>
          
          {!generatedNote ? (
            <div className="space-y-4">
              <div>
                <Label>Select Patient *</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} - DOB: {patient.date_of_birth}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Note Type *</Label>
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Consultation</SelectItem>
                    <SelectItem value="follow_up">Follow-up Visit</SelectItem>
                    <SelectItem value="emergency">Emergency/Urgent Care</SelectItem>
                    <SelectItem value="specialist">Specialist Consultation</SelectItem>
                    <SelectItem value="preventive">Preventive Care/Checkup</SelectItem>
                    <SelectItem value="mental_health">Mental Health</SelectItem>
                    <SelectItem value="chronic_disease">Chronic Disease Management</SelectItem>
                    <SelectItem value="procedure">Procedure Note</SelectItem>
                    <SelectItem value="telehealth">Telehealth Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Clinical Transcript / Voice Notes *
                </Label>
                <div className="flex gap-2 mt-2 mb-2">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="flex-1"
                  >
                    <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </Button>
                </div>
                <Textarea
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="Click 'Start Recording' to record audio, or type/paste clinical encounter notes..."
                  rows={10}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Tip: Include symptoms, vitals, exam findings, and treatment plan details
                </p>
              </div>

              <Button 
                onClick={handleGenerateNote}
                disabled={!selectedPatient || !voiceTranscript || generating}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating SOAP Note...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate SOAP Note
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  AI-generated SOAP note ready for review
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="font-semibold text-slate-700">Subjective (S)</Label>
                  <div className="bg-slate-50 rounded-lg p-3 mt-1 text-sm">{generatedNote.subjective}</div>
                </div>

                <div>
                  <Label className="font-semibold text-slate-700">Objective (O)</Label>
                  <div className="bg-slate-50 rounded-lg p-3 mt-1 text-sm">{generatedNote.objective}</div>
                </div>

                <div>
                  <Label className="font-semibold text-slate-700">Assessment (A)</Label>
                  <div className="bg-slate-50 rounded-lg p-3 mt-1 text-sm">{generatedNote.assessment}</div>
                </div>

                <div>
                  <Label className="font-semibold text-slate-700">Plan (P)</Label>
                  <div className="bg-slate-50 rounded-lg p-3 mt-1 text-sm">{generatedNote.plan}</div>
                </div>

                {generatedNote.icd10_codes && generatedNote.icd10_codes.length > 0 && (
                  <div>
                    <Label className="font-semibold text-slate-700">ICD-10 Codes</Label>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {generatedNote.icd10_codes.map((code, i) => (
                        <Badge key={i} variant="outline">{code}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setGeneratedNote(null);
                  setVoiceTranscript('');
                }}>
                  Regenerate
                </Button>
                <Button 
                  onClick={() => signNoteMutation.mutate(generatedNote.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={signNoteMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sign & Save Note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}