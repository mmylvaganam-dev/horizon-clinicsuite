import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ approved: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Platform owner always approved
    const platformOwnerEmails = [
      'mylvaganam@premierhealthcanada.ca',
      'mmylvaganam@premierhealthcanada.ca'
    ];
    if (platformOwnerEmails.includes(user.email) || user.is_platform_owner) {
      return Response.json({ 
        approved: true, 
        role: 'platform_owner',
        user_email: user.email,
        has_unrestricted_access: true
      });
    }

    // Check if user is blocked
    const blockedRecords = await base44.asServiceRole.entities.BlockedUser.filter({ 
      email: user.email 
    });
    if (blockedRecords.length > 0) {
      return Response.json({ 
        approved: false, 
        blocked: true,
        error: 'Access denied by platform owner' 
      }, { status: 403 });
    }

    // Check UserApproval records for this user email
    const approvals = await base44.asServiceRole.entities.UserApproval.filter({ 
      user_email: user.email 
    });

    const approvedRecord = approvals.find(a => 
      a.final_status === 'approved' || a.platform_owner_status === 'approved'
    );

    if (approvedRecord) {
      // If user doesn't have organization_id set yet, set it now from the approval record
      if (!user.organization_id && approvedRecord.organization_id) {
        const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            organization_id: approvedRecord.organization_id
          });
          console.log('✅ Auto-assigned organization_id on first login:', approvedRecord.organization_id);
        }
      }
      return Response.json({ 
        approved: true, 
        role: 'user',
        user_email: user.email,
        organization_id: approvedRecord.organization_id
      });
    }

    // No approval record found - check if user has admin role (admins are always approved)
    if (user.role === 'admin') {
      return Response.json({ approved: true, role: 'admin', user_email: user.email });
    }

    return Response.json({ 
      approved: false, 
      needs_approval: true,
      error: 'Pending platform owner approval' 
    }, { status: 403 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});