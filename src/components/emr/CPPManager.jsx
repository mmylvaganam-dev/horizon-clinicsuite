import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Plus, Check, X, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CPPManager({ patientId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    problem_name: '', status: 'active', onset_date: '', notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: cppItems = [] } = useQuery({
    queryKey: ['cppItems', patientId],
    queryFn: () => base44.entities.CPPItem.filter({ patient_ref: patientId }),
    enabled: !!patientId
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['cppSuggestions', patientId],
    queryFn: () => base44.entities.CPPUpdateSuggestion.filter({ patient_ref: patientId, status: 'pending' }),
    enabled: !!patientId
  });

  const addCPPMutation = useMutation({
    mutationFn: (data) => base44.entities.CPPItem.create({
      organization_id: '',
      patient_ref: patientId,
      last_reviewed_at: new Date().toISOString(),
      last_reviewed_by: user.id,
      last_reviewed_by_email: user.email,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cppItems', patientId] });
      setShowAdd(false);
      setFormData({ problem_name: '', status: 'active', onset_date: '', notes: '' });
      toast.success('Problem added');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CPPItem.update(id, { 
      status,
      last_reviewed_at: new Date().toISOString(),
      last_reviewed_by: user.id,
      last_reviewed_by_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cppItems', patientId] });
    }
  });

  const acceptSuggestionMutation = useMutation({
    mutationFn: async (suggestion) => {
      // Add suggested problems
      const problems = suggestion.suggested_changes_json.add_problems || [];
      for (const prob of problems) {
        await base44.entities.CPPItem.create({
          organization_id: '',
          patient_ref: patientId,
          problem_name: prob.name,
          status: 'active',
          notes: prob.notes || '',
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: user.id,
          last_reviewed_by_email: user.email
        });
      }

      // Mark suggestion as accepted
      await base44.entities.CPPUpdateSuggestion.update(suggestion.id, {
        status: 'accepted',
        reviewed_by: user.id,
        reviewed_by_email: user.email,
        reviewed_at: new Date().toISOString()
      });

      // Audit
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        patient_id: patientId,
        module: 'CPP',
        action: 'accept_suggestion',
        record_type: 'CPPUpdateSuggestion',
        record_id: suggestion.id,
        metadata: { problems_added: problems.length }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cppItems', patientId] });
      queryClient.invalidateQueries({ queryKey: ['cppSuggestions', patientId] });
      toast.success('Suggestion accepted');
    }
  });

  const rejectSuggestionMutation = useMutation({
    mutationFn: (suggestionId) => base44.entities.CPPUpdateSuggestion.update(suggestionId, {
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_by_email: user.email,
      reviewed_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cppSuggestions', patientId] });
      toast.success('Suggestion rejected');
    }
  });

  const activeProblems = cppItems.filter(i => i.status === 'active');
  const inactiveProblems = cppItems.filter(i => i.status !== 'active');

  return (
    <div className="space-y-4">
      {suggestions.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Sparkles className="w-5 h-5" />
              {suggestions.length} CPP Update Suggestion{suggestions.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" onClick={() => setShowSuggestions(true)}>
              Review Suggestions
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Active Problems ({activeProblems.length})
            </CardTitle>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Problem
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeProblems.map((item) => (
            <div key={item.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{item.problem_name}</p>
                {item.onset_date && <p className="text-xs text-slate-500">Onset: {format(new Date(item.onset_date), 'MMM yyyy')}</p>}
                {item.notes && <p className="text-sm text-slate-600 mt-1">{item.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'resolved' })}>
                  Resolve
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'inactive' })}>
                  Inactivate
                </Button>
              </div>
            </div>
          ))}
          {activeProblems.length === 0 && (
            <p className="text-center text-slate-500 py-4">No active problems</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Problem to CPP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Problem Name *</Label>
              <Input value={formData.problem_name} onChange={(e) => setFormData({...formData, problem_name: e.target.value})} />
            </div>
            <div>
              <Label>Onset Date</Label>
              <Input type="date" value={formData.onset_date} onChange={(e) => setFormData({...formData, onset_date: e.target.value})} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => addCPPMutation.mutate(formData)} disabled={!formData.problem_name}>
                Add Problem
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CPP Update Suggestions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
            {suggestions.map((sug) => (
              <Card key={sug.id} className="p-4 bg-amber-50">
                <div className="space-y-3">
                  <Badge variant="outline">From: {sug.source_type}</Badge>
                  <div>
                    <p className="font-semibold mb-2">Suggested Problems:</p>
                    {(sug.suggested_changes_json.add_problems || []).map((prob, idx) => (
                      <div key={idx} className="ml-4 mb-2">
                        <p className="font-medium">• {prob.name}</p>
                        {prob.notes && <p className="text-sm text-slate-600 ml-4">{prob.notes}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => acceptSuggestionMutation.mutate(sug)}>
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectSuggestionMutation.mutate(sug.id)}>
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}