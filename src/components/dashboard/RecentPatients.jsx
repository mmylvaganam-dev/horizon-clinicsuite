import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function RecentPatients({ patients, onViewAll }) {
  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">Recent Patients</CardTitle>
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
        {patients.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No patients yet</p>
          </div>
        ) : (
          patients.map((patient) => (
            <Link 
              key={patient.id} 
              to={createPageUrl(`PatientDetails?id=${patient.id}`)}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              {patient.photo_url ? (
                <img 
                  src={patient.photo_url} 
                  alt={`${patient.first_name} ${patient.last_name}`}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-violet-500/20">
                  {patient.first_name?.[0]}{patient.last_name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {patient.first_name} {patient.last_name}
                </p>
                <p className="text-sm text-slate-500">
                  Added {format(new Date(patient.created_date), 'MMM d, yyyy')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}