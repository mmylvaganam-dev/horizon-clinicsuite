import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import LabTrendChart from './LabTrendChart';
import toast from 'react-hot-toast';

export default function PatientLabsTab({ patientId }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(response.file_url);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const extractLabMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const response = await base44.functions.invoke('extractLabFromPDF', {
        file_url: uploadedFile,
        patient_id: patientId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patientLabResults', patientId] });
      setUploadDialogOpen(false);
      setUploadedFile(null);
      setUploading(false);
      
      if (data.abnormal_count > 0) {
        toast.success(`Lab imported: ${data.abnormal_count} abnormal value(s) flagged`);
      } else {
        toast.success('Lab imported successfully');
      }
    },
    onError: () => {
      setUploading(false);
      toast.error('Failed to extract lab data');
    }
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Laboratory Results</h3>
        <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Upload className="w-4 h-4 mr-2" />
          Upload Lab PDF
        </Button>
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
                  <div className="flex gap-2">
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

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Lab Results PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="lab-pdf-upload"
              />
              <label htmlFor="lab-pdf-upload">
                <Button asChild variant="outline">
                  <span>Choose PDF File</span>
                </Button>
              </label>
              {uploadedFile && (
                <p className="text-sm text-emerald-600 mt-2">✓ File uploaded successfully</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>AI Extraction:</strong> The system will automatically extract test results, match with historical data, and flag abnormal values for review.
              </p>
            </div>

            <Button
              onClick={() => extractLabMutation.mutate()}
              disabled={!uploadedFile || uploading}
              className="w-full"
            >
              {uploading ? 'Extracting Lab Data...' : 'Extract & Import Lab Results'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}