import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const MODULE_PERMISSIONS = {
  PHYSICIAN: {
    emr: { view: true, create: true, update: true, sign: true },
    orders: { view: true, create: true, review: true, sign: true, release: true },
    results: { view: true, review: true, sign: true, release: true },
    diagnostics: { view: true, sign: true, release: true },
    lis: { view: true },
    pharmacy: { view_prescriptions: true, create_prescriptions: true, verify: false, dispense: false, pos: false },
    billing: { view_patient_invoices: true, create: false, reports: false },
    reports: { view: true, export: true },
    patients: { full_chart: true },
    payroll: { view: false },
    shareholder: { view: false }
  },
  LAB_TECH: {
    emr: { view: false },
    orders: { view_lab_only: true },
    results: { enter: true, edit: true, sign: false },
    lis: { view_basic_profile: true, enter_results: true },
    pharmacy: { view: false },
    billing: { view: false },
    reports: { view: false },
    patients: { basic_profile: true },
    payroll: { view: false },
    shareholder: { view: false },
    diagnostics: { view: false }
  },
  PHARMACIST: {
    emr: { view: false },
    pharmacy: { view_prescriptions: true, verify: true, dispense: true, pos: true, inventory: true },
    patients: { basic_profile: true, view_prescriptions_readonly: true },
    billing: { view: false },
    reports: { view: false },
    payroll: { view: false },
    shareholder: { view: false },
    orders: { view: false }
  },
  CLINIC_ADMIN_STAFF: {
    emr: { view: false },
    pms: { scheduling: true, registrations: true, demographics: true },
    patients: { basic_profile: true, appointments: true },
    billing: { view: false },
    reports: { view: false },
    orders: { view: false },
    results: { view: false },
    payroll: { view: false },
    shareholder: { view: false }
  },
  DIRECTOR_REPORT_VIEWER: {
    reports: { view_aggregated: true, no_patient_lists: true, no_patient_exports: true },
    patients: { view: false },
    emr: { view: false },
    billing: { view: false },
    payroll: { view: false },
    shareholder: { view: false }
  },
  FINANCE_USER: {
    billing: { view: true, reports: true, export_with_reason: true },
    accounting: { view: true, reports: true },
    emr: { view: false },
    patients: { view: false },
    reports: { view: true, export: true },
    payroll: { view: false },
    shareholder: { view: false }
  },
  ORG_SUPER_USER: {
    all: true
  },
  PLATFORM_OWNER: {
    all: true
  }
};

export function useModulePermissions() {
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
    return role?.role_name;
  }).filter(Boolean);

  const hasPermission = (module, action) => {
    // Super users have all permissions
    if (roleNames.includes('PLATFORM_OWNER') || roleNames.includes('ORG_SUPER_USER')) {
      return true;
    }

    // Check each role's permissions
    for (const roleName of roleNames) {
      const rolePerms = MODULE_PERMISSIONS[roleName];
      if (!rolePerms) continue;

      if (rolePerms.all) return true;

      if (rolePerms[module]?.[action]) {
        return true;
      }
    }

    return false;
  };

  const canExport = (module) => {
    return hasPermission(module, 'export') || hasPermission(module, 'export_with_reason');
  };

  const requiresExportReason = (module) => {
    return hasPermission(module, 'export_with_reason') && !hasPermission(module, 'export');
  };

  return {
    user,
    roleNames,
    hasPermission,
    canExport,
    requiresExportReason,
  };
}

export async function logExportAction(user, module, exportType, reason, metadata = {}) {
  try {
    await base44.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      organization_id: metadata.organization_id || '',
      location_id: metadata.location_id || '',
      patient_id: metadata.patient_id || '',
      module: module,
      action: 'export',
      record_type: exportType,
      record_id: '',
      metadata: {
        export_type: exportType,
        reason: reason,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  } catch (error) {
    console.error('Failed to log export action:', error);
  }
}

export async function logPrintAction(user, module, printType, metadata = {}) {
  try {
    await base44.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      organization_id: metadata.organization_id || '',
      location_id: metadata.location_id || '',
      patient_id: metadata.patient_id || '',
      module: module,
      action: 'print',
      record_type: printType,
      record_id: metadata.record_id || '',
      metadata: {
        print_type: printType,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  } catch (error) {
    console.error('Failed to log print action:', error);
  }
}