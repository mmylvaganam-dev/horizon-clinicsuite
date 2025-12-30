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
    if (user && userRoles.length > 0 && allRoles.length > 0) {
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
        // Default to EMR if no specific workspace role
        navigate(createPageUrl('EMR'));
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="p-8 text-center max-w-md">
        <CardContent>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome to Horizon ClinicSuite</h2>
          <p className="text-slate-600 mb-6">Select your workspace:</p>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => navigate(createPageUrl('PhysicianWorkspace'))}>
              Physician Workspace
            </Button>
            <Button className="w-full" onClick={() => navigate(createPageUrl('FrontDeskWorkspace'))}>
              Front Desk Workspace
            </Button>
            <Button className="w-full" onClick={() => navigate(createPageUrl('PharmacyWorkspace'))}>
              Pharmacy Workspace
            </Button>
            <Button className="w-full" onClick={() => navigate(createPageUrl('LabWorkspace'))}>
              Lab Workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}