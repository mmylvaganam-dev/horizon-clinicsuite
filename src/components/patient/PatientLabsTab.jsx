import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, AlertTriangle, CheckCircle, TrendingUp, FileText, Loader2, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import LabTrendChart from './LabTrendChart';
import toast from 'react-hot-toast';

export default function PatientLabsTab({ patientId }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: results = [] } = useQuery({
    queryKey: ['patientLabResults', patientId],
    queryFn: async () => {
      const allResults = await base44.entities.Result.filter({ 
        patient_id: patientId,
        result_type: 'LAB'
      });
      return allResults.sort((a, b) => new Date(b.result_date) - new Date(a.result_date));
    },
  });

  const { data: labParameters = [] } = useQuery({
    queryKey: ['labParameters'],
    queryFn: () => base44.entities.LabParameter.list(),
  });

  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(response.file_url);
      toast.success('File ready — click Extract to import');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileInput = (e) => uploadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      uploadFile(file);
    } else {
      toast.error('Please drop a PDF or image file');
    }
  };

  const extractLabMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('extractLabFromPDF', {
        file_url: uploadedFile,
        patient_id: patientId
      });
      const data = response.data;
      // Save as PatientDocument (non-critical)
      try {
        await base44.entities.PatientDocument.create({
          organization_id: user?.organization_id || '',
          patient_ref: patientId,
          doc_category: 'LAB',
          doc_type: uploadedFileName?.endsWith('.pdf') ? 'PDF' : 'IMAGE',
          doc_title: uploadedFileName || 'Lab Report',
          doc_date: new Date().toISOString().split('T')[0],
          source: 'patient_brought',
          uploaded_by: user?.id || '',
          uploaded_by_email: user?.email || '',
          file_ref: uploadedFile,
          notes: `AI extracted: ${data.test_count || 0} test(s), ${data.abnormal_count || 0} abnormal.`,
          visibility: 'internal',
          status: 'active'
        });
      } catch (_) {}
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patientLabResults', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', patientId] });
      setUploadedFile(null);
      setUploadedFileName('');
      toast.success(
        data.abnormal_count > 0
          ? `Imported ${data.test_count} tests — ${data.abnormal_count} abnormal value(s) flagged`
          : `Imported ${data.test_count} test(s) successfully`
      );
    },
    onError: () => toast.error('Failed to extract lab data'),
  });

  const deleteResultMutation = useMutation({
    mutationFn: (resultId) => base44.entities.Result.delete(resultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientLabResults', patientId] });
      toast.success('Lab result deleted');
    },
    onError: () => toast.error('Failed to delete lab result'),
  });

  const acknowledgeResultMutation = useMutation({
    mutationFn: (resultId) => base44.functions.invoke('acknowledgeLabResult', {
      result_id: resultId,
      acknowledgement_note: 'Lab results reviewed'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientLabResults', patientId] });
      toast.success('Lab result acknowledged');
    },
  });

  // Aggregate lab data for trending
  const labTrends = {};
  results.forEach(result => {
    if (result.structured_json?.test_results) {
      result.structured_json.test_results.forEach(test => {
        if (!labTrends[test.test_code]) {
          labTrends[test.test_code] = {
            test_code: test.test_code,
            test_name: test.test_name,
            unit: test.unit,
            results: []
          };
        }
        
        const param = labParameters.find(p => p.test_code === test.test_code);
        const value = parseFloat(test.value);
        const isAbnormal = param && ((param.normal_range_min && value < param.normal_range_min) || 
                                     (param.normal_range_max && value > param.normal_range_max));
        
        labTrends[test.test_code].results.push({
          result_date: result.result_date,
          value: value,
          is_abnormal: isAbnormal
        });
        
        if (param) {
          labTrends[test.test_code].normal_min = param.normal_range_min;
          labTrends[test.test_code].normal_max = param.normal_range_max;
        }
      });
    }
  });

  const unapprovedResults = results.filter(r => r.status === 'Released' && !r.reviewed_by);

  const isProcessing = uploading || extractLabMutation.isPending;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Laboratory Results</h3>

      {/* Drag-and-drop upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}
          ${isProcessing ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-blue-700">
              {uploading ? 'Uploading file…' : 'AI is extracting lab values…'}
            </p>
          </div>
        ) : uploadedFile ? (
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <FileText className="w-5 h-5 text-emerald-500" />
              <span className="truncate max-w-xs">{uploadedFileName}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); extractLabMutation.mutate(); }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-3 h-3 mr-1" /> Extract & Import
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setUploadedFileName(''); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-2">
            <Upload className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">Drop a lab PDF or image here</p>
            <p className="text-xs text-slate-400">or click to browse — AI will extract values, units & ranges automatically</p>
          </div>
        )}
      </div>

      {unapprovedResults.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {unapprovedResults.length} lab result(s) require family doctor acknowledgement
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {unapprovedResults.slice(0, 3).map(result => (
                  <Button
                    key={result.id}
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeResultMutation.mutate(result.id)}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Acknowledge {format(new Date(result.result_date), 'MMM d')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {Object.keys(labTrends).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No lab trends available</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.values(labTrends).map(trend => (
                <LabTrendChart
                  key={trend.test_code}
                  testCode={trend.test_code}
                  testName={trend.test_name}
                  results={trend.results}
                  normalMin={trend.normal_min}
                  normalMax={trend.normal_max}
                  unit={trend.unit}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No lab results yet</p>
          ) : (
            results.map(result => (
              <div key={result.id} className="p-3 rounded-lg border bg-white">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{format(new Date(result.result_date), 'MMM d, yyyy')}</p>
                    <p className="text-sm text-slate-600">{result.structured_json?.lab_name || 'Lab Results'}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge className={result.status === 'Reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                      {result.status}
                    </Badge>
                    {!result.reviewed_by && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeResultMutation.mutate(result.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm('Delete this lab result? This cannot be undone.')) {
                          deleteResultMutation.mutate(result.id);
                        }
                      }}
                      disabled={deleteResultMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {result.structured_json?.test_results && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {result.structured_json.test_results.map((test, idx) => {
                      const param = labParameters.find(p => p.test_code === test.test_code);
                      const value = parseFloat(test.value);
                      const isAbnormal = param && ((param.normal_range_min && value < param.normal_range_min) || 
                                                   (param.normal_range_max && value > param.normal_range_max));
                      
                      return (
                        <div key={idx} className={`p-2 rounded border ${isAbnormal ? 'bg-rose-50 border-rose-200' : 'bg-slate-50'}`}>
                          <p className="text-xs text-slate-600">{test.test_name}</p>
                          <p className={`text-sm font-semibold ${isAbnormal ? 'text-rose-700' : 'text-slate-900'}`}>
                            {test.value} {test.unit}
                            {isAbnormal && <span className="ml-1">⚠️</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}