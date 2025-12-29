import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ArrowLeft, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const actionColors = {
  view: 'bg-blue-100 text-blue-700 border-blue-200',
  create: 'bg-green-100 text-green-700 border-green-200',
  update: 'bg-amber-100 text-amber-700 border-amber-200',
  delete: 'bg-rose-100 text-rose-700 border-rose-200',
  export: 'bg-purple-100 text-purple-700 border-purple-200',
  print: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100),
  });

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.patient_id?.includes(searchTerm);
    
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesModule && matchesAction;
  });

  const uniqueModules = [...new Set(auditLogs.map(log => log.module))].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 mt-1">{auditLogs.length} recent activities</p>
        </div>
      </div>

      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by user, record type, patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {uniqueModules.map(mod => (
                  <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="print">Print</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No audit logs found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={`${actionColors[log.action] || 'bg-slate-100 text-slate-700 border-slate-200'} border`}>
                          {log.action}
                        </Badge>
                        <Badge variant="outline">{log.module}</Badge>
                        <span className="text-sm text-slate-900">{log.record_type}</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">{log.user_email}</span>
                        {log.patient_id && <span className="text-slate-400"> • Patient: {log.patient_id}</span>}
                        {log.record_id && <span className="text-slate-400"> • Record: {log.record_id}</span>}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">
                        {format(new Date(log.timestamp || log.created_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(log.timestamp || log.created_date), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}