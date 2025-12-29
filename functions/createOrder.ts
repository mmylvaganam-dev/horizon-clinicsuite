import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { orderData } = payload;

        // Create the order
        const order = await base44.asServiceRole.entities.Order.create({
            ...orderData,
            ordered_at: orderData.ordered_at || new Date().toISOString()
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: orderData.organization_id,
            location_id: orderData.location_id,
            patient_id: orderData.patient_id,
            module: 'ORDER_SYSTEM',
            action: 'create',
            record_type: 'Order',
            record_id: order.id,
            metadata: {
                order_type: orderData.order_type,
                priority: orderData.priority,
                status: orderData.status
            }
        });

        return Response.json({ order });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});