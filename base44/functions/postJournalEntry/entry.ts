import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { sourceType, sourceId, organizationId, locationId } = payload;

        // Get active posting rules for this source type
        const rules = await base44.asServiceRole.entities.PostingRule.filter({
            source_type: sourceType,
            is_active: true
        });

        if (rules.length === 0) {
            return Response.json({ 
                message: 'No posting rules configured for this source type',
                posted: false 
            });
        }

        // Get source record details
        let sourceRecord;
        let memo;
        let amount;
        let category;

        if (sourceType === 'Invoice') {
            const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: sourceId });
            sourceRecord = invoices[0];
            memo = `Payment for invoice ${sourceRecord.invoice_number}`;
            amount = sourceRecord.total;
        } else if (sourceType === 'PharmacySale') {
            const sales = await base44.asServiceRole.entities.PharmacySale.filter({ id: sourceId });
            sourceRecord = sales[0];
            memo = `Pharmacy sale`;
            amount = sourceRecord.total;
        } else {
            return Response.json({ error: 'Unsupported source type' }, { status: 400 });
        }

        if (!sourceRecord) {
            return Response.json({ error: 'Source record not found' }, { status: 404 });
        }

        // Generate journal entry number
        const year = new Date().getFullYear();
        const timestamp = Date.now();
        const entryNumber = `JE-${year}-${timestamp.toString().slice(-6)}`;

        // Create journal entry
        const journalEntry = await base44.asServiceRole.entities.JournalEntry.create({
            organization_id: organizationId || sourceRecord.organization_id || '',
            location_id: locationId || sourceRecord.location_id || '',
            entry_date: new Date().toISOString().split('T')[0],
            entry_number: entryNumber,
            memo,
            source_type: sourceType,
            source_id: sourceId,
            status: 'posted',
            created_at: new Date().toISOString(),
            created_by: user.id,
            created_by_email: user.email
        });

        // Create journal lines based on posting rules
        const lines = [];
        for (const rule of rules) {
            // Check if rule applies to this category (if specified)
            if (rule.source_category && category && rule.source_category !== category) {
                continue;
            }

            // Get account names
            const debitAccounts = await base44.asServiceRole.entities.ChartOfAccounts.filter({
                code: rule.debit_account_code
            });
            const creditAccounts = await base44.asServiceRole.entities.ChartOfAccounts.filter({
                code: rule.credit_account_code
            });

            const debitAccountName = debitAccounts[0]?.name || rule.debit_account_code;
            const creditAccountName = creditAccounts[0]?.name || rule.credit_account_code;

            // Debit line
            const debitLine = await base44.asServiceRole.entities.JournalLine.create({
                journal_entry_id: journalEntry.id,
                account_code: rule.debit_account_code,
                account_name: debitAccountName,
                debit: amount,
                credit: 0,
                note: memo
            });
            lines.push(debitLine);

            // Credit line
            const creditLine = await base44.asServiceRole.entities.JournalLine.create({
                journal_entry_id: journalEntry.id,
                account_code: rule.credit_account_code,
                account_name: creditAccountName,
                debit: 0,
                credit: amount,
                note: memo
            });
            lines.push(creditLine);
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: organizationId || '',
            location_id: locationId || '',
            patient_id: '',
            module: 'ACCOUNTING',
            action: 'auto_post_journal',
            record_type: 'JournalEntry',
            record_id: journalEntry.id,
            metadata: {
                entry_number: entryNumber,
                source_type: sourceType,
                source_id: sourceId,
                amount
            }
        });

        return Response.json({ 
            journalEntry,
            lines,
            posted: true
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});