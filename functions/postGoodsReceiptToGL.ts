import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { grId, grAmount, poId } = await req.json();
    if (!grId || !grAmount) return Response.json({ error: 'GR ID and amount required' }, { status: 400 });

    const grs = await base44.entities.GoodsReceived.filter({ id: grId });
    const gr = grs[0];
    if (!gr) return Response.json({ error: 'GR not found' }, { status: 404 });

    const accounts = {
      inventory: '1200',
      accounts_payable: '2200'
    };

    // If GR matches PO, reverse the provisional entry and finalize
    // Entry: Debit Accounts Payable (to finalize), Credit Inventory
    const entry = await base44.entities.JournalEntry.create({
      organization_id: gr.organization_id,
      journal_date: gr.received_date || new Date().toISOString(),
      transaction_type: 'goods_received',
      reference_id: grId,
      reference_number: `GR-${gr.id.substring(0, 8)}`,
      description: `Goods Received - Rs ${grAmount.toFixed(2)}`,
      lines: [
        { account_code: accounts.inventory, debit: grAmount, credit: 0 },
        { account_code: accounts.accounts_payable, debit: 0, credit: grAmount }
      ]
    });

    console.log(`✅ GR GL posted: ${grId} - Rs ${grAmount}`);
    return Response.json({ success: true, entry_id: entry.id, amount: grAmount });
  } catch (error) {
    console.error('GR GL error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});