import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Cleanup orphaned data in the system
 * - Remove UserRoles where user or org doesn't exist
 * - Remove duplicate UserApprovals
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

    const { dryRun = true } = await req.json();

    const results = {
      orphanedUserRoles: [],
      duplicateApprovals: [],
      timestamp: new Date().toISOString(),
      dryRun
    };

    // Get all data
    const users = await base44.asServiceRole.entities.User.list();
    const organizations = await base44.asServiceRole.entities.Organization.list();
    const userRoles = await base44.asServiceRole.entities.UserRole.list();
    const approvals = await base44.asServiceRole.entities.UserApproval.list();

    console.log(`Found ${users.length} users, ${organizations.length} orgs, ${userRoles.length} roles`);

    // Find orphaned UserRoles
    for (const ur of userRoles) {
      const userExists = users.some(u => u.id === ur.user_id);
      const orgExists = organizations.some(o => o.id === ur.organization_id);

      if (!userExists || !orgExists) {
        results.orphanedUserRoles.push({
          id: ur.id,
          user_id: ur.user_id,
          organization_id: ur.organization_id,
          role_id: ur.role_id,
          reason: !userExists ? 'User not found' : 'Organization not found'
        });

        if (!dryRun) {
          await base44.asServiceRole.entities.UserRole.delete(ur.id);
          console.log(`✅ Deleted orphaned UserRole: ${ur.id}`);
        }
      }
    }

    // Find duplicate approvals
    const approvalMap = new Map();
    for (const approval of approvals) {
      const key = `${approval.user_email}-${approval.organization_id}`;
      if (approvalMap.has(key)) {
        results.duplicateApprovals.push({
          id: approval.id,
          user_email: approval.user_email,
          organization_id: approval.organization_id,
          final_status: approval.final_status
        });

        if (!dryRun) {
          // Keep the most recent one, delete others
          const existing = approvalMap.get(key);
          const deleteId = new Date(approval.created_date) < new Date(existing.created_date) 
            ? approval.id 
            : existing.id;
          
          await base44.asServiceRole.entities.UserApproval.delete(deleteId);
          console.log(`✅ Deleted duplicate approval: ${deleteId}`);
        }
      } else {
        approvalMap.set(key, approval);
      }
    }

    return Response.json({
      success: true,
      dryRun,
      summary: {
        orphanedUserRoles: results.orphanedUserRoles.length,
        duplicateApprovals: results.duplicateApprovals.length
      },
      details: results,
      message: dryRun 
        ? 'Dry run complete - no changes made. Call with {"dryRun": false} to execute cleanup.'
        : 'Cleanup complete!'
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});