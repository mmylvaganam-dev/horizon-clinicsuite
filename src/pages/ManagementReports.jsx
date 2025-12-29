import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileText, Download, TrendingUp, DollarSign, Package, Activity, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManagementReports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['managementReports'],
    queryFn: async () => {
      const bundles = await base44.entities.ExportBundle.list('-generated_at');
      return bundles.filter(b => b.notes === 'Monthly Management Pack Report');
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateManagementPack', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementReports'] });
      setDialogOpen(false);
      setPeriodStart('');
      setPeriodEnd('');
      setSelectedOrg('');
    },
  });

  const handleGenerate = () => {
    if (!periodStart || !periodEnd) return;
    
    generateMutation.mutate({
      organization_id: selectedOrg || null,
      period_start: periodStart,
      period_end: periodEnd
    });
  };

  const renderSummary = (summary) => {
    if (!summary) return null;

    return (
      <div className="space-y-4 mt-4 p-4 bg-slate-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">${summary.total_revenue?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-slate-600 mt-1">{summary.invoice_count || 0} invoices</p>
            </CardContent>
          </Card>

          {/* Pharmacy Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Pharmacy Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">${summary.pharmacy_summary?.total_revenue?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-slate-600 mt-1">{summary.pharmacy_summary?.total_sales || 0} sales</p>
              <p className="text-xs text-slate-500 mt-1">Avg: ${summary.pharmacy_summary?.average_sale?.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>

          {/* Lab Volume */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Lab Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{summary.lab_summary?.total_tests || 0}</p>
              <p className="text-sm text-slate-600 mt-1">TAT: {summary.lab_summary?.average_tat_hours || 0}h avg</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{summary.lab_summary?.signed || 0} signed</Badge>
                <Badge variant="outline" className="text-xs">{summary.lab_summary?.pending || 0} pending</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic Volume */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Diagnostics Signed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cardio:</span>
                  <span className="font-semibold">{summary.diagnostic_volume?.cardio || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">PFT:</span>
                  <span className="font-semibold">{summary.diagnostic_volume?.pft || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Radiology:</span>
                  <span className="font-semibold">{summary.diagnostic_volume?.radiology || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Services */}
        {summary.top_services && summary.top_services.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Services by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.top_services.slice(0, 5).map((service, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 truncate">{service.name}</span>
                    <Badge variant="outline">${service.revenue.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AR Aging */}
        {summary.ar_aging && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AR Aging</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Current (0-30 days)</span>
                  <span className="font-semibold">${summary.ar_aging.current?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">31-60 days</span>
                  <span className="font-semibold">${summary.ar_aging['30_days']?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">61-90 days</span>
                  <span className="font-semibold">${summary.ar_aging['60_days']?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">91-120 days</span>
                  <span className="font-semibold">${summary.ar_aging['90_days']?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Over 120 days</span>
                  <span className="font-semibold text-rose-600">${summary.ar_aging.over_90?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Management Reports</h1>
          <p className="text-slate-500 mt-1">Monthly management pack reports and analytics</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Management Pack</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Organization (Optional)</Label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Organizations</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleGenerate}
                disabled={!periodStart || !periodEnd || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No reports generated yet</h3>
          <p className="text-slate-500 mt-1">Click "Generate Report" to create your first management pack</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id}>
              <Card 
                className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Management Pack</Badge>
                      {report.organization_id && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {organizations.find(o => o.id === report.organization_id)?.name || 'Organization'}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-slate-900">
                      Period: {format(new Date(report.date_from), 'MMM d, yyyy')} - {format(new Date(report.date_to), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-slate-500">
                      Generated by {report.generated_by_email} • {format(new Date(report.generated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </Card>
              {expandedReport === report.id && renderSummary(report.summary_json)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}