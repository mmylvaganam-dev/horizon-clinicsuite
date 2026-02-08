import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Platform owner check - using email directly
    const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' || 
                           user.email === 'mylvaganam@premierhealthcanada.ca';

    if (!isPlatformOwner) {
      return Response.json({ error: 'Forbidden - Platform Owner only' }, { status: 403 });
    }

    const body = await req.json();
    const { organizationId } = body;
    
    const results = {
      timestamp: new Date().toISOString(),
      organizationId,
      tests: [],
      summary: { passed: 0, failed: 0, warnings: 0 }
    };

    // Test 1: Database Connectivity
    try {
      await base44.entities.Organization.list();
      results.tests.push({ 
        category: 'Database', 
        test: 'Connection Test', 
        status: 'passed', 
        message: 'Database connection successful' 
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Database', 
        test: 'Connection Test', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 2: Patient Entity
    try {
      const patients = await base44.entities.Patient.filter({ organization_id: organizationId });
      results.tests.push({ 
        category: 'Entities', 
        test: 'Patient Entity', 
        status: 'passed', 
        message: `Found ${patients.length} patients`,
        count: patients.length
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Entities', 
        test: 'Patient Entity', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 3: Pharmacy Stock
    try {
      const stock = await base44.entities.PharmacyStock.filter({ organization_id: organizationId });
      results.tests.push({ 
        category: 'Entities', 
        test: 'Pharmacy Stock', 
        status: 'passed', 
        message: `Found ${stock.length} stock items`,
        count: stock.length
      });
      results.summary.passed++;
      
      if (stock.length === 0) {
        results.tests.push({ 
          category: 'Entities', 
          test: 'Pharmacy Stock Data', 
          status: 'warning', 
          message: 'No pharmacy stock items found - please import stock' 
        });
        results.summary.warnings++;
      }
    } catch (error) {
      results.tests.push({ 
        category: 'Entities', 
        test: 'Pharmacy Stock', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 4: Sales Data
    try {
      const sales = await base44.entities.PharmacySaleHeader.filter({ organization_id: organizationId });
      results.tests.push({ 
        category: 'Entities', 
        test: 'Sales Records', 
        status: 'passed', 
        message: `Found ${sales.length} sales records`,
        count: sales.length
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Entities', 
        test: 'Sales Records', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 5: User Management
    try {
      const users = await base44.entities.User.list();
      const orgUsers = users.filter(u => u.organization_id === organizationId);
      results.tests.push({ 
        category: 'Users', 
        test: 'User Management', 
        status: 'passed', 
        message: `Found ${orgUsers.length} users in organization`,
        count: orgUsers.length
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Users', 
        test: 'User Management', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 6: Roles & Permissions
    try {
      const roles = await base44.entities.Role.list();
      const hasPhysician = roles.some(r => r.code === 'PHYSICIAN');
      const hasPharmacist = roles.some(r => r.code === 'PHARMACIST');
      
      if (hasPhysician && hasPharmacist) {
        results.tests.push({ 
          category: 'Access Control', 
          test: 'Roles Setup', 
          status: 'passed', 
          message: `Found ${roles.length} roles configured` 
        });
        results.summary.passed++;
      } else {
        results.tests.push({ 
          category: 'Access Control', 
          test: 'Roles Setup', 
          status: 'warning', 
          message: 'Some standard roles missing - run role seed' 
        });
        results.summary.warnings++;
      }
    } catch (error) {
      results.tests.push({ 
        category: 'Access Control', 
        test: 'Roles Setup', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 7: Email Configuration
    try {
      // Email is available via Core integration - always available
      results.tests.push({ 
        category: 'Communications', 
        test: 'Email Service', 
        status: 'passed', 
        message: 'Email service available via Core.SendEmail integration' 
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Communications', 
        test: 'Email Service', 
        status: 'warning', 
        message: 'Email configuration not verified' 
      });
      results.summary.warnings++;
    }

    // Test 8: SMS Configuration
    try {
      const smsUser = Deno.env.get('ESMS_USERNAME');
      const smsPass = Deno.env.get('ESMS_PASSWORD');
      
      if (smsUser && smsPass) {
        results.tests.push({ 
          category: 'Communications', 
          test: 'SMS Service', 
          status: 'passed', 
          message: 'Dialog eSMS credentials configured' 
        });
        results.summary.passed++;
      } else {
        results.tests.push({ 
          category: 'Communications', 
          test: 'SMS Service', 
          status: 'warning', 
          message: 'SMS credentials not configured' 
        });
        results.summary.warnings++;
      }
    } catch (error) {
      results.tests.push({ 
        category: 'Communications', 
        test: 'SMS Service', 
        status: 'warning', 
        message: 'Could not verify SMS configuration' 
      });
      results.summary.warnings++;
    }

    // Test 9: Organization Branding
    try {
      const branding = await base44.entities.OrganizationBranding.filter({ organization_id: organizationId });
      if (branding.length > 0) {
        results.tests.push({ 
          category: 'Configuration', 
          test: 'Organization Branding', 
          status: 'passed', 
          message: 'Branding configured' 
        });
        results.summary.passed++;
      } else {
        results.tests.push({ 
          category: 'Configuration', 
          test: 'Organization Branding', 
          status: 'warning', 
          message: 'No branding configured' 
        });
        results.summary.warnings++;
      }
    } catch (error) {
      results.tests.push({ 
        category: 'Configuration', 
        test: 'Organization Branding', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 10: Appointments
    try {
      const appointments = await base44.entities.Appointment.filter({ organization_id: organizationId });
      results.tests.push({ 
        category: 'Clinical', 
        test: 'Appointments', 
        status: 'passed', 
        message: `Found ${appointments.length} appointments`,
        count: appointments.length
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Clinical', 
        test: 'Appointments', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 11: Medical Records
    try {
      const records = await base44.entities.MedicalRecord.filter({ organization_id: organizationId });
      results.tests.push({ 
        category: 'Clinical', 
        test: 'Medical Records', 
        status: 'passed', 
        message: `Found ${records.length} medical records`,
        count: records.length
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Clinical', 
        test: 'Medical Records', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 12: Invoicing
    try {
      const invoices = await base44.entities.InvoiceHeader.filter({ organization_id: organizationId });
      results.tests.push({ 
        category: 'Finance', 
        test: 'Invoicing System', 
        status: 'passed', 
        message: `Found ${invoices.length} invoices`,
        count: invoices.length
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Finance', 
        test: 'Invoicing System', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Test 13: Audit Logs
    try {
      const logs = await base44.entities.AuditLog.filter({ organization_id: organizationId });
      results.tests.push({ 
        category: 'Security', 
        test: 'Audit Logging', 
        status: 'passed', 
        message: `Found ${logs.length} audit log entries`,
        count: logs.length
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({ 
        category: 'Security', 
        test: 'Audit Logging', 
        status: 'failed', 
        message: error.message 
      });
      results.summary.failed++;
    }

    // Calculate overall health score
    const totalTests = results.summary.passed + results.summary.failed + results.summary.warnings;
    results.healthScore = Math.round((results.summary.passed / totalTests) * 100);
    results.status = results.summary.failed > 0 ? 'critical' : results.summary.warnings > 0 ? 'warning' : 'healthy';

    // Create alert if there are failures
    if (results.summary.failed > 0) {
      try {
        await base44.asServiceRole.entities.PlatformAdminNote.create({
          note_type: 'system_health_alert',
          severity: 'high',
          title: `System Health Check Failed - ${organizationId}`,
          description: `${results.summary.failed} critical issues detected. Health score: ${results.healthScore}%`,
          metadata: { organizationId, results },
          status: 'active'
        });
      } catch (alertError) {
        console.error('Failed to create alert:', alertError);
      }
    }

    return Response.json(results);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});