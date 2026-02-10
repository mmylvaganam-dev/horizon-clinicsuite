import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This is a scheduled automation - runs without user context
    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    
    console.log('Starting automated backup for all companies...');
    
    // Get all active companies
    const allCompanies = await base44.asServiceRole.entities.CompanyProfile.filter({ 
      status: 'active' 
    });
    
    console.log(`Found ${allCompanies.length} active companies to backup`);
    
    const results = [];
    
    for (const company of allCompanies) {
      try {
        console.log(`Backing up company: ${company.company_legal_name}`);
        
        // Get all organizations for this company
        const organizations = await base44.asServiceRole.entities.Organization.filter({
          company_id: company.id
        });
        
        if (organizations.length === 0) {
          console.log(`No organizations found for company ${company.company_legal_name}`);
          continue;
        }
        
        // Collect all data for all organizations in this company
        const companyData = {
          export_info: {
            company_id: company.id,
            company_name: company.company_legal_name,
            export_date: new Date().toISOString(),
            organizations_count: organizations.length
          },
          organizations: []
        };
        
        for (const org of organizations) {
          console.log(`  - Exporting organization: ${org.name}`);
          
          const [
            patients,
            appointments,
            pharmacySales,
            pharmacyStock,
            invoices
          ] = await Promise.all([
            base44.asServiceRole.entities.Patient.filter({ organization_id: org.id }).catch(() => []),
            base44.asServiceRole.entities.Appointment.filter({ organization_id: org.id }).catch(() => []),
            base44.asServiceRole.entities.PharmacySaleHeader.filter({ organization_id: org.id }).catch(() => []),
            base44.asServiceRole.entities.PharmacyStock.filter({ organization_id: org.id }).catch(() => []),
            base44.asServiceRole.entities.InvoiceHeader.filter({ organization_id: org.id }).catch(() => [])
          ]);
          
          companyData.organizations.push({
            organization_id: org.id,
            organization_name: org.name,
            summary: {
              patients_count: patients.length,
              appointments_count: appointments.length,
              sales_count: pharmacySales.length,
              stock_items_count: pharmacyStock.length,
              invoices_count: invoices.length
            },
            data: {
              patients,
              appointments,
              pharmacy_sales: pharmacySales,
              pharmacy_stock: pharmacyStock,
              invoices
            }
          });
        }
        
        // Delete old backup file if exists
        if (company.last_backup_drive_file_id) {
          try {
            console.log(`Deleting old backup file: ${company.last_backup_drive_file_id}`);
            await fetch(
              `https://www.googleapis.com/drive/v3/files/${company.last_backup_drive_file_id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );
          } catch (deleteError) {
            console.log('Could not delete old backup:', deleteError.message);
          }
        }
        
        // Upload new backup to Google Drive
        const jsonContent = JSON.stringify(companyData, null, 2);
        const exportDate = new Date().toISOString().split('T')[0];
        const fileName = `${company.company_legal_name.replace(/[^a-zA-Z0-9]/g, '_')}_Backup_${exportDate}.json`;
        
        const metadata = {
          name: fileName,
          mimeType: 'application/json',
          parents: company.google_drive_folder_id ? [company.google_drive_folder_id] : []
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([jsonContent], { type: 'application/json' }));
        
        const uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            body: form
          }
        );
        
        if (!uploadResponse.ok) {
          const error = await uploadResponse.text();
          throw new Error(`Google Drive upload failed: ${error}`);
        }
        
        const driveFile = await uploadResponse.json();
        
        // Delete old backups - keep only last 6
        if (company.google_drive_folder_id) {
          try {
            const listResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files?q='${company.google_drive_folder_id}' in parents and name contains '${company.company_legal_name.replace(/[^a-zA-Z0-9]/g, '_')}_Backup'&orderBy=createdTime desc&fields=files(id,name,createdTime)`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );
            
            if (listResponse.ok) {
              const files = await listResponse.json();
              // Keep 6 most recent, delete the rest
              const filesToDelete = files.files?.slice(6) || [];
              
              for (const file of filesToDelete) {
                await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                console.log(`Deleted old backup: ${file.name}`);
              }
            }
          } catch (error) {
            console.error('Failed to cleanup old backups:', error);
          }
        }
        
        // Update company profile with new backup info
        await base44.asServiceRole.entities.CompanyProfile.update(company.id, {
          last_backup_date: new Date().toISOString(),
          last_backup_drive_file_id: driveFile.id
        });
        
        console.log(`✅ Backup successful for ${company.company_legal_name}`);
        
        results.push({
          company_name: company.company_legal_name,
          success: true,
          file_name: fileName,
          drive_file_id: driveFile.id,
          organizations_backed_up: organizations.length
        });
        
      } catch (companyError) {
        console.error(`❌ Error backing up ${company.company_legal_name}:`, companyError);
        results.push({
          company_name: company.company_legal_name,
          success: false,
          error: companyError.message
        });
      }
    }
    
    // Log overall results
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Backup complete: ${successful} successful, ${failed} failed`);
    
    return Response.json({
      success: true,
      message: `Backup completed for ${allCompanies.length} companies`,
      summary: {
        total_companies: allCompanies.length,
        successful,
        failed
      },
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Backup automation failed:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});