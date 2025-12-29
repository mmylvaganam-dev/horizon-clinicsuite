import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { invoiceId, paymentData } = payload;

        // Get invoice
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoiceId });
        const invoice = invoices[0];

        if (!invoice) {
            return Response.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.status === 'void') {
            return Response.json({ error: 'Cannot record payment on voided invoice' }, { status: 400 });
        }

        // Create payment
        const payment = await base44.asServiceRole.entities.Payment.create({
            organization_id: invoice.organization_id || '',
            location_id: invoice.location_id || '',
            invoice_id: invoiceId,
            method: paymentData.method,
            amount: paymentData.amount,
            paid_at: new Date().toISOString(),
            reference: paymentData.reference || '',
            notes: paymentData.notes || '',
            created_by: user.id,
            created_by_email: user.email
        });

        // Update invoice
        const newAmountPaid = invoice.amount_paid + paymentData.amount;
        const newBalance = invoice.total - newAmountPaid;
        const newStatus = newBalance <= 0 ? 'paid' : invoice.status;

        await base44.asServiceRole.entities.Invoice.update(invoiceId, {
            amount_paid: newAmountPaid,
            balance: newBalance,
            status: newStatus
        });

        // Auto-post journal entry if posting rules exist
        try {
            await base44.asServiceRole.functions.invoke('postJournalEntry', {
                sourceType: 'Invoice',
                sourceId: invoiceId,
                organizationId: invoice.organization_id,
                locationId: invoice.location_id
            });
        } catch (journalError) {
            console.error('Journal posting error:', journalError);
            // Continue even if journal posting fails
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: invoice.organization_id || '',
            location_id: invoice.location_id || '',
            patient_id: invoice.patient_id || '',
            module: 'BILLING',
            action: 'record_payment',
            record_type: 'Payment',
            record_id: payment.id,
            metadata: {
                invoice_number: invoice.invoice_number,
                amount: paymentData.amount,
                method: paymentData.method,
                new_balance: newBalance
            }
        });

        return Response.json({ 
            payment,
            invoice: { 
                ...invoice, 
                amount_paid: newAmountPaid, 
                balance: newBalance, 
                status: newStatus 
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});