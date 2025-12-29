import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { file_url, patient_id } = payload;

        if (!file_url || !patient_id) {
            return Response.json({ error: 'file_url and patient_id are required' }, { status: 400 });
        }

        // Define expected lab result schema
        const labSchema = {
            type: "object",
            properties: {
                test_results: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            test_name: { type: "string" },
                            test_code: { type: "string" },
                            value: { type: "number" },
                            unit: { type: "string" },
                            reference_range: { type: "string" }
                        }
                    }
                },
                collection_date: { type: "string" },
                lab_name: { type: "string" }
            }
        };

        // Extract lab data from PDF
        const extractionResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: labSchema
        });

        if (extractionResult.status === 'error') {
            return Response.json({ error: extractionResult.details }, { status: 400 });
        }

        const labData = extractionResult.output;

        // Get patient details
        const patients = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });
        const patient = patients[0];

        if (!patient) {
            return Response.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Create order for lab results
        const order = await base44.asServiceRole.entities.Order.create({
            organization_id: patient.organization_id || '',
            location_id: patient.location_id || '',
            patient_id: patient_id,
            order_type: 'LAB',
            status: 'Completed',
            priority: 'routine',
            ordered_by: user.id,
            ordered_at: new Date().toISOString()
        });

        // Create result with structured JSON
        const result = await base44.asServiceRole.entities.Result.create({
            organization_id: patient.organization_id || '',
            location_id: patient.location_id || '',
            order_id: order.id,
            patient_id: patient_id,
            result_type: 'LAB',
            result_date: labData.collection_date || new Date().toISOString(),
            structured_json: {
                lab_name: labData.lab_name,
                test_results: labData.test_results
            },
            narrative_text: `Lab results from ${labData.lab_name || 'External Lab'}`,
            status: 'Released',
            entered_by: user.id
        });

        // Check for abnormal values and flag
        const abnormalTests = [];
        for (const test of labData.test_results || []) {
            // Get lab parameter for reference range
            const params = await base44.asServiceRole.entities.LabParameter.filter({ test_code: test.test_code });
            
            if (params.length > 0) {
                const param = params[0];
                const value = parseFloat(test.value);
                
                if ((param.normal_range_min && value < param.normal_range_min) || 
                    (param.normal_range_max && value > param.normal_range_max)) {
                    abnormalTests.push(test);
                    
                    // Create result flag
                    await base44.asServiceRole.entities.ResultFlag.create({
                        result_id: result.id,
                        flag_type: 'abnormal',
                        severity: 'moderate',
                        parameter_name: test.test_name,
                        value: test.value.toString(),
                        reference_range: test.reference_range || `${param.normal_range_min}-${param.normal_range_max}`,
                        flagged_by: 'system',
                        flagged_at: new Date().toISOString()
                    });
                }
            }
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: patient.organization_id || '',
            location_id: patient.location_id || '',
            patient_id: patient_id,
            module: 'LAB',
            action: 'extract_lab_from_pdf',
            record_type: 'Result',
            record_id: result.id,
            metadata: {
                test_count: labData.test_results?.length || 0,
                abnormal_count: abnormalTests.length,
                file_url: file_url
            }
        });

        return Response.json({
            success: true,
            order_id: order.id,
            result_id: result.id,
            test_count: labData.test_results?.length || 0,
            abnormal_count: abnormalTests.length,
            abnormal_tests: abnormalTests
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});