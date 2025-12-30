import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePatientAccess() {
  const { data: user } = useQuery({
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

  const roleNames = userRoles.map(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code || role?.role_name;
  }).filter(Boolean);

  const hasRole = (roleName) => roleNames.includes(roleName);

  const isPhysician = hasRole('PHYSICIAN');
  const isClinicAdmin = hasRole('CLINIC_ADMIN_STAFF');
  const isLabTech = hasRole('LAB_TECH');
  const isPharmacist = hasRole('PHARMACIST');
  const isDiagnosticsTech = hasRole('DIAGNOSTICS_TECH');
  const isDirector = hasRole('DIRECTOR_REPORT_VIEWER');
  const isPlatformOwner = hasRole('PLATFORM_OWNER');
  const isOrgSuperUser = hasRole('ORG_SUPER_USER');

  // Access levels
  const canViewFullChart = isPhysician || isPlatformOwner || isOrgSuperUser;
  const canViewBasicProfile = isClinicAdmin || isLabTech || isPharmacist || isDiagnosticsTech || canViewFullChart;
  const canViewAppointments = isClinicAdmin || canViewFullChart;
  const canViewClinicalNotes = canViewFullChart;
  const canViewLabResults = isLabTech || canViewFullChart;
  const canViewPrescriptions = isPharmacist || canViewFullChart;
  const canViewDiagnostics = isDiagnosticsTech || canViewFullChart;
  const canViewBilling = canViewFullChart;
  const canViewTasks = canViewFullChart;
  const canViewReferrals = canViewFullChart;
  const noPatientAccess = isDirector && !canViewFullChart;

  return {
    user,
    roleNames,
    canViewFullChart,
    canViewBasicProfile,
    canViewAppointments,
    canViewClinicalNotes,
    canViewLabResults,
    canViewPrescriptions,
    canViewDiagnostics,
    canViewBilling,
    canViewTasks,
    canViewReferrals,
    noPatientAccess,
    isPhysician,
    isClinicAdmin,
    isLabTech,
    isPharmacist,
    isDiagnosticsTech,
    isDirector,
  };
}

export async function logPatientProfileView(user, patientId, accessLevel) {
  try {
    await base44.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      organization_id: '',
      location_id: '',
      patient_id: patientId,
      module: 'PATIENT_ACCESS',
      action: 'view',
      record_type: 'Patient',
      record_id: patientId,
      metadata: {
        access_level: accessLevel,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log patient profile view:', error);
  }
}