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

    // Fetch institution/supplier to get organization_id
    const suppliers = await base44.entities.Supplier.filter({ name: po.supplier_name });
    const supplier = suppliers[0];

    if (!supplier) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Create pharmacy sale header (credit sale)
    const saleHeader = await base44.entities.PharmacySaleHeader.create({
      organization_id: supplier.organization_id,
      sale_type: 'credit',
      institution_id: supplier.id,
      institution_name: po.supplier_name,
      sale_date: new Date().toISOString(),
      total_amount: lines.reduce((sum, line) => sum + (line.unit_price * line.quantity), 0),
      payment_status: 'outstanding',
      created_by: user.email,
    });

    // Create sale lines from PO lines
    for (const line of lines) {
      await base44.entities.PharmacySaleLine.create({
        sale_id: saleHeader.id,
        organization_id: supplier.organization_id,
        product_id: line.product_id,
        product_name: line.product_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        amount: line.unit_price * line.quantity,
      });
    }

    // Update PO status to approved
    await base44.entities.PurchaseOrder.update(po_id, {
      status: 'approved',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      sale_id: saleHeader.id,
      total_amount: saleHeader.total_amount,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});