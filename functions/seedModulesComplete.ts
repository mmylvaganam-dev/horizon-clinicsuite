import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modules = [
      // Core modules (always available)
      { module_code: 'SALES_WORKSPACE', module_name: 'Sales Workspace', description: 'Point of sale and billing interface', category: 'dashboards', is_core: true },
      { module_code: 'ADMIN', module_name: 'Administration', description: 'System administration and configuration', category: 'administration', is_core: true },
      { module_code: 'REPORTS', module_name: 'Reports', description: 'Business intelligence and reporting', category: 'reports', is_core: true },
      
      // Business modules
      { module_code: 'PHARMACY', module_name: 'Pharmacy Management', description: 'Complete pharmacy operations including inventory, billing, and dispensing', category: 'pharmacy' },
      { module_code: 'EMR', module_name: 'Electronic Medical Records', description: 'Clinical documentation and patient records', category: 'clinical' },
      { module_code: 'DENTAL', module_name: 'Dental Module', description: 'Dental practice management including charting and treatment planning', category: 'clinical' },
      { module_code: 'HOME_CARE', module_name: 'Home Care Services', description: 'Home nursing and caretaker service management', category: 'clinical' },
      { module_code: 'LIS', module_name: 'Laboratory Information System', description: 'Lab test orders, results, and quality control', category: 'lab' },
      { module_code: 'DIAGNOSTICS', module_name: 'Diagnostic Services', description: 'Radiology, ECG, and other diagnostic imaging', category: 'diagnostics' },
      { module_code: 'APPOINTMENTS', module_name: 'Appointment Management', description: 'Patient scheduling and appointment booking', category: 'clinical' },
      { module_code: 'FINANCE', module_name: 'Financial Management', description: 'Accounting, ledger, and financial reporting', category: 'finance' },
      { module_code: 'HR_PAYROLL', module_name: 'HR & Payroll', description: 'Staff management and payroll processing', category: 'administration' },
      { module_code: 'QUEUE_MGMT', module_name: 'Queue Management', description: 'Virtual queue and patient flow management — OPD, Lab, Pharmacy, Doctor counters with real-time display board and SMS notifications', category: 'clinical' },
      { module_code: 'DIGITAL_SIGNAGE', module_name: 'Digital Signage', description: 'Manage clinic TV screens, playlists, content library, emergency banners, and health education slideshows', category: 'engagement' },
    ];

    const results = [];

    for (const moduleData of modules) {
      try {
        // Check if module already exists
        const existing = await base44.asServiceRole.entities.Module.filter({ module_code: moduleData.module_code });
        
        if (existing.length === 0) {
          await base44.asServiceRole.entities.Module.create(moduleData);
          results.push({ module_code: moduleData.module_code, status: 'created' });
        } else {
          results.push({ module_code: moduleData.module_code, status: 'already_exists' });
        }
      } catch (error) {
        results.push({ module_code: moduleData.module_code, status: 'error', error: error.message });
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Modules seeded successfully',
      results 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});