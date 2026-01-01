import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only PLATFORM_OWNER can seed roles
    const userRoles = await base44.entities.UserRole.filter({ user_id: user.id });
    const allRoles = await base44.entities.Role.list();
    const isPlatformOwner = userRoles.some(ur => {
      const role = allRoles.find(r => r.id === ur.role_id);
      return role?.code === 'PLATFORM_OWNER';
    });

    if (!isPlatformOwner) {
      return Response.json({ error: 'Forbidden: PLATFORM_OWNER required' }, { status: 403 });
    }

    const functionalRoles = [
      // Clinical Roles
      { code: 'PHYSICIAN', name: 'Physician', description: 'Medical doctor - full clinical access', is_system_role: true },
      { code: 'SPECIALIST', name: 'Specialist Doctor', description: 'Specialist physician', is_system_role: true },
      { code: 'NURSE', name: 'Nurse', description: 'Nursing staff - patient care', is_system_role: true },
      { code: 'NURSE_PRACTITIONER', name: 'Nurse Practitioner', description: 'Advanced practice nurse', is_system_role: true },
      
      // Diagnostic Roles
      { code: 'LAB_TECHNICIAN', name: 'Lab Technician', description: 'Laboratory technician - sample processing', is_system_role: true },
      { code: 'LAB_MANAGER', name: 'Lab Manager', description: 'Laboratory manager - oversight and approval', is_system_role: true },
      { code: 'PATHOLOGIST', name: 'Pathologist', description: 'Pathologist - result interpretation and sign-off', is_system_role: true },
      { code: 'RADIOLOGIST', name: 'Radiologist', description: 'Radiology specialist', is_system_role: true },
      { code: 'CARDIO_TECH', name: 'Cardiology Technician', description: 'Cardiology technician - ECG, echo', is_system_role: true },
      { code: 'CARDIOLOGIST', name: 'Cardiologist', description: 'Cardiologist - cardiology reports', is_system_role: true },
      
      // Pharmacy Roles
      { code: 'PHARMACIST', name: 'Pharmacist', description: 'Licensed pharmacist - dispensing', is_system_role: true },
      { code: 'PHARMACY_ASSISTANT', name: 'Pharmacy Assistant', description: 'Pharmacy support staff', is_system_role: true },
      { code: 'PHARMACY_MANAGER', name: 'Pharmacy Manager', description: 'Pharmacy operations manager', is_system_role: true },
      
      // Administrative Roles
      { code: 'RECEPTIONIST', name: 'Receptionist', description: 'Front desk - appointments and registration', is_system_role: true },
      { code: 'MEDICAL_RECORDS', name: 'Medical Records Officer', description: 'Medical records management', is_system_role: true },
      { code: 'BILLING_CLERK', name: 'Billing Clerk', description: 'Billing and invoicing', is_system_role: true },
      { code: 'CASHIER', name: 'Cashier', description: 'Payment collection', is_system_role: true },
      
      // Management Roles
      { code: 'CLINIC_MANAGER', name: 'Clinic Manager', description: 'Clinic operations manager', is_system_role: true },
      { code: 'DEPARTMENT_HEAD', name: 'Department Head', description: 'Department manager', is_system_role: true },
      { code: 'HR_MANAGER', name: 'HR Manager', description: 'Human resources manager', is_system_role: true },
      { code: 'FINANCE_MANAGER', name: 'Finance Manager', description: 'Financial operations manager', is_system_role: true },
      
      // Support Roles
      { code: 'PHLEBOTOMIST', name: 'Phlebotomist', description: 'Blood collection specialist', is_system_role: true },
      { code: 'MEDICAL_ASSISTANT', name: 'Medical Assistant', description: 'Clinical support assistant', is_system_role: true },
      { code: 'IT_SUPPORT', name: 'IT Support', description: 'Technical support staff', is_system_role: true },
    ];

    const created = [];
    const existing = [];

    for (const roleData of functionalRoles) {
      const existingRole = allRoles.find(r => r.code === roleData.code);
      
      if (existingRole) {
        existing.push(roleData.code);
      } else {
        const newRole = await base44.asServiceRole.entities.Role.create({
          ...roleData,
          organization_id: null, // System role
          status: 'active'
        });
        created.push(roleData.code);

        await base44.asServiceRole.entities.AuditLog.create({
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_email: user.email,
          organization_id: '',
          location_id: '',
          patient_id: '',
          module: 'ADMIN',
          action: 'create_system_role',
          record_type: 'Role',
          record_id: newRole.id,
          metadata: { code: roleData.code, name: roleData.name }
        });
      }
    }

    return Response.json({
      success: true,
      created_count: created.length,
      existing_count: existing.length,
      created_roles: created,
      existing_roles: existing,
      message: `Seeded ${created.length} new functional roles. ${existing.length} roles already exist.`
    });

  } catch (error) {
    console.error('Role seeding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});