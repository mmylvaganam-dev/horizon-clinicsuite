import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { mode, date_from, date_to, drug_filter, supplier_filter } = body;

    // Use service role to aggregate across all pharmacies
    const svc = base44.asServiceRole;

    // Build date filter
    const now = new Date();
    let fromDate, toDate;
    if (mode === 'daily') {
      fromDate = new Date(now);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(now);
      toDate.setHours(23, 59, 59, 999);
    } else if (mode === 'monthly') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (mode === 'yearly') {
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (date_from && date_to) {
      fromDate = new Date(date_from);
      toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999);
    } else {
      fromDate = new Date(now);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(now);
      toDate.setHours(23, 59, 59, 999);
    }

    // Fetch all goods received in date range (paginate)
    let allGoodsReceived = [];
    let offset = 0;
    while (true) {
      const batch = await svc.entities.GoodsReceived.filter(
        { received_at: { $gte: fromDate.toISOString(), $lte: toDate.toISOString() } },
        '-received_at',
        500,
        offset
      );
      allGoodsReceived = allGoodsReceived.concat(batch);
      if (batch.length < 500) break;
      offset += 500;
    }

    // Fetch all goods received lines for these GRNs
    const grnIds = allGoodsReceived.map(g => g.id);
    let allLines = [];
    if (grnIds.length > 0) {
      // Fetch lines in chunks
      for (let i = 0; i < grnIds.length; i += 100) {
        const chunk = grnIds.slice(i, i + 100);
        const lines = await svc.entities.GoodsReceivedLine.filter(
          { goods_received_id: { $in: chunk } }
        );
        allLines = allLines.concat(lines);
      }
    }

    // Enrich lines with GRN data (pharmacy name, supplier, date)
    const grnMap = {};
    allGoodsReceived.forEach(g => { grnMap[g.id] = g; });
    allLines.forEach(line => {
      const grn = grnMap[line.goods_received_id];
      if (grn) {
        line._pharmacy_name = grn.organization_name || 'Unknown Pharmacy';
        line._supplier_name = line.supplier_name || grn.supplier_name || 'Unknown Supplier';
        line._received_at = grn.received_at;
        line._invoice_number = grn.invoice_number || '';
      } else {
        line._pharmacy_name = 'Unknown';
        line._supplier_name = line.supplier_name || 'Unknown';
        line._received_at = null;
      }
    });

    // Apply drug/supplier filters if provided
    if (drug_filter) {
      const dl = drug_filter.toLowerCase();
      allLines = allLines.filter(l =>
        (l.item_name || '').toLowerCase().includes(dl) ||
        (l.generic_name || '').toLowerCase().includes(dl) ||
        (l.sku_code || '').toLowerCase().includes(dl)
      );
    }
    if (supplier_filter) {
      const sl = supplier_filter.toLowerCase();
      allLines = allLines.filter(l => (l._supplier_name || '').toLowerCase().includes(sl));
      allGoodsReceived = allGoodsReceived.filter(g =>
        (g.supplier_name || '').toLowerCase().includes(sl)
      );
    }

    // === DAILY VIEW: Group by pharmacy → supplier → items ===
    const dailyByPharmacy = {};
    allLines.forEach(line => {
      const pharm = line._pharmacy_name;
      if (!dailyByPharmacy[pharm]) {
        dailyByPharmacy[pharm] = {
          pharmacy: pharm,
          suppliers: {},
          total_cost: 0,
          total_free_items: 0,
          total_savings: 0,
        };
      }
      const pharmData = dailyByPharmacy[pharm];
      const supp = line._supplier_name;
      if (!pharmData.suppliers[supp]) {
        pharmData.suppliers[supp] = { supplier: supp, lines: [], total_cost: 0, total_free: 0, total_savings: 0 };
      }
      const suppData = pharmData.suppliers[supp];
      suppData.lines.push({
        item_name: line.item_name,
        generic_name: line.generic_name,
        sku_code: line.sku_code,
        qty_received: line.qty_received || 0,
        qty_purchased: line.qty_purchased || line.qty_received || 0,
        qty_free: line.qty_free || 0,
        unit_cost: line.unit_cost || 0,
        effective_unit_cost: line.effective_unit_cost || 0,
        total_line_cost: line.total_line_cost || ((line.qty_purchased || line.qty_received || 0) * (line.unit_cost || 0)),
        deal_savings: line.deal_savings || 0,
        deal_type: line.deal_type || 'none',
        deal_description: line.deal_description || '',
        batch_number: line.batch_number || '',
        expiry_date: line.expiry_date || '',
      });
      suppData.total_cost += line.total_line_cost || ((line.qty_purchased || line.qty_received || 0) * (line.unit_cost || 0));
      suppData.total_free += line.qty_free || 0;
      suppData.total_savings += line.deal_savings || 0;
      pharmData.total_cost += line.total_line_cost || ((line.qty_purchased || line.qty_received || 0) * (line.unit_cost || 0));
      pharmData.total_free_items += line.qty_free || 0;
      pharmData.total_savings += line.deal_savings || 0;
    });

    // Convert to arrays
    const dailyPharmacies = Object.values(dailyByPharmacy).map(p => ({
      ...p,
      suppliers: Object.values(p.suppliers),
    }));

    // === MEDICINE ANALYTICS: Aggregate by medicine across all pharmacies ===
    const medicineMap = {};
    allLines.forEach(line => {
      const key = line.generic_name || line.item_name || line.sku_code || 'Unknown';
      if (!medicineMap[key]) {
        medicineMap[key] = {
          medicine: key,
          item_names: new Set(),
          total_qty_purchased: 0,
          total_qty_free: 0,
          total_qty_received: 0,
          total_cost: 0,
          total_savings: 0,
          unit_prices: [],
          effective_prices: [],
          suppliers: new Set(),
          pharmacies: new Set(),
          deals: [],
          line_count: 0,
        };
      }
      const m = medicineMap[key];
      m.item_names.add(line.item_name);
      m.total_qty_purchased += line.qty_purchased || line.qty_received || 0;
      m.total_qty_free += line.qty_free || 0;
      m.total_qty_received += line.qty_received || 0;
      m.total_cost += line.total_line_cost || ((line.qty_purchased || line.qty_received || 0) * (line.unit_cost || 0));
      m.total_savings += line.deal_savings || 0;
      if (line.unit_cost) m.unit_prices.push(line.unit_cost);
      if (line.effective_unit_cost) m.effective_prices.push(line.effective_unit_cost);
      m.suppliers.add(line._supplier_name);
      m.pharmacies.add(line._pharmacy_name);
      if (line.deal_type && line.deal_type !== 'none') {
        m.deals.push(line.deal_description || line.deal_type);
      }
      m.line_count++;
    });

    const medicineAnalytics = Object.values(medicineMap).map(m => ({
      medicine: m.medicine,
      item_names: Array.from(m.item_names),
      total_qty_purchased: m.total_qty_purchased,
      total_qty_free: m.total_qty_free,
      total_qty_received: m.total_qty_received,
      total_cost: m.total_cost,
      total_savings: m.total_savings,
      avg_unit_cost: m.unit_prices.length ? m.unit_prices.reduce((a, b) => a + b, 0) / m.unit_prices.length : 0,
      min_unit_cost: m.unit_prices.length ? Math.min(...m.unit_prices) : 0,
      max_unit_cost: m.unit_prices.length ? Math.max(...m.unit_prices) : 0,
      avg_effective_cost: m.effective_prices.length ? m.effective_prices.reduce((a, b) => a + b, 0) / m.effective_prices.length : 0,
      supplier_count: m.suppliers.size,
      suppliers: Array.from(m.suppliers),
      pharmacy_count: m.pharmacies.size,
      deal_count: m.deals.length,
      deal_examples: Array.from(new Set(m.deals)).slice(0, 5),
      line_count: m.line_count,
    })).sort((a, b) => b.total_cost - a.total_cost);

    // === SUPPLIER COMPARISON: Aggregate by supplier → medicine ===
    const supplierMap = {};
    allLines.forEach(line => {
      const supp = line._supplier_name;
      if (!supplierMap[supp]) {
        supplierMap[supp] = {
          supplier: supp,
          medicines: {},
          total_cost: 0,
          total_free: 0,
          total_savings: 0,
          total_lines: 0,
          pharmacies: new Set(),
        };
      }
      const s = supplierMap[supp];
      s.total_cost += line.total_line_cost || ((line.qty_purchased || line.qty_received || 0) * (line.unit_cost || 0));
      s.total_free += line.qty_free || 0;
      s.total_savings += line.deal_savings || 0;
      s.total_lines++;
      s.pharmacies.add(line._pharmacy_name);
      const medKey = line.generic_name || line.item_name || 'Unknown';
      if (!s.medicines[medKey]) {
        s.medicines[medKey] = {
          medicine: medKey,
          unit_cost: line.unit_cost || 0,
          effective_cost: line.effective_unit_cost || 0,
          deal_type: line.deal_type || 'none',
          deal_description: line.deal_description || '',
          qty_delivered: 0,
        };
      }
      s.medicines[medKey].qty_delivered += line.qty_received || 0;
    });

    const supplierComparison = Object.values(supplierMap).map(s => ({
      supplier: s.supplier,
      total_cost: s.total_cost,
      total_free_items: s.total_free,
      total_savings: s.total_savings,
      total_lines: s.total_lines,
      pharmacy_count: s.pharmacies.size,
      medicines: Object.values(s.medicines),
    })).sort((a, b) => b.total_cost - a.total_cost);

    // === SUMMARY ===
    const summary = {
      total_pharmacies: dailyPharmacies.length,
      total_suppliers: supplierComparison.length,
      total_grns: allGoodsReceived.length,
      total_lines: allLines.length,
      total_procurement_value: allLines.reduce((sum, l) => sum + (l.total_line_cost || ((l.qty_purchased || l.qty_received || 0) * (l.unit_cost || 0))), 0),
      total_free_items: allLines.reduce((sum, l) => sum + (l.qty_free || 0), 0),
      total_deal_savings: allLines.reduce((sum, l) => sum + (l.deal_savings || 0), 0),
      deals_applied_count: allLines.filter(l => l.deal_type && l.deal_type !== 'none').length,
      period_from: fromDate.toISOString(),
      period_to: toDate.toISOString(),
      mode,
    };

    // === NEGOTIATION INTELLIGENCE: Top medicines by volume (leverage data) ===
    const negotiationData = medicineAnalytics
      .filter(m => m.total_qty_purchased > 0)
      .slice(0, 20)
      .map(m => ({
        medicine: m.medicine,
        total_volume: m.total_qty_purchased,
        total_spend: m.total_cost,
        current_avg_price: m.avg_unit_cost,
        current_min_price: m.min_unit_cost,
        current_max_price: m.max_unit_cost,
        price_variance_pct: m.avg_unit_cost > 0
          ? ((m.max_unit_cost - m.min_unit_cost) / m.avg_unit_cost * 100)
          : 0,
        supplier_count: m.supplier_count,
        pharmacy_count: m.pharmacy_count,
        savings_pct: m.total_cost > 0 ? (m.total_savings / (m.total_cost + m.total_savings) * 100) : 0,
        negotiation_leverage: m.total_qty_purchased > 1000 ? 'HIGH' : m.total_qty_purchased > 200 ? 'MEDIUM' : 'LOW',
        manufacturing_candidate: m.total_spend > 500000 && m.total_qty_purchased > 500 ? 'YES' : 'NO',
      }));

    return Response.json({
      summary,
      daily_pharmacies: dailyPharmacies,
      medicine_analytics: medicineAnalytics,
      supplier_comparison: supplierComparison,
      negotiation_intelligence: negotiationData,
    });
  } catch (error) {
    console.error('Procurement intelligence error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});