import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'in-progress': 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  'no-show': 'bg-red-100 text-red-700 border-red-200',
};

export default function AppointmentsList({ appointments, title = "Today's Appointments", onViewAll }) {
  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
          {onViewAll && (
            <button 
              onClick={onViewAll}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No appointments scheduled</p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div 
              key={appointment.id} 
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-teal-500/20">
                {appointment.time?.slice(0, 2) || '00'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{appointment.patient_name || 'Unknown Patient'}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{appointment.time || 'No time set'}</span>
                  <span className="text-slate-300">•</span>
                  <span>{appointment.duration || 30} min</span>
                </div>
              </div>
              <Badge variant="outline" className={`${statusColors[appointment.status] || statusColors.scheduled} border`}>
                {appointment.status?.replace('-', ' ') || 'scheduled'}
              </Badge>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}