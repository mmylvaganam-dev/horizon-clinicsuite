import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Archive, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const recordTypeColors = {
  Result: 'from-purple-500 to-purple-600',
  Order: 'from-blue-500 to-blue-600',
  Invoice: 'from-green-500 to-green-600',
  Patient: 'from-teal-500 to-teal-600',
  Appointment: 'from-amber-500 to-amber-600',
  MedicalRecord: 'from-indigo-500 to-indigo-600',
};

export default function AdminArchive() {
  const [searchTerm, setSearchTerm] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');

  const { data: archives = [], isLoading } = useQuery({
    queryKey: ['archiveRecords'],
    queryFn: () => base44.entities.ArchiveRecord.list('-archived_at'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const getPatientName = (patientRef) => {
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const filteredArchives = archives.filter(archive => {
    const patientName = archive.patient_ref ? getPatientName(archive.patient_ref).toLowerCase() : '';
    const matchesSearch = 
      patientName.includes(searchTerm.toLowerCase()) ||
      archive.record_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      archive.archived_by_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = recordTypeFilter === 'all' || archive.record_type === recordTypeFilter;
    return matchesSearch && matchesType;
  });

  const recordTypes = [...new Set(archives.map(a => a.record_type))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Archive Management</h1>
        <p className="text-slate-500 mt-1">View and manage archived records</p>
      </div>

      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by patient name, record ID, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {recordTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{archives.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {archives.filter(a => {
                const archivedDate = new Date(a.archived_at);
                const now = new Date();
                return archivedDate.getMonth() === now.getMonth() && 
                       archivedDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Record Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{recordTypes.length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredArchives.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <Archive className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No archived records found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredArchives.map((archive) => (
            <Card key={archive.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${recordTypeColors[archive.record_type] || 'from-slate-500 to-slate-600'} flex items-center justify-center flex-shrink-0`}>
                  <Archive className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      {archive.record_type}
                    </Badge>
                    {archive.patient_ref && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {getPatientName(archive.patient_ref)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-900 font-medium">
                    Record ID: {archive.record_id}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Archived by: {archive.archived_by_email} • {format(new Date(archive.archived_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  {archive.reason && (
                    <p className="text-sm text-slate-600 mt-2">
                      Reason: {archive.reason}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}