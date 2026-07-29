import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Authorization ───────────────────────────────────────────────
    // Only platform owners or org admins may clear stock, and org admins
    // may only act within their own organization. This prevents an
    // authenticated low-privileged user from destroying an arbitrary
    // organization's pharmacy inventory.
    const isPlatformOwner = user.email === 'mmylvaganam@premierhealthcanada.ca' ||
      user.email === 'mylvaganam@premierhealthcanada.ca' ||
      user.is_platform_owner === true;
    const isAdmin = user.role === 'admin';

    if (!isPlatformOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden: administrative access required' }, { status: 403 });
    }

    const { organization_id } = await req.json();
    if (!organization_id) {
      return Response.json({ error: 'organization_id required' }, { status: 400 });
    }

    if (!isPlatformOwner && user.organization_id !== organization_id) {
      return Response.json({ error: 'Forbidden: you can only clear stock in your own organization' }, { status: 403 });
    }

    console.log('🗑️ Clearing ALL stock for organization:', organization_id);

    // Fetch ALL stock items for this organization
    let allStock = [];
    let skip = 0;
    const fetchBatchSize = 500;

    while (true) {
      const batch = await base44.asServiceRole.entities.PharmacyStock.filter(
        { organization_id },
        '-created_date',
        fetchBatchSize,
        skip
      );
      if (batch.length === 0) break;
      allStock = allStock.concat(batch);
      skip += batch.length;
      console.log(`Fetched batch: ${batch.length} items (total so far: ${allStock.length})`);
    }

    console.log('Total items to delete:', allStock.length);

    // Delete in small batches with minimal delays
    let deleted = 0;
    let failed = 0;
    const deleteBatchSize = 10;

    for (let i = 0; i < allStock.length; i += deleteBatchSize) {
      const batch = allStock.slice(i, i + deleteBatchSize);
      const results = await Promise.allSettled(
        batch.map(item => base44.asServiceRole.entities.PharmacyStock.delete(item.id))
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          deleted++;
        } else {
          console.error('Failed to delete:', batch[idx].id, result.reason?.message);
          failed++;
        }
      });

      if (i + deleteBatchSize < allStock.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
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