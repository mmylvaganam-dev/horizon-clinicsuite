import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ClipboardList, FileText } from 'lucide-react';

// Derives outstanding tasks from appointments (unsigned notes, pending billing, etc.)
export default function ProviderTasksPanel({ appointments }) {
  const tasks = [];

  appointments.forEach(appt => {
    if (appt.status === 'COMPLETED' && !appt.soap_note) {
      tasks.push({
        type: 'note',
        label: `SOAP Note missing`,
        detail: `${appt.patient_name || 'Patient'} — ${appt.appointment_type || 'Consultation'}`,
        priority: 'high',
        id: appt.id,
      });
    }
    if (appt.status === 'COMPLETED' && appt.billing_status === 'pending') {
      tasks.push({
        type: 'billing',
        label: `Billing pending`,
        detail: `${appt.patient_name || 'Patient'} — $${appt.billing_amount_usd || 0} USD`,
        priority: 'medium',
        id: appt.id + '_billing',
      });
    }
    if (appt.second_opinion_request_id && appt.status === 'COMPLETED' && !appt.diagnosis) {
      tasks.push({
        type: 'opinion',
        label: `Second opinion not finalized`,
        detail: appt.patient_name || 'Patient',
        priority: 'high',
        id: appt.id + '_opinion',
      });
    }
  });

  const PRIORITY_COLORS = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700' };
  const TYPE_ICONS = {
    note: FileText,
    billing: AlertCircle,
    opinion: ClipboardList,
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-slate-500" />
          Outstanding Tasks
          {tasks.length > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 text-xs">{tasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 py-3 text-center">All tasks complete ✓</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const Icon = TYPE_ICONS[task.type];
              return (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{task.label}</p>
                      <Badge className={`${PRIORITY_COLORS[task.priority]} border-0 text-xs py-0`}>{task.priority}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{task.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}