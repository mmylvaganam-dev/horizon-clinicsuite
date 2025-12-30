import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, TestTube, Scan, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import UploadDocument from './UploadDocument';

export default function DiagnosticsTab({ patientId }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['patientDocuments', patientId],
    queryFn: () => base44.entities.PatientDocument.filter({ patient_ref: patientId, status: 'active' }),
    enabled: !!patientId
  });

  const { data: labReports = [] } = useQuery({
    queryKey: ['externalLabReports', patientId],
    queryFn: () => base44.entities.ExternalLabReport.filter({ patient_ref: patientId }),
    enabled: !!patientId
  });

  const { data: diagnosticTests = [] } = useQuery({
    queryKey: ['diagnosticTests', patientId],
    queryFn: () => base44.entities.DiagnosticTest.filter({ patient_ref: patientId }),
    enabled: !!patientId
  });

  const { data: imagingStudies = [] } = useQuery({
    queryKey: ['imagingStudies', patientId],
    queryFn: () => base44.entities.ImagingStudy.filter({ patient_ref: patientId }),
    enabled: !!patientId
  });

  const labDocs = documents.filter(d => d.doc_category === 'LAB');
  const testDocs = documents.filter(d => d.doc_category === 'TEST');
  const imagingDocs = documents.filter(d => d.doc_category === 'IMAGING');

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
          <div className="flex justify-end">
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
          <div className="flex justify-end">
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
          <div className="flex justify-end">
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