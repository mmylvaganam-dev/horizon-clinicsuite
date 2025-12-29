import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { file_url, organization_id, location_id } = payload;

        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Define expected patient schema
        const patientSchema = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    first_name: { type: "string" },
                    last_name: { type: "string" },
                    date_of_birth: { type: "string" },
                    gender: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    address: { type: "string" },
                    blood_type: { type: "string" },
                    allergies: { type: "string" },
                    chronic_conditions: { type: "string" },
                    insurance_provider: { type: "string" },
                    insurance_number: { type: "string" }
                }
            }
        };

        // Extract data from Excel/CSV file using AI
        const extractionResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: patientSchema
        });

        if (extractionResult.status === 'error') {
            return Response.json({ error: extractionResult.details }, { status: 400 });
        }

        const patientsData = extractionResult.output;

        if (!Array.isArray(patientsData) || patientsData.length === 0) {
            return Response.json({ error: 'No valid patient data found in file' }, { status: 400 });
        }

        // Bulk create patients
        const createdPatients = [];
        const errors = [];

        for (const patientData of patientsData) {
            try {
                const patient = await base44.asServiceRole.entities.Patient.create({
                    organization_id: organization_id || '',
                    location_id: location_id || '',
                    first_name: patientData.first_name,
                    last_name: patientData.last_name,
                    date_of_birth: patientData.date_of_birth,
                    gender: patientData.gender?.toLowerCase(),
                    email: patientData.email,
                    phone: patientData.phone,
                    address: patientData.address,
                    blood_type: patientData.blood_type,
                    allergies: patientData.allergies,
                    chronic_conditions: patientData.chronic_conditions,
                    insurance_provider: patientData.insurance_provider,
                    insurance_number: patientData.insurance_number,
                    status: 'active'
                });
                createdPatients.push(patient);
            } catch (error) {
                errors.push({
                    patient: `${patientData.first_name} ${patientData.last_name}`,
                    error: error.message
                });
            }
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: organization_id || '',
            location_id: location_id || '',
            patient_id: '',
            module: 'ADMIN',
            action: 'bulk_import_patients',
            record_type: 'Patient',
            record_id: '',
            metadata: {
                total_attempted: patientsData.length,
                successful: createdPatients.length,
                failed: errors.length,
                file_url: file_url
            }
        });

        return Response.json({
            success: true,
            total_attempted: patientsData.length,
            successful: createdPatients.length,
            failed: errors.length,
            created_patients: createdPatients,
            errors: errors
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});