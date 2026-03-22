import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESCRIPTION_CATEGORIES = ['PRESCRIPTION', 'MED_SUMMARY'];
const LAB_CATEGORIES = ['LAB'];

export default function UploadDocument({ patientId, defaultCategory, onSuccess }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    doc_category: defaultCategory || 'OTHER',
    doc_title: '',
    doc_date: new Date().toISOString().split('T')[0],
    source: 'clinic_scan',
    notes: ''
  });
  const [file, setFile] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      try {
        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
        
        // Determine doc type
        const docType = data.file.type.includes('pdf') ? 'PDF' : 'IMAGE';
        
        // Create document record
        const doc = await base44.entities.PatientDocument.create({
          organization_id: '',
          location_id: '',
          patient_ref: patientId,
          doc_category: data.doc_category,
          doc_type: docType,
          doc_title: data.doc_title,
          doc_date: data.doc_date,
          source: data.source,
          uploaded_by: user.id,
          uploaded_by_email: user.email,
          file_ref: file_url,
          notes: data.notes,
          visibility: 'internal',
          status: 'active'
        });

        // Audit log
        await base44.entities.AuditLog.create({
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_email: user.email,
          organization_id: '',
          location_id: '',
          patient_id: patientId,
          module: 'EMR_UPLOAD',
          action: 'create',
          record_type: 'PatientDocument',
          record_id: doc.id,
          metadata: { doc_category: data.doc_category, doc_title: data.doc_title }
        });

        // Auto-extract medications from prescription/med summary documents
        if (PRESCRIPTION_CATEGORIES.includes(data.doc_category)) {
          try {
            const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
              file_url: file_url,
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
              toast.success(`Extracted ${extracted.output.medications.length} medication(s) — check med suggestions`);
            }
          } catch (_) { /* non-critical, doc is already saved */ }
        }

        // Auto-extract lab results from lab documents  
        if (LAB_CATEGORIES.includes(data.doc_category) && docType === 'PDF') {
          try {
            await base44.functions.invoke('extractLabFromPDF', {
              file_url: file_url,
              patient_id: patientId
            });
            toast.success('Lab results extracted from PDF');
          } catch (_) { /* non-critical */ }
        }

        return doc;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
      toast.success('Document uploaded successfully');
      setOpen(false);
      setFile(null);
      setFormData({
        doc_category: defaultCategory || 'OTHER',
        doc_title: '',
        doc_date: new Date().toISOString().split('T')[0],
        source: 'clinic_scan',
        notes: ''
      });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Upload failed');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    if (!formData.doc_title) {
      toast.error('Please enter document title');
      return;
    }
    uploadMutation.mutate({ ...formData, file });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4 mr-2" />
        Upload Document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Category *</Label>
              <Select value={formData.doc_category} onValueChange={(v) => setFormData({...formData, doc_category: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAB">Laboratory</SelectItem>
                  <SelectItem value="TEST">Diagnostic Test</SelectItem>
                  <SelectItem value="IMAGING">Diagnostic Imaging</SelectItem>
                  <SelectItem value="CONSULT_NOTE">Consult Note</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Title *</Label>
              <Input 
                value={formData.doc_title} 
                onChange={(e) => setFormData({...formData, doc_title: e.target.value})}
                placeholder="e.g., CBC Report, Chest X-ray"
              />
            </div>
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
            <div>
              <Label>File * (PDF or Image)</Label>
              <Input 
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files[0])}
              />
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading || uploadMutation.isPending}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}