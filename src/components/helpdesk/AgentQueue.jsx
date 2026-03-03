import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Clock, AlertCircle, CheckCircle2, UserCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700 animate-pulse'
};

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting_client: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600'
};

const LANE_CONFIG = [
  { key: 'open',           label: 'New / Open',        color: 'border-blue-400',   bg: 'bg-blue-50',   icon: Clock },
  { key: 'in_progress',   label: 'In Progress',        color: 'border-indigo-400', bg: 'bg-indigo-50', icon: UserCheck },
  { key: 'waiting_client', label: 'Waiting on Client', color: 'border-amber-400',  bg: 'bg-amber-50',  icon: AlertCircle },
  { key: 'resolved',      label: 'Resolved',           color: 'border-green-400',  bg: 'bg-green-50',  icon: CheckCircle2 },
];

function TicketCard({ ticket, onSelect }) {
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onSelect(ticket)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs text-slate-400">{ticket.ticket_number}</span>
        <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</Badge>
      </div>
      <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">{ticket.title}</p>
      <p className="text-xs text-slate-500 line-clamp-1">{ticket.submitter_name || ticket.submitter_email}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">{format(new Date(ticket.created_date), 'MMM d, HH:mm')}</span>
        {ticket.hoptodesk_id && (
          <Badge className="text-xs bg-blue-100 text-blue-600">
            <Monitor className="w-3 h-3 mr-1" />Remote
          </Badge>
        )}
      </div>
      {ticket.assigned_to && (
        <p className="text-xs text-teal-600 mt-1 truncate">→ {ticket.assigned_to.split('@')[0]}</p>
      )}
      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="outline" className="w-full text-xs h-7">
          Open Ticket <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function AgentQueue({ tickets, onSelect, currentUser }) {
  const [agentFilter, setAgentFilter] = useState('all');

  const activeAgents = [...new Set(tickets.map(t => t.assigned_to).filter(Boolean))];

  const filteredTickets = tickets.filter(t => {
    if (agentFilter === 'mine') return t.assigned_to === currentUser?.email;
    if (agentFilter === 'unassigned') return !t.assigned_to;
    return true;
  });

  const laneTickets = (status) => filteredTickets.filter(t => t.status === status);

  const criticalOpen = tickets.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved');

  return (
    <div className="space-y-4">
      {/* Critical Alert Banner */}
      {criticalOpen.length > 0 && (
        <div className="bg-red-600 text-white rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{criticalOpen.length} critical ticket{criticalOpen.length > 1 ? 's' : ''} require immediate attention!</p>
          <div className="flex gap-2 ml-auto shrink-0">
            {criticalOpen.slice(0, 3).map(t => (
              <button key={t.id} onClick={() => onSelect(t)} className="bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-xs font-mono">
                {t.ticket_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent Filter + Remote Support Quick Access */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">Show:</span>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="mine">Assigned to Me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-blue-400 text-blue-700 hover:bg-blue-50"
          onClick={() => window.open('https://www.hoptodesk.com', '_blank')}
        >
          <Monitor className="w-4 h-4 mr-2" />Open HopToDesk
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {/* Kanban Lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {LANE_CONFIG.map(lane => {
          const cards = laneTickets(lane.key);
          return (
            <div key={lane.key} className={`rounded-xl border-t-4 ${lane.color} ${lane.bg} p-3`}>
              <div className="flex items-center gap-2 mb-3">
                <lane.icon className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">{lane.label}</span>
                <span className="ml-auto bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cards.length}
                </span>
              </div>
              <div className="space-y-2">
                {cards.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No tickets</p>
                ) : (
                  cards.map(t => <TicketCard key={t.id} ticket={t} onSelect={onSelect} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}