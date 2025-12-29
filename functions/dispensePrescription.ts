import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { prescriptionId, quantityDispensed, notes, saleId } = payload;

        // Get prescription
        const prescriptions = await base44.asServiceRole.entities.Prescription.filter({ id: prescriptionId });
        const prescription = prescriptions[0];

        if (!prescription) {
            return Response.json({ error: 'Prescription not found' }, { status: 404 });
        }

        // Create dispense event
        const dispenseEvent = await base44.asServiceRole.entities.DispenseEvent.create({
            prescription_id: prescriptionId,
            patient_id: prescription.patient_id,
            sale_id: saleId || null,
            quantity_dispensed: quantityDispensed,
            dispensed_by: user.id,
            dispensed_by_email: user.email,
            dispensed_at: new Date().toISOString(),
            status: quantityDispensed >= prescription.quantity ? 'dispensed' : 'partial',
            notes: notes || ''
        });

        // Update prescription status
        const newStatus = quantityDispensed >= prescription.quantity ? 'dispensed' : 'partially_dispensed';
        await base44.asServiceRole.entities.Prescription.update(prescriptionId, {
            status: newStatus
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: prescription.organization_id || '',
            location_id: prescription.location_id || '',
            patient_id: prescription.patient_id,
            module: 'PHARMACY',
            action: 'dispense',
            record_type: 'DispenseEvent',
            record_id: dispenseEvent.id,
            metadata: {
                prescription_id: prescriptionId,
                drug_name: prescription.drug_name,
                quantity_dispensed: quantityDispensed,
                quantity_prescribed: prescription.quantity,
                status: dispenseEvent.status,
                sale_id: saleId || null
            }
        });

        return Response.json({ dispenseEvent, prescription: { ...prescription, status: newStatus } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});