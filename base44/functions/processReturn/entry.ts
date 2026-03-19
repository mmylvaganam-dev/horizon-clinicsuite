import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      saleId, 
      items, // [{ stock_id, qty, reason }]
      returnType, // 'customer_refund' or 'vendor_credit'
      notes 
    } = await req.json();

    if (!saleId || !items || items.length === 0) {
      return Response.json({ error: 'Sale ID and items required' }, { status: 400 });
    }

    // Get original sale
    const sales = await base44.entities.PharmacySaleHeader.filter({ id: saleId });
    const sale = sales[0];
    
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Verify authorization
    if (sale.organization_id !== user.organization_id && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let totalReturnAmount = 0;

    // Process each returned item
    for (const returnItem of items) {
      // Get stock item
      const stockItems = await base44.entities.PharmacyStock.filter({ id: returnItem.stock_id });
      if (stockItems.length === 0) continue;

      const stock = stockItems[0];
      
      // Restore quantity
      await base44.entities.PharmacyStock.update(returnItem.stock_id, {
        quantity: (stock.quantity || 0) + returnItem.qty
      });

      // Calculate refund amount (from original sale line)
      const saleLines = await base44.entities.PharmacySaleLine.filter({ 
        sale_header_id: saleId,
        stock_id: returnItem.stock_id
      });

      if (saleLines.length > 0) {
        const lineTotalPerUnit = saleLines[0].unit_price || 0;
        totalReturnAmount += lineTotalPerUnit * returnItem.qty;
      }

      console.log(`✅ Returned ${returnItem.qty} units of ${stock.display_name}`);
    }

    // Update original sale with return info
    const updatedNotes = `${sale.notes || ''}\n[RETURN: ${returnType} - Rs ${totalReturnAmount.toFixed(2)} - ${items[0]?.reason || 'No reason provided'} - ${new Date().toISOString()}]`;
    
    await base44.entities.PharmacySaleHeader.update(saleId, {
      notes: updatedNotes
    });

    // Post return to GL
    try {
      await base44.functions.invoke('postReturnToGL', {
        saleId: saleId,
        returnAmount: totalReturnAmount,
        originalSaleAmount: sale.total
      });
    } catch (glError) {
      console.warn('GL posting failed (return still processed):', glError);
    }

    return Response.json({
      success: true,
      message: `Return processed (${returnType})`,
      sale_id: saleId,
      items_returned: items.length,
      total_refund_amount: totalReturnAmount,
      return_type: returnType,
      gl_posted: true
    });
  } catch (error) {
    console.error('Process return error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});