import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { saleData, items } = payload;

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

        // Create the sale
        const sale = await base44.asServiceRole.entities.PharmacySale.create({
            ...saleData,
            sale_date: new Date().toISOString(),
            subtotal,
            tax,
            total,
            status: 'completed',
            created_by: user.id,
            created_by_email: user.email,
            prescription_id: saleData.prescription_id || null
        });

        // Create sale items and update inventory
        const createdItems = [];
        for (const item of items) {
            const saleItem = await base44.asServiceRole.entities.PharmacySaleItem.create({
                sale_id: sale.id,
                item_name: item.item_name,
                drug_id: item.drug_id || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total,
                notes: item.notes || ''
            });
            createdItems.push(saleItem);

            // Update inventory if drug_id exists
            if (item.drug_id && saleData.location_id) {
                const inventoryItems = await base44.asServiceRole.entities.InventoryItem.filter({
                    location_id: saleData.location_id,
                    drug_id: item.drug_id
                });

                if (inventoryItems.length > 0) {
                    const inventoryItem = inventoryItems[0];
                    const previousQty = inventoryItem.on_hand_qty;
                    const newQty = previousQty - item.quantity;

                    // Update inventory quantity
                    await base44.asServiceRole.entities.InventoryItem.update(inventoryItem.id, {
                        on_hand_qty: newQty,
                        updated_at: new Date().toISOString()
                    });

                    // Create stock movement record
                    await base44.asServiceRole.entities.StockMovement.create({
                        inventory_item_id: inventoryItem.id,
                        movement_type: 'sale',
                        quantity: -item.quantity,
                        ref_type: 'PharmacySale',
                        ref_id: sale.id,
                        created_by: user.id,
                        created_by_email: user.email,
                        created_at: new Date().toISOString(),
                        reason: `Sale: ${receiptNumber}`,
                        previous_qty: previousQty,
                        new_qty: newQty
                    });
                }
            }
        }

        // Create receipt
        const receipt = await base44.asServiceRole.entities.PharmacyReceipt.create({
            sale_id: sale.id,
            receipt_number: receiptNumber,
            issued_at: new Date().toISOString(),
            issued_by: user.id,
            issued_by_email: user.email
        });

        // If this sale is for a prescription, create DispenseEvent link
        let dispenseEvent = null;
        if (saleData.prescription_id) {
            const prescriptions = await base44.asServiceRole.entities.Prescription.filter({ 
                id: saleData.prescription_id 
            });
            const prescription = prescriptions[0];

            if (prescription) {
                dispenseEvent = await base44.asServiceRole.entities.DispenseEvent.create({
                    prescription_id: saleData.prescription_id,
                    patient_id: prescription.patient_id,
                    sale_id: sale.id,
                    quantity_dispensed: prescription.quantity,
                    dispensed_by: user.id,
                    dispensed_by_email: user.email,
                    dispensed_at: new Date().toISOString(),
                    status: 'dispensed',
                    notes: `Dispensed via POS sale ${receiptNumber}`
                });

                // Update prescription status
                await base44.asServiceRole.entities.Prescription.update(saleData.prescription_id, {
                    status: 'Dispensed'
                });

                // Audit the prescription-sale link
                await base44.asServiceRole.entities.AuditLog.create({
                    timestamp: new Date().toISOString(),
                    user_id: user.id,
                    user_email: user.email,
                    organization_id: saleData.organization_id || '',
                    location_id: saleData.location_id || '',
                    patient_id: prescription.patient_id || '',
                    module: 'PHARMACY_POS',
                    action: 'link_prescription',
                    record_type: 'DispenseEvent',
                    record_id: dispenseEvent.id,
                    metadata: {
                        prescription_id: saleData.prescription_id,
                        sale_id: sale.id,
                        receipt_number: receiptNumber
                    }
                });
            }
        }

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
            record_type: 'PharmacySale',
            record_id: sale.id,
            metadata: {
                receipt_number: receiptNumber,
                total,
                item_count: items.length,
                has_patient: !!saleData.patient_id
            }
        });

        return Response.json({ 
            sale, 
            items: createdItems,
            receipt,
            dispenseEvent
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});