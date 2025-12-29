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

        if (!['refund', 'void'].includes(type)) {
            return Response.json({ error: 'Invalid type. Must be refund or void' }, { status: 400 });
        }

        // Check user role permissions
        const userRoles = await base44.asServiceRole.entities.UserRole.filter({ 
            user_id: user.id 
        });
        
        if (userRoles.length === 0) {
            return Response.json({ 
                error: 'Insufficient permissions. Role required for refund/void operations.' 
            }, { status: 403 });
        }

        const roleIds = userRoles.map(ur => ur.role_id);
        const rolePermissions = await base44.asServiceRole.entities.RolePermission.filter({});
        
        const hasPermission = rolePermissions.some(rp => 
            roleIds.includes(rp.role_id) && 
            rp.permission_id && 
            (rp.permission_id.includes('pharmacy') || rp.permission_id.includes('refund'))
        );

        // For now, we'll allow any user with a role to perform refund/void
        // In production, you'd check specific permissions
        if (userRoles.length === 0) {
            return Response.json({ 
                error: 'Insufficient permissions' 
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
                error: `Sale cannot be ${type}ed. Current status: ${sale.status}` 
            }, { status: 400 });
        }

        // Create refund/void record
        const refundVoid = await base44.asServiceRole.entities.PharmacyRefundVoid.create({
            sale_id: saleId,
            type,
            reason,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            amount: sale.total,
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
            patient_id: sale.patient_id || '',
            module: 'PHARMACY_POS',
            action: type === 'refund' ? 'refund_sale' : 'void_sale',
            record_type: 'PharmacySale',
            record_id: saleId,
            metadata: {
                type,
                reason,
                amount: sale.total,
                previous_status: sale.status,
                new_status: type === 'refund' ? 'refunded' : 'voided',
                refund_void_id: refundVoid.id
            }
        });

        return Response.json({ 
            refundVoid,
            sale: updatedSale
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});