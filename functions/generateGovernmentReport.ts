import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { report_type_id, period_start, period_end } = payload;

        // Get report type
        const reportTypes = await base44.asServiceRole.entities.GovernmentReportType.filter({ 
            id: report_type_id 
        });
        const reportType = reportTypes[0];

        if (!reportType) {
            return Response.json({ error: 'Report type not found' }, { status: 404 });
        }

        const spec = reportType.spec_json;
        const summary = {};

        // Execute report based on spec_json
        // This is flexible - spec defines what entities and aggregations to use
        if (spec.entities && Array.isArray(spec.entities)) {
            for (const entityName of spec.entities) {
                try {
                    // Dynamically fetch entity data
                    const entityData = await base44.asServiceRole.entities[entityName].list();
                    
                    // Filter by date range if entity has date fields
                    let filteredData = entityData;
                    if (spec.date_field) {
                        filteredData = entityData.filter(record => {
                            const recordDate = new Date(record[spec.date_field]);
                            return recordDate >= new Date(period_start) && 
                                   recordDate <= new Date(period_end);
                        });
                    }

                    // Apply aggregations
                    if (spec.aggregations && Array.isArray(spec.aggregations)) {
                        for (const agg of spec.aggregations) {
                            if (agg === 'count') {
                                summary[`${entityName}_count`] = filteredData.length;
                            }
                            if (agg.startsWith('sum:')) {
                                const field = agg.split(':')[1];
                                summary[`${entityName}_sum_${field}`] = filteredData.reduce(
                                    (sum, record) => sum + (parseFloat(record[field]) || 0), 
                                    0
                                );
                            }
                        }
                    } else {
                        // Default to count
                        summary[`${entityName}_count`] = filteredData.length;
                    }
                } catch (error) {
                    console.error(`Error processing entity ${entityName}:`, error);
                }
            }
        }

        // Generate PDF
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(reportType.name, 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Country: ${reportType.country_code}`, 20, 30);
        doc.text(`Period: ${period_start} to ${period_end}`, 20, 36);
        doc.text(`Generated: ${new Date().toISOString()}`, 20, 42);

        let y = 55;
        doc.setFontSize(12);
        doc.text('Report Summary', 20, y);
        y += 10;

        doc.setFontSize(10);
        Object.entries(summary).forEach(([key, value]) => {
            doc.text(`${key}: ${value}`, 25, y);
            y += 6;
        });

        // In production, upload to storage
        const pdfBytes = doc.output('arraybuffer');
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        // For now, create a data URL (in production, upload to file storage)
        const buffer = new Uint8Array(pdfBytes);
        const base64 = btoa(String.fromCharCode(...buffer));
        const dataUrl = `data:application/pdf;base64,${base64}`;

        // Create report run
        const reportRun = await base44.asServiceRole.entities.GovernmentReportRun.create({
            report_type_id,
            report_type_name: reportType.name,
            period_start,
            period_end,
            generated_at: new Date().toISOString(),
            generated_by: user.id,
            generated_by_email: user.email,
            output_file_ref: dataUrl,
            summary_json: summary
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: '',
            location_id: '',
            patient_id: '',
            module: 'GOVERNMENT_REPORTING',
            action: 'generate_report',
            record_type: 'GovernmentReportRun',
            record_id: reportRun.id,
            metadata: {
                report_type_id,
                report_type_name: reportType.name,
                country_code: reportType.country_code,
                period_start,
                period_end,
                summary
            }
        });

        return Response.json({ reportRun, summary });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});