import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { po_id } = await req.json();

    if (!po_id) {
      return Response.json({ error: 'PO ID required' }, { status: 400 });
    }

    // Fetch the purchase order
    const po = await base44.entities.PurchaseOrder.get(po_id);
    if (!po) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Fetch order lines
    const lines = await base44.entities.PurchaseOrderLine.filter({ po_id });

    // Fetch institution to check credit limits
    const institutions = await base44.entities.Institution.filter({ name: po.supplier_name });
    const institution = institutions[0];

    if (!institution) {
      return Response.json({ error: 'Institution not found' }, { status: 404 });
    }

    // Calculate order total
    const orderTotal = lines.reduce((sum, line) => sum + (line.unit_price * line.quantity), 0);

    // Calculate institution's outstanding balance
    const creditSales = await base44.entities.CreditSale.filter({ 
      institution_id: institution.id,
      payment_status: { $ne: 'paid' }
    });
    const outstandingBalance = creditSales.reduce((sum, sale) => sum + sale.total_amount, 0);

    // Check for credit risk
    const projectedBalance = outstandingBalance + orderTotal;
    const isHighRisk = institution.credit_limit > 0 && projectedBalance > institution.credit_limit;

    // Create credit sale record
    const creditSale = await base44.entities.CreditSale.create({
      organization_id: institution.organization_id,
      institution_id: institution.id,
      institution_name: po.supplier_name,
      sale_date: new Date().toISOString(),
      po_number: po.po_number,
      total_amount: orderTotal,
      payment_status: 'outstanding',
      risk_status: isHighRisk ? 'high_risk' : 'normal',
      created_by: user.email,
    });

    // Update PO status to approved
    await base44.entities.PurchaseOrder.update(po_id, {
      status: 'approved',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    });

    // Create notification if high risk
    if (isHighRisk) {
      await base44.entities.Notification.create({
        organization_id: institution.organization_id,
        type: 'credit_limit_exceeded',
        title: 'Credit Limit Alert',
        message: `Institution "${institution.name}" has exceeded credit limit. Outstanding: $${outstandingBalance.toFixed(2)}, Order: $${orderTotal.toFixed(2)}, Limit: $${institution.credit_limit.toFixed(2)}`,
        reference_id: saleHeader.id,
        status: 'unread',
        created_for: user.email,
      });
    }

    return Response.json({
      success: true,
      sale_id: saleHeader.id,
      total_amount: orderTotal,
      is_high_risk: isHighRisk,
      outstanding_balance: outstandingBalance,
      projected_balance: projectedBalance,
      credit_limit: institution.credit_limit,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});