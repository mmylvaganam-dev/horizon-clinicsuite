import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { prescriptionData } = payload;

        // Set prescribed date if not provided
        if (!prescriptionData.prescribed_date) {
            prescriptionData.prescribed_date = new Date().toISOString();
        }

        // Create the prescription
        const prescription = await base44.asServiceRole.entities.Prescription.create(prescriptionData);

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: prescriptionData.organization_id || '',
            location_id: prescriptionData.location_id || '',
            patient_id: prescriptionData.patient_id,
            module: 'PHARMACY',
            action: 'create',
            record_type: 'Prescription',
            record_id: prescription.id,
            metadata: {
                drug_name: prescriptionData.drug_name,
                quantity: prescriptionData.quantity,
                refills: prescriptionData.refills,
                status: prescriptionData.status || 'pending'
            }
        });

        return Response.json({ prescription });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});