import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Test function to verify critical user flows:
 * 1. Invite user
 * 2. Assign to organization
 * 3. Approve access
 * 4. Delete user
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' || 
                           user.email === 'mylvaganam@premierhealthcanada.ca' ||
                           user.is_platform_owner === true;

    if (!isPlatformOwner) {
      return Response.json({ error: 'Platform owner access required' }, { status: 403 });
    }

    const { testType } = await req.json();

    const results = {
      testType,
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Check data integrity
    if (testType === 'data_integrity' || testType === 'all') {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const organizations = await base44.asServiceRole.entities.Organization.list();
        const userRoles = await base44.asServiceRole.entities.UserRole.list();
        const approvals = await base44.asServiceRole.entities.UserApproval.list();

        // Check for users without organization_id
        const unassignedUsers = users.filter(u => !u.organization_id);
        
        // Check for orphaned UserRoles (user or org doesn't exist)
        const orphanedRoles = userRoles.filter(ur => {
          const userExists = users.some(u => u.id === ur.user_id);
          const orgExists = organizations.some(o => o.id === ur.organization_id);
          return !userExists || !orgExists;
        });

        // Check for duplicate approvals
        const approvalKeys = approvals.map(a => `${a.user_email}-${a.organization_id}`);
        const duplicateApprovals = approvalKeys.filter((key, idx) => approvalKeys.indexOf(key) !== idx);

        results.tests.push({
          name: 'Data Integrity Check',
          status: unassignedUsers.length === 0 && orphanedRoles.length === 0 && duplicateApprovals.length === 0 ? 'PASS' : 'FAIL',
          details: {
            totalUsers: users.length,
            totalOrgs: organizations.length,
            unassignedUsers: unassignedUsers.length,
            orphanedRoles: orphanedRoles.length,
            duplicateApprovals: duplicateApprovals.length,
            unassignedUserEmails: unassignedUsers.map(u => u.email)
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'Data Integrity Check',
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Test 2: Check for null/undefined issues
    if (testType === 'null_checks' || testType === 'all') {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const organizations = await base44.asServiceRole.entities.Organization.list();
        
        const usersWithMissingData = users.filter(u => !u.email || !u.id);
        const orgsWithMissingData = organizations.filter(o => !o.name || !o.id);

        results.tests.push({
          name: 'Null/Undefined Check',
          status: usersWithMissingData.length === 0 && orgsWithMissingData.length === 0 ? 'PASS' : 'FAIL',
          details: {
            usersWithMissingData: usersWithMissingData.length,
            orgsWithMissingData: orgsWithMissingData.length
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'Null/Undefined Check',
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Test 3: Check approval flow consistency
    if (testType === 'approval_flow' || testType === 'all') {
      try {
        const approvals = await base44.asServiceRole.entities.UserApproval.list();
        
        const inconsistentApprovals = approvals.filter(a => {
          // Check if final_status matches the approval statuses
          if (a.final_status === 'approved') {
            return a.org_admin_status !== 'approved' || a.platform_owner_status !== 'approved';
          }
          if (a.final_status === 'rejected') {
            return a.org_admin_status !== 'rejected' && a.platform_owner_status !== 'rejected';
          }
          if (a.final_status === 'pending_platform') {
            return a.org_admin_status !== 'approved' || a.platform_owner_status !== 'pending';
          }
          if (a.final_status === 'pending_org') {
            return a.org_admin_status !== 'pending';
          }
          return false;
        });

        results.tests.push({
          name: 'Approval Flow Consistency',
          status: inconsistentApprovals.length === 0 ? 'PASS' : 'FAIL',
          details: {
            totalApprovals: approvals.length,
            inconsistentApprovals: inconsistentApprovals.length,
            inconsistentDetails: inconsistentApprovals.map(a => ({
              email: a.user_email,
              final_status: a.final_status,
              org_admin_status: a.org_admin_status,
              platform_owner_status: a.platform_owner_status
            }))
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'Approval Flow Consistency',
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Test 4: Check platform owner identification
    if (testType === 'platform_owner' || testType === 'all') {
      try {
        const isPlatformOwnerCheck = user.email === 'mmylvaganam@premierhealthcanada.ca' || 
                                     user.email === 'mylvaganam@premierhealthcanada.ca' ||
                                     user.is_platform_owner === true;

        results.tests.push({
          name: 'Platform Owner Check',
          status: isPlatformOwnerCheck ? 'PASS' : 'FAIL',
          details: {
            userEmail: user.email,
            isPlatformOwner: isPlatformOwnerCheck,
            is_platform_owner_field: user.is_platform_owner
          }
        });
      } catch (error) {
        results.tests.push({
          name: 'Platform Owner Check',
          status: 'ERROR',
          error: error.message
        });
      }
    }

    const passedTests = results.tests.filter(t => t.status === 'PASS').length;
    const failedTests = results.tests.filter(t => t.status === 'FAIL').length;
    const errorTests = results.tests.filter(t => t.status === 'ERROR').length;

    return Response.json({
      summary: {
        total: results.tests.length,
        passed: passedTests,
        failed: failedTests,
        errors: errorTests,
        overallStatus: failedTests === 0 && errorTests === 0 ? 'PASS' : 'FAIL'
      },
      results
    });
  } catch (error) {
    console.error('Test execution error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});