import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Platform owner check
        const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' || 
                                user.email === 'mylvaganam@premierhealthcanada.ca';
        
        if (!isPlatformOwner) {
            return Response.json({ error: 'Forbidden: Platform owner only' }, { status: 403 });
        }

        const { organizationId } = await req.json();

        if (!organizationId) {
            return Response.json({ error: 'Organization ID required' }, { status: 400 });
        }

        console.log('🔴 CLEARING ALL SALES DATA for org:', organizationId);

        // Clear pharmacy sales data
        const pharmacySales = await base44.asServiceRole.entities.PharmacySaleHeader.filter({ organization_id: organizationId });
        for (const sale of pharmacySales) {
            await base44.asServiceRole.entities.PharmacySaleHeader.delete(sale.id);
        }

        const pharmacySaleLines = await base44.asServiceRole.entities.PharmacySaleLine.filter({ organization_id: organizationId });
        for (const line of pharmacySaleLines) {
            await base44.asServiceRole.entities.PharmacySaleLine.delete(line.id);
        }

        const pharmacyReceipts = await base44.asServiceRole.entities.PharmacyReceipt.filter({ organization_id: organizationId });
        for (const receipt of pharmacyReceipts) {
            await base44.asServiceRole.entities.PharmacyReceipt.delete(receipt.id);
        }

        // Clear audit logs
        const auditLogs = await base44.asServiceRole.entities.AuditLog.filter({ organization_id: organizationId });
        for (const log of auditLogs) {
            await base44.asServiceRole.entities.AuditLog.delete(log.id);
        }

        // Clear invoices
        const invoices = await base44.asServiceRole.entities.InvoiceHeader.filter({ organization_id: organizationId });
        for (const invoice of invoices) {
            await base44.asServiceRole.entities.InvoiceHeader.delete(invoice.id);
        }

        const invoiceLines = await base44.asServiceRole.entities.InvoiceLine.filter({ organization_id: organizationId });
        for (const line of invoiceLines) {
            await base44.asServiceRole.entities.InvoiceLine.delete(line.id);
        }

        // Clear payments
        const payments = await base44.asServiceRole.entities.Payment.filter({ organization_id: organizationId });
        for (const payment of payments) {
            await base44.asServiceRole.entities.Payment.delete(payment.id);
        }

        console.log('✅ All sales data cleared successfully');

        return Response.json({ 
            success: true,
            message: 'All sales data cleared successfully',
            cleared: {
                pharmacySales: pharmacySales.length,
                pharmacySaleLines: pharmacySaleLines.length,
                pharmacyReceipts: pharmacyReceipts.length,
                auditLogs: auditLogs.length,
                invoices: invoices.length,
                invoiceLines: invoiceLines.length,
                payments: payments.length
            }
        });

    } catch (error) {
        console.error('❌ Error clearing sales data:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});