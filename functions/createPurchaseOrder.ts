import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { poData, lines } = payload;

        // Generate PO number
        let poNumber;
        const configKey = `po_counter_${poData.organization_id || 'default'}`;
        
        try {
            const configs = await base44.asServiceRole.entities.OrganizationConfig.filter({ 
                config_key: configKey 
            });
            
            let counter = 1;
            if (configs.length > 0) {
                counter = parseInt(configs[0].config_value || '0') + 1;
                await base44.asServiceRole.entities.OrganizationConfig.update(configs[0].id, {
                    config_value: counter.toString()
                });
            } else {
                await base44.asServiceRole.entities.OrganizationConfig.create({
                    organization_id: poData.organization_id || '',
                    config_key: configKey,
                    config_value: counter.toString(),
                    description: 'Purchase order counter'
                });
            }
            
            const year = new Date().getFullYear();
            poNumber = `PO-${year}-${counter.toString().padStart(6, '0')}`;
        } catch (error) {
            poNumber = `PO-${Date.now()}`;
        }

        // Create purchase order
        const po = await base44.asServiceRole.entities.PurchaseOrder.create({
            ...poData,
            po_number: poNumber,
            created_at: new Date().toISOString(),
            created_by: user.id,
            created_by_email: user.email
        });

        // Create lines
        const createdLines = [];
        for (const line of lines) {
            const poLine = await base44.asServiceRole.entities.PurchaseOrderLine.create({
                purchase_order_id: po.id,
                sku_code: line.sku_code,
                item_name: line.item_name,
                qty_ordered: line.qty_ordered,
                unit_cost: line.unit_cost,
                line_total: line.qty_ordered * line.unit_cost
            });
            createdLines.push(poLine);
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: poData.organization_id || '',
            location_id: poData.location_id || '',
            patient_id: '',
            module: 'PROCUREMENT',
            action: 'create_po',
            record_type: 'PurchaseOrder',
            record_id: po.id,
            metadata: {
                po_number: poNumber,
                supplier: poData.supplier_name,
                line_count: lines.length
            }
        });

        return Response.json({ 
            purchaseOrder: po,
            lines: createdLines
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});