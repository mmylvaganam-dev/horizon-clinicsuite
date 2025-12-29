import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { purchaseOrderId, receivedLines } = payload;

        // Get PO
        const pos = await base44.asServiceRole.entities.PurchaseOrder.filter({ 
            id: purchaseOrderId 
        });
        const po = pos[0];

        if (!po) {
            return Response.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        // Create goods received
        const gr = await base44.asServiceRole.entities.GoodsReceived.create({
            organization_id: po.organization_id || '',
            location_id: po.location_id || '',
            purchase_order_id: purchaseOrderId,
            po_number: po.po_number,
            received_at: new Date().toISOString(),
            received_by: user.id,
            received_by_email: user.email,
            notes: ''
        });

        // Process received lines
        const createdLines = [];
        for (const line of receivedLines) {
            // Create GR line
            const grLine = await base44.asServiceRole.entities.GoodsReceivedLine.create({
                goods_received_id: gr.id,
                sku_code: line.sku_code,
                item_name: line.item_name,
                qty_received: line.qty_received,
                unit_cost: line.unit_cost || 0,
                batch_number: line.batch_number || '',
                expiry_date: line.expiry_date || null
            });
            createdLines.push(grLine);

            // Update inventory balance
            const balances = await base44.asServiceRole.entities.InventoryBalance.filter({
                location_id: po.location_id,
                sku_code: line.sku_code
            });

            let balance;
            const previousQty = balances.length > 0 ? balances[0].on_hand_qty : 0;

            if (balances.length > 0) {
                balance = balances[0];
                const newQty = previousQty + line.qty_received;

                balance = await base44.asServiceRole.entities.InventoryBalance.update(balance.id, {
                    on_hand_qty: newQty,
                    unit_cost: line.unit_cost || balance.unit_cost,
                    updated_at: new Date().toISOString()
                });
            } else {
                balance = await base44.asServiceRole.entities.InventoryBalance.create({
                    organization_id: po.organization_id || '',
                    location_id: po.location_id || '',
                    sku_code: line.sku_code,
                    item_name: line.item_name,
                    on_hand_qty: line.qty_received,
                    reorder_level: 0,
                    reorder_qty: 0,
                    unit_cost: line.unit_cost || 0,
                    updated_at: new Date().toISOString()
                });
            }

            // Create inventory transaction
            await base44.asServiceRole.entities.InventoryTxn.create({
                organization_id: po.organization_id || '',
                location_id: po.location_id || '',
                sku_code: line.sku_code,
                item_name: line.item_name,
                txn_type: 'receive',
                qty: line.qty_received,
                ref_type: 'GoodsReceived',
                ref_id: gr.id,
                reason: `PO: ${po.po_number}`,
                created_by: user.id,
                created_by_email: user.email,
                created_at: new Date().toISOString(),
                previous_qty: previousQty,
                new_qty: balance.on_hand_qty,
                metadata_json: {
                    po_number: po.po_number,
                    batch_number: line.batch_number || null
                }
            });

            // If batch tracking, create/update stock batch
            if (line.batch_number && line.expiry_date) {
                const existingBatches = await base44.asServiceRole.entities.StockBatch.filter({
                    location_id: po.location_id,
                    sku_code: line.sku_code,
                    batch_number: line.batch_number
                });

                if (existingBatches.length > 0) {
                    const batch = existingBatches[0];
                    await base44.asServiceRole.entities.StockBatch.update(batch.id, {
                        qty_on_hand: batch.qty_on_hand + line.qty_received
                    });
                } else {
                    await base44.asServiceRole.entities.StockBatch.create({
                        organization_id: po.organization_id || '',
                        location_id: po.location_id || '',
                        sku_code: line.sku_code,
                        item_name: line.item_name,
                        batch_number: line.batch_number,
                        expiry_date: line.expiry_date,
                        qty_on_hand: line.qty_received,
                        created_at: new Date().toISOString()
                    });
                }

                // Create batch transaction
                await base44.asServiceRole.entities.BatchTxn.create({
                    organization_id: po.organization_id || '',
                    location_id: po.location_id || '',
                    sku_code: line.sku_code,
                    item_name: line.item_name,
                    batch_number: line.batch_number,
                    txn_type: 'receive',
                    qty: line.qty_received,
                    ref_type: 'GoodsReceived',
                    ref_id: gr.id,
                    created_at: new Date().toISOString(),
                    created_by: user.id,
                    created_by_email: user.email
                });
            }
        }

        // Update PO status
        await base44.asServiceRole.entities.PurchaseOrder.update(purchaseOrderId, {
            status: 'received'
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: po.organization_id || '',
            location_id: po.location_id || '',
            patient_id: '',
            module: 'PROCUREMENT',
            action: 'receive_goods',
            record_type: 'GoodsReceived',
            record_id: gr.id,
            metadata: {
                po_number: po.po_number,
                line_count: receivedLines.length
            }
        });

        return Response.json({ 
            goodsReceived: gr,
            lines: createdLines
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});