import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hasPermission(user) {
    if (user.role === 'admin') return true;
    
    try {
        const userRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: user.id });
        for (const ur of userRoles) {
            const rolePerms = await base44.asServiceRole.entities.RolePermission.filter({ role_id: ur.role_id });
            for (const rp of rolePerms) {
                const perm = await base44.asServiceRole.entities.Permission.filter({ id: rp.permission_id });
                if (perm.length > 0 && perm[0].name === 'billing_void_refund') {
                    return true;
                }
            }
        }
    } catch (e) {
        console.error('Permission check error:', e);
    }
    
    return false;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!await hasPermission(user)) {
            return Response.json({ error: 'Permission denied: billing_void_refund required' }, { status: 403 });
        }

        const payload = await req.json();
        const { invoiceId, type, reason } = payload;

        // Get invoice
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoiceId });
        const invoice = invoices[0];

        if (!invoice) {
            return Response.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.status === 'void') {
            return Response.json({ error: 'Invoice already voided' }, { status: 400 });
        }

        // Create RefundVoid record
        const refundVoid = await base44.asServiceRole.entities.RefundVoid.create({
            organization_id: invoice.organization_id || '',
            location_id: invoice.location_id || '',
            invoice_id: invoiceId,
            type,
            reason,
            amount: type === 'refund' ? invoice.amount_paid : 0,
            created_at: new Date().toISOString(),
            created_by: user.id,
            created_by_email: user.email,
            approved_by: user.id,
            approved_by_email: user.email
        });

        // Update invoice status
        await base44.asServiceRole.entities.Invoice.update(invoiceId, {
            status: 'void'
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: invoice.organization_id || '',
            location_id: invoice.location_id || '',
            patient_id: invoice.patient_id || '',
            module: 'BILLING',
            action: `invoice_${type}`,
            record_type: 'RefundVoid',
            record_id: refundVoid.id,
            metadata: {
                invoice_number: invoice.invoice_number,
                reason,
                amount: refundVoid.amount
            }
        });

        return Response.json({ 
            refundVoid,
            invoice: { ...invoice, status: 'void' }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});