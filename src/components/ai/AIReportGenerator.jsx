import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { FileText, Sparkles, Loader2, Download } from 'lucide-react';

export default function AIReportGenerator({ data, reportType: defaultReportType }) {
  const [reportType, setReportType] = useState(defaultReportType || 'patient_summary');
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);

  const handleGenerate = async () => {
    if (!data) {
      alert('No data provided for report generation');
      return;
    }

    setGenerating(true);
    setReport(null);

    try {
      const { data: result } = await base44.functions.invoke('generateAIReport', {
        report_type: reportType,
        data: data,
        include_recommendations: includeRecommendations
      });

      setReport(result);
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Failed to generate report: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;

    const blob = new Blob([report.report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_type}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <Card className="bg-gradient-to-br from-cyan-50 to-teal-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-600" />
          AI Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Report Type</label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patient_summary">Patient Summary</SelectItem>
              <SelectItem value="financial_analysis">Financial Analysis</SelectItem>
              <SelectItem value="operational_insights">Operational Insights</SelectItem>
              <SelectItem value="dental_treatment_plan">Dental Treatment Plan</SelectItem>
              <SelectItem value="pharmacy_stock_analysis">Pharmacy Stock Analysis</SelectItem>
              <SelectItem value="lab_trends">Lab Trends</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="recommendations"
            checked={includeRecommendations}
            onChange={(e) => setIncludeRecommendations(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="recommendations" className="text-sm">
            Include recommendations
          </label>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate AI Report
            </>
          )}
        </Button>

        {report && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-white rounded-lg border border-cyan-200 max-h-96 overflow-y-auto">
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {report.report}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Tokens used: {report.tokens_used}
              </p>
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download Report
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}