import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has approval record
    const approvals = await base44.asServiceRole.entities.UserApproval.filter({
      user_email: user.email
    });

    if (approvals.length === 0) {
      // No approval record yet - create pending one
      await base44.asServiceRole.entities.UserApproval.create({
        user_email: user.email,
        organization_id: user.organization_id || 'default',
        status: 'pending'
      });
      return Response.json({ 
        approved: false, 
        status: 'pending',
        message: 'Your access is pending admin approval'
      });
    }

    const approval = approvals[0];
    
    if (approval.status === 'approved') {
      return Response.json({ 
        approved: true, 
        status: 'approved'
      });
    }

    if (approval.status === 'rejected') {
      return Response.json({ 
        approved: false, 
        status: 'rejected',
        reason: approval.rejection_reason || 'Access denied'
      });
    }

    return Response.json({ 
      approved: false, 
      status: 'pending',
      message: 'Your access is pending admin approval'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});