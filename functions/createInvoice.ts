import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { invoiceData, lines, linkedRecords } = payload;

        // Generate invoice number
        const year = new Date().getFullYear();
        const timestamp = Date.now();
        const invoiceNumber = `INV-${year}-${timestamp.toString().slice(-6)}`;

        // Calculate line totals and categorize
        const processedLines = lines.map(line => ({
            ...line,
            line_total: line.qty * line.unit_price
        }));

        const subtotal = processedLines.reduce((sum, line) => sum + line.line_total, 0);

        // Get active tax rules
        const taxRules = await base44.asServiceRole.entities.TaxRule.filter({ is_active: true });

        // Calculate tax based on categories
        let totalTax = 0;
        const categoryTotals = {};

        processedLines.forEach(line => {
            if (!categoryTotals[line.category]) {
                categoryTotals[line.category] = 0;
            }
            categoryTotals[line.category] += line.line_total;
        });

        for (const [category, amount] of Object.entries(categoryTotals)) {
            for (const rule of taxRules) {
                const appliesToCategories = rule.applies_to_categories || [];
                if (appliesToCategories.length === 0 || appliesToCategories.includes(category)) {
                    totalTax += (amount * rule.rate / 100);
                }
            }
        }

        const total = subtotal + totalTax;

        // Create invoice
        const invoice = await base44.asServiceRole.entities.Invoice.create({
            ...invoiceData,
            invoice_number: invoiceNumber,
            subtotal,
            tax: totalTax,
            total,
            balance: total,
            amount_paid: 0,
            issued_at: new Date().toISOString(),
            created_by: user.id,
            created_by_email: user.email
        });

        // Create invoice lines
        const createdLines = [];
        for (const line of processedLines) {
            const invoiceLine = await base44.asServiceRole.entities.InvoiceLine.create({
                invoice_id: invoice.id,
                service_code: line.service_code || '',
                description: line.description,
                category: line.category || 'other',
                qty: line.qty,
                unit_price: line.unit_price,
                line_total: line.line_total
            });
            createdLines.push(invoiceLine);
        }

        // Create RecordLinks if provided
        if (linkedRecords && linkedRecords.length > 0) {
            for (const link of linkedRecords) {
                await base44.asServiceRole.entities.RecordLink.create({
                    organization_id: invoiceData.organization_id || '',
                    location_id: invoiceData.location_id || '',
                    left_type: link.record_type,
                    left_id: link.record_id,
                    right_type: 'Invoice',
                    right_id: invoice.id,
                    link_purpose: link.purpose || 'invoice_for_record',
                    created_by: user.id,
                    created_by_email: user.email,
                    created_at: new Date().toISOString(),
                    metadata_json: {
                        invoice_number: invoiceNumber
                    }
                });
            }
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: invoiceData.organization_id || '',
            location_id: invoiceData.location_id || '',
            patient_id: invoiceData.patient_id || '',
            module: 'BILLING',
            action: 'create_invoice',
            record_type: 'Invoice',
            record_id: invoice.id,
            metadata: {
                invoice_number: invoiceNumber,
                total,
                line_count: lines.length
            }
        });

        return Response.json({ 
            invoice,
            lines: createdLines
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});