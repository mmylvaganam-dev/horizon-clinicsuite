import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { orderId, updates } = payload;

        // Get existing order for audit
        const existingOrders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
        const existingOrder = existingOrders[0];

        if (!existingOrder) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        // Update the order
        const updatedOrder = await base44.asServiceRole.entities.Order.update(orderId, updates);

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: existingOrder.organization_id,
            location_id: existingOrder.location_id,
            patient_id: existingOrder.patient_id,
            module: 'ORDER_SYSTEM',
            action: 'update',
            record_type: 'Order',
            record_id: orderId,
            metadata: {
                updates,
                previous_status: existingOrder.status,
                new_status: updates.status || existingOrder.status
            }
        });

        return Response.json({ order: updatedOrder });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});