import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, Sparkles, FileText, Image, Loader2, CheckCircle2, XCircle,
  FlaskConical, Pill, Stethoscope, ClipboardList, Eye, Camera, Trash2, AlertCircle, Cloud
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import GoogleDrivePickerDialog from './GoogleDrivePickerDialog';

const DOC_CATEGORIES = [
  { value: 'LAB', label: 'Lab Report', icon: FlaskConical, color: 'bg-blue-100 text-blue-700', aiAction: 'extract lab results and update patient lab records' },
  { value: 'PRESCRIPTION', label: 'Prescription', icon: Pill, color: 'bg-green-100 text-green-700', aiAction: 'extract medication names, doses, frequencies and routes' },
  { value: 'MED_SUMMARY', label: 'Medication Summary', icon: Pill, color: 'bg-emerald-100 text-emerald-700', aiAction: 'extract all current medications with doses and instructions' },
  { value: 'CONSULT_NOTE', label: 'Consult Note', icon: Stethoscope, color: 'bg-purple-100 text-purple-700', aiAction: 'extract specialist findings, diagnosis, recommendations and follow-up plan' },
  { value: 'IMAGING', label: 'Imaging / X-Ray', icon: Image, color: 'bg-orange-100 text-orange-700', aiAction: 'extract imaging findings, impressions and radiologist conclusions' },
  { value: 'TEST', label: 'Diagnostic Test', icon: ClipboardList, color: 'bg-yellow-100 text-yellow-700', aiAction: 'extract test results, normal ranges and clinical interpretation' },
  { value: 'OTHER', label: 'Other Document', icon: FileText, color: 'bg-slate-100 text-slate-700', aiAction: 'summarize the document and extract clinically relevant information' },
];

