import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePatientAccess() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // CRITICAL: Platform owner check FIRST - independent of roles
  const isPlatformOwnerByEmail = user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                                  user?.email === 'mylvaganam@premierhealthcanada.ca' ||
                                  user?.is_platform_owner === true;

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: user.id });
      return roles;
    },
    enabled: !!user && !isPlatformOwnerByEmail,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: !isPlatformOwnerByEmail,
  });

  // While user is still loading, return a neutral "loading" state (not denied)
  if (!user) {
    return {
      user: null,
      roleNames: [],
      canViewFullChart: false,
      canViewBasicProfile: false,
      canViewAppointments: false,
      canViewClinicalNotes: false,
      canViewLabResults: false,
      canViewPrescriptions: false,
      canViewDiagnostics: false,
      canViewBilling: false,
      canViewTasks: false,
      canViewReferrals: false,
      noPatientAccess: false,
      isPhysician: false,
      isClinicAdmin: false,
      isLabTech: false,
      isPharmacist: false,
      isDiagnosticsTech: false,
      isDirector: false,
      isPlatformOwner: false,
      isLoading: true,
    };
  }

  // If platform owner, grant ALL permissions immediately without checking roles
  if (isPlatformOwnerByEmail) {
    return {
      user,
      roleNames: ['PLATFORM_OWNER'],
      canViewFullChart: true,
      canViewBasicProfile: true,
      canViewAppointments: true,
      canViewClinicalNotes: true,
      canViewLabResults: true,
      canViewPrescriptions: true,
      canViewDiagnostics: true,
      canViewBilling: true,
      canViewTasks: true,
      canViewReferrals: true,
      noPatientAccess: false,
      isPhysician: true,
      isClinicAdmin: true,
      isLabTech: true,
      isPharmacist: true,
      isDiagnosticsTech: true,
      isDirector: false,
      isPlatformOwner: true,
    };
  }

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