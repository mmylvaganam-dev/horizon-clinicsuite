import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationId, locationId, method = 'FIFO' } = await req.json();
    if (!organizationId) return Response.json({ error: 'Organization ID required' }, { status: 400 });

    // Get all stock for organization/location
    const filter = { organization_id: organizationId };
    if (locationId) filter.location_id = locationId;

    const stocks = await base44.entities.PharmacyStock.filter(filter);

    let totalValue = 0;
    const valuationDetails = [];

    // Process each stock item
    for (const stock of stocks) {
      let itemValue = 0;

      if (method === 'FIFO') {
        // FIFO: Assume oldest batches are sold first
        // Get batch transactions ordered by date
        const batchTxns = await base44.entities.BatchTxn.filter({ stock_id: stock.id });
        
        let remainingQty = stock.quantity || 0;
        // Sort by date ascending (oldest first)
        batchTxns.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        for (const txn of batchTxns) {
          if (remainingQty <= 0) break;
          const costPerUnit = txn.cost_per_unit || stock.unit_cost || 0;
          const valueForThisBatch = Math.min(remainingQty, txn.quantity || 0) * costPerUnit;
          itemValue += valueForThisBatch;
          remainingQty -= Math.min(remainingQty, txn.quantity || 0);
        }

        // Remaining quantity valued at current cost
        if (remainingQty > 0) {
          itemValue += remainingQty * (stock.unit_cost || 0);
        }
      } else if (method === 'LIFO') {
        // LIFO: Assume newest batches are sold first
        const batchTxns = await base44.entities.BatchTxn.filter({ stock_id: stock.id });
        
        let remainingQty = stock.quantity || 0;
        // Sort by date descending (newest first)
        batchTxns.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        for (const txn of batchTxns) {
          if (remainingQty <= 0) break;
          const costPerUnit = txn.cost_per_unit || stock.unit_cost || 0;
          const valueForThisBatch = Math.min(remainingQty, txn.quantity || 0) * costPerUnit;
          itemValue += valueForThisBatch;
          remainingQty -= Math.min(remainingQty, txn.quantity || 0);
        }

        if (remainingQty > 0) {
          itemValue += remainingQty * (stock.unit_cost || 0);
        }
      } else {
        // WAC: Weighted Average Cost
        itemValue = (stock.quantity || 0) * (stock.unit_cost || 0);
      }

      totalValue += itemValue;
      valuationDetails.push({
        stock_id: stock.id,
        product_name: stock.display_name,
        quantity: stock.quantity || 0,
        unit_cost: stock.unit_cost || 0,
        total_value: itemValue
      });
    }

    console.log(`✅ Inventory valuation (${method}): Rs ${totalValue.toFixed(2)}`);
    return Response.json({
      success: true,
      method,
      total_value: totalValue,
      item_count: stocks.length,
      details: valuationDetails
    });
  } catch (error) {
    console.error('Valuation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});