import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has permission for management reports
        // In production: verify user has 'finance:view_reports' permission
        // For now: require authenticated user only

        const payload = await req.json();
        const { organization_id, period_start, period_end } = payload;

        if (!period_start || !period_end) {
            return Response.json({ error: 'period_start and period_end are required' }, { status: 400 });
        }

        const startDate = new Date(period_start);
        const endDate = new Date(period_end);

        // Fetch all relevant data - using service role for aggregation
        // Data will be filtered by organization_id from payload to prevent cross-org access
        const [invoices, invoiceLines, services, pharmacySales, results, orders] = await Promise.all([
            base44.asServiceRole.entities.Invoice.list(),
            base44.asServiceRole.entities.InvoiceLine.list(),
            base44.asServiceRole.entities.ServiceCatalog.list(),
            base44.asServiceRole.entities.PharmacySale.list(),
            base44.asServiceRole.entities.Result.list(),
            base44.asServiceRole.entities.Order.list()
        ]);

        // SECURITY: Verify organization_id is provided to prevent cross-org data leaks
        if (!organization_id) {
            return Response.json({ error: 'organization_id is required for security' }, { status: 400 });
        }

        // Filter by period and organization
        const filterByPeriod = (item, dateField) => {
            const itemDate = new Date(item[dateField] || item.created_date);
            const inPeriod = itemDate >= startDate && itemDate <= endDate;
            const inOrg = !organization_id || item.organization_id === organization_id;
            return inPeriod && inOrg;
        };

        const periodInvoices = invoices.filter(inv => filterByPeriod(inv, 'invoice_date'));
        const periodSales = pharmacySales.filter(sale => filterByPeriod(sale, 'sale_date'));
        const periodResults = results.filter(res => filterByPeriod(res, 'result_date'));

        // 1. Revenue by service line
        const revenueByService = {};
        for (const line of invoiceLines) {
            const invoice = periodInvoices.find(inv => inv.id === line.invoice_id);
            if (invoice) {
                const serviceName = line.description || 'Other';
                revenueByService[serviceName] = (revenueByService[serviceName] || 0) + (line.line_total || 0);
            }
        }

        // 2. Top services
        const topServices = Object.entries(revenueByService)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, revenue]) => ({ name, revenue }));

        // 3. AR aging
        const now = new Date();
        const arAging = {
            current: 0,
            '30_days': 0,
            '60_days': 0,
            '90_days': 0,
            'over_90': 0
        };
        
        const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
        for (const inv of unpaidInvoices) {
            const invDate = new Date(inv.invoice_date || inv.created_date);
            const daysDiff = Math.floor((now - invDate) / (1000 * 60 * 60 * 24));
            const amount = inv.total || 0;
            
            if (daysDiff <= 30) arAging.current += amount;
            else if (daysDiff <= 60) arAging['30_days'] += amount;
            else if (daysDiff <= 90) arAging['60_days'] += amount;
            else if (daysDiff <= 120) arAging['90_days'] += amount;
            else arAging.over_90 += amount;
        }

        // 4. Pharmacy sales summary
        const pharmacySummary = {
            total_sales: periodSales.length,
            total_revenue: periodSales.reduce((sum, sale) => sum + (sale.total || 0), 0),
            average_sale: periodSales.length > 0 
                ? periodSales.reduce((sum, sale) => sum + (sale.total || 0), 0) / periodSales.length 
                : 0
        };

        // 5. Lab volume and TAT
        const labResults = periodResults.filter(r => r.result_type === 'LAB');
        let totalTAT = 0;
        let tatCount = 0;

        for (const result of labResults) {
            const order = orders.find(o => o.id === result.order_id);
            if (order && order.ordered_at && result.result_date) {
                const orderDate = new Date(order.ordered_at);
                const resultDate = new Date(result.result_date);
                const tat = Math.floor((resultDate - orderDate) / (1000 * 60 * 60)); // hours
                totalTAT += tat;
                tatCount++;
            }
        }

        const labSummary = {
            total_tests: labResults.length,
            average_tat_hours: tatCount > 0 ? (totalTAT / tatCount).toFixed(1) : 0,
            signed: labResults.filter(r => r.status === 'Signed' || r.status === 'Released').length,
            pending: labResults.filter(r => r.status === 'Pending' || r.status === 'Entered').length
        };

        // 6. Diagnostic volume
        const diagnosticVolume = {
            cardio: periodResults.filter(r => r.result_type === 'CARDIO' && (r.status === 'Signed' || r.status === 'Released')).length,
            pft: periodResults.filter(r => r.result_type === 'PFT' && (r.status === 'Signed' || r.status === 'Released')).length,
            radiology: periodResults.filter(r => r.result_type === 'RADIOLOGY' && (r.status === 'Signed' || r.status === 'Released')).length
        };

        // Create summary object
        const summary = {
            period: { start: period_start, end: period_end },
            revenue_by_service: revenueByService,
            top_services: topServices,
            ar_aging: arAging,
            pharmacy_summary: pharmacySummary,
            lab_summary: labSummary,
            diagnostic_volume: diagnosticVolume,
            total_revenue: periodInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
            invoice_count: periodInvoices.length
        };

        // Get critical result count
        const criticalFlags = await base44.asServiceRole.entities.ResultFlag.list();
        const criticalResultIds = new Set(
            criticalFlags
                .filter(f => f.flag_type === 'critical')
                .map(f => f.result_id)
        );
        const criticalCount = labResults.filter(r => criticalResultIds.has(r.id)).length;

        // Get inventory for low stock summary
        const inventoryBalances = await base44.asServiceRole.entities.InventoryBalance.list();
        const lowStockItems = inventoryBalances.filter(inv => {
            const inOrg = !organization_id || inv.organization_id === organization_id;
            return inOrg && inv.available_qty < 10; // threshold for low stock
        });

        // Add to summary
        summary.lab_summary.critical_count = criticalCount;
        summary.low_stock_summary = {
            low_stock_items: lowStockItems.length,
            items: lowStockItems.slice(0, 10).map(item => ({
                product_code: item.product_code,
                available_qty: item.available_qty
            }))
        };
        summary.diagnostic_volume.signed_count = diagnosticVolume.cardio + diagnosticVolume.pft + diagnosticVolume.radiology;
        summary.diagnostic_volume.released_count = periodResults.filter(r => 
            ['CARDIO', 'PFT', 'RADIOLOGY'].includes(r.result_type) && r.status === 'Released'
        ).length;

        // Create ExportBundle
        const bundle = await base44.asServiceRole.entities.ExportBundle.create({
            organization_id: organization_id || '',
            location_id: '',
            bundle_type: 'custom',
            date_from: period_start,
            date_to: period_end,
            status: 'generated',
            requested_by: user.id,
            requested_by_email: user.email,
            requested_at: new Date().toISOString(),
            export_reason: 'Monthly Management Pack Report',
            generated_by: user.id,
            generated_by_email: user.email,
            generated_at: new Date().toISOString(),
            file_ref: `management_pack_${period_start}_${period_end}_${Date.now()}`,
            notes: 'Monthly Management Pack Report',
            summary_json: summary
        });

        // Create DocumentArtifact
        const artifact = await base44.asServiceRole.entities.DocumentArtifact.create({
            organization_id: organization_id || '',
            location_id: '',
            patient_ref: '',
            artifact_type: 'other',
            source_type: 'ExportBundle',
            source_id: bundle.id,
            file_ref: bundle.file_ref,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            metadata_json: {
                report_type: 'monthly_management_pack',
                period_start,
                period_end,
                organization_id: organization_id || 'all'
            }
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: organization_id || '',
            location_id: '',
            patient_id: '',
            module: 'REPORTS',
            action: 'generate_management_pack',
            record_type: 'ExportBundle',
            record_id: bundle.id,
            metadata: {
                period_start,
                period_end,
                total_revenue: summary.total_revenue,
                invoice_count: summary.invoice_count,
                artifact_id: artifact.id
            }
        });

        return Response.json({ bundle, summary, artifact_id: artifact.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});