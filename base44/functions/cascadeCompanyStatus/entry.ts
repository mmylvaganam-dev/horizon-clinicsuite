import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();

    // Only process if status changed to inactive
    if (data?.status === 'inactive' && old_data?.status !== 'inactive') {
      const companyId = data.id;
      
      // Find all organizations linked to this company
      const organizations = await base44.asServiceRole.entities.Organization.filter({ 
        company_id: companyId 
      });
      
      console.log(`Found ${organizations.length} organizations linked to company ${companyId}`);
      
      // Update all organizations to inactive
      for (const org of organizations) {
        if (org.status !== 'inactive') {
          await base44.asServiceRole.entities.Organization.update(org.id, {
            status: 'inactive'
          });
          console.log(`Updated organization ${org.id} (${org.name}) to inactive`);
        }
      }

      return Response.json({ 
        success: true, 
        message: `Deactivated ${organizations.length} organizations`,
        organizations_updated: organizations.length
      });
    }

    // Also handle reactivation
    if (data?.status === 'active' && old_data?.status === 'inactive') {
      const companyId = data.id;
      
      const organizations = await base44.asServiceRole.entities.Organization.filter({ 
        company_id: companyId 
      });
      
      console.log(`Reactivating ${organizations.length} organizations for company ${companyId}`);
      
      for (const org of organizations) {
        if (org.status === 'inactive') {
          await base44.asServiceRole.entities.Organization.update(org.id, {
            status: 'active'
          });
          console.log(`Reactivated organization ${org.id} (${org.name})`);
        }
      }

      return Response.json({ 
        success: true, 
        message: `Reactivated ${organizations.length} organizations`,
        organizations_updated: organizations.length
      });
    }

    return Response.json({ success: true, message: 'No status change' });

  } catch (error) {
    console.error('Error cascading company status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});