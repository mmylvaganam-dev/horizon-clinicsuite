import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, Search, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function AdminBreakGlassReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: breakGlassLogs = [], isLoading } = useQuery({
    queryKey: ['breakGlassLogs'],
    queryFn: () => base44.entities.BreakGlassLog.list('-started_at', 100),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : patientId;
  };

  const filteredLogs = breakGlassLogs.filter(log => {
    const matchesSearch = 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.patient_id?.includes(searchTerm) ||
      log.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const logDate = new Date(log.started_at);
    const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || logDate <= new Date(dateTo);
    
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Patient', 'Reason', 'Approved By', 'Duration'];
    const rows = filteredLogs.map(log => {
      const duration = log.ended_at 
        ? Math.round((new Date(log.ended_at) - new Date(log.started_at)) / 60000) 
        : 'Ongoing';
      return [
        format(new Date(log.started_at), 'yyyy-MM-dd HH:mm'),
        log.user_email,
        getPatientName(log.patient_id),
        log.reason,
        log.approved_by_email || 'N/A',
        duration
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `break-glass-report-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Break-Glass Access Report</h1>
          <p className="text-slate-500 mt-1">Emergency access audit log</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Events</p>
              <p className="text-2xl font-bold">{breakGlassLogs.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Last 7 Days</p>
              <p className="text-2xl font-bold">
                {breakGlassLogs.filter(log => {
                  const days = Math.floor((new Date() - new Date(log.started_at)) / (1000 * 60 * 60 * 24));
                  return days <= 7;
                }).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ongoing</p>
              <p className="text-2xl font-bold">
                {breakGlassLogs.filter(log => !log.ended_at).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by user, patient, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="flex gap-3">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From date"
              className="w-48"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To date"
              className="w-48"
            />
            {(searchTerm || dateFrom || dateTo) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No break-glass events found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const duration = log.ended_at 
              ? Math.round((new Date(log.ended_at) - new Date(log.started_at)) / 60000)
              : null;

            return (
              <Card key={log.id} className="p-5 bg-white border-2 border-red-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        BREAK-GLASS
                      </Badge>
                      {!log.ended_at && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                          Ongoing
                        </Badge>
                      )}
                      {log.approved_by && (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">
                      {log.user_email}
                      <span className="text-slate-400 mx-2">→</span>
                      Patient: {getPatientName(log.patient_id)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <strong>Reason:</strong> {log.reason}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Started: {format(new Date(log.started_at), 'MMM d, yyyy h:mm a')}</span>
                      {log.ended_at && (
                        <span>Ended: {format(new Date(log.ended_at), 'MMM d, yyyy h:mm a')}</span>
                      )}
                      {duration !== null && (
                        <span>Duration: {duration} min</span>
                      )}
                    </div>
                    {log.approved_by && (
                      <p className="text-xs text-green-600 mt-1">
                        Approved by: {log.approved_by_email}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}