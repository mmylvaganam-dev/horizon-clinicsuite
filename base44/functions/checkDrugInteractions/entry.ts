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
        const chronicConditions = patient.chronic_conditions || 'None';
        const bloodType = patient.blood_type || 'Unknown';
        const age = patient.date_of_birth 
            ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
            : null;

        // Use AI to check for interactions
        const prompt = `You are a clinical pharmacist. Check for drug interactions, allergy concerns, and contraindications based on the patient's full health profile.

New Drug to Prescribe: ${new_drug_name}${new_drug_class ? ` (${new_drug_class})` : ''}

Patient Profile:
- Age: ${age ? age + ' years' : 'Unknown'}
- Blood Type: ${bloodType}
- Allergies: ${patientAllergies}
- Chronic Conditions: ${chronicConditions}

Current Active Medications:
${activeDrugs.length > 0 ? activeDrugs.map((d, i) => `${i+1}. ${d}`).join('\n') : 'None'}

Please check:
1. Drug-drug interactions with current medications
2. Allergy concerns (including cross-reactivity)
3. Contraindications based on chronic conditions (e.g., renal failure, diabetes, hypertension, liver disease)
4. Age-related dosing concerns
5. Severity rating: none, mild, moderate, severe, or contraindicated
6. Clinical recommendations for the prescriber

Return as JSON with fields: interactions (array of strings), allergy_concerns (array of strings), severity (string), recommendations (string)`;

        const aiResponse = await base44.asServiceRole.functions.invoke('invokeOpenAI', {
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
            chronic_conditions: chronicConditions,
            has_interactions: (aiResponse.interactions?.length > 0 || aiResponse.allergy_concerns?.length > 0),
            ...aiResponse
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});