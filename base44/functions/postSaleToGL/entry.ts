import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saleId, saleAmount, tax, discount } = await req.json();
    if (!saleId || !saleAmount) {
      return Response.json({ error: 'Sale ID and amount required' }, { status: 400 });
    }

    // Get sale for date and org
    const sales = await base44.entities.PharmacySaleHeader.filter({ id: saleId });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    // Get company chart of accounts
    const companies = await base44.entities.CompanyProfile.filter({ organization_id: sale.organization_id });
    const company = companies[0];
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    // Standard GL accounts for pharmacy sales (create if not exists)
    const accounts = {
      cash: '1010', // Cash account
      sales_revenue: '4100', // Sales revenue
      tax_payable: '2100', // Tax payable
      sales_discount: '4200' // Sales discounts
    };

    const journalEntries = [];

    // Entry 1: Debit Cash, Credit Revenue
    journalEntries.push({
      organization_id: sale.organization_id,
      journal_date: sale.sale_date,
      transaction_type: 'pharmacy_sale',
      reference_id: saleId,
      reference_number: sale.sale_number,
      description: `Pharmacy Sale - ${sale.sale_number}`,
      lines: [
        { account_code: accounts.cash, debit: saleAmount, credit: 0 },
        { account_code: accounts.sales_revenue, debit: 0, credit: saleAmount }
      ]
    });

    // Entry 2: Tax posting if applicable
    if (tax && tax > 0) {
      journalEntries.push({
        organization_id: sale.organization_id,
        journal_date: sale.sale_date,
        transaction_type: 'pharmacy_tax',
        reference_id: saleId,
        reference_number: sale.sale_number,
        description: `Sales Tax - ${sale.sale_number}`,
        lines: [
          { account_code: accounts.cash, debit: tax, credit: 0 },
          { account_code: accounts.tax_payable, debit: 0, credit: tax }
        ]
      });
    }

    // Entry 3: Discount posting if applicable
    if (discount && discount > 0) {
      journalEntries.push({
        organization_id: sale.organization_id,
        journal_date: sale.sale_date,
        transaction_type: 'pharmacy_discount',
        reference_id: saleId,
        reference_number: sale.sale_number,
        description: `Sales Discount - ${sale.sale_number}`,
        lines: [
          { account_code: accounts.sales_discount, debit: discount, credit: 0 },
          { account_code: accounts.sales_revenue, debit: 0, credit: discount }
        ]
      });
    }

    // Create journal entries
    const createdEntries = [];
    for (const entry of journalEntries) {
      const created = await base44.entities.JournalEntry.create(entry);
      createdEntries.push(created);
    }

    console.log(`✅ GL posted for sale ${saleId}: ${createdEntries.length} entries`);

    return Response.json({
      success: true,
      sale_id: saleId,
      entries_created: createdEntries.length,
      total_amount: saleAmount,
      message: 'Sale posted to general ledger'
    });
  } catch (error) {
    console.error('GL posting error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});