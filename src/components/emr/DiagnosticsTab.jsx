import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, TestTube, Scan, ExternalLink, Activity, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import UploadDocument from './UploadDocument';
import SectionAIInput from './SectionAIInput';
import LabOrderBuilder from './LabOrderBuilder';

export default function DiagnosticsTab({ patientId, patient }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [showLabOrderBuilder, setShowLabOrderBuilder] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['patientDocuments', patientId],
    queryFn: () => base44.entities.PatientDocument.filter({ patient_ref: patientId, status: 'active' }),
    enabled: !!patientId
  });

  const labDocs = documents.filter(d => d.doc_category === 'LAB');
  const testDocs = documents.filter(d => d.doc_category === 'TEST');
  const imagingDocs = documents.filter(d => d.doc_category === 'IMAGING');

  // For Lab: upload is one-to-one (each uploaded file = one doc record). 
  // AI handler: extract title/notes from voice or image/PDF and auto-create a document record.
  const handleDocAI = async ({ text, fileUrl }, category) => {
    setAiLoading(true);
    try {
      const catLabel = category === 'LAB' ? 'laboratory report' : category === 'TEST' ? 'diagnostic test result' : 'imaging study report';
      const prompt = `Extract key details from this ${catLabel}. Return JSON: { doc_title, notes, doc_date (YYYY-MM-DD, today if unknown) }
Text: ${text || '(see uploaded file)'}`;
      const { data: res } = await base44.functions.invoke('invokeAI', {
        prompt,
        file_url: fileUrl || null,
        response_json_schema: {
          type: 'object',
          properties: {
            doc_title: { type: 'string' },
            notes: { type: 'string' },
            doc_date: { type: 'string' },
          }
        }
      });

      const today = new Date().toISOString().split('T')[0];
      await base44.entities.PatientDocument.create({
        organization_id: '',
        location_id: '',
        patient_ref: patientId,
        doc_category: category,
        doc_type: fileUrl ? 'PDF' : 'IMAGE',
        doc_title: res.doc_title || `${catLabel} (AI imported)`,
        doc_date: res.doc_date || today,
        source: 'patient_brought',
        uploaded_by: user?.id || '',
        uploaded_by_email: user?.email || '',
        file_ref: fileUrl || '',
        notes: res.notes || (text ? text.substring(0, 300) : ''),
        visibility: 'internal',
        status: 'active'
      });

      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
      toast.success('Document saved from AI input');
    } catch {
      toast.error('AI extraction failed');
    } finally {
      setAiLoading(false);
    }
  };

  const renderDocumentCard = (doc) => (
    <Card key={doc.id} className="p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {doc.doc_type}
            </Badge>
            <Badge variant="outline">{doc.source}</Badge>
          </div>
          <h4 className="font-semibold text-slate-900">{doc.doc_title}</h4>
          <p className="text-sm text-slate-500">
            {format(new Date(doc.doc_date), 'MMM d, yyyy')} • Uploaded by {doc.uploaded_by_email}
          </p>
          {doc.notes && <p className="text-sm text-slate-600 mt-2">{doc.notes}</p>}
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => window.open(doc.file_ref, '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {showLabOrderBuilder && (
        <LabOrderBuilder
          patientId={patientId}
          patient={patient}
          onClose={() => setShowLabOrderBuilder(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['labOrders'] })}
        />
      )}
      <Tabs defaultValue="lab" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lab">
            <TestTube className="w-4 h-4 mr-2" />
            Laboratory ({labDocs.length})
          </TabsTrigger>
          <TabsTrigger value="tests">
            <Activity className="w-4 h-4 mr-2" />
            Tests ({testDocs.length})
          </TabsTrigger>
          <TabsTrigger value="imaging">
            <Scan className="w-4 h-4 mr-2" />
            Imaging ({imagingDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab" className="space-y-3">
          <div className="flex justify-end gap-2 flex-wrap">
            <Button
              onClick={() => setShowLabOrderBuilder(true)}
              className="bg-teal-600 hover:bg-teal-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Request Labs
            </Button>
            <SectionAIInput
              label="AI: Add from Voice/Upload"
              placeholder="Paste lab report text or dictate findings — AI extracts title, date, notes. For multi-page reports, upload one page at a time."
              onGenerate={(args) => handleDocAI(args, 'LAB')}
              disabled={aiLoading}
            />
            <UploadDocument patientId={patientId} defaultCategory="LAB" />
          </div>
          {labDocs.length === 0 ? (
            <Card className="p-8 text-center">
              <TestTube className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No lab reports uploaded</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {labDocs.map(renderDocumentCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tests" className="space-y-3">
          <div className="flex justify-end gap-2 flex-wrap">
            <SectionAIInput
              label="AI: Add from Voice/Upload"
              placeholder="Dictate or paste ECG, PFT, or other test results…"
              onGenerate={(args) => handleDocAI(args, 'TEST')}
              disabled={aiLoading}
            />
            <UploadDocument patientId={patientId} defaultCategory="TEST" />
          </div>
          {testDocs.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No diagnostic tests uploaded</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {testDocs.map(renderDocumentCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="imaging" className="space-y-3">
          <div className="flex justify-end gap-2 flex-wrap">
            <SectionAIInput
              label="AI: Add from Voice/Upload"
              placeholder="Paste or dictate the radiology/ultrasound report…"
              onGenerate={(args) => handleDocAI(args, 'IMAGING')}
              disabled={aiLoading}
            />
            <UploadDocument patientId={patientId} defaultCategory="IMAGING" />
          </div>
          {imagingDocs.length === 0 ? (
            <Card className="p-8 text-center">
              <Scan className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No imaging studies uploaded</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {imagingDocs.map(renderDocumentCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}