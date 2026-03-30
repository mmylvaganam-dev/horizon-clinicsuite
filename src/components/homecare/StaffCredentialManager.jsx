import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, FileText, Plus, Upload, Trash2, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { differenceInDays, parseISO, format, isPast } from 'date-fns';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { value: 'nursing_license', label: 'Nursing License', icon: '🏥' },
  { value: 'certificate', label: 'Certificate', icon: '📜' },
  { value: 'background_check', label: 'Background Check', icon: '🔍' },
  { value: 'id_document', label: 'ID Document', icon: '🪪' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'other', label: 'Other', icon: '📄' },
];

const emptyForm = {
  doc_type: 'nursing_license',
  doc_name: '',
  doc_number: '',
  issue_date: '',
  expiry_date: '',
  alert_days_before: 30,
  notes: '',
};

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const expiry = parseISO(expiryDate);
  const daysLeft = differenceInDays(expiry, new Date());
  if (isPast(expiry)) return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', icon: 'expired', days: daysLeft };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, color: 'bg-orange-100 text-orange-700 border-orange-200', icon: 'warning', days: daysLeft };
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'soon', days: daysLeft };
  return { label: `${daysLeft}d left`, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'ok', days: daysLeft };
}

export default function StaffCredentialManager({ staffMember, organizationId, onClose }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['staffCredentials', staffMember.id],
    queryFn: () => base44.entities.StaffCredentialDocument.filter({ staff_ref: staffMember.id }),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => base44.entities.StaffCredentialDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffCredentials', staffMember.id] });
      setShowAddDialog(false);
      setForm(emptyForm);
      setSelectedFile(null);
      toast.success('Document added!');
    },
    onError: (e) => toast.error(e.message || 'Failed to add document'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.StaffCredentialDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffCredentials', staffMember.id] });
      toast.success('Document removed');
    },
  });

  const handleSubmit = async () => {
    if (!form.doc_name || !form.doc_type) {
      toast.error('Document name and type are required');
      return;
    }
    let file_ref = '';
    if (selectedFile) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      file_ref = file_url;
      setUploading(false);
    }
    createMutation.mutate({
      ...form,
      organization_id: organizationId,
      staff_ref: staffMember.id,
      file_ref,
      alert_days_before: Number(form.alert_days_before) || 30,
      uploaded_by: user?.id || '',
      uploaded_by_email: user?.email || '',
    });
  };

  // Alerts: docs expiring within alert_days_before
  const expiringDocs = docs.filter(doc => {
    if (!doc.expiry_date || doc.alert_dismissed) return false;
    const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
    return daysLeft <= (doc.alert_days_before || 30);
  });

  const staffName = `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Documents — {staffName}
          </DialogTitle>
        </DialogHeader>

        {/* Expiry Alerts Banner */}
        {expiringDocs.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">
                {expiringDocs.length} document{expiringDocs.length > 1 ? 's' : ''} expiring soon or expired
              </p>
              <ul className="text-xs text-orange-700 mt-1 space-y-0.5">
                {expiringDocs.map(d => {
                  const status = getExpiryStatus(d.expiry_date);
                  return (
                    <li key={d.id}>• {d.doc_name}: <strong>{status?.label}</strong></li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Doc List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-slate-400 py-6">Loading...</p>
          ) : docs.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            docs.map(doc => {
              const status = getExpiryStatus(doc.expiry_date);
              const docType = DOC_TYPES.find(t => t.value === doc.doc_type);
              return (
                <Card key={doc.id} className={`border ${status?.icon === 'expired' ? 'border-red-200 bg-red-50' : status?.icon === 'warning' ? 'border-orange-200 bg-orange-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{docType?.icon}</span>
                          <p className="font-semibold text-slate-900 text-sm">{doc.doc_name}</p>
                          <Badge variant="outline" className="text-xs">{docType?.label}</Badge>
                          {status && (
                            <Badge className={`text-xs border ${status.color}`}>
                              {status.icon === 'expired' ? '⚠️ ' : status.icon === 'warning' ? '⏰ ' : '✓ '}
                              {status.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                          {doc.doc_number && <span>No: <strong>{doc.doc_number}</strong></span>}
                          {doc.issue_date && <span>Issued: {format(parseISO(doc.issue_date), 'MMM d, yyyy')}</span>}
                          {doc.expiry_date && <span>Expires: <strong className={status?.icon === 'expired' ? 'text-red-600' : status?.icon === 'warning' ? 'text-orange-600' : ''}>{format(parseISO(doc.expiry_date), 'MMM d, yyyy')}</strong></span>}
                        </div>
                        {doc.notes && <p className="text-xs text-slate-400 mt-1 italic">{doc.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.file_ref && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={doc.file_ref} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> View
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50"
                          onClick={() => deleteMutation.mutate(doc.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Button onClick={() => setShowAddDialog(true)} className="w-full mt-2">
          <Plus className="w-4 h-4 mr-2" /> Add Document
        </Button>

        {/* Add Document Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Credential Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Document Type *</Label>
                  <Select value={form.doc_type} onValueChange={v => setForm({...form, doc_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Name *</Label>
                  <Input value={form.doc_name} onChange={e => setForm({...form, doc_name: e.target.value})}
                    placeholder="e.g. SLNC License 2024" />
                </div>
              </div>

              <div>
                <Label>Document / License Number</Label>
                <Input value={form.doc_number} onChange={e => setForm({...form, doc_number: e.target.value})}
                  placeholder="e.g. NL-2024-001234" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Date</Label>
                  <Input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
                </div>
              </div>

              <div>
                <Label>Alert me before expiry (days)</Label>
                <Select value={String(form.alert_days_before)} onValueChange={v => setForm({...form, alert_days_before: Number(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Upload File (optional)</Label>
                <div className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 transition-colors"
                  onClick={() => document.getElementById('doc-file-input').click()}>
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <p className="text-sm text-slate-500">
                    {selectedFile ? selectedFile.name : 'Click to upload PDF, JPG, PNG'}
                  </p>
                  <input id="doc-file-input" type="file" className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setSelectedFile(e.target.files[0])} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Any additional notes..." rows={2} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || uploading}>
                  {uploading ? 'Uploading...' : createMutation.isPending ? 'Saving...' : 'Save Document'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}