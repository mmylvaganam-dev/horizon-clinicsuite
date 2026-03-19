import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product_id, product_name, organization_id } = await req.json();

    if (!product_id || !product_name) {
      return Response.json({ error: 'product_id and product_name required' }, { status: 400 });
    }

    // Check if usage record exists
    const existingUsage = await base44.entities.PharmacyProductUsage.filter({
      product_id,
      organization_id: organization_id || user.organization_id
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    if (existingUsage && existingUsage.length > 0) {
      const usage = existingUsage[0];
      
      // Calculate recent count (simplified - in real scenario, would query actual sales)
      let recent30Count = usage.recent_30days_count || 0;
      const lastSold = usage.last_sold_date ? new Date(usage.last_sold_date) : null;
      
      if (lastSold && lastSold < thirtyDaysAgo) {
        recent30Count = 1; // Reset if last sale was > 30 days ago
      } else {
        recent30Count += 1;
      }

      const totalCount = (usage.total_sales_count || 0) + 1;
      
      // Frequency score: 70% recent + 30% all-time
      const frequencyScore = (recent30Count * 0.7) + (totalCount * 0.3);

      await base44.entities.PharmacyProductUsage.update(usage.id, {
        total_sales_count: totalCount,
        last_sold_date: now.toISOString(),
        recent_30days_count: recent30Count,
        frequency_score: frequencyScore
      });

      return Response.json({ 
        success: true, 
        message: 'Usage updated',
        usage: { totalCount, recent30Count, frequencyScore }
      });
    } else {
      // Create new usage record
      await base44.entities.PharmacyProductUsage.create({
        organization_id: organization_id || user.organization_id,
        product_id,
        product_name,
        total_sales_count: 1,
        last_sold_date: now.toISOString(),
        recent_30days_count: 1,
        frequency_score: 1
      });

      return Response.json({ 
        success: true, 
        message: 'Usage record created'
      });
    }
  } catch (error) {
    console.error('Error updating product usage:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});