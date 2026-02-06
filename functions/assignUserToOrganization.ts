import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform owner
    const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' || 
                           user.email === 'mylvaganam@premierhealthcanada.ca' ||
                           user.is_platform_owner === true;

    if (!isPlatformOwner) {
      return Response.json({ error: 'Forbidden: Platform owner access required' }, { status: 403 });
    }

    const { userId, orgId } = await req.json();

    if (!userId || !orgId) {
      return Response.json({ error: 'userId and orgId are required' }, { status: 400 });
    }

    // Update User.organization_id using service role
    await base44.asServiceRole.entities.User.update(userId, {
      organization_id: orgId
    });

    console.log('✅ User assigned to organization successfully');

    return Response.json({ 
      success: true,
      message: 'User assigned to organization successfully'
    });
  } catch (error) {
    console.error('❌ Error assigning user:', error);
    return Response.json({ 
      error: error.message || 'Failed to assign user'
    }, { status: 500 });
  }
});