import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, organizationId } = await req.json();

    if (!email || !organizationId) {
      return Response.json({ error: 'Email and organizationId required' }, { status: 400 });
    }

    console.log('🔵 Inviting user:', email, 'to org:', organizationId);

    // Step 1: Invite user (creates account)
    await base44.users.inviteUser(email, 'user');
    console.log('✅ User invited');

    // Step 2: Wait for user creation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Assign to organization
    const assignResponse = await base44.functions.invoke('assignUserToOrganization', {
      userEmail: email,
      organizationId: organizationId
    });

    console.log('✅ User assigned to org');

    return Response.json({
      success: true,
      message: `User ${email} invited and assigned to organization`,
      data: assignResponse.data
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});