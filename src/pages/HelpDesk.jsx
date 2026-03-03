import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Ticket, Plus, Search, Monitor, AlertCircle, CheckCircle2,
  Clock, Users, ExternalLink, Download, RefreshCw, BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import TicketForm from '../components/helpdesk/TicketForm';
import TicketDetail from '../components/helpdesk/TicketDetail';
import KnowledgeBase from '../components/helpdesk/KnowledgeBase';

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

export default function HelpDesk() {
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('tickets');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['helpdesk_tickets', selectedOrgId],
    queryFn: () => base44.entities.HelpDeskTicket.filter(
      selectedOrgId ? { organization_id: selectedOrgId } : {},
      '-created_date'
    ),
    refetchInterval: 30000,
  });

  const filtered = tickets.filter(t => {
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.submitter_email?.toLowerCase().includes(search.toLowerCase()) ||
      t.submitter_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    critical: tickets.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length,
  };

  if (selectedTicket) {
    return (
      <div className="space-y-4">
        <TicketDetail
          ticket={selectedTicket}
          currentUser={user}
          onBack={() => setSelectedTicket(null)}
          onUpdate={(updated) => {
            setSelectedTicket(updated);
            queryClient.invalidateQueries(['helpdesk_tickets']);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            Help Desk
          </h1>
          <p className="text-slate-500 mt-1">Support tickets, remote sessions & live chat</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('https://www.hoptodesk.com', '_blank')}>
            <Monitor className="w-4 h-4 mr-2" />Get HopToDesk
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowNewTicket(true)}>
            <Plus className="w-4 h-4 mr-2" />New Ticket
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-4">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-2 px-1 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Ticket className="w-4 h-4" />Tickets
        </button>
        <button
          onClick={() => setActiveTab('kb')}
          className={`pb-2 px-1 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === 'kb' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <BookOpen className="w-4 h-4" />Knowledge Base
        </button>
      </div>

      {activeTab === 'kb' && <KnowledgeBase />}

      {activeTab === 'tickets' && <>
      {/* HopToDesk Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Monitor className="w-10 h-10 opacity-80" />
          <div>
            <p className="font-bold text-lg">Remote Support via HopToDesk</p>
            <p className="text-blue-100 text-sm">Free, encrypted remote desktop — clients share their HopToDesk ID when submitting a ticket for instant screen sharing support.</p>
          </div>
        </div>
        <Button
          className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shrink-0"
          onClick={() => window.open('https://www.hoptodesk.com', '_blank')}
        >
          Download HopToDesk <ExternalLink className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: 'In Progress', value: stats.in_progress, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: RefreshCw },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Critical', value: stats.critical, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
        ].map(s => (
          <Card key={s.label} className={`${s.bg} border-0`}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_client">Waiting on Client</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">🔴 Critical</SelectItem>
            <SelectItem value="high">🟠 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🟢 Low</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" />Refresh
        </Button>
      </div>

      {/* Ticket List */}
      <Card>
        <div className="divide-y">
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin mb-3" />
              <p className="text-slate-400">Loading tickets...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No tickets found</p>
              <p className="text-slate-400 text-sm mt-1">Create a new ticket to get started</p>
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setShowNewTicket(true)}>
                <Plus className="w-4 h-4 mr-2" />New Ticket
              </Button>
            </div>
          ) : (
            filtered.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-slate-400">{ticket.ticket_number}</span>
                      <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</Badge>
                      <Badge className={`text-xs ${STATUS_COLORS[ticket.status]}`}>{ticket.status?.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{ticket.category}</Badge>
                      {ticket.hoptodesk_id && (
                        <Badge className="text-xs bg-blue-100 text-blue-700">
                          <Monitor className="w-3 h-3 mr-1" />Remote ID: {ticket.hoptodesk_id}
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{ticket.title}</p>
                    <p className="text-sm text-slate-500 truncate mt-0.5">{ticket.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ticket.submitter_name || ticket.submitter_email}</span>
                      <span>·</span>
                      <span>{ticket.submitter_type}</span>
                      <span>·</span>
                      <span>{format(new Date(ticket.created_date), 'MMM d, yyyy HH:mm')}</span>
                      {ticket.assigned_to && <span>· Assigned: {ticket.assigned_to.split('@')[0]}</span>}
                    </div>
                  </div>
                  {ticket.screenshot_urls?.length > 0 && (
                    <img
                      src={ticket.screenshot_urls[0]}
                      alt="screenshot"
                      className="w-14 h-14 object-cover rounded border shrink-0"
                      onError={e => e.target.style.display = 'none'}
                    />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      </>}

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-600" />Submit a Support Ticket
            </DialogTitle>
          </DialogHeader>
          <TicketForm
            organizationId={selectedOrgId}
            currentUser={user}
            onSuccess={(ticket) => {
              setShowNewTicket(false);
              queryClient.invalidateQueries(['helpdesk_tickets']);
              setSelectedTicket(ticket);
            }}
            onCancel={() => setShowNewTicket(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}