export default function PatientDocumentHub({ patientId, patientName }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [files, setFiles] = useState([]); // array of File objects
  const [fileStatuses, setFileStatuses] = useState({}); // { fileName: 'pending'|'uploading'|'done'|'error' }
  const [allDone, setAllDone] = useState(false);
  const [formData, setFormData] = useState({
    doc_category: 'LAB',
    doc_title: '',
    doc_date: new Date().toISOString().split('T')[0],
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['patientDocuments', patientId],
    queryFn: () => base44.entities.PatientDocument.filter({ patient_ref: patientId }, '-doc_date'),
    enabled: !!patientId,
  });

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const newOnes = selected.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...newOnes];
    });
    // Reset input so same files can be re-added after removal
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processSingleFile = async (file, titleOverride, catInfo) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const isImage = file.type.startsWith('image/');

    let aiSummary = null;
    let aiExtracted = null;
    try {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical AI assistant. Analyze this medical document and ${catInfo?.aiAction || 'summarize key clinical information'}.

Document category: ${catInfo?.label}
Patient: ${patientName}

Please provide:
1. A brief clinical summary (2-3 sentences)
2. Key findings or data points extracted
3. Any action items or follow-up needed

For labs: extract test name, value, unit, reference range, and flag if abnormal.
For medications: extract drug name, dose, frequency, route, duration.
For consult notes: extract diagnosis, recommendations, follow-up date.
For imaging: extract findings, impression, recommendations.

Be concise and clinically accurate.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_findings: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            medications: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, dose: { type: 'string' }, frequency: { type: 'string' }, route: { type: 'string' }, duration: { type: 'string' } } } },
            lab_results: { type: 'array', items: { type: 'object', properties: { test: { type: 'string' }, value: { type: 'string' }, unit: { type: 'string' }, reference_range: { type: 'string' }, is_abnormal: { type: 'boolean' } } } },
            document_date: { type: 'string' },
            ordering_provider: { type: 'string' }
          }
        }
      });
      aiExtracted = aiResponse;
      aiSummary = aiResponse?.summary || null;
    } catch (err) {
      console.error('AI extraction failed (non-critical):', err);
    }

    const doc = await base44.entities.PatientDocument.create({
      patient_ref: patientId,
      doc_category: formData.doc_category,
      doc_type: isImage ? 'IMAGE' : 'PDF',
      doc_title: titleOverride || file.name,
      doc_date: formData.doc_date,
      source: 'clinic_scan',
      uploaded_by: user?.id,
      uploaded_by_email: user?.email,
      file_ref: file_url,
      ai_summary: aiSummary,
      ai_extracted_json: aiExtracted,
      visibility: 'internal',
      status: 'active'
    });

    if (['PRESCRIPTION', 'MED_SUMMARY'].includes(formData.doc_category) && aiExtracted?.medications?.length > 0) {
      await base44.entities.MedReconSuggestion.create({
        patient_ref: patientId,
        source_type: 'DocumentUpload',
        source_id: doc.id,
        suggested_meds_json: { add_medications: aiExtracted.medications },
        status: 'pending'
      });
    }

    if (formData.doc_category === 'LAB') {
      try { await base44.functions.invoke('extractLabFromPDF', { file_url, patient_id: patientId }); } catch (_) {}
    }

    return doc;
  };

  const [uploading, setUploading] = useState(false);

  const handleUploadAll = async () => {
    if (!files.length) { toast.error('No files selected'); return; }
    if (files.length === 1 && !formData.doc_title) { toast.error('Please enter a document title'); return; }

    setUploading(true);
    const catInfo = DOC_CATEGORIES.find(c => c.value === formData.doc_category);
    const initial = {};
    files.forEach(f => { initial[f.name + f.size] = 'pending'; });
    setFileStatuses(initial);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const key = f.name + f.size;
      const titleOverride = files.length === 1 ? formData.doc_title : (formData.doc_title ? `${formData.doc_title} (${i + 1})` : f.name.replace(/\.[^.]+$/, ''));
      setFileStatuses(prev => ({ ...prev, [key]: 'uploading' }));
      try {
        await processSingleFile(f, titleOverride, catInfo);
        setFileStatuses(prev => ({ ...prev, [key]: 'done' }));
      } catch (err) {
        setFileStatuses(prev => ({ ...prev, [key]: 'error' }));
        console.error('Failed to process file:', f.name, err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
    queryClient.invalidateQueries({ queryKey: ['medReconSuggestions', patientId] });
    toast.success(`${files.length} document(s) uploaded & analyzed ✨`);
    setUploading(false);
    setAllDone(true);
  };

  const resetForm = () => {
    setFiles([]);
    setFileStatuses({});
    setAllDone(false);
    setFormData({ doc_category: 'LAB', doc_title: '', doc_date: new Date().toISOString().split('T')[0] });
  };

  const getCatInfo = (val) => DOC_CATEGORIES.find(c => c.value === val);

  const handleDriveImport = async ({ file_url, file_name, mime_type }) => {
    const isImage = mime_type?.startsWith('image/');
    const catInfo = DOC_CATEGORIES.find(c => c.value === 'OTHER');

    let aiSummary = null;
    let aiExtracted = null;
    try {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical AI assistant. Analyze this medical document and summarize key clinical information.
Patient: ${patientName}
Please provide: 1. A brief clinical summary. 2. Key findings. 3. Any action items.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_findings: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      aiExtracted = aiResponse;
      aiSummary = aiResponse?.summary || null;
    } catch (_) {}

    await base44.entities.PatientDocument.create({
      patient_ref: patientId,
      doc_category: 'OTHER',
      doc_type: isImage ? 'IMAGE' : 'PDF',
      doc_title: file_name,
      doc_date: new Date().toISOString().split('T')[0],
      source: 'google_drive',
      uploaded_by: user?.id,
      uploaded_by_email: user?.email,
      file_ref: file_url,
      ai_summary: aiSummary,
      ai_extracted_json: aiExtracted,
      visibility: 'internal',
      status: 'active'
    });

    queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
    setDriveOpen(false);
  };

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.PatientDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const handleDelete = (doc) => {
    if (!window.confirm(`Delete "${doc.doc_title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(doc.id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-900">AI Document Hub</h3>
          <Badge variant="outline" className="text-xs text-teal-600 border-teal-200">PDF & Photo</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setDriveOpen(true)}>
            <Cloud className="w-4 h-4 mr-2" />
            Google Drive
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => { resetForm(); setUploadOpen(true); }}>
            <Upload className="w-4 h-4 mr-2" />
            Upload & Analyze
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
          <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No documents yet</p>
          <p className="text-sm text-slate-400 mt-1">Upload lab reports, prescriptions, consult notes, or photos — AI will analyze and update records automatically</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const cat = getCatInfo(doc.doc_category);
            const CatIcon = cat?.icon || FileText;
            return (
              <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat?.color || 'bg-slate-100 text-slate-600'}`}>
                  <CatIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900 text-sm truncate">{doc.doc_title}</p>
                    <Badge variant="outline" className="text-xs">{cat?.label || doc.doc_category}</Badge>
                    {doc.doc_type === 'IMAGE' && <Badge variant="outline" className="text-xs text-orange-600 border-orange-200"><Camera className="w-3 h-3 mr-1" />Photo</Badge>}
                    {doc.ai_summary && <Badge className="text-xs bg-teal-50 text-teal-700 border border-teal-200"><Sparkles className="w-3 h-3 mr-1" />AI Analyzed</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{(() => { try { const d = new Date(doc.doc_date || doc.created_date); return isNaN(d) ? '' : format(d, 'MMM d, yyyy'); } catch { return ''; } })()}</p>
                  {doc.ai_summary && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.ai_summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(doc)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              Upload & AI Analyze Document
            </DialogTitle>
          </DialogHeader>

          {allDone ? (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                  <span className="font-semibold text-teal-800">Upload Complete</span>
                </div>
                <div className="space-y-2">
                  {files.map((f, i) => {
                    const key = f.name + f.size;
                    const status = fileStatuses[key];
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {status === 'done' ? <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        <span className={status === 'error' ? 'text-red-600' : 'text-slate-700'}>{f.name}</span>
                        {status === 'error' && <span className="text-xs text-red-400">— failed</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button className="w-full" onClick={() => { setUploadOpen(false); resetForm(); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Document Type</Label>
                <Select value={formData.doc_category} onValueChange={v => setFormData({ ...formData, doc_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{files.length > 1 ? 'Title Prefix (optional)' : 'Document Title *'}</Label>
                <Input
                  value={formData.doc_title}
                  onChange={e => setFormData({ ...formData, doc_title: e.target.value })}
                  placeholder={files.length > 1 ? 'e.g., "CBC Report" → auto-numbered per file' : 'e.g., CBC Report, Chest X-ray, Dr. Silva Consult'}
                />
                {files.length > 1 && <p className="text-xs text-slate-400 mt-1">Leave blank to use each file's filename as the title.</p>}
              </div>

              <div>
                <Label>Document Date</Label>
                <Input type="date" value={formData.doc_date} onChange={e => setFormData({ ...formData, doc_date: e.target.value })} />
              </div>

              {/* Multi-file area */}
              <div>
                <Label>Files (PDF or Photos) *</Label>
                <div
                  className="mt-1 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {files.length === 0 ? (
                    <div className="text-slate-400">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-medium">Click to select files</p>
                      <p className="text-xs mt-1">PDF, JPG, PNG, HEIC — multiple files supported</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-left">
                      {files.map((f, i) => {
                        const key = f.name + f.size;
                        const status = fileStatuses[key];
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2">
                            {f.type.startsWith('image/') ? <Image className="w-4 h-4 text-orange-500 flex-shrink-0" /> : <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />}
                            <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
                            <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                            {status === 'uploading' && <Loader2 className="w-4 h-4 text-teal-500 animate-spin flex-shrink-0" />}
                            {status === 'done' && <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                            {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                            {!status && (
                              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400">
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      <p className="text-xs text-teal-600 pt-1 text-center">+ Click to add more files</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <input ref={fileInputRef} type="file" accept=".pdf,image/*" multiple className="hidden" onChange={handleFileChange} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Add Files
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" />Take Photo
                  </Button>
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-xs text-teal-800">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  <strong>AI will automatically:</strong> analyze each file, extract key data, update lab records, and add medication suggestions. Files are processed one by one.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  disabled={files.length === 0 || (files.length === 1 && !formData.doc_title) || uploading}
                  onClick={handleUploadAll}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing {files.length} file{files.length > 1 ? 's' : ''}...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Upload & Analyze {files.length > 1 ? `${files.length} Files` : ''}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Google Drive Picker */}
      <GoogleDrivePickerDialog
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        onImport={handleDriveImport}
      />

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDoc?.doc_title}</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{getCatInfo(viewDoc.doc_category)?.label}</Badge>
                <Badge variant="outline">{(() => { try { const d = new Date(viewDoc.doc_date || viewDoc.created_date); return isNaN(d) ? '' : format(d, 'MMM d, yyyy'); } catch { return ''; } })()}</Badge>
                {viewDoc.doc_type === 'IMAGE' && <Badge variant="outline" className="text-orange-600"><Camera className="w-3 h-3 mr-1" />Photo</Badge>}
              </div>

              {viewDoc.file_ref && (
                viewDoc.doc_type === 'IMAGE' ? (
                  <img src={viewDoc.file_ref} alt={viewDoc.doc_title} className="w-full rounded-lg object-contain max-h-80" />
                ) : (
                  <a href={viewDoc.file_ref} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-2" />Open PDF</Button>
                  </a>
                )
              )}

              {viewDoc.ai_summary && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-teal-800 text-sm">AI Summary</span>
                  </div>
                  <p className="text-sm text-teal-900">{viewDoc.ai_summary}</p>
                </div>
              )}

              {viewDoc.ai_extracted_json?.key_findings?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Key Findings</p>
                  <ul className="space-y-1">
                    {viewDoc.ai_extracted_json.key_findings.map((f, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2"><span className="text-teal-500">•</span>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {viewDoc.ai_extracted_json?.lab_results?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Lab Results</p>
                  {viewDoc.ai_extracted_json.lab_results.map((lr, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs p-2 rounded mb-1 ${lr.is_abnormal ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                      <span className="font-medium">{lr.test}</span>
                      <span className={lr.is_abnormal ? 'text-red-600 font-bold' : ''}>{lr.value} {lr.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              {viewDoc.ai_extracted_json?.action_items?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Action Items</p>
                  {viewDoc.ai_extracted_json.action_items.map((a, i) => (
                    <p key={i} className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1 mb-1">⚠️ {a}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}