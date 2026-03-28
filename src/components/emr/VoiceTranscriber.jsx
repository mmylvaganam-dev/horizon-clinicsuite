import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Mic, MicOff, Square, Sparkles, Loader2, CheckCircle2,
  RotateCcw, Edit3, FileText, AlertTriangle, Clock, Volume2, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Animated waveform bars
function Waveform({ active }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${active ? 'bg-rose-500' : 'bg-slate-300'}`}
          style={{
            height: active ? `${20 + Math.sin((Date.now() / 200) + i) * 12}px` : '6px',
            animation: active ? `wave ${0.6 + i * 0.08}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { height: 6px; }
          to { height: 28px; }
        }
      `}</style>
    </div>
  );
}

const SOAP_SECTIONS = [
  { key: 'subjective', label: 'Subjective', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', description: "Patient's symptoms, complaints, history" },
  { key: 'objective', label: 'Objective', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', description: 'Physical exam, vitals, test results' },
  { key: 'assessment', label: 'Assessment', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', description: 'Diagnosis, clinical impression' },
  { key: 'plan', label: 'Plan', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', description: 'Treatment, medications, follow-up' },
];

export default function VoiceTranscriber({ patientId, patientName, onNoteSaved, compact = false }) {
  const queryClient = useQueryClient();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Generation state
  const [stage, setStage] = useState('idle'); // idle | recording | review | editing | saved
  const [soapData, setSoapData] = useState(null);
  const [editedSoap, setEditedSoap] = useState(null);
  const [noteDate, setNoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setSpeechSupported(supported);
    return () => {
      stopRecording();
      clearInterval(timerRef.current);
    };
  }, []);

  // Keep ref in sync for use inside event handlers
  useEffect(() => {
    transcriptRef.current = finalTranscript;
  }, [finalTranscript]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setIsPaused(false);
      setStage('recording');
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + ' ';
        } else {
          interim += text;
        }
      }
      if (final) {
        setFinalTranscript(prev => prev + final);
        transcriptRef.current += final;
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') toast.error(`Recording error: ${e.error}`);
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
      clearInterval(timerRef.current);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
  }, []);

  const pauseRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsPaused(true);
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    setIsPaused(false);
    startRecording();
  };

  const resetAll = () => {
    stopRecording();
    setFinalTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    setSoapData(null);
    setEditedSoap(null);
    setStage('idle');
    transcriptRef.current = '';
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const transcript = finalTranscript.trim();
      if (!transcript) throw new Error('No transcript to process');
      const response = await base44.functions.invoke('generateSOAPNote', {
        patient_id: patientId,
        voice_transcript: transcript,
        note_date: noteDate,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const soap = data?.soapNote || data;
      setSoapData(soap);
      setEditedSoap({
        subjective: soap.subjective || '',
        objective: soap.objective || '',
        assessment: soap.assessment || '',
        plan: soap.plan || '',
        icd10_codes: soap.icd10_codes || [],
      });
      setStage('review');
    },
    onError: (e) => toast.error(e.message || 'Failed to generate SOAP note'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!soapData?.id) throw new Error('No note to save');
      await base44.entities.SOAPNote.update(soapData.id, {
        subjective: editedSoap.subjective,
        objective: editedSoap.objective,
        assessment: editedSoap.assessment,
        plan: editedSoap.plan,
        icd10_codes: editedSoap.icd10_codes,
        status: 'draft',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientSOAP', patientId] });
      setStage('saved');
      toast.success('SOAP note saved to EMR');
      onNoteSaved?.();
    },
    onError: () => toast.error('Failed to save note'),
  });

  // ── IDLE / START ──────────────────────────────────────────────────────────
  if (stage === 'idle') {
    return (
      <div className={`space-y-4 ${compact ? '' : 'max-w-2xl mx-auto'}`}>
        {!compact && (
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Voice-to-SOAP Transcriber</h2>
            <p className="text-slate-500 text-sm">Speak naturally during the consultation — AI will structure it into a complete SOAP note</p>
          </div>
        )}

        {patientName && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 rounded-xl border border-teal-200">
            <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span className="text-sm font-medium text-teal-800">Patient: <span className="font-bold">{patientName}</span></span>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <Label className="text-sm text-amber-800 font-medium whitespace-nowrap">Consultation date:</Label>
          <Input
            type="date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="h-8 text-sm border-amber-300 bg-white max-w-[160px]"
          />
          {noteDate !== format(new Date(), 'yyyy-MM-dd') && (
            <Badge className="bg-amber-200 text-amber-800 text-xs">Backdated</Badge>
          )}
        </div>

        {!speechSupported && (
          <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-xl border border-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-800 text-sm">Voice input not supported</p>
              <p className="text-xs text-rose-600 mt-0.5">Use Chrome or Edge. You can still type directly below.</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={startRecording}
            disabled={!speechSupported}
            className="w-full h-14 text-base bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Recording Consultation
          </Button>
          <p className="text-xs text-center text-slate-400">Or type / paste the consultation notes manually below</p>
          <Textarea
            placeholder="Paste or type consultation notes here..."
            rows={4}
            value={finalTranscript}
            onChange={(e) => setFinalTranscript(e.target.value)}
            className="text-sm"
          />
          {finalTranscript.trim() && (
            <Button
              onClick={() => { stopRecording(); generateMutation.mutate(); }}
              disabled={generateMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate SOAP Note
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── RECORDING ─────────────────────────────────────────────────────────────
  if (stage === 'recording') {
    return (
      <div className="space-y-5">
        {/* Status bar */}
        <div className="flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-200">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-semibold text-rose-700">{isPaused ? 'Paused' : 'Recording'}</span>
            <span className="font-mono text-sm text-rose-600">{formatTime(recordingTime)}</span>
          </div>
          <Waveform active={isRecording && !isPaused} />
        </div>

        {patientName && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>Recording for: <strong>{patientName}</strong></span>
          </div>
        )}

        {/* Live transcript */}
        <div className="min-h-[200px] max-h-[320px] overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> Live Transcript
          </p>
          {!finalTranscript && !interimTranscript && (
            <p className="text-slate-400 text-sm italic">
              {isRecording ? 'Listening… speak now' : 'Start speaking or resume recording'}
            </p>
          )}
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {finalTranscript}
            {interimTranscript && (
              <span className="text-slate-400 italic">{interimTranscript}</span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-2">
          {isPaused ? (
            <Button onClick={resumeRecording} className="bg-rose-500 hover:bg-rose-600">
              <Mic className="w-4 h-4 mr-1" /> Resume
            </Button>
          ) : (
            <Button onClick={pauseRecording} variant="outline">
              <MicOff className="w-4 h-4 mr-1" /> Pause
            </Button>
          )}
          <Button
            onClick={() => { stopRecording(); setStage('review-transcript'); }}
            variant="outline"
            className="border-slate-300"
          >
            <Square className="w-4 h-4 mr-1" /> Stop
          </Button>
          <Button
            onClick={() => { stopRecording(); generateMutation.mutate(); }}
            disabled={!finalTranscript.trim() || generateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            Generate
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={resetAll} className="w-full text-slate-400 text-xs">
          <RotateCcw className="w-3 h-3 mr-1" /> Discard & Start Over
        </Button>
      </div>
    );
  }

  // ── REVIEW TRANSCRIPT BEFORE GENERATING ───────────────────────────────────
  if (stage === 'review-transcript') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Review Transcript</h3>
          <Badge className="bg-slate-100 text-slate-600">{formatTime(recordingTime)} recorded</Badge>
        </div>
        <p className="text-sm text-slate-500">Review and edit the transcript before generating the SOAP note.</p>
        <Textarea
          value={finalTranscript}
          onChange={(e) => setFinalTranscript(e.target.value)}
          rows={10}
          className="text-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetAll} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-1" /> Start Over
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!finalTranscript.trim() || generateMutation.isPending}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate SOAP Note</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── REVIEW SOAP ───────────────────────────────────────────────────────────
  if (stage === 'review' && editedSoap) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              AI-Generated SOAP Note
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Review and edit before filing to EMR</p>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-purple-100 text-purple-700">AI Draft</Badge>
            <Button size="sm" variant="ghost" onClick={resetAll} className="text-xs text-slate-400">
              <RotateCcw className="w-3 h-3 mr-1" /> Restart
            </Button>
          </div>
        </div>

        {SOAP_SECTIONS.map(({ key, label, color, bg, border, description }) => (
          <div key={key} className={`rounded-xl border ${border} ${bg} overflow-hidden`}>
            <div className={`px-4 py-2 border-b ${border} flex items-center justify-between`}>
              <div>
                <span className={`font-bold text-sm ${color}`}>{label}</span>
                <span className="text-xs text-slate-500 ml-2">{description}</span>
              </div>
              <Edit3 className="w-3 h-3 text-slate-400" />
            </div>
            <Textarea
              value={editedSoap[key]}
              onChange={(e) => setEditedSoap(prev => ({ ...prev, [key]: e.target.value }))}
              className={`border-0 bg-transparent text-sm text-slate-800 min-h-[80px] focus-visible:ring-0 resize-none`}
              placeholder={`Enter ${label.toLowerCase()} details…`}
            />
          </div>
        ))}

        {/* ICD-10 */}
        {editedSoap.icd10_codes?.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">ICD-10 Codes</p>
            <div className="flex flex-wrap gap-1.5">
              {editedSoap.icd10_codes.map((code, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono">{code}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => setStage('review-transcript')} className="flex-1">
            <Edit3 className="w-4 h-4 mr-1" /> Edit Transcript
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> File to EMR</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── SAVED ─────────────────────────────────────────────────────────────────
  if (stage === 'saved') {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">SOAP Note Saved</h3>
          <p className="text-sm text-slate-500 mt-1">Filed as draft — ready for physician review & signing</p>
        </div>
        <Button onClick={resetAll} variant="outline">
          <Mic className="w-4 h-4 mr-2" /> Record Another Consultation
        </Button>
      </div>
    );
  }

  return null;
}