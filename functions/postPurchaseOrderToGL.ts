import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { poId, poAmount, vendorId } = await req.json();
    if (!poId || !poAmount) return Response.json({ error: 'PO ID and amount required' }, { status: 400 });

    // Get PO
    const pos = await base44.entities.PurchaseOrder.filter({ id: poId });
    const po = pos[0];
    if (!po) return Response.json({ error: 'PO not found' }, { status: 404 });

    const accounts = {
      inventory: '1200',
      accounts_payable: '2200',
      purchase_expense: '5100'
    };

    // Entry: Debit Inventory (or Expense), Credit Accounts Payable
    const entry = await base44.entities.JournalEntry.create({
      organization_id: po.organization_id,
      journal_date: new Date().toISOString(),
      transaction_type: 'purchase_order',
      reference_id: poId,
      reference_number: po.po_number || 'PO',
      description: `Purchase Order - Rs ${poAmount.toFixed(2)}`,
      lines: [
        { account_code: accounts.inventory, debit: poAmount, credit: 0 },
        { account_code: accounts.accounts_payable, debit: 0, credit: poAmount }
      ]
    });

    console.log(`✅ PO GL posted: ${poId} - Rs ${poAmount}`);
    return Response.json({ success: true, entry_id: entry.id, amount: poAmount });
  } catch (error) {
    console.error('PO GL error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});