/**
 * Reusable AI input panel for any EMR section.
 * Supports: type/paste text, voice dictation, upload PDF/image.
 * On submit calls onResult(extractedText, fileUrl?) so the parent section
 * can call the AI or save directly.
 */
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Upload, FileText, Sparkles, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function SectionAIInput({ label = 'AI Input', onGenerate, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('text'); // 'text' | 'upload'
  const [text, setText] = useState('');
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recognizer, setRecognizer] = useState(null);
  const fileRef = useRef(null);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported in this browser'); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onstart = () => { setRecording(true); toast.success('Listening…'); };
    rec.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setText(prev => prev + final);
    };
    rec.onerror = () => { setRecording(false); toast.error('Recording error'); };
    rec.onend = () => setRecording(false);
    rec.start();
    setRecognizer(rec);
  };

  const stopRecording = () => {
    recognizer?.stop();
    setRecording(false);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(res.file_url);
      toast.success('File ready');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'text' && !text.trim()) { toast.error('Please enter some text'); return; }
    if (mode === 'upload' && !fileUrl) { toast.error('Please upload a file'); return; }
    onGenerate({ text: text.trim(), fileUrl, mode });
    setOpen(false);
    setText('');
    setFileUrl(null);
    setFileName('');
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 text-purple-700 border-purple-300 hover:bg-purple-50"
        disabled={disabled}
      >
        <Sparkles className="w-4 h-4" />
        {label}
      </Button>
    );
  }

  return (
    <div className="border border-purple-200 bg-purple-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {label}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === 'text' ? 'default' : 'outline'}
          onClick={() => setMode('text')}
          className={mode === 'text' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <Mic className="w-3.5 h-3.5 mr-1" /> Type / Dictate
        </Button>
        <Button
          size="sm"
          variant={mode === 'upload' ? 'default' : 'outline'}
          onClick={() => setMode('upload')}
          className={mode === 'upload' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <Upload className="w-3.5 h-3.5 mr-1" /> Upload PDF/Image
        </Button>
      </div>

      {mode === 'text' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={recording ? 'destructive' : 'outline'}
              onClick={recording ? stopRecording : startRecording}
              className="gap-2"
            >
              {recording ? <MicOff className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
              {recording ? 'Stop' : 'Record Voice'}
            </Button>
            {recording && <span className="text-xs text-red-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" /> Listening…</span>}
          </div>
          <Textarea
            rows={4}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={placeholder || 'Type or dictate clinical notes here…'}
            className="bg-white text-sm"
          />
        </div>
      )}

      {mode === 'upload' && (
        <div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          {fileUrl ? (
            <div className="flex items-center gap-2 p-3 bg-white border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
              <Button size="sm" variant="ghost" onClick={() => { setFileUrl(null); setFileName(''); }} className="ml-auto h-6 px-2">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center cursor-pointer hover:bg-white transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                  <p className="text-sm text-slate-600">Click to upload PDF or image</p>
                  <p className="text-xs text-slate-400 mt-1">AI will extract the content automatically</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={disabled || uploading || (mode === 'text' && !text.trim()) || (mode === 'upload' && !fileUrl)}
        className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
        size="sm"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {disabled ? 'Processing…' : 'Process with AI'}
      </Button>
    </div>
  );
}