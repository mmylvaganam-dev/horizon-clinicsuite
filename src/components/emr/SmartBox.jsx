import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SmartBox({ patientId }) {
  const queryClient = useQueryClient();
  const [summaryText, setSummaryText] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['smartSummary', patientId],
    queryFn: async () => {
      const summaries = await base44.entities.PatientSmartSummary.filter({ patient_ref: patientId });
      return summaries[0];
    },
    enabled: !!patientId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: cppSuggestions = [] } = useQuery({
    queryKey: ['cppSuggestions', patientId],
    queryFn: () => base44.entities.CPPUpdateSuggestion.filter({ patient_ref: patientId, status: 'pending' }),
    enabled: !!patientId
  });

  const { data: medSuggestions = [] } = useQuery({
    queryKey: ['medSuggestions', patientId],
    queryFn: () => base44.entities.MedReconSuggestion.filter({ patient_ref: patientId, status: 'pending' }),
    enabled: !!patientId
  });

  const saveSummaryMutation = useMutation({
    mutationFn: async (text) => {
      if (summary) {
        return base44.entities.PatientSmartSummary.update(summary.id, {
          summary_text: text,
          updated_at: new Date().toISOString()
        });
      } else {
        return base44.entities.PatientSmartSummary.create({
          patient_ref: patientId,
          summary_text: text,
          created_by: user.id,
          created_by_email: user.email,
          updated_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartSummary', patientId] });
      toast.success('Summary saved');
    }
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Based on this patient summary, suggest structured updates:
          
Summary: ${summaryText}

Extract:
1. Active problems/conditions to add to CPP
2. Current medications to add to medication list

Return JSON with: { problems: [{ name, notes }], medications: [{ name, dose, frequency }] }`,
          response_json_schema: {
            type: 'object',
            properties: {
              problems: { type: 'array', items: { type: 'object' } },
              medications: { type: 'array', items: { type: 'object' } }
            }
          }
        });

        // Create CPP suggestions
        if (result.problems?.length > 0) {
          await base44.entities.CPPUpdateSuggestion.create({
            patient_ref: patientId,
            source_type: 'SmartBox',
            source_id: summary?.id || 'new',
            suggested_changes_json: { add_problems: result.problems },
            status: 'pending'
          });
        }

        // Create med suggestions
        if (result.medications?.length > 0) {
          await base44.entities.MedReconSuggestion.create({
            patient_ref: patientId,
            source_type: 'SmartBox',
            source_id: summary?.id || 'new',
            suggested_meds_json: { add_medications: result.medications },
            status: 'pending'
          });
        }

        return result;
      } finally {
        setGenerating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cppSuggestions', patientId] });
      queryClient.invalidateQueries({ queryKey: ['medSuggestions', patientId] });
      toast.success('Suggestions generated');
    }
  });

  React.useEffect(() => {
    setSummaryText(summary?.summary_text || '');
  }, [summary, patientId]);

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5" />
          Patient Smart Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
          placeholder="Type or paste patient summary, assessment, or next steps..."
          rows={6}
          className="bg-white"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {cppSuggestions.length > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-700">
                {cppSuggestions.length} CPP suggestions
              </Badge>
            )}
            {medSuggestions.length > 0 && (
              <Badge variant="outline" className="bg-blue-100 text-blue-700">
                {medSuggestions.length} med suggestions
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => saveSummaryMutation.mutate(summaryText)}
              disabled={!summaryText || saveSummaryMutation.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button 
              size="sm"
              onClick={() => generateSuggestionsMutation.mutate()}
              disabled={!summaryText || generating}
            >
              <FileText className="w-4 h-4 mr-1" />
              {generating ? 'Generating...' : 'Generate Suggestions'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}