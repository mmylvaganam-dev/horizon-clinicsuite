import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function OperationsReports() {
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState('daily');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const reports = [
    {
      name: 'Daily Close Report',
      description: 'Income, expenses, deposits, and variance',
      type: 'daily'
    },
    {
      name: 'Monthly P&L',
      description: 'Income vs expenses by stream',
      type: 'monthly'
    },
    {
      name: 'Yearly Summary',
      description: 'Annual financial overview',
      type: 'yearly'
    },
    {
      name: 'Payroll Summary',
      description: 'Staff payments by type',
      type: 'payroll'
    },
    {
      name: 'Provider Productivity',
      description: 'Consults, scans, tests and payouts',
      type: 'productivity'
    },
    {
      name: 'Vendor Spend',
      description: 'Supplier and contractor expenses',
      type: 'vendor'
    },
    {
      name: 'Bank Snapshot',
      description: 'Account balances and statements',
      type: 'bank'
    }
  ];

  const handleRunReport = (type) => {
    // This would call a backend function to generate PDF
    console.log(`Running ${type} report for ${reportDate}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Operations Reports</h1>
        <p className="text-slate-500 mt-1">Financial and operational reporting</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Report Date</label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Report Period</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.type} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{report.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                  <Button 
                    size="sm" 
                    className="mt-3"
                    onClick={() => handleRunReport(report.type)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Run Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}