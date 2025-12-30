import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Scan, FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function DiagnosticsWorkspace() {
  const { data: tests = [] } = useQuery({
    queryKey: ['diagnosticTests'],
    queryFn: () => base44.entities.DiagnosticTest.list('-created_date', 10),
  });

  const { data: imaging = [] } = useQuery({
    queryKey: ['imagingStudies'],
    queryFn: () => base44.entities.ImagingStudy.list('-created_date', 10),
  });

  const pendingTests = tests.filter(t => t.result_status === 'uploaded').length;
  const pendingImaging = imaging.filter(i => i.report_status === 'uploaded').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Diagnostics Workspace</h1>
        <p className="text-slate-500 mt-1">Tests and imaging - upload and report workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Tests</p>
                <p className="text-2xl font-bold">{pendingTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Scan className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Imaging</p>
                <p className="text-2xl font-bold">{pendingImaging}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed Today</p>
                <p className="text-2xl font-bold">{tests.length + imaging.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Awaiting Review</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No diagnostic tests yet</p>
            ) : (
              <div className="space-y-2">
                {tests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{test.test_type}</p>
                      <p className="text-sm text-slate-500">Patient: {test.patient_ref}</p>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      test.result_status === 'uploaded' ? 'bg-amber-100 text-amber-700' :
                      test.result_status === 'entered' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {test.result_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Imaging</CardTitle>
          </CardHeader>
          <CardContent>
            {imaging.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No imaging studies yet</p>
            ) : (
              <div className="space-y-2">
                {imaging.map((study) => (
                  <div key={study.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{study.modality} - {study.body_part}</p>
                      <p className="text-sm text-slate-500">Patient: {study.patient_ref}</p>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      study.report_status === 'uploaded' ? 'bg-amber-100 text-amber-700' :
                      study.report_status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {study.report_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Link to={createPageUrl('OrdersResults')}>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                Tests Queue
              </Button>
            </Link>
            <Link to={createPageUrl('OrdersResults')}>
              <Button className="w-full justify-start" variant="outline">
                <Scan className="w-4 h-4 mr-2" />
                Imaging Queue
              </Button>
            </Link>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Upload Results
            </Button>
            <Link to={createPageUrl('Reports')}>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}