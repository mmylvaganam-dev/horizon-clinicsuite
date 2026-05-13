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

        // Create LabResultEntry records + flag abnormal values
        const abnormalTests = [];
        for (const test of labData.test_results || []) {
            const params = await base44.asServiceRole.entities.LabParameter.filter({ test_code: test.test_code });
            const param = params[0] || null;

            const numericValue = parseFloat(test.value);
            const refMin = param?.normal_range_min;
            const refMax = param?.normal_range_max;
            let isAbnormal = false;
            let abnormalFlag = null;

            if (!isNaN(numericValue) && (refMin !== undefined || refMax !== undefined)) {
                if (refMin !== undefined && numericValue < refMin) { isAbnormal = true; abnormalFlag = 'low'; }
                if (refMax !== undefined && numericValue > refMax) { isAbnormal = true; abnormalFlag = 'high'; }
            }

            // Create a LabResultEntry for every test
            await base44.asServiceRole.entities.LabResultEntry.create({
                result_id: result.id,
                test_id: param?.id || 'external',
                test_code: test.test_code || test.test_name?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
                test_name: test.test_name,
                value_numeric: isNaN(numericValue) ? undefined : numericValue,
                value_text: test.value?.toString(),
                unit: test.unit || '',
                reference_range_text: test.reference_range || (param ? `${refMin ?? ''}–${refMax ?? ''}` : ''),
                is_abnormal: isAbnormal,
                abnormal_flag: abnormalFlag || undefined,
                entered_by: user.id,
                entered_at: new Date().toISOString()
            });

            if (isAbnormal) {
                abnormalTests.push(test);
                await base44.asServiceRole.entities.ResultFlag.create({
                    result_id: result.id,
                    flag_type: 'abnormal',
                    severity: 'moderate',
                    parameter_name: test.test_name,
                    value: test.value?.toString(),
                    reference_range: test.reference_range || `${refMin ?? ''}–${refMax ?? ''}`,
                    flagged_by: 'system',
                    flagged_at: new Date().toISOString()
                });
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
            action_type: 'create',
            entity_type: 'Result',
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