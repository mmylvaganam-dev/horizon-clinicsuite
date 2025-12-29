import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { patient_id, new_drug_name, new_drug_class } = payload;

        if (!patient_id || !new_drug_name) {
            return Response.json({ error: 'patient_id and new_drug_name are required' }, { status: 400 });
        }

        // Get patient details
        const patients = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });
        const patient = patients[0];

        if (!patient) {
            return Response.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Get all active prescriptions for patient
        const prescriptions = await base44.asServiceRole.entities.Prescription.filter({
            patient_id: patient_id,
            status: 'Verified'
        });

        const activeDrugs = prescriptions.map(p => p.drug_name).filter(Boolean);
        const patientAllergies = patient.allergies || 'None';

        // Use AI to check for interactions
        const prompt = `You are a clinical pharmacist. Check for drug interactions and allergy concerns.

New Drug: ${new_drug_name}${new_drug_class ? ` (${new_drug_class})` : ''}

Current Medications:
${activeDrugs.length > 0 ? activeDrugs.join(', ') : 'None'}

Patient Allergies:
${patientAllergies}

Please provide:
1. Any critical drug-drug interactions
2. Any allergy concerns
3. Severity rating (none, mild, moderate, severe, contraindicated)
4. Clinical recommendations

Return as JSON with fields: interactions (array), allergy_concerns (array), severity (string), recommendations (string)`;

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    interactions: { type: "array", items: { type: "string" } },
                    allergy_concerns: { type: "array", items: { type: "string" } },
                    severity: { type: "string" },
                    recommendations: { type: "string" }
                }
            }
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: patient.organization_id || '',
            location_id: patient.location_id || '',
            patient_id: patient_id,
            module: 'PHARMACY',
            action: 'check_drug_interactions',
            record_type: 'Prescription',
            record_id: '',
            metadata: {
                new_drug: new_drug_name,
                severity: aiResponse.severity,
                interaction_count: aiResponse.interactions?.length || 0
            }
        });

        return Response.json({
            patient_name: `${patient.first_name} ${patient.last_name}`,
            new_drug: new_drug_name,
            current_medications: activeDrugs,
            allergies: patientAllergies,
            ...aiResponse
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});