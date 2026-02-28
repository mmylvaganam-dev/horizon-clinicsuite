import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import TelephonyModuleGate from '@/components/telephony/TelephonyModuleGate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FileText, Archive, UserCheck, Eye, X } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  triaged: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-500',
};

export default function FaxInbox() {
  const { selectedOrgId } = useOrganization();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewFax, setPreviewFax] = useState(null);
  const [assignFax, setAssignFax] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [newTag, setNewTag] = useState('');

  const { data: faxes, isLoading } = useQuery({
    queryKey: ['faxInbox', selectedOrgId, statusFilter],
    queryFn: async () => {
      const filters = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await base44.functions.invoke('faxInbox', {
        action: 'list', org_id: selectedOrgId, filters
      });
      return res.data.items || [];
    },
    enabled: !!selectedOrgId,
  });

  const archiveMutation = useMutation({
    mutationFn: (fax_id) => base44.functions.invoke('faxInbox', { action: 'archive', org_id: selectedOrgId, fax_id }),
    onSuccess: () => queryClient.invalidateQueries(['faxInbox', selectedOrgId])
  });

  const assignMutation = useMutation({
    mutationFn: ({ fax_id, user_id }) => base44.functions.invoke('faxInbox', {
      action: 'assign', org_id: selectedOrgId, fax_id, user_id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['faxInbox', selectedOrgId]);
      setAssignFax(null); setAssignUserId('');
    }
  });

  const tagMutation = useMutation({
    mutationFn: ({ fax_id, tags }) => base44.functions.invoke('faxInbox', {
      action: 'update_tags', org_id: selectedOrgId, fax_id, tags
    }),
    onSuccess: () => queryClient.invalidateQueries(['faxInbox', selectedOrgId])
  });

  const triageMutation = useMutation({
    mutationFn: (fax_id) => base44.functions.invoke('faxInbox', {
      action: 'update_status', org_id: selectedOrgId, fax_id, status: 'triaged'
    }),
    onSuccess: () => queryClient.invalidateQueries(['faxInbox', selectedOrgId])
  });

  const addTag = (fax) => {
    if (!newTag.trim()) return;
    const updated = [...(fax.tags || []), newTag.trim()];
    tagMutation.mutate({ fax_id: fax.id, tags: updated });
    setNewTag('');
  };

  const removeTag = (fax, tag) => {
    tagMutation.mutate({ fax_id: fax.id, tags: (fax.tags || []).filter(t => t !== tag) });
  };

  const counts = {
    new: (faxes || []).filter(f => f.status === 'new').length,
    triaged: (faxes || []).filter(f => f.status === 'triaged').length,
    assigned: (faxes || []).filter(f => f.status === 'assigned').length,
  };

  return (
    <TelephonyModuleGate>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Fax Inbox</h1>
              <p className="text-sm text-slate-500">Incoming faxes for this organization</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-3 text-sm">
              <span className="text-blue-600 font-semibold">{counts.new} New</span>
              <span className="text-yellow-600 font-semibold">{counts.triaged} Triaged</span>
              <span className="text-green-600 font-semibold">{counts.assigned} Assigned</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="triaged">Triaged</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>}

        {!isLoading && (faxes || []).length === 0 && (
          <Card><CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No faxes found</p>
            <p className="text-slate-400 text-sm">Incoming faxes will appear here once connected.</p>
          </CardContent></Card>
        )}

        <div className="space-y-3">
          {(faxes || []).map(fax => (
            <Card key={fax.id} className={`hover:shadow-md transition-shadow ${fax.status === 'new' ? 'border-blue-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-xs ${STATUS_COLORS[fax.status]}`}>{fax.status}</Badge>
                      <span className="text-sm font-medium text-slate-700">From: {fax.from_number || 'Unknown'}</span>
                      <span className="text-xs text-slate-400">→ {fax.fax_did}</span>
                      {fax.pages && <span className="text-xs text-slate-400">{fax.pages} page{fax.pages !== 1 ? 's' : ''}</span>}
                    </div>
                    <p className="text-xs text-slate-400">
                      {fax.received_at ? format(new Date(fax.received_at), 'MMM d, yyyy HH:mm') : '--'}
                    </p>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(fax.tags || []).map(tag => (
                        <span key={tag} className="text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          {tag}
                          <button onClick={() => removeTag(fax, tag)} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        className="text-xs border border-dashed border-slate-300 rounded-full px-2 py-0.5 w-20 focus:outline-none focus:border-violet-400"
                        placeholder="+ tag"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTag(fax)}
                        onBlur={() => newTag && addTag(fax)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setPreviewFax(fax)} className="text-xs">
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    {fax.status === 'new' && (
                      <Button variant="outline" size="sm" onClick={() => triageMutation.mutate(fax.id)} className="text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50">
                        Triage
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setAssignFax(fax)} className="text-xs text-green-700 border-green-300 hover:bg-green-50">
                      <UserCheck className="w-3 h-3 mr-1" /> Assign
                    </Button>
                    {fax.status !== 'archived' && (
                      <Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate(fax.id)} className="text-xs text-slate-400 hover:text-slate-600">
                        <Archive className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* PDF Preview Dialog */}
        <Dialog open={!!previewFax} onOpenChange={() => setPreviewFax(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Fax from {previewFax?.from_number || 'Unknown'}</DialogTitle>
            </DialogHeader>
            {previewFax?.pdf_file_pointer ? (
              <iframe
                src={previewFax.pdf_file_pointer}
                className="w-full h-[70vh] rounded border border-slate-200"
                title="Fax PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-40 bg-slate-50 rounded">
                <p className="text-slate-400">No PDF file attached</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <Dialog open={!!assignFax} onOpenChange={() => { setAssignFax(null); setAssignUserId(''); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign Fax</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Assign to (User ID or Email)</label>
                <Input
                  placeholder="user@example.com"
                  value={assignUserId}
                  onChange={e => setAssignUserId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setAssignFax(null); setAssignUserId(''); }}>Cancel</Button>
                <Button
                  onClick={() => assignMutation.mutate({ fax_id: assignFax.id, user_id: assignUserId })}
                  disabled={!assignUserId || assignMutation.isPending}
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TelephonyModuleGate>
  );
}