import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Brain, Sparkles, Loader2 } from 'lucide-react';

export default function SmartInsights({ data, analysisType, title = "AI Smart Insights" }) {
  const [question, setQuestion] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const handleAnalyze = async (customQuestion = null) => {
    if (!data) {
      alert('No data provided for analysis');
      return;
    }

    setAnalyzing(true);
    setInsights(null);

    try {
      const { data: result } = await base44.functions.invoke('smartDataAnalysis', {
        analysis_type: analysisType,
        data: data,
        question: customQuestion || question || undefined
      });

      setInsights(result);
    } catch (error) {
      console.error('Smart analysis error:', error);
      alert('Failed to generate insights: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Ask AI a question about this data (optional)
          </label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What patterns do you see? Any risks? Recommendations?"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleAnalyze()}
            disabled={analyzing}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Insights
              </>
            )}
          </Button>
        </div>

        {insights && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Insights:
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {insights.insights}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Analyzed at: {new Date(insights.analyzed_at).toLocaleString()} • Tokens: {insights.tokens_used}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}