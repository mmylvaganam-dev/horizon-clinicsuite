import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { locationId, skuCode, itemName, batchNumber, expiryDate, qty, unitCost } = payload;

        // Find or create batch
        const existingBatches = await base44.asServiceRole.entities.StockBatch.filter({
            location_id: locationId,
            sku_code: skuCode,
            batch_number: batchNumber
        });

        let batch;
        if (existingBatches.length > 0) {
            batch = existingBatches[0];
            const newQty = batch.qty_on_hand + qty;

            batch = await base44.asServiceRole.entities.StockBatch.update(batch.id, {
                qty_on_hand: newQty
            });
        } else {
            batch = await base44.asServiceRole.entities.StockBatch.create({
                organization_id: '',
                location_id: locationId,
                sku_code: skuCode,
                item_name: itemName,
                batch_number: batchNumber,
                expiry_date: expiryDate,
                qty_on_hand: qty,
                created_at: new Date().toISOString()
            });
        }

        // Create batch transaction
        await base44.asServiceRole.entities.BatchTxn.create({
            organization_id: '',
            location_id: locationId,
            sku_code: skuCode,
            item_name: itemName,
            batch_number: batchNumber,
            txn_type: 'receive',
            qty,
            ref_type: 'Receive',
            ref_id: batch.id,
            created_at: new Date().toISOString(),
            created_by: user.id,
            created_by_email: user.email
        });

        // Update inventory balance
        const balances = await base44.asServiceRole.entities.InventoryBalance.filter({
            location_id: locationId,
            sku_code: skuCode
        });

        let balance;
        if (balances.length > 0) {
            balance = balances[0];
            const newQty = balance.on_hand_qty + qty;

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

        // Create inventory transaction
        await base44.asServiceRole.entities.InventoryTxn.create({
            organization_id: '',
            location_id: locationId,
            sku_code: skuCode,
            item_name: itemName,
            txn_type: 'receive',
            qty,
            ref_type: 'StockBatch',
            ref_id: batch.id,
            reason: `Batch: ${batchNumber}`,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            previous_qty: balance.on_hand_qty - qty,
            new_qty: balance.on_hand_qty,
            metadata_json: {
                batch_number: batchNumber,
                expiry_date: expiryDate
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
            action: 'receive_batch',
            record_type: 'StockBatch',
            record_id: batch.id,
            metadata: {
                sku_code: skuCode,
                batch_number: batchNumber,
                qty_received: qty,
                expiry_date: expiryDate
            }
        });

        return Response.json({ batch, balance });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});