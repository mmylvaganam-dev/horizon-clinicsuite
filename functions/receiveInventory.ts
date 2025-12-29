import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { locationId, skuCode, itemName, qty, unitCost, reason } = payload;

        // Find or create balance
        const existingBalances = await base44.asServiceRole.entities.InventoryBalance.filter({
            location_id: locationId,
            sku_code: skuCode
        });

        let balance;
        let previousQty = 0;

        if (existingBalances.length > 0) {
            balance = existingBalances[0];
            previousQty = balance.on_hand_qty;
            const newQty = previousQty + qty;

            balance = await base44.asServiceRole.entities.InventoryBalance.update(balance.id, {
                on_hand_qty: newQty,
                unit_cost: unitCost || balance.unit_cost,
                updated_at: new Date().toISOString()
            });
        } else {
            balance = await base44.asServiceRole.entities.InventoryBalance.create({
                organization_id: '',
                location_id: locationId,
                sku_code: skuCode,
                item_name: itemName,
                on_hand_qty: qty,
                reorder_level: 0,
                reorder_qty: 0,
                unit_cost: unitCost || 0,
                updated_at: new Date().toISOString()
            });
        }

        const newQty = balance.on_hand_qty;

        // Create transaction
        const txn = await base44.asServiceRole.entities.InventoryTxn.create({
            organization_id: '',
            location_id: locationId,
            sku_code: skuCode,
            item_name: itemName,
            txn_type: 'receive',
            qty,
            ref_type: 'Receive',
            ref_id: balance.id,
            reason: reason || 'Stock received',
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            previous_qty: previousQty,
            new_qty: newQty,
            metadata_json: {
                unit_cost: unitCost
            }
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
            action: 'receive',
            record_type: 'InventoryTxn',
            record_id: txn.id,
            metadata: {
                sku_code: skuCode,
                item_name: itemName,
                qty_received: qty,
                previous_qty: previousQty,
                new_qty: newQty,
                unit_cost: unitCost
            }
        });

        return Response.json({ 
            balance,
            transaction: txn 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});