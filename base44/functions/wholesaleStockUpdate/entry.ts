import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * wholesaleStockUpdate
 * Called to:
 *   action="post_grn"    → post a GRN, add stock_qty to each product
 *   action="deduct_order" → deduct stock_qty when order status → delivered
 *   action="restock_return" → add back stock for resaleable returned items
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, grn_id, order_id, return_id } = body;

  if (action === 'post_grn') {
    // 1. Load GRN and lines
    const grns = await base44.asServiceRole.entities.WholesaleGRN.filter({ id: grn_id });
    const grn = grns[0];
    if (!grn) return Response.json({ error: 'GRN not found' }, { status: 404 });
    if (grn.status === 'posted') return Response.json({ error: 'GRN already posted' }, { status: 400 });

    const lines = await base44.asServiceRole.entities.WholesaleGRNLine.filter({ grn_id });

    // 2. For each line, increment product stock_qty
    for (const line of lines) {
      const products = await base44.asServiceRole.entities.WholesaleProduct.filter({ id: line.product_id });
      const product = products[0];
      if (!product) continue;
      const newQty = (product.stock_qty || 0) + (line.qty_received || 0);
      await base44.asServiceRole.entities.WholesaleProduct.update(line.product_id, { stock_qty: newQty });
    }

    // 3. Mark GRN as posted
    await base44.asServiceRole.entities.WholesaleGRN.update(grn_id, { status: 'posted', received_by: user.email });

    return Response.json({ success: true, message: `GRN posted. ${lines.length} product(s) stock updated.` });
  }

  if (action === 'deduct_order') {
    // Load order items and deduct from stock
    const items = await base44.asServiceRole.entities.WholesaleOrderItem.filter({ order_id });
    let deducted = 0;
    for (const item of items) {
      const products = await base44.asServiceRole.entities.WholesaleProduct.filter({ id: item.product_id });
      const product = products[0];
      if (!product) continue;
      const newQty = Math.max(0, (product.stock_qty || 0) - (item.qty || 0));
      await base44.asServiceRole.entities.WholesaleProduct.update(item.product_id, { stock_qty: newQty });
      deducted++;
    }
    return Response.json({ success: true, message: `Stock deducted for ${deducted} product(s).` });
  }

  if (action === 'restock_return') {
    // Add back resaleable returned items to stock
    const returnLines = await base44.asServiceRole.entities.WholesaleReturnLine.filter({ return_id });
    const resaleable = returnLines.filter(l => l.condition === 'resaleable');
    for (const line of resaleable) {
      const products = await base44.asServiceRole.entities.WholesaleProduct.filter({ id: line.product_id });
      const product = products[0];
      if (!product) continue;
      const newQty = (product.stock_qty || 0) + (line.qty_returned || 0);
      await base44.asServiceRole.entities.WholesaleProduct.update(line.product_id, { stock_qty: newQty });
    }
    // Mark return as restocked
    await base44.asServiceRole.entities.WholesaleReturn.update(return_id, { stock_restocked: true });
    return Response.json({ success: true, message: `${resaleable.length} resaleable item(s) restocked.` });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});