import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { itemData } = payload;

        // Get parent order for context
        const orders = await base44.asServiceRole.entities.Order.filter({ id: itemData.order_id });
        const parentOrder = orders[0];

        if (!parentOrder) {
            return Response.json({ error: 'Parent order not found' }, { status: 404 });
        }

        // Create the order item
        const orderItem = await base44.asServiceRole.entities.OrderItem.create(itemData);

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: parentOrder.organization_id,
            location_id: parentOrder.location_id,
            patient_id: parentOrder.patient_id,
            module: 'ORDER_SYSTEM',
            action: 'create',
            record_type: 'OrderItem',
            record_id: orderItem.id,
            metadata: {
                order_id: itemData.order_id,
                item_name: itemData.name,
                catalog_code: itemData.catalog_code
            }
        });

        return Response.json({ orderItem });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});