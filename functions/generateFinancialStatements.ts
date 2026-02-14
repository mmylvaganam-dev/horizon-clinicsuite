import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationId, startDate, endDate } = await req.json();
    if (!organizationId) return Response.json({ error: 'Organization ID required' }, { status: 400 });

    // Call reconciliation to get trial balance
    const reconciliation = await base44.functions.invoke('financialReconciliation', {
      organizationId,
      startDate: startDate || new Date(new Date().getFullYear(), 0, 1).toISOString(),
      endDate: endDate || new Date().toISOString()
    });

    const summary = reconciliation.data.summary;

    // Prepare P&L Statement
    const incomeStatement = {
      period: `${startDate} to ${endDate}`,
      revenue: {
        sales_revenue: summary.total_revenue,
        line_items: []
      },
      costs: {
        cost_of_goods_sold: 0,
        total_cogs: 0
      },
      expenses: {
        operating_expenses: summary.total_expenses,
        line_items: []
      },
      net_income: summary.net_income,
      gross_profit: summary.total_revenue - (summary.total_expenses || 0)
    };

    // Get COGS for the period
    if (startDate && endDate) {
      try {
        const cogsResult = await base44.functions.invoke('calculateCOGS', {
          organizationId,
          startDate,
          endDate
        });
        incomeStatement.costs.total_cogs = cogsResult.data.total_cogs;
        incomeStatement.gross_profit = cogsResult.data.gross_profit;
      } catch (e) {
        console.warn('COGS calculation failed:', e);
      }
    }

    // Prepare Balance Sheet
    const balanceSheet = {
      date: new Date().toISOString(),
      assets: {
        current_assets: summary.total_assets,
        fixed_assets: 0,
        total_assets: summary.total_assets
      },
      liabilities: {
        current_liabilities: summary.total_liabilities,
        long_term_liabilities: 0,
        total_liabilities: summary.total_liabilities
      },
      equity: {
        retained_earnings: summary.net_income,
        total_equity: summary.total_assets - summary.total_liabilities
      }
    };

    // Get inventory valuation
    try {
      const valuation = await base44.functions.invoke('calculateInventoryValuation', {
        organizationId,
        method: 'FIFO'
      });
      balanceSheet.assets.inventory = valuation.data.total_value;
      balanceSheet.assets.current_assets = (balanceSheet.assets.current_assets || 0) + valuation.data.total_value;
      balanceSheet.assets.total_assets = balanceSheet.assets.current_assets + (balanceSheet.assets.fixed_assets || 0);
    } catch (e) {
      console.warn('Inventory valuation failed:', e);
    }

    console.log(`✅ Financial statements generated for ${organizationId}`);
    return Response.json({
      success: true,
      income_statement: incomeStatement,
      balance_sheet: balanceSheet,
      period: `${startDate} to ${endDate}`
    });
  } catch (error) {
    console.error('Statement generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});