import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIDocumentAnalyzer from '@/components/ai/AIDocumentAnalyzer';
import AIReportGenerator from '@/components/ai/AIReportGenerator';
import SmartInsights from '@/components/ai/SmartInsights';
import { Sparkles, FileText, Brain, Upload } from 'lucide-react';

export default function AIAssistant() {
  const [sampleData, setSampleData] = useState({
    patients: 150,
    appointments: 45,
    revenue: 25000,
    medication_count: 320
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">AI Assistant</h1>
              <p className="text-slate-600">Intelligent document analysis, report generation, and smart insights</p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-100 to-blue-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Upload className="w-8 h-8 text-purple-600" />
                <h3 className="font-semibold text-slate-900">Document Analysis</h3>
              </div>
              <p className="text-sm text-slate-600">
                Upload medical documents, lab reports, or prescriptions for AI-powered analysis and data extraction
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-100 to-teal-100 border-cyan-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-cyan-600" />
                <h3 className="font-semibold text-slate-900">Report Generation</h3>
              </div>
              <p className="text-sm text-slate-600">
                Generate comprehensive reports with AI analysis, insights, and recommendations for any dataset
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-100 to-purple-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-8 h-8 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">Smart Insights</h3>
              </div>
              <p className="text-sm text-slate-600">
                Get intelligent analysis of trends, patterns, risks, and actionable recommendations from your data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="analyze" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analyze" className="gap-2">
              <Upload className="w-4 h-4" />
              Analyze Documents
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <FileText className="w-4 h-4" />
              Generate Reports
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Brain className="w-4 h-4" />
              Smart Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze">
            <AIDocumentAnalyzer 
              onAnalysisComplete={(result) => console.log('Analysis complete:', result)}
            />
          </TabsContent>

          <TabsContent value="report">
            <AIReportGenerator 
              data={sampleData}
              reportType="operational_insights"
            />
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Currently showing with sample data. Pass real data from your pages to generate actual reports.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <SmartInsights 
              data={sampleData}
              analysisType="operational_insights"
              title="Smart Data Analysis"
            />
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Currently showing with sample data. Pass real data from your pages for actual insights.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Usage Examples */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">How to Use AI Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-800">
            <div>
              <strong>1. Document Analysis:</strong> Upload lab reports, prescriptions, or medical records to extract structured data and get AI summaries.
            </div>
            <div>
              <strong>2. Report Generation:</strong> Select any data from your system (patient records, financial data, inventory) and generate professional reports with AI insights.
            </div>
            <div>
              <strong>3. Smart Insights:</strong> Ask questions about your data or get automatic trend analysis, predictions, and recommendations.
            </div>
            <div className="pt-2 border-t border-blue-200">
              <strong>Privacy Note:</strong> Documents are analyzed using OpenAI's API. Avoid uploading documents with personally identifiable information (PII) if privacy is a concern. Consider anonymizing data before analysis.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}