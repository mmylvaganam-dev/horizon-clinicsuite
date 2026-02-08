import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Building2, User, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function OrgAdminAuditReport() {
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['allDeletionRequests'],
    queryFn: () => base44.entities.SaleDeletionRequest.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  // Filter by organization
  const filteredRequests = selectedOrgId === 'all' 
    ? allRequests 
    : allRequests.filter(r => r.organization_id === selectedOrgId);

  // Group by reviewer
  const byReviewer = filteredRequests.reduce((acc, req) => {
    if (!req.reviewed_by) return acc;
    if (!acc[req.reviewed_by]) {
      acc[req.reviewed_by] = { approved: 0, rejected: 0, total: 0, totalAmount: 0 };
    }
    acc[req.reviewed_by].total++;
    acc[req.reviewed_by].totalAmount += req.sale_amount || 0;
    if (req.status === 'approved') acc[req.reviewed_by].approved++;
    if (req.status === 'rejected') acc[req.reviewed_by].rejected++;
    return acc;
  }, {});

  // Group by organization
  const byOrganization = filteredRequests.reduce((acc, req) => {
    if (!acc[req.organization_id]) {
      const org = organizations.find(o => o.id === req.organization_id);
      acc[req.organization_id] = {
        name: org?.name || 'Unknown',
        approved: 0,
        rejected: 0,
        pending: 0,
        totalAmount: 0
      };
    }
    acc[req.organization_id][req.status]++;
    acc[req.organization_id].totalAmount += req.sale_amount || 0;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          Organization Admin Audit Report
        </h1>
      </div>

      <Card className="bg-blue-50 border-2 border-blue-300">
        <CardContent className="pt-6">
          <p className="text-blue-900 font-medium">
            🔍 Platform Owner View: Track all sale deletion actions performed by organization administrators across all companies
          </p>
        </CardContent>
      </Card>

      {/* Organization Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Filter by Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary by Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Actions by Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byOrganization).map(([orgId, stats]) => (
              <div key={orgId} className="border rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg">{stats.name}</p>
                    <p className="text-sm text-slate-600">Total Amount: ${stats.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Approved: {stats.approved}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm">Rejected: {stats.rejected}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">Pending: {stats.pending}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary by Reviewer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Actions by Admin User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byReviewer).map(([email, stats]) => (
              <div key={email} className="border rounded-lg p-4 bg-slate-50">
                <p className="font-bold">{email}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-green-600">✅ Approved: {stats.approved}</span>
                  <span className="text-red-600">❌ Rejected: {stats.rejected}</span>
                  <span className="text-slate-600">Total: {stats.total}</span>
                  <span className="text-blue-600">Amount: ${stats.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detailed Activity Log ({filteredRequests.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredRequests.filter(r => r.reviewed_by).map((request) => {
              const org = organizations.find(o => o.id === request.organization_id);
              return (
                <div key={request.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold">{request.sale_number}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mt-1">
                        <span>Organization: {org?.name}</span>
                        <span>Amount: ${request.sale_amount?.toFixed(2)}</span>
                        <span>Requested by: {request.requested_by_name}</span>
                        <span>Reviewed by: {request.reviewed_by}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      {request.review_notes && (
                        <p className="text-sm text-slate-500 mt-2 bg-slate-50 p-2 rounded">
                          Notes: {request.review_notes}
                        </p>
                      )}
                    </div>
                    <Badge className={request.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}>
                      {request.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}