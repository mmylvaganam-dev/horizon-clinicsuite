import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, FileText, Image, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESCRIPTION_CATEGORIES = ['PRESCRIPTION', 'MED_SUMMARY'];
const LAB_CATEGORIES = ['LAB'];

export default function UploadDocument({ patientId, defaultCategory, onSuccess }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({}); // { fileName: 'uploading' | 'done' | 'error' }
  const [formData, setFormData] = useState({
    doc_category: defaultCategory || 'OTHER',
    doc_title: '',
    doc_date: new Date().toISOString().split('T')[0],
    source: 'clinic_scan',
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => {
      const existing = prev.map(f => f.name);
      const newFiles = selected.filter(f => !existing.includes(f.name));
      return [...prev, ...newFiles];
    });
    e.target.value = ''; // reset so same file can be re-added after removal
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setFileStatuses(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const uploadSingleFile = async (file) => {
    setFileStatuses(prev => ({ ...prev, [file.name]: 'uploading' }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const docType = file.type.includes('pdf') ? 'PDF' : 'IMAGE';

      // Use provided title for single file; for multiple, use filename
      const titleToUse = files.length === 1 && formData.doc_title
        ? formData.doc_title
        : file.name.replace(/\.[^/.]+$/, '');

      const doc = await base44.entities.PatientDocument.create({
        organization_id: '',
        location_id: '',
        patient_ref: patientId,
        doc_category: formData.doc_category,
        doc_type: docType,
        doc_title: titleToUse,
        doc_date: formData.doc_date,
        source: formData.source,
        uploaded_by: user.id,
        uploaded_by_email: user.email,
        file_ref: file_url,
        notes: formData.notes,
        visibility: 'internal',
        status: 'active'
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: patientId,
        module: 'EMR_UPLOAD',
        action: 'create',
        action_type: 'create',
        entity_type: 'PatientDocument',
        record_type: 'PatientDocument',
        record_id: doc.id,
        metadata: { doc_category: formData.doc_category, doc_title: titleToUse }
      });

      // Auto-extract medications
      if (PRESCRIPTION_CATEGORIES.includes(formData.doc_category)) {
        try {
          const { data: extracted } = await base44.functions.invoke('extractDataOpenAI', {
            file_url,
            json_schema: {
              type: 'object',
              properties: {
                medications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      dose: { type: 'string' },
                      frequency: { type: 'string' },
                      route: { type: 'string' },
                      duration: { type: 'string' }
                    }
                  }
                }
              }
            }
          });
          if (extracted.status === 'success' && extracted.output?.medications?.length > 0) {
            await base44.entities.MedReconSuggestion.create({
              patient_ref: patientId,
              source_type: 'DocumentUpload',
              source_id: doc.id,
              suggested_meds_json: { add_medications: extracted.output.medications },
              status: 'pending'
            });
          }
        } catch (_) { /* non-critical */ }
      }

      // Auto-extract lab results
      if (LAB_CATEGORIES.includes(formData.doc_category) && docType === 'PDF') {
        try {
          await base44.functions.invoke('extractLabFromPDF', { file_url, patient_id: patientId });
        } catch (_) { /* non-critical */ }
      }

      setFileStatuses(prev => ({ ...prev, [file.name]: 'done' }));
      return doc;
    } catch (err) {
      setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    if (files.length === 1 && !formData.doc_title) {
      toast.error('Please enter a document title');
      return;
    }
    setUploading(true);
    try {
      const results = await Promise.allSettled(files.map(uploadSingleFile));
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });

      if (failed === 0) {
        toast.success(`${succeeded} document${succeeded > 1 ? 's' : ''} uploaded successfully`);
        handleClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(`${failed} file(s) failed — ${succeeded} uploaded successfully`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFiles([]);
    setFileStatuses({});
    setFormData({
      doc_category: defaultCategory || 'OTHER',
      doc_title: '',
      doc_date: new Date().toISOString().split('T')[0],
      source: 'clinic_scan',
      notes: ''
    });
  };

  const getFileIcon = (file) => {
    return file.type.includes('pdf') ? <FileText className="w-4 h-4 text-red-500" /> : <Image className="w-4 h-4 text-blue-500" />;
  };

  const getStatusIcon = (name) => {
    const s = fileStatuses[name];
    if (s === 'uploading') return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    if (s === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === 'error') return <X className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4 mr-2" />
        Upload Document
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v && !uploading) handleClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document(s)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Category *</Label>
              <Select value={formData.doc_category} onValueChange={(v) => setFormData({...formData, doc_category: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAB">Laboratory (AI extracts results)</SelectItem>
                  <SelectItem value="PRESCRIPTION">Prescription (AI extracts meds ✨)</SelectItem>
                  <SelectItem value="MED_SUMMARY">Medication Summary (AI extracts meds ✨)</SelectItem>
                  <SelectItem value="TEST">Diagnostic Test</SelectItem>
                  <SelectItem value="IMAGING">Diagnostic Imaging</SelectItem>
                  <SelectItem value="CONSULT_NOTE">Consult Note</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title only required for single file */}
            <div>
              <Label>Document Title {files.length <= 1 ? '*' : <span className="text-slate-400 font-normal">(optional — filenames used for multiple)</span>}</Label>
              <Input
                value={formData.doc_title}
                onChange={(e) => setFormData({...formData, doc_title: e.target.value})}
                placeholder="e.g., CBC Report, Chest X-ray"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Document Date *</Label>
                <Input
                  type="date"
                  value={formData.doc_date}
                  onChange={(e) => setFormData({...formData, doc_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic_scan">Clinic Scan</SelectItem>
                    <SelectItem value="patient_brought">Patient Brought</SelectItem>
                    <SelectItem value="external">External Provider</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-file picker */}
            <div>
              <Label>Files * (PDF or Images)</Label>
              <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-500">Click to add files (PDF, JPG, PNG…)</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>

              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map(f => (
                    <li key={f.name} className="flex items-center gap-2 text-sm bg-slate-50 rounded px-3 py-1.5">
                      {getFileIcon(f)}
                      <span className="flex-1 truncate text-slate-700">{f.name}</span>
                      <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                      {getStatusIcon(f.name)}
                      {!uploading && !fileStatuses[f.name] && (
                        <button type="button" onClick={() => removeFile(f.name)}>
                          <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
                placeholder="Optional clinical notes"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>Cancel</Button>
              <Button type="submit" disabled={uploading || files.length === 0}>
                {uploading
                  ? `Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`
                  : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}