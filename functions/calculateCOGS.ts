import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationId, startDate, endDate } = await req.json();
    if (!organizationId || !startDate || !endDate) {
      return Response.json({ error: 'Organization ID and date range required' }, { status: 400 });
    }

    // Get all sales in date range
    const filter = {
      organization_id: organizationId,
      status: 'paid'
    };

    const sales = await base44.entities.PharmacySaleHeader.filter(filter);
    const filteredSales = sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    });

    let totalCOGS = 0;
    const cogsDetails = [];

    // Calculate COGS for each sale
    for (const sale of filteredSales) {
      // Get sale lines
      const saleLines = await base44.entities.PharmacySaleLine.filter({
        sale_header_id: sale.id
      });

      for (const line of saleLines) {
        // Get stock to find unit cost
        if (line.stock_id) {
          const stocks = await base44.entities.PharmacyStock.filter({ id: line.stock_id });
          if (stocks.length > 0) {
            const unitCost = stocks[0].unit_cost || 0;
            const lineCOGS = (line.qty || 0) * unitCost;
            totalCOGS += lineCOGS;

            cogsDetails.push({
              sale_number: sale.sale_number,
              product_name: line.product_name_cache,
              qty: line.qty,
              unit_cost: unitCost,
              line_cogs: lineCOGS,
              unit_price: line.unit_price,
              gross_profit: (line.line_total || 0) - lineCOGS
            });
          }
        }
      }
    }

    // Get total revenue in period
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    console.log(`✅ COGS calculated: Rs ${totalCOGS.toFixed(2)} (Margin: ${grossMargin.toFixed(2)}%)`);
    return Response.json({
      success: true,
      start_date: startDate,
      end_date: endDate,
      total_revenue: totalRevenue,
      total_cogs: totalCOGS,
      gross_profit: grossProfit,
      gross_margin_percent: grossMargin,
      transaction_count: filteredSales.length,
      details: cogsDetails.slice(0, 100) // Limit details to 100 items
    });
  } catch (error) {
    console.error('COGS error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});