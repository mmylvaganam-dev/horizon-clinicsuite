import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Search, Filter, Clock, User, Package } from 'lucide-react';
import { format } from 'date-fns';

const MODULE_COLORS = {
  pharmacy: 'bg-blue-100 text-blue-800',
  clinical: 'bg-green-100 text-green-800',
  dental: 'bg-purple-100 text-purple-800',
  lab: 'bg-orange-100 text-orange-800',
  diagnostics: 'bg-red-100 text-red-800',
  home_care: 'bg-cyan-100 text-cyan-800',
  sales: 'bg-amber-100 text-amber-800',
  reports: 'bg-indigo-100 text-indigo-800',
  admin: 'bg-slate-100 text-slate-800',
  finance: 'bg-emerald-100 text-emerald-800'
};

const ACTION_ICONS = {
  create: '✨',
  read: '👁️',
  update: '✏️',
  delete: '🗑️',
  process: '⚙️',
  complete: '✅',
  approve: '👍',
  reject: '❌',
  print: '🖨️',
  export: '📤'
};

export default function ActivityLog() {
  const [filters, setFilters] = useState({
    module: 'all',
    action_type: 'all',
    search: '',
    patient_id: '',
    user_email: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['auditLog', filters],
    queryFn: async () => {
      const query = {};
      
      if (user?.organization_id) {
        query.organization_id = user.organization_id;
      }
      
      if (filters.module !== 'all') {
        query.module = filters.module;
      }
      
      if (filters.action_type !== 'all') {
        query.action_type = filters.action_type;
      }
      
      if (filters.patient_id) {
        query.patient_id = filters.patient_id;
      }
      
      if (filters.user_email) {
        query.user_email = filters.user_email;
      }

      const results = await base44.entities.AuditLog.filter(query, '-timestamp', 500);
      
      // Client-side search
      if (filters.search) {
        return results.filter(log =>
          log.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
          log.entity_type?.toLowerCase().includes(filters.search.toLowerCase()) ||
          log.user_name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      return results;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Activity Log</h1>
            <p className="text-slate-300 mt-1">Track all actions across your organization</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Description, entity, user..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Module Filter */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Module</label>
              <Select value={filters.module} onValueChange={(value) => setFilters({...filters, module: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="diagnostics">Diagnostics</SelectItem>
                  <SelectItem value="home_care">Home Care</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Type Filter */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Action</label>
              <Select value={filters.action_type} onValueChange={(value) => setFilters({...filters, action_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="process">Process</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="print">Print</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">Loading activities...</p>
          </Card>
        ) : activities.length === 0 ? (
          <Card className="p-8 text-center">
            <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No activities found</p>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id} className="border-l-4 border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge className={MODULE_COLORS[activity.module]}>
                        {activity.module}
                      </Badge>
                      <span className="text-lg">{ACTION_ICONS[activity.action_type] || '→'}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.entity_type}
                      </Badge>
                      {activity.status === 'failure' && (
                        <Badge className="bg-red-100 text-red-800">Failed</Badge>
                      )}
                    </div>

                    <p className="font-semibold text-slate-900 mb-1">
                      {activity.description}
                    </p>

                    <div className="grid md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="w-4 h-4" />
                        <span>{activity.user_name || activity.user_email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                      </div>
                      {activity.patient_id && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Package className="w-4 h-4" />
                          <span>Patient: {activity.patient_id}</span>
                        </div>
                      )}
                    </div>

                    {activity.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {activity.error_message}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}