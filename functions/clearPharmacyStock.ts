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

    console.log('🗑️ Clearing ALL stock for organization:', organization_id);

    // Fetch ALL stock items for this organization
    let allStock = [];
    let skip = 0;
    const batchSize = 500;

    while (true) {
      const batch = await base44.asServiceRole.entities.PharmacyStock.filter(
        { organization_id },
        '-created_date',
        batchSize,
        skip
      );
      if (batch.length === 0) break;
      allStock = allStock.concat(batch);
      skip += batch.length;
      console.log(`Fetched batch: ${batch.length} items (total so far: ${allStock.length})`);
    }

    console.log('Total items to delete:', allStock.length);

    // Use bulkDelete if available, otherwise delete in smaller batches to avoid rate limits
    let deleted = 0;
    let failed = 0;
    const deleteChunkSize = 50;
    
    for (let i = 0; i < allStock.length; i += deleteChunkSize) {
      const chunk = allStock.slice(i, i + deleteChunkSize);
      const chunkPromises = chunk.map(item => 
        base44.asServiceRole.entities.PharmacyStock.delete(item.id)
          .then(() => deleted++)
          .catch(error => {
            console.error('Failed to delete:', item.id, error.message);
            failed++;
          })
      );
      await Promise.all(chunkPromises);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between chunks
    }

    console.log(`✓ Deleted: ${deleted}, Failed: ${failed}`);

    return Response.json({
      status: 'success',
      total_deleted: deleted,
      total_failed: failed,
      message: `Cleared ${deleted} items from pharmacy stock`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});