import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { organizationId, locationId } = await req.json();

        if (!organizationId) {
            return Response.json({ error: 'Organization ID required' }, { status: 400 });
        }

        console.log('🧪 Generating test sale for org:', organizationId);

        // Get a random patient or create test patient
        const patients = await base44.entities.Patient.filter({ organization_id: organizationId });
        let testPatient = patients.find(p => p.first_name === 'Test' && p.last_name === 'Patient');
        
        if (!testPatient) {
            testPatient = await base44.asServiceRole.entities.Patient.create({
                organization_id: organizationId,
                location_id: locationId,
                first_name: 'Test',
                last_name: 'Patient',
                phone: '+94771234567',
                mobile: '+94771234567',
                email: 'test.patient@test.com',
                gender: 'male',
                status: 'active',
                patient_type: 'walk_in'
            });
        }

        // Get some pharmacy stock items
        const stockItems = await base44.entities.PharmacyStock.filter({ organization_id: organizationId });
        
        if (stockItems.length === 0) {
            return Response.json({ 
                error: 'No pharmacy stock items found. Please add stock first.' 
            }, { status: 400 });
        }

        // Select random items (up to 3)
        const selectedItems = stockItems
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(3, stockItems.length));

        // Generate sale header
        const saleNumber = `TEST-${Date.now()}`;
        const totalAmount = selectedItems.reduce((sum, item) => {
            const qty = Math.floor(Math.random() * 3) + 1;
            return sum + (item.unit_price * qty);
        }, 0);

        const saleHeader = await base44.asServiceRole.entities.PharmacySaleHeader.create({
            organization_id: organizationId,
            location_id: locationId,
            sale_number: saleNumber,
            sale_date: new Date().toISOString(),
            patient_id: testPatient.id,
            total_amount: totalAmount,
            paid_amount: totalAmount,
            payment_method: 'cash',
            status: 'completed',
            created_by_user: user.email,
            notes: '🧪 TEST SALE - Generated for testing purposes'
        });

        // Generate sale lines
        const saleLines = [];
        for (const item of selectedItems) {
            const quantity = Math.floor(Math.random() * 3) + 1;
            const lineTotal = item.unit_price * quantity;

            const line = await base44.asServiceRole.entities.PharmacySaleLine.create({
                organization_id: organizationId,
                location_id: locationId,
                sale_header_id: saleHeader.id,
                product_id: item.id,
                product_name: item.display_name,
                batch_no: item.batch_no,
                quantity: quantity,
                unit_price: item.unit_price,
                line_total: lineTotal,
                discount_amount: 0
            });
            
            saleLines.push(line);
        }

        // Create receipt
        await base44.asServiceRole.entities.PharmacyReceipt.create({
            organization_id: organizationId,
            location_id: locationId,
            sale_id: saleHeader.id,
            receipt_number: saleNumber,
            total_amount: totalAmount,
            payment_method: 'cash',
            issued_date: new Date().toISOString(),
            issued_by: user.email
        });

        // Log activity
        await base44.asServiceRole.entities.AuditLog.create({
            organization_id: organizationId,
            module: 'pharmacy',
            action_type: 'create',
            entity_type: 'PharmacySaleHeader',
            entity_id: saleHeader.id,
            patient_id: testPatient.id,
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name,
            description: `🧪 Test sale created: ${saleNumber}`,
            timestamp: new Date().toISOString(),
            status: 'success'
        });

        console.log('✅ Test sale generated successfully');

        return Response.json({
            success: true,
            message: 'Test sale generated successfully',
            sale: {
                saleNumber: saleNumber,
                totalAmount: totalAmount,
                itemCount: selectedItems.length,
                patient: `${testPatient.first_name} ${testPatient.last_name}`
            }
        });

    } catch (error) {
        console.error('❌ Error generating test sale:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});