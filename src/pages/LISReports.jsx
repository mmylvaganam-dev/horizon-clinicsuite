import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText } from 'lucide-react';

export default function LISReports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LIS Reports</h1>
        <p className="text-slate-500 mt-1">Laboratory reporting and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Daily Workload', icon: BarChart3, description: 'Daily test volume and TAT' },
          { title: 'Monthly Volume', icon: BarChart3, description: 'Monthly test counts by type' },
          { title: 'Critical Results', icon: FileText, description: 'Critical value log and acknowledgments' },
          { title: 'QC Summary', icon: FileText, description: 'QC pass/fail trends' },
          { title: 'TAT Analysis', icon: BarChart3, description: 'Turnaround time by test type' },
          { title: 'Specimen Rejection', icon: FileText, description: 'Rejection reasons and trends' }
        ].map((report) => (
          <Card key={report.title} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <report.icon className="w-5 h-5 text-teal-600" />
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}