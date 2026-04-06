import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const ENDPOINT_BASE = `${window.location.origin}/api/functions/analyzerIngest`;

export default function AnalyzerConnectionGuide({ open, onOpenChange, analyzer }) {
  const [copied, setCopied] = useState(false);

  const webhookUrl = ENDPOINT_BASE;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const samplePayload = (type) => {
    const base = { analyzer_id: analyzer?.id || '<ANALYZER_ID>', organization_id: analyzer?.organization_id || '<ORG_ID>', location_id: analyzer?.location_id || null };
    if (type === 'hl7') return JSON.stringify({ ...base, message_type: 'hl7', raw_message: 'MSH|^~\\&|LAB|HOSP|LIS|HOSP|20240101120000||ORU^R01|MSG001|P|2.5\rPID|||PAT001\rOBR|||ACC001|58410-2^CBC PANEL\rOBX|1|NM|718-7^Hemoglobin||14.2|g/dL|12.0-17.0||||F' }, null, 2);
    if (type === 'astm') return JSON.stringify({ ...base, message_type: 'astm', raw_message: 'H|\\^&|||Analyzer|||||LIS||P|1\rP|1|||PatientName\rO|1|ACC001||GLU^Glucose\rR|1|GLU^Glucose^99ROC|5.4|mmol/L|3.9-6.1||||F\rL|1|N' }, null, 2);
    if (type === 'csv') return JSON.stringify({ ...base, message_type: 'csv', raw_message: 'specimen_id,test_name,result,unit,reference_range,flag\nACC001,Glucose,5.4,mmol/L,3.9-6.1,\nACC001,Creatinine,88,umol/L,60-120,' }, null, 2);
    return '{}';
  };

  if (!analyzer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connection Guide — {analyzer.analyzer_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Endpoint */}
          <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Ingest Endpoint (POST)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded px-3 py-2 text-teal-700 break-all">{webhookUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copy(webhookUrl)}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Configure this URL in your analyzer's middleware (e.g., RALS, Bridge, Mirth Connect) as the HTTP POST destination.</span>
            </div>
          </div>

          {/* IDs */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3 bg-white">
              <p className="text-xs text-slate-500 mb-1">Analyzer ID</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-slate-800 truncate">{analyzer.id}</code>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(analyzer.id)}><Copy className="w-3 h-3" /></Button>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-white">
              <p className="text-xs text-slate-500 mb-1">Interface Protocol</p>
              <Badge variant="outline" className="uppercase">{analyzer.interface_type}</Badge>
            </div>
          </div>

          {/* Protocol guides */}
          <Tabs defaultValue={analyzer.interface_type || 'hl7'}>
            <TabsList className="w-full">
              <TabsTrigger value="hl7" className="flex-1">HL7 v2.x</TabsTrigger>
              <TabsTrigger value="astm" className="flex-1">ASTM E1394</TabsTrigger>
              <TabsTrigger value="csv" className="flex-1">CSV/Flat File</TabsTrigger>
            </TabsList>

            <TabsContent value="hl7" className="space-y-3 mt-3">
              <div className="text-sm text-slate-600 space-y-2">
                <p className="font-medium text-slate-800">HL7 v2.x (ORU^R01) Setup</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Configure your middleware (Mirth Connect, Rhapsody, etc.) to forward ORU^R01 messages to the endpoint above.</li>
                  <li>Ensure MSH, PID, OBR, and OBX segments are included in the message.</li>
                  <li>OBR-3 (Filler Order Number) should match the specimen accession number in HorizonLIS.</li>
                  <li>Wrap the HL7 message in a JSON body with the fields shown in the sample below.</li>
                </ol>
              </div>
              <div className="relative">
                <pre className="text-xs bg-slate-900 text-green-400 rounded-lg p-3 overflow-x-auto">{samplePayload('hl7')}</pre>
                <Button size="sm" variant="ghost" className="absolute top-2 right-2 text-slate-400 hover:text-white" onClick={() => copy(samplePayload('hl7'))}><Copy className="w-3 h-3" /></Button>
              </div>
            </TabsContent>

            <TabsContent value="astm" className="space-y-3 mt-3">
              <div className="text-sm text-slate-600 space-y-2">
                <p className="font-medium text-slate-800">ASTM E1394 Setup</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Most hematology and biochemistry analyzers (Sysmex, Mindray, Roche) natively output ASTM.</li>
                  <li>Use a serial-to-TCP bridge (e.g., Moxa, ATEN) or vendor middleware to forward messages via HTTP.</li>
                  <li>Order (O) record field O-3 must contain the specimen accession number.</li>
                  <li>Each Result (R) record carries parameter code, value, unit, and reference range.</li>
                </ol>
              </div>
              <div className="relative">
                <pre className="text-xs bg-slate-900 text-green-400 rounded-lg p-3 overflow-x-auto">{samplePayload('astm')}</pre>
                <Button size="sm" variant="ghost" className="absolute top-2 right-2 text-slate-400 hover:text-white" onClick={() => copy(samplePayload('astm'))}><Copy className="w-3 h-3" /></Button>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-3 mt-3">
              <div className="text-sm text-slate-600 space-y-2">
                <p className="font-medium text-slate-800">CSV / Flat File Setup</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Export results from your analyzer software as CSV (or configure auto-export to a watched folder).</li>
                  <li>Use a file-watching agent to POST the file content to this endpoint.</li>
                  <li>Required columns: <code className="bg-slate-100 px-1 rounded">specimen_id, test_name, result, unit</code></li>
                  <li>Optional: <code className="bg-slate-100 px-1 rounded">reference_range, flag</code></li>
                </ol>
              </div>
              <div className="relative">
                <pre className="text-xs bg-slate-900 text-green-400 rounded-lg p-3 overflow-x-auto">{samplePayload('csv')}</pre>
                <Button size="sm" variant="ghost" className="absolute top-2 right-2 text-slate-400 hover:text-white" onClick={() => copy(samplePayload('csv'))}><Copy className="w-3 h-3" /></Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Status flow */}
          <div className="rounded-lg border p-4 bg-blue-50">
            <p className="text-sm font-semibold text-blue-800 mb-2">Auto-Processing Flow</p>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {['Message Received', '→', 'Parsed', '→', 'Specimen Matched?', '→', 'Result Auto-Created (Entered)', '→', 'Awaiting Lab Review'].map((s, i) => (
                <span key={i} className={s === '→' ? 'text-slate-400' : 'bg-white border border-blue-200 rounded px-2 py-1 text-blue-700 font-medium'}>{s}</span>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-2">If specimen is not matched, the message remains in the inbox as <strong>parsed</strong> — a lab technician can manually link and apply it.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}