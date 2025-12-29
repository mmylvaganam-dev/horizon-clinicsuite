import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { locationId, drugId, quantity, unitCost, reason } = payload;

        // Get drug details
        const drugs = await base44.asServiceRole.entities.DrugCatalog.filter({ id: drugId });
        const drug = drugs[0];

        if (!drug) {
            return Response.json({ error: 'Drug not found' }, { status: 404 });
        }

        // Find or create inventory item
        const existingItems = await base44.asServiceRole.entities.InventoryItem.filter({
            location_id: locationId,
            drug_id: drugId
        });

        let inventoryItem;
        let previousQty = 0;

        if (existingItems.length > 0) {
            inventoryItem = existingItems[0];
            previousQty = inventoryItem.on_hand_qty;
            const newQty = previousQty + quantity;

            inventoryItem = await base44.asServiceRole.entities.InventoryItem.update(inventoryItem.id, {
                on_hand_qty: newQty,
                unit_cost: unitCost || inventoryItem.unit_cost,
                updated_at: new Date().toISOString()
            });
        } else {
            inventoryItem = await base44.asServiceRole.entities.InventoryItem.create({
                location_id: locationId,
                drug_id: drugId,
                drug_name: drug.drug_name,
                on_hand_qty: quantity,
                reorder_level: 0,
                reorder_qty: 0,
                unit_cost: unitCost || 0,
                updated_at: new Date().toISOString()
            });
        }

        const newQty = inventoryItem.on_hand_qty;

        // Create stock movement
        const movement = await base44.asServiceRole.entities.StockMovement.create({
            inventory_item_id: inventoryItem.id,
            movement_type: 'receive',
            quantity,
            ref_type: 'Receive',
            ref_id: inventoryItem.id,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            reason: reason || 'Stock received',
            previous_qty: previousQty,
            new_qty: newQty
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: '',
            location_id: locationId,
            patient_id: '',
            module: 'INVENTORY',
            action: 'receive_stock',
            record_type: 'StockMovement',
            record_id: movement.id,
            metadata: {
                drug_name: drug.drug_name,
                quantity_received: quantity,
                previous_qty: previousQty,
                new_qty: newQty,
                unit_cost: unitCost
            }
        });

        return Response.json({ 
            inventoryItem,
            movement 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});