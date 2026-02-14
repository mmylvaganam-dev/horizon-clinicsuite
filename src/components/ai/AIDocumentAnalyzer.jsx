import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Upload, Sparkles, Loader2, FileText } from 'lucide-react';

export default function AIDocumentAnalyzer({ onAnalysisComplete }) {
  const [file, setFile] = useState(null);
  const [analysisType, setAnalysisType] = useState('medical_record');
  const [customPrompt, setCustomPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setResult(null);

    try {
      // Upload file first using FormData
      const formData = new FormData();
      formData.append('file', file);
      
      const { data: uploadResult } = await base44.functions.invoke('uploadFile', formData);
      const fileUrl = uploadResult.file_url;

      // Analyze with AI
      const { data: analysisResult } = await base44.functions.invoke('analyzeDocument', {
        file_url: fileUrl,
        analysis_type: analysisType,
        custom_prompt: customPrompt || undefined
      });

      setResult(analysisResult);
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze document: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Document Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Upload Document</label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="flex-1"
            />
            {file && <FileText className="w-5 h-5 text-green-600" />}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Analysis Type</label>
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lab_report">Lab Report</SelectItem>
              <SelectItem value="prescription">Prescription</SelectItem>
              <SelectItem value="medical_record">Medical Record</SelectItem>
              <SelectItem value="imaging">Imaging Report</SelectItem>
              <SelectItem value="custom">Custom Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div style={{ display: analysisType === 'custom' ? 'block' : 'none' }}>
          <label className="block text-sm font-medium mb-2">Custom Instructions</label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="What should the AI look for in this document?"
            rows={3}
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={!file || analyzing}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Document
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">AI Analysis Result:</h3>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {result.analysis}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Tokens used: {result.tokens_used}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}