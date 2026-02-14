import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { saleData, items, prescriptionId } = payload;

        if (!items || items.length === 0) {
            return Response.json({ error: 'At least one item is required' }, { status: 400 });
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
        const tax = saleData.tax || 0;
        const total = subtotal + tax;

        // Generate receipt number using OrganizationConfig
        let receiptNumber;
        const configKey = `pharmacy_receipt_counter_${saleData.organization_id || 'default'}`;
        
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
                    organization_id: saleData.organization_id || '',
                    config_key: configKey,
                    config_value: counter.toString(),
                    description: 'Pharmacy receipt counter'
                });
            }
            
            const year = new Date().getFullYear();
            receiptNumber = `RX-${year}-${counter.toString().padStart(6, '0')}`;
        } catch (error) {
            console.error('Error generating receipt number:', error);
            receiptNumber = `RX-${Date.now()}`;
        }

        // Create the sale HEADER
        const saleHeader = await base44.asServiceRole.entities.PharmacySaleHeader.create({
            organization_id: saleData.organization_id,
            location_id: saleData.location_id,
            patient_ref: saleData.patient_id || null,
            sale_number: receiptNumber,
            sale_date: new Date().toISOString(),
            status: 'paid',
            subtotal,
            tax_total: tax,
            total,
            payment_method: saleData.payment_method || 'cash',
            notes: saleData.notes || ''
        });

        // Create sale LINE ITEMS and update PharmacyStock
        const createdItems = [];
        for (const item of items) {
            // Create sale line
            const saleLine = await base44.asServiceRole.entities.PharmacySaleLine.create({
                sale_header_id: saleHeader.id,
                stock_id: item.stock_id,
                product_code: item.product_code || '',
                barcode_value: item.barcode || '',
                product_name_cache: item.item_name,
                qty: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total
            });
            createdItems.push(saleLine);

            // Update PharmacyStock quantity
            if (item.stock_id) {
                const stockItems = await base44.asServiceRole.entities.PharmacyStock.filter({ id: item.stock_id });
                if (stockItems.length > 0) {
                    const stock = stockItems[0];
                    const previousQty = stock.quantity || 0;
                    const newQty = previousQty - item.quantity;

                    // Update stock quantity
                    await base44.asServiceRole.entities.PharmacyStock.update(stock.id, {
                        quantity: newQty
                    });

                    console.log(`Stock updated: ${stock.display_name} from ${previousQty} to ${newQty}`);
                }
            }
        }

        // Receipt number is already part of the header, no separate entity needed

        // Prescription linking removed for simplified pharmacy flow

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: saleData.organization_id || '',
            location_id: saleData.location_id || '',
            patient_id: saleData.patient_id || '',
            module: 'PHARMACY_POS',
            action: 'create_sale',
            record_type: 'PharmacySaleHeader',
            record_id: saleHeader.id,
            metadata: {
                receipt_number: receiptNumber,
                total,
                item_count: items.length,
                has_patient: !!saleData.patient_id
            }
        });

        return Response.json({ 
            saleHeader, 
            saleLines: createdItems,
            receiptNumber
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});