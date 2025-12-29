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

        // Validate items
        if (!items || items.length === 0) {
            return Response.json({ error: 'Sale must have at least one item' }, { status: 400 });
        }

        // Create the sale
        const sale = await base44.asServiceRole.entities.PharmacySale.create({
            ...saleData,
            sale_date: new Date().toISOString(),
            created_by: user.id,
            created_by_email: user.email,
            status: 'completed'
        });

        // Create sale items
        const saleItems = await Promise.all(
            items.map(item =>
                base44.asServiceRole.entities.PharmacySaleItem.create({
                    sale_id: sale.id,
                    item_name: item.item_name,
                    drug_id: item.drug_id || null,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    line_total: item.quantity * item.unit_price,
                    notes: item.notes || ''
                })
            )
        );

        // Generate receipt number
        const receiptNumber = await generateReceiptNumber(base44, saleData.organization_id);

        // Create receipt
        const receipt = await base44.asServiceRole.entities.PharmacyReceipt.create({
            sale_id: sale.id,
            receipt_number: receiptNumber,
            issued_at: new Date().toISOString(),
            issued_by: user.id,
            issued_by_email: user.email
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: saleData.organization_id || '',
            location_id: saleData.location_id || '',
            patient_id: saleData.patient_id || null,
            module: 'PHARMACY_POS',
            action: 'create',
            record_type: 'PharmacySale',
            record_id: sale.id,
            metadata: {
                receipt_number: receiptNumber,
                total: saleData.total,
                item_count: items.length
            }
        });

        return Response.json({ sale, saleItems, receipt });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function generateReceiptNumber(base44, organizationId) {
    // Get organization config for receipt numbering
    const configs = await base44.asServiceRole.entities.OrganizationConfig.filter({
        organization_id: organizationId,
        config_key: 'pharmacy_receipt_prefix'
    });

    const prefix = configs.length > 0 ? configs[0].config_value : 'RCP';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}-${timestamp}-${random}`;
}