import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { itemId, updates } = payload;

        // Get existing item
        const existingItems = await base44.asServiceRole.entities.OrderItem.filter({ id: itemId });
        const existingItem = existingItems[0];

        if (!existingItem) {
            return Response.json({ error: 'Order item not found' }, { status: 404 });
        }

        // Get parent order for context
        const orders = await base44.asServiceRole.entities.Order.filter({ id: existingItem.order_id });
        const parentOrder = orders[0];

        // Update the order item
        const updatedItem = await base44.asServiceRole.entities.OrderItem.update(itemId, updates);

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: parentOrder?.organization_id || '',
            location_id: parentOrder?.location_id || '',
            patient_id: parentOrder?.patient_id || '',
            module: 'ORDER_SYSTEM',
            action: 'update',
            record_type: 'OrderItem',
            record_id: itemId,
            metadata: {
                order_id: existingItem.order_id,
                updates,
                previous_status: existingItem.status,
                new_status: updates.status || existingItem.status
            }
        });

        return Response.json({ orderItem: updatedItem });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});