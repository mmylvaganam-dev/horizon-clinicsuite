import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { staff_id } = await req.json();

    if (!staff_id) {
      return Response.json({ error: 'staff_id required' }, { status: 400 });
    }

    // Get staff profile
    const staff = await base44.asServiceRole.entities.StaffProfile.filter({ id: staff_id });
    if (staff.length === 0) {
      return Response.json({ error: 'Staff not found' }, { status: 404 });
    }

    const staffData = staff[0];
    const displayName = `${staffData.first_name} ${staffData.last_name}${staffData.credentials_text ? ', ' + staffData.credentials_text : ''}`;

    // Check if payee record exists
    const existingPayee = await base44.asServiceRole.entities.PayeeDirectory.filter({ 
      source_ref_id: staff_id 
    });

    const payeeData = {
      organization_id: staffData.organization_id,
      payee_type: 'STAFF',
      source_ref_id: staff_id,
      display_name: displayName,
      status: staffData.status
    };

    let result;
    if (existingPayee.length > 0) {
      result = await base44.asServiceRole.entities.PayeeDirectory.update(existingPayee[0].id, payeeData);
    } else {
      result = await base44.asServiceRole.entities.PayeeDirectory.create(payeeData);
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      organization_id: staffData.organization_id,
      location_id: '',
      patient_id: '',
      module: 'OPERATIONS',
      action: 'sync_staff_to_payee',
      record_type: 'PayeeDirectory',
      record_id: result.id,
      metadata: { staff_id, display_name: displayName }
    });

    return Response.json({ success: true, payee: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});