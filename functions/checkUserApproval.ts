import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ approved: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Platform owner (no restrictions)
    const platformOwnerEmails = [
      'mylvaganam@premierhealthcanada.ca',
      'mmylvaganam@premierhealthcanada.ca'
    ];
    if (platformOwnerEmails.includes(user.email)) {
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

    // Check UserApproval - ALL users must be approved by platform owner
    const approvals = await base44.asServiceRole.entities.UserApproval.filter({ 
      user_email: user.email 
    });
    
    const hasApproval = approvals.some(a => a.final_status === 'approved' || a.platform_owner_status === 'approved');
    
    if (!hasApproval) {
      return Response.json({ 
        approved: false, 
        needs_approval: true,
        error: 'Pending platform owner approval' 
      }, { status: 403 });
    }

    return Response.json({ 
      approved: true, 
      role: 'user',
      user_email: user.email 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});