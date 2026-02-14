import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saleId, returnAmount, originalSaleAmount } = await req.json();
    if (!saleId || !returnAmount) {
      return Response.json({ error: 'Sale ID and return amount required' }, { status: 400 });
    }

    // Get sale
    const sales = await base44.entities.PharmacySaleHeader.filter({ id: saleId });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    const accounts = {
      cash: '1010',
      sales_returns: '4110', // Sales returns account
      sales_revenue: '4100'
    };

    // Post return to GL - reverse the original entry
    const returnEntry = {
      organization_id: sale.organization_id,
      journal_date: new Date().toISOString(),
      transaction_type: 'pharmacy_return',
      reference_id: saleId,
      reference_number: `RET-${sale.sale_number}`,
      description: `Return for Sale ${sale.sale_number} - Rs ${returnAmount.toFixed(2)}`,
      lines: [
        { account_code: accounts.cash, debit: 0, credit: returnAmount }, // Credit cash (reducing cash)
        { account_code: accounts.sales_returns, debit: returnAmount, credit: 0 } // Debit sales return
      ]
    };

    const created = await base44.entities.JournalEntry.create(returnEntry);
    
    console.log(`✅ Return GL posted for sale ${saleId}: Rs ${returnAmount}`);

    return Response.json({
      success: true,
      sale_id: saleId,
      return_amount: returnAmount,
      journal_entry_id: created.id,
      message: 'Return posted to general ledger'
    });
  } catch (error) {
    console.error('Return GL posting error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});