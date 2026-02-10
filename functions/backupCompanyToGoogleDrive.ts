import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { company_id, organization_id } = await req.json();
    
    if (!organization_id) {
      return Response.json({ error: 'organization_id required' }, { status: 400 });
    }

    // Get company profile for backup settings
    let companyProfile = null;
    if (company_id) {
      const companies = await base44.asServiceRole.entities.CompanyProfile.filter({ id: company_id });
      companyProfile = companies[0];
      
      if (!companyProfile?.google_drive_backup_enabled) {
        return Response.json({ error: 'Google Drive backup not enabled for this company' }, { status: 400 });
      }
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    
    // Export company data
    console.log('Exporting data for organization:', organization_id);
    
    const [
      patients,
      appointments,
      pharmacySales,
      pharmacyStock,
      invoices,
      organizations
    ] = await Promise.all([
      base44.asServiceRole.entities.Patient.filter({ organization_id }).catch(() => []),
      base44.asServiceRole.entities.Appointment.filter({ organization_id }).catch(() => []),
      base44.asServiceRole.entities.PharmacySaleHeader.filter({ organization_id }).catch(() => []),
      base44.asServiceRole.entities.PharmacyStock.filter({ organization_id }).catch(() => []),
      base44.asServiceRole.entities.InvoiceHeader.filter({ organization_id }).catch(() => []),
      base44.asServiceRole.entities.Organization.filter({ id: organization_id })
    ]);

    const orgName = organizations[0]?.name || 'Unknown';
    const exportDate = new Date().toISOString().split('T')[0];
    
    const backupData = {
      export_info: {
        organization_id,
        organization_name: orgName,
        company_id,
        export_date: new Date().toISOString(),
        exported_by: user.email
      },
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
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    const fileName = `${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_Backup_${exportDate}.json`;

    // Upload to Google Drive
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: companyProfile?.google_drive_folder_id ? [companyProfile.google_drive_folder_id] : []
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
    if (companyProfile?.google_drive_folder_id) {
      try {
        const listResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${companyProfile.google_drive_folder_id}' in parents and name contains '${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_Backup'&orderBy=createdTime desc&fields=files(id,name,createdTime)`,
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

    // Update last backup date in company profile
    if (company_id && companyProfile) {
      await base44.asServiceRole.entities.CompanyProfile.update(company_id, {
        last_backup_date: new Date().toISOString()
      });
    }

    // Log the backup
    await base44.asServiceRole.entities.AuditLog.create({
      organization_id,
      action: 'backup_to_google_drive',
      entity_type: 'organization_backup',
      user_email: user.email,
      details: {
        file_name: fileName,
        drive_file_id: driveFile.id,
        records_exported: backupData.summary
      }
    });

    return Response.json({
      success: true,
      message: 'Backup completed successfully',
      file_name: fileName,
      drive_file_id: driveFile.id,
      summary: backupData.summary,
      export_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});