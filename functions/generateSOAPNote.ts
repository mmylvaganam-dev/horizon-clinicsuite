import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { patient_id, encounter_id, voice_transcript, note_date } = payload;

        if (!patient_id || !voice_transcript) {
            return Response.json({ error: 'patient_id and voice_transcript are required' }, { status: 400 });
        }

        // Get patient details for context
        const patient = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });
        const patientData = patient[0];

        // Use AI to generate SOAP note from transcript
        const prompt = `You are a medical assistant helping to structure clinical notes. Given the following patient information and clinical encounter transcript, generate a well-structured SOAP note.

Patient: ${patientData.first_name} ${patientData.last_name}, Age: ${patientData.date_of_birth ? new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear() : 'Unknown'}
Known Allergies: ${patientData.allergies || 'None documented'}
Chronic Conditions: ${patientData.chronic_conditions || 'None documented'}

Clinical Transcript:
${voice_transcript}

Please structure the response as a JSON object with the following fields:
- subjective: Patient's complaints and symptoms (what they report)
- objective: Clinical findings, vitals, physical exam results
- assessment: Diagnosis or clinical impression
- plan: Treatment plan, medications, follow-up
- icd10_codes: Array of relevant ICD-10 codes (if identifiable)

Be concise but comprehensive. Use medical terminology appropriately.`;

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    subjective: { type: "string" },
                    objective: { type: "string" },
                    assessment: { type: "string" },
                    plan: { type: "string" },
                    icd10_codes: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Create SOAP note
        const soapNote = await base44.asServiceRole.entities.SOAPNote.create({
            organization_id: patientData.organization_id || '',
            location_id: patientData.location_id || '',
            patient_id: patient_id,
            encounter_id: encounter_id || '',
            provider_id: user.id,
            provider_email: user.email,
            note_date: note_date ? new Date(note_date).toISOString() : new Date().toISOString(),
            subjective: aiResponse.subjective,
            objective: aiResponse.objective,
            assessment: aiResponse.assessment,
            plan: aiResponse.plan,
            ai_generated: true,
            voice_transcript: voice_transcript,
            status: 'draft',
            icd10_codes: aiResponse.icd10_codes || []
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: patientData.organization_id || '',
            location_id: patientData.location_id || '',
            patient_id: patient_id,
            module: 'EMR',
            action: 'generate_soap_note_ai',
            record_type: 'SOAPNote',
            record_id: soapNote.id,
            metadata: {
                ai_generated: true,
                transcript_length: voice_transcript.length
            }
        });

        return Response.json({ soapNote });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});