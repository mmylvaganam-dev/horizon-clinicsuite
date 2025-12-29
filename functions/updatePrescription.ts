import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { prescriptionId, updates } = payload;

        // Get existing prescription
        const existingPrescriptions = await base44.asServiceRole.entities.Prescription.filter({ id: prescriptionId });
        const existingPrescription = existingPrescriptions[0];

        if (!existingPrescription) {
            return Response.json({ error: 'Prescription not found' }, { status: 404 });
        }

        // Update the prescription
        const updatedPrescription = await base44.asServiceRole.entities.Prescription.update(prescriptionId, updates);

        // Audit status transition if status changed
        if (updates.status && updates.status !== existingPrescription.status) {
            await base44.asServiceRole.entities.AuditLog.create({
                timestamp: new Date().toISOString(),
                user_id: user.id,
                user_email: user.email,
                organization_id: existingPrescription.organization_id || '',
                location_id: existingPrescription.location_id || '',
                patient_id: existingPrescription.patient_id,
                module: 'PHARMACY',
                action: 'status_transition',
                record_type: 'Prescription',
                record_id: prescriptionId,
                metadata: {
                    previous_status: existingPrescription.status,
                    new_status: updates.status
                }
            });
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: existingPrescription.organization_id || '',
            location_id: existingPrescription.location_id || '',
            patient_id: existingPrescription.patient_id,
            module: 'PHARMACY',
            action: 'update',
            record_type: 'Prescription',
            record_id: prescriptionId,
            metadata: {
                updates,
                previous_status: existingPrescription.status,
                new_status: updates.status || existingPrescription.status
            }
        });

        return Response.json({ prescription: updatedPrescription });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});