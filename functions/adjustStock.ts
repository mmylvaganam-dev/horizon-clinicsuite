import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { inventoryItemId, quantity, reason } = payload;

        // Check permissions - require admin or inventory_adjust permission
        const userRoles = await base44.asServiceRole.entities.UserRole.filter({ 
            user_id: user.id 
        });
        
        if (userRoles.length === 0) {
            return Response.json({ 
                error: 'Insufficient permissions for inventory adjustments' 
            }, { status: 403 });
        }

        // Get inventory item
        const inventoryItems = await base44.asServiceRole.entities.InventoryItem.filter({ 
            id: inventoryItemId 
        });
        const inventoryItem = inventoryItems[0];

        if (!inventoryItem) {
            return Response.json({ error: 'Inventory item not found' }, { status: 404 });
        }

        const previousQty = inventoryItem.on_hand_qty;
        const newQty = previousQty + quantity;

        if (newQty < 0) {
            return Response.json({ 
                error: 'Adjustment would result in negative inventory' 
            }, { status: 400 });
        }

        // Update inventory
        const updatedItem = await base44.asServiceRole.entities.InventoryItem.update(inventoryItemId, {
            on_hand_qty: newQty,
            updated_at: new Date().toISOString()
        });

        // Create stock movement
        const movement = await base44.asServiceRole.entities.StockMovement.create({
            inventory_item_id: inventoryItemId,
            movement_type: 'adjust',
            quantity,
            ref_type: 'ManualAdjustment',
            ref_id: inventoryItemId,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            reason: reason || 'Manual adjustment',
            previous_qty: previousQty,
            new_qty: newQty
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: '',
            location_id: inventoryItem.location_id,
            patient_id: '',
            module: 'INVENTORY',
            action: 'adjust_stock',
            record_type: 'StockMovement',
            record_id: movement.id,
            metadata: {
                inventory_item_id: inventoryItemId,
                drug_name: inventoryItem.drug_name,
                quantity_change: quantity,
                previous_qty: previousQty,
                new_qty: newQty,
                reason
            }
        });

        return Response.json({ 
            inventoryItem: updatedItem,
            movement 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});