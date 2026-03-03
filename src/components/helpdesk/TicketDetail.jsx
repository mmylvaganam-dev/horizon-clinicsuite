import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Monitor, AlertCircle, Image, ChevronLeft, Check, ExternalLink, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import TicketChat from './TicketChat';
import CreateKBArticleDialog from './CreateKBArticleDialog';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting_client: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600'
};

export default function TicketDetail({ ticket, currentUser, onBack, onUpdate }) {
  const [status, setStatus] = useState(ticket.status);
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to || '');
  const [resolutionNotes, setResolutionNotes] = useState(ticket.resolution_notes || '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.HelpDeskTicket.update(ticket.id, data),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries(['helpdesk_tickets']);
      onUpdate && onUpdate(updated);
      toast.success('Ticket updated');
      if (variables.status && variables.status !== ticket.status) {
        base44.functions.invoke('helpdeskNotify', {
          event: 'status_changed',
          ticket: { ...ticket, ...variables },
          newStatus: variables.status
        }).catch(() => {});
      }
    }
  });

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    updateMutation.mutate({
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : ticket.resolved_at,
      resolution_notes: resolutionNotes,
      assigned_to: assignedTo
    });
  };

  const handleSaveChanges = () => {
    updateMutation.mutate({ status, assigned_to: assignedTo, resolution_notes: resolutionNotes });
  };

  const openHopToDesk = () => {
    window.open('https://www.hoptodesk.com', '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-slate-500">{ticket.ticket_number}</span>
              <Badge className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
              <Badge className={STATUS_COLORS[status]}>{status.replace('_', ' ')}</Badge>
              <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{ticket.title}</h2>
            <p className="text-xs text-slate-400">
              Submitted by {ticket.submitter_name || ticket.submitter_email} ({ticket.submitter_type}) · {format(new Date(ticket.created_date), 'PPP p')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Details + Chat */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Issue Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-slate-800 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Error Message */}
          {ticket.error_message && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />Error Message / Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-amber-900 whitespace-pre-wrap overflow-x-auto">{ticket.error_message}</pre>
              </CardContent>
            </Card>
          )}

          {/* Screenshots */}
          {ticket.screenshot_urls?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Image className="w-4 h-4" />Attachments ({ticket.screenshot_urls.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {ticket.screenshot_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                      <img src={url} alt={`attachment ${i+1}`} className="w-24 h-24 object-cover rounded border hover:opacity-80 transition-opacity"
                        onError={e => { e.target.style.display='none'; }}
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Live Chat / Messages</CardTitle></CardHeader>
            <CardContent className="p-0">
              <TicketChat ticket={ticket} currentUser={currentUser} />
            </CardContent>
          </Card>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          {/* Remote Support */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                <Monitor className="w-4 h-4" />Remote Support (HopToDesk)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.hoptodesk_id ? (
                <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Client's HopToDesk ID</p>
                  <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{ticket.hoptodesk_id}</p>
                </div>
              ) : (
                <p className="text-xs text-blue-600">No HopToDesk ID provided by client yet.</p>
              )}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={openHopToDesk}>
                <ExternalLink className="w-4 h-4 mr-2" />Open HopToDesk
              </Button>
              <p className="text-xs text-slate-400 text-center">Enter the client's ID in HopToDesk to connect remotely</p>
            </CardContent>
          </Card>

          {/* Status & Assignment */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Manage Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_client">Waiting on Client</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Assigned To</Label>
                <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="support@example.com" />
              </div>
              <div>
                <Label className="text-xs">Resolution Notes</Label>
                <Textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={3} placeholder="How was it resolved?" />
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleSaveChanges} disabled={updateMutation.isPending}>
                <Check className="w-4 h-4 mr-2" />{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              {status !== 'resolved' && (
                <Button variant="outline" className="w-full border-green-500 text-green-700" onClick={() => handleStatusChange('resolved')}>
                  Mark as Resolved
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card className="bg-slate-50">
            <CardContent className="pt-4 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between"><span>Submitter:</span><span className="font-medium">{ticket.submitter_name}</span></div>
              <div className="flex justify-between"><span>Email:</span><span className="font-medium">{ticket.submitter_email}</span></div>
              <div className="flex justify-between capitalize"><span>Type:</span><span>{ticket.submitter_type}</span></div>
              <div className="flex justify-between capitalize"><span>Category:</span><span>{ticket.category}</span></div>
              <div className="flex justify-between"><span>Created:</span><span>{format(new Date(ticket.created_date), 'MMM d, HH:mm')}</span></div>
              {ticket.resolved_at && (
                <div className="flex justify-between"><span>Resolved:</span><span>{format(new Date(ticket.resolved_at), 'MMM d, HH:mm')}</span></div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}