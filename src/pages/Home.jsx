import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: user.id });
      return roles;
    },
    enabled: !!user,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  useEffect(() => {
    if (user && allRoles.length > 0) {
      if (userRoles.length > 0) {
        const roleNames = userRoles.map(ur => {
          const role = allRoles.find(r => r.id === ur.role_id);
          return role?.role_name || role?.code;
        });

        // Priority routing based on primary role
        if (roleNames.includes('PLATFORM_OWNER')) {
          navigate(createPageUrl('OwnerWorkspace'));
        } else if (roleNames.includes('PHYSICIAN')) {
          navigate(createPageUrl('PhysicianWorkspace'));
        } else if (roleNames.includes('CLINIC_ADMIN_STAFF') || roleNames.includes('RECEPTION')) {
          navigate(createPageUrl('FrontDeskWorkspace'));
        } else if (roleNames.includes('PHARMACIST')) {
          navigate(createPageUrl('PharmacyWorkspace'));
        } else if (roleNames.includes('LAB_TECH')) {
          navigate(createPageUrl('LabWorkspace'));
        } else if (roleNames.includes('DIAGNOSTICS_TECH')) {
          navigate(createPageUrl('DiagnosticsWorkspace'));
        } else if (roleNames.includes('FINANCE_USER')) {
          navigate(createPageUrl('FinanceDashboard'));
        } else {
          // Default to DailyOps if no specific workspace role
          navigate(createPageUrl('DailyOps'));
        }
      }
    }
  }, [user, userRoles, allRoles, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <CardContent className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            <p className="text-slate-600">Loading your workspace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user has no roles, show access message
  if (user && userRoles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="p-8 text-center max-w-lg shadow-xl">
          <CardContent>
            <div className="mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Pending</h2>
              <p className="text-slate-600 mb-4">
                Welcome, {user.full_name || user.email}! Your account needs to be assigned a role before you can access the system.
              </p>
              <div className="p-4 bg-blue-50 rounded-lg text-sm text-slate-700">
                <p className="font-medium mb-2">Next Steps:</p>
                <ul className="text-left space-y-1">
                  <li>• Contact your administrator to assign you a role</li>
                  <li>• Once assigned, refresh this page</li>
                  <li>• You'll be redirected to your workspace automatically</li>
                </ul>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="p-8 text-center max-w-md">
        <CardContent>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome to Horizon ClinicSuite</h2>
          <p className="text-slate-600 mb-6">Select your workspace:</p>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => navigate(createPageUrl('DailyOps'))}>
              Daily Operations
            </Button>
            <Button className="w-full" onClick={() => navigate(createPageUrl('PharmacyDashboard'))}>
              Pharmacy
            </Button>
            <Button className="w-full" onClick={() => navigate(createPageUrl('Patients'))}>
              Patients
            </Button>
            <Button className="w-full" onClick={() => navigate(createPageUrl('Appointments'))}>
              Appointments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}