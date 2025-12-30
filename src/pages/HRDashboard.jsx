import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle, Calendar, FileText } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function HRDashboard() {
  const navigate = useNavigate();

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.StaffCredentialDocument.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['upcomingShifts'],
    queryFn: () => base44.entities.ShiftRoster.filter({ status: 'planned' }),
  });

  const activeStaff = staff.filter(s => s.status === 'active');
  
  const expiringCredentials = credentials.filter(c => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(new Date(c.expiry_date), new Date());
    return days >= 0 && days <= 90;
  });

  const credentialsExpiring30 = expiringCredentials.filter(c => {
    const days = differenceInDays(new Date(c.expiry_date), new Date());
    return days <= 30;
  });

  const credentialsExpiring60 = expiringCredentials.filter(c => {
    const days = differenceInDays(new Date(c.expiry_date), new Date());
    return days > 30 && days <= 60;
  });

  const credentialsExpiring90 = expiringCredentials.filter(c => {
    const days = differenceInDays(new Date(c.expiry_date), new Date());
    return days > 60 && days <= 90;
  });

  const getStaffName = (staffRef) => {
    const member = staff.find(s => s.id === staffRef);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">HR Dashboard</h1>
        <p className="text-slate-500 mt-1">Human resources overview and alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Staff</p>
                <p className="text-2xl font-bold">{activeStaff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Expiring (30d)</p>
                <p className="text-2xl font-bold">{credentialsExpiring30.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Expiring (60d)</p>
                <p className="text-2xl font-bold">{credentialsExpiring60.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Upcoming Shifts</p>
                <p className="text-2xl font-bold">{shifts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {credentialsExpiring30.length > 0 && (
        <Card className="bg-rose-50 border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Critical: Credentials Expiring Within 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {credentialsExpiring30.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-semibold">{getStaffName(cred.staff_ref)}</p>
                    <p className="text-sm text-slate-600">{cred.doc_type} - {cred.doc_number}</p>
                  </div>
                  <Badge className="bg-rose-100 text-rose-700">
                    Expires {format(new Date(cred.expiry_date), 'MMM d, yyyy')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Credentials Expiring 31-60 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {credentialsExpiring60.length === 0 ? (
              <p className="text-center text-slate-500 py-8">None expiring in this period</p>
            ) : (
              <div className="space-y-2">
                {credentialsExpiring60.map((cred) => (
                  <div key={cred.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{getStaffName(cred.staff_ref)}</p>
                      <p className="text-sm text-slate-500">{cred.doc_type}</p>
                    </div>
                    <span className="text-xs text-amber-600">
                      {format(new Date(cred.expiry_date), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credentials Expiring 61-90 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {credentialsExpiring90.length === 0 ? (
              <p className="text-center text-slate-500 py-8">None expiring in this period</p>
            ) : (
              <div className="space-y-2">
                {credentialsExpiring90.map((cred) => (
                  <div key={cred.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{getStaffName(cred.staff_ref)}</p>
                      <p className="text-sm text-slate-500">{cred.doc_type}</p>
                    </div>
                    <span className="text-xs text-blue-600">
                      {format(new Date(cred.expiry_date), 'MMM d')}
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
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" onClick={() => navigate(createPageUrl('StaffDirectory'))}>
            <Users className="w-4 h-4 mr-2" />
            Staff Directory
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl('Scheduling'))}>
            <Calendar className="w-4 h-4 mr-2" />
            Scheduling
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl('PayrollManagement'))}>
            <FileText className="w-4 h-4 mr-2" />
            Payroll
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}