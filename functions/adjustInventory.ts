import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { balanceId, qty, reason } = payload;

        // Get balance
        const balances = await base44.asServiceRole.entities.InventoryBalance.filter({ 
            id: balanceId 
        });
        const balance = balances[0];

        if (!balance) {
            return Response.json({ error: 'Balance not found' }, { status: 404 });
        }

        const previousQty = balance.on_hand_qty;
        const newQty = previousQty + qty;

        if (newQty < 0) {
            return Response.json({ 
                error: 'Adjustment would result in negative inventory' 
            }, { status: 400 });
        }

        // Update balance
        const updatedBalance = await base44.asServiceRole.entities.InventoryBalance.update(balanceId, {
            on_hand_qty: newQty,
            updated_at: new Date().toISOString()
        });

        // Create transaction
        const txn = await base44.asServiceRole.entities.InventoryTxn.create({
            organization_id: balance.organization_id || '',
            location_id: balance.location_id,
            sku_code: balance.sku_code,
            item_name: balance.item_name,
            txn_type: 'adjust',
            qty,
            ref_type: 'ManualAdjustment',
            ref_id: balanceId,
            reason: reason || 'Manual adjustment',
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            previous_qty: previousQty,
            new_qty: newQty,
            metadata_json: {}
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: balance.organization_id || '',
            location_id: balance.location_id,
            patient_id: '',
            module: 'INVENTORY',
            action: 'adjust',
            record_type: 'InventoryTxn',
            record_id: txn.id,
            metadata: {
                sku_code: balance.sku_code,
                item_name: balance.item_name,
                qty_change: qty,
                previous_qty: previousQty,
                new_qty: newQty,
                reason
            }
        });

        return Response.json({ 
            balance: updatedBalance,
            transaction: txn 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});