import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { bundleId } = payload;

        if (!bundleId) {
            return Response.json({ error: 'bundleId is required' }, { status: 400 });
        }

        // Get the approved bundle
        const bundles = await base44.asServiceRole.entities.ExportBundle.filter({ id: bundleId });
        const bundle = bundles[0];

        if (!bundle) {
            return Response.json({ error: 'Bundle not found' }, { status: 404 });
        }

        if (bundle.status !== 'approved') {
            return Response.json({ error: 'Bundle must be approved before generation' }, { status: 400 });
        }

        const { organization_id, location_id, bundle_type, date_from, date_to } = bundle;

        // CRITICAL: No cross-organization export
        // Ensure all data fetched is scoped to the specified organization
        const summary = {
            organization_id,
            location_id: location_id || 'all',
            bundle_type,
            period: `${date_from} to ${date_to}`,
            patient_ids: [],
            record_counts: {}
        };

        const patientSet = new Set();
        const dateFrom = new Date(date_from);
        const dateTo = new Date(date_to);

        // Fetch data based on bundle type
        switch (bundle_type) {
            case 'patient_records': {
                const patients = await base44.asServiceRole.entities.Patient.filter({ 
                    organization_id 
                });
                patients.forEach(p => {
                    const createdDate = new Date(p.created_date);
                    if (createdDate >= dateFrom && createdDate <= dateTo) {
                        patientSet.add(p.id);
                    }
                });
                summary.record_counts.patients = patientSet.size;
                break;
            }

            case 'lab_results': {
                const results = await base44.asServiceRole.entities.Result.filter({ 
                    organization_id,
                    result_type: 'LAB'
                });
                results.forEach(r => {
                    const resultDate = new Date(r.result_date || r.created_date);
                    if (resultDate >= dateFrom && resultDate <= dateTo) {
                        patientSet.add(r.patient_id);
                    }
                });
                summary.record_counts.lab_results = results.filter(r => {
                    const d = new Date(r.result_date || r.created_date);
                    return d >= dateFrom && d <= dateTo;
                }).length;
                break;
            }

            case 'cardio_results': {
                const results = await base44.asServiceRole.entities.Result.filter({ 
                    organization_id,
                    result_type: 'CARDIO'
                });
                results.forEach(r => {
                    const resultDate = new Date(r.result_date || r.created_date);
                    if (resultDate >= dateFrom && resultDate <= dateTo) {
                        patientSet.add(r.patient_id);
                    }
                });
                summary.record_counts.cardio_results = results.filter(r => {
                    const d = new Date(r.result_date || r.created_date);
                    return d >= dateFrom && d <= dateTo;
                }).length;
                break;
            }

            case 'billing_data': {
                const invoices = await base44.asServiceRole.entities.Invoice.filter({ 
                    organization_id 
                });
                invoices.forEach(inv => {
                    const issuedDate = new Date(inv.issued_at || inv.created_date);
                    if (issuedDate >= dateFrom && issuedDate <= dateTo) {
                        if (inv.patient_id) patientSet.add(inv.patient_id);
                    }
                });
                summary.record_counts.invoices = invoices.filter(inv => {
                    const d = new Date(inv.issued_at || inv.created_date);
                    return d >= dateFrom && d <= dateTo;
                }).length;
                break;
            }

            case 'pharmacy_sales': {
                const sales = await base44.asServiceRole.entities.PharmacySale.filter({ 
                    organization_id 
                });
                sales.forEach(sale => {
                    const saleDate = new Date(sale.sale_date);
                    if (saleDate >= dateFrom && saleDate <= dateTo) {
                        if (sale.patient_id) patientSet.add(sale.patient_id);
                    }
                });
                summary.record_counts.pharmacy_sales = sales.filter(s => {
                    const d = new Date(s.sale_date);
                    return d >= dateFrom && d <= dateTo;
                }).length;
                break;
            }

            case 'full_backup': {
                // Full organization backup - all entities
                const [patients, results, orders, appointments, invoices] = await Promise.all([
                    base44.asServiceRole.entities.Patient.filter({ organization_id }),
                    base44.asServiceRole.entities.Result.filter({ organization_id }),
                    base44.asServiceRole.entities.Order.filter({ organization_id }),
                    base44.asServiceRole.entities.Appointment.filter({ organization_id }),
                    base44.asServiceRole.entities.Invoice.filter({ organization_id })
                ]);

                patients.forEach(p => {
                    const d = new Date(p.created_date);
                    if (d >= dateFrom && d <= dateTo) patientSet.add(p.id);
                });

                summary.record_counts = {
                    patients: patients.filter(p => {
                        const d = new Date(p.created_date);
                        return d >= dateFrom && d <= dateTo;
                    }).length,
                    results: results.filter(r => {
                        const d = new Date(r.result_date || r.created_date);
                        return d >= dateFrom && d <= dateTo;
                    }).length,
                    orders: orders.filter(o => {
                        const d = new Date(o.ordered_at || o.created_date);
                        return d >= dateFrom && d <= dateTo;
                    }).length,
                    appointments: appointments.filter(a => {
                        const d = new Date(a.start_time);
                        return d >= dateFrom && d <= dateTo;
                    }).length,
                    invoices: invoices.filter(i => {
                        const d = new Date(i.issued_at || i.created_date);
                        return d >= dateFrom && d <= dateTo;
                    }).length
                };
                break;
            }

            default:
                return Response.json({ error: 'Invalid bundle_type' }, { status: 400 });
        }

        summary.patient_ids = Array.from(patientSet);
        summary.total_patients = patientSet.size;
        summary.total_records = Object.values(summary.record_counts).reduce((sum, count) => sum + count, 0);

        // Generate file reference (in production, this would be a zip file or similar)
        const fileRef = `export_${bundle_type}_${organization_id}_${new Date().toISOString()}.zip`;

        // Update bundle to generated status
        const updatedBundle = await base44.asServiceRole.entities.ExportBundle.update(bundleId, {
            status: 'generated',
            generated_by: user.id,
            generated_by_email: user.email,
            generated_at: new Date().toISOString(),
            file_ref: fileRef,
            summary_json: summary
        });

        // Create document artifact
        const artifact = await base44.asServiceRole.entities.DocumentArtifact.create({
            organization_id,
            location_id: location_id || '',
            patient_ref: '',
            artifact_type: 'export_bundle',
            source_type: 'ExportBundle',
            source_id: bundleId,
            file_ref: fileRef,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString()
        });

        // Audit log for export generation
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id,
            location_id: location_id || '',
            patient_id: '',
            module: 'EXPORT_CONTROL',
            action: 'generate_export_bundle',
            record_type: 'ExportBundle',
            record_id: bundleId,
            metadata: {
                bundle_type,
                period: `${date_from} to ${date_to}`,
                total_patients: summary.total_patients,
                total_records: summary.total_records,
                record_counts: summary.record_counts,
                artifact_id: artifact.id
            }
        });

        // Audit log entries for each patient included in export
        for (const patientId of summary.patient_ids) {
            await base44.asServiceRole.entities.AuditLog.create({
                timestamp: new Date().toISOString(),
                user_id: user.id,
                user_email: user.email,
                organization_id,
                location_id: location_id || '',
                patient_id: patientId,
                module: 'EXPORT_CONTROL',
                action: 'patient_data_exported',
                record_type: 'ExportBundle',
                record_id: bundleId,
                metadata: {
                    bundle_type,
                    export_date: new Date().toISOString()
                }
            });
        }

        return Response.json({ 
            bundle: updatedBundle, 
            summary,
            artifact_id: artifact.id
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});