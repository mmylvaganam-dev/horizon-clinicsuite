import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/components/OrganizationProvider';
import { MessageSquare, CheckCircle2, XCircle, Clock, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function SmsLogs() {
  const { selectedOrgId } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: smsLogs = [], isLoading } = useQuery({
    queryKey: ['smsLogs', selectedOrgId],
    queryFn: async () => {
      const filter = selectedOrgId ? { organization_id: selectedOrgId } : {};
      return await base44.entities.SmsOutbox.filter(filter, '-created_date', 200);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const filteredLogs = smsLogs.filter(log => {
    const matchesSearch = searchTerm.length === 0 || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sent_by_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.campaign_id?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || log.provider_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: smsLogs.length,
    sent: smsLogs.filter(s => s.provider_status === 'sent').length,
    failed: smsLogs.filter(s => s.provider_status === 'failed').length,
    pending: smsLogs.filter(s => s.provider_status === 'pending').length,
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-teal-600" />
          SMS Logs
        </h1>
        <p className="text-slate-600 mt-2">
          View all SMS messages sent via Dialog eSMS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Messages</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <div className="text-sm text-slate-600">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-slate-600">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>Message History</CardTitle>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'sent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('sent')}
                >
                  Sent
                </Button>
                <Button
                  variant={statusFilter === 'failed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('failed')}
                >
                  Failed
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No SMS logs found</div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(log.provider_status)}
                        <span className="text-sm text-slate-500">
                          {format(new Date(log.created_date), 'MMM dd, yyyy HH:mm')}
                        </span>
                        {log.campaign_id && (
                          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                            ID: {log.campaign_id}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-700 mb-1">
                        <strong>To:</strong> {log.recipient_count} recipient(s)
                      </div>
                      <div className="text-sm text-slate-600 mb-2">
                        "{log.message}"
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>Sent by: {log.sent_by_email}</span>
                        {log.source_address && <span>Mask: {log.source_address}</span>}
                        {log.err_code && <span className="text-red-600">Error: {log.err_code}</span>}
                      </div>
                      {log.provider_comment && (
                        <div className="text-xs text-slate-500 mt-1 italic">
                          {log.provider_comment}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}