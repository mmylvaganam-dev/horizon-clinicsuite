import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id } = await req.json();
    
    if (!organization_id) {
      return Response.json({ error: 'organization_id required' }, { status: 400 });
    }

    console.log('Fetching all stock for organization:', organization_id);
    
    // Get all stock items for this organization
    const allStock = await base44.asServiceRole.entities.PharmacyStock.filter(
      { organization_id },
      '-created_date'
    );
    
    console.log('Total stock items:', allStock.length);
    
    // Group by barcode to find duplicates
    const stockByBarcode = {};
    allStock.forEach(item => {
      const barcode = item.barcode || item.legacy_id || item.display_name;
      if (!stockByBarcode[barcode]) {
        stockByBarcode[barcode] = [];
      }
      stockByBarcode[barcode].push(item);
    });
    
    // Find duplicates and mark older ones for deletion
    const toDelete = [];
    let duplicateGroups = 0;
    
    Object.entries(stockByBarcode).forEach(([barcode, items]) => {
      if (items.length > 1) {
        duplicateGroups++;
        // Sort by created_date descending (newest first)
        items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        
        // Keep the first (newest), delete the rest
        const [keep, ...deleteItems] = items;
        console.log(`Duplicate: ${barcode} - Keeping ${keep.id} (${keep.created_date}), deleting ${deleteItems.length} older versions`);
        
        toDelete.push(...deleteItems.map(item => item.id));
      }
    });
    
    console.log(`Found ${duplicateGroups} duplicate groups, ${toDelete.length} items to delete`);
    
    // Delete old duplicates
    let deleted = 0;
    for (const id of toDelete) {
      await base44.asServiceRole.entities.PharmacyStock.delete(id);
      deleted++;
      if (deleted % 50 === 0) {
        console.log(`Deleted ${deleted}/${toDelete.length}...`);
      }
    }
    
    return Response.json({
      success: true,
      total_items: allStock.length,
      duplicate_groups: duplicateGroups,
      items_deleted: deleted,
      items_kept: allStock.length - deleted
    });
    
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});