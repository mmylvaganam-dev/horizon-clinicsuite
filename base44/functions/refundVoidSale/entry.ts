import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { saleId, type, reason, notes } = payload;

        // Check permissions
        const hasPermission = await checkRefundVoidPermission(base44, user.id, user.email);
        if (!hasPermission) {
            return Response.json({ 
                error: 'Insufficient permissions to perform refund/void operations' 
            }, { status: 403 });
        }

        // Get the sale
        const sales = await base44.asServiceRole.entities.PharmacySale.filter({ id: saleId });
        const sale = sales[0];

        if (!sale) {
            return Response.json({ error: 'Sale not found' }, { status: 404 });
        }

        if (sale.status !== 'completed') {
            return Response.json({ 
                error: 'Only completed sales can be refunded or voided',
                current_status: sale.status 
            }, { status: 400 });
        }

        // Create refund/void record
        const refundVoid = await base44.asServiceRole.entities.PharmacyRefundVoid.create({
            sale_id: saleId,
            type,
            reason,
            amount: sale.total,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            notes: notes || ''
        });

        // Update sale status
        const updatedSale = await base44.asServiceRole.entities.PharmacySale.update(saleId, {
            status: type === 'refund' ? 'refunded' : 'voided'
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: sale.organization_id || '',
            location_id: sale.location_id || '',
            patient_id: sale.patient_id || null,
            module: 'PHARMACY_POS',
            action: type,
            record_type: 'PharmacySale',
            record_id: saleId,
            metadata: {
                type,
                reason,
                amount: sale.total,
                previous_status: sale.status,
                new_status: updatedSale.status,
                refund_void_id: refundVoid.id
            }
        });

        return Response.json({ refundVoid, sale: updatedSale });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function checkRefundVoidPermission(base44, userId, userEmail) {
    // Check if user has admin role or specific refund/void permission
    const userRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: userId });
    
    for (const userRole of userRoles) {
        const roles = await base44.asServiceRole.entities.Role.filter({ id: userRole.role_id });
        if (roles.length > 0 && roles[0].name === 'admin') {
            return true;
        }

        // Check role permissions for pharmacy_refund_void
        const rolePerms = await base44.asServiceRole.entities.RolePermission.filter({ 
            role_id: userRole.role_id 
        });
        
        for (const rolePerm of rolePerms) {
            const perms = await base44.asServiceRole.entities.Permission.filter({ 
                id: rolePerm.permission_id 
            });
            if (perms.length > 0 && perms[0].permission_key === 'pharmacy_refund_void') {
                return true;
            }
        }
    }
    
    return false;
}