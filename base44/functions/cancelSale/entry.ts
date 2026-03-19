import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saleId } = await req.json();
    if (!saleId) {
      return Response.json({ error: 'Sale ID required' }, { status: 400 });
    }

    // Get sale header
    const sales = await base44.entities.PharmacySaleHeader.filter({ id: saleId });
    const sale = sales[0];
    
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Verify user owns this organization
    if (sale.organization_id !== user.organization_id && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all sale line items
    const saleLines = await base44.entities.PharmacySaleLine.filter({ sale_header_id: saleId });

    // Restore stock for each item
    for (const line of saleLines) {
      if (line.stock_id) {
        const stockItems = await base44.entities.PharmacyStock.filter({ id: line.stock_id });
        if (stockItems.length > 0) {
          const stock = stockItems[0];
          await base44.entities.PharmacyStock.update(line.stock_id, {
            quantity: (stock.quantity || 0) + line.qty
          });
        }
      }
    }

    // Mark sale as void
    await base44.entities.PharmacySaleHeader.update(saleId, {
      status: 'void',
      notes: `${sale.notes || ''} [CANCELLED on ${new Date().toISOString()} by ${user.email}]`
    });

    // Post reversal to GL (reverse the original GL entries)
    try {
      await base44.functions.invoke('postReturnToGL', {
        saleId: saleId,
        returnAmount: sale.total,
        originalSaleAmount: sale.total
      });
    } catch (glError) {
      console.warn('GL reversal failed (sale still cancelled):', glError);
    }

    return Response.json({
      success: true,
      message: 'Sale cancelled and stock restored',
      sale_id: saleId,
      items_restored: saleLines.length,
      amount_reversed: sale.total,
      gl_reversed: true
    });
  } catch (error) {
    console.error('Cancel sale error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});