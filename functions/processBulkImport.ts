import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { import_job_id, import_type } = await req.json();

    const job = await base44.asServiceRole.entities.ImportJob.filter({ id: import_job_id });
    if (!job || job.length === 0) {
      return Response.json({ error: 'Import job not found' }, { status: 404 });
    }

    const importJob = job[0];
    const fileUrl = importJob.file_ref;

    // Fetch the CSV file
    const fileResponse = await fetch(fileUrl);
    const fileText = await fileResponse.text();
    
    // Parse CSV
    const lines = fileText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    const errors = [];
    const warnings = [];
    let processedCount = 0;

    // Validate and process based on import type
    if (import_type === 'SERVICES') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Account for header row

        if (!row.service_code) {
          errors.push({ row: rowNum, field: 'service_code', message: 'Service code is required' });
          continue;
        }
        if (!row.service_name) {
          errors.push({ row: rowNum, field: 'service_name', message: 'Service name is required' });
          continue;
        }
        if (!row.default_price || isNaN(parseFloat(row.default_price))) {
          errors.push({ row: rowNum, field: 'default_price', message: 'Valid price is required' });
          continue;
        }

        // Check if exists
        const existing = await base44.asServiceRole.entities.ServiceCatalog.filter({
          organization_id: user.organization_id,
          service_code: row.service_code
        });

        if (existing.length > 0) {
          // Update
          await base44.asServiceRole.entities.ServiceCatalog.update(existing[0].id, {
            service_name: row.service_name,
            category: row.category || 'OTHER',
            default_price: parseFloat(row.default_price),
            currency: row.currency || 'USD',
            tax_rule_code: row.tax_rule_code || '',
            active: row.active === 'true' || row.active === 'TRUE' || row.active === '1'
          });
        } else {
          // Create
          await base44.asServiceRole.entities.ServiceCatalog.create({
            organization_id: user.organization_id,
            service_code: row.service_code,
            service_name: row.service_name,
            category: row.category || 'OTHER',
            default_price: parseFloat(row.default_price),
            currency: row.currency || 'USD',
            tax_rule_code: row.tax_rule_code || '',
            active: row.active === 'true' || row.active === 'TRUE' || row.active === '1'
          });
        }
        processedCount++;
      }
    } else if (import_type === 'PHARMACY_PRODUCTS') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        if (!row.product_code) {
          errors.push({ row: rowNum, field: 'product_code', message: 'Product code is required' });
          continue;
        }
        if (!row.product_name) {
          errors.push({ row: rowNum, field: 'product_name', message: 'Product name is required' });
          continue;
        }
        if (!row.sale_price || isNaN(parseFloat(row.sale_price))) {
          errors.push({ row: rowNum, field: 'sale_price', message: 'Valid sale price is required' });
          continue;
        }

        const existing = await base44.asServiceRole.entities.ProductCatalog.filter({
          organization_id: user.organization_id,
          product_code: row.product_code
        });

        if (existing.length > 0) {
          await base44.asServiceRole.entities.ProductCatalog.update(existing[0].id, {
            barcode_value: row.barcode_value || '',
            product_name: row.product_name,
            strength: row.strength || '',
            form: row.form || '',
            pack_size: row.pack_size || '',
            cost_price: parseFloat(row.cost_price || 0),
            sale_price: parseFloat(row.sale_price),
            currency: row.currency || 'USD',
            tax_rule_code: row.tax_rule_code || '',
            active: row.active === 'true' || row.active === 'TRUE' || row.active === '1'
          });
        } else {
          await base44.asServiceRole.entities.ProductCatalog.create({
            organization_id: user.organization_id,
            product_code: row.product_code,
            barcode_value: row.barcode_value || '',
            product_name: row.product_name,
            strength: row.strength || '',
            form: row.form || '',
            pack_size: row.pack_size || '',
            cost_price: parseFloat(row.cost_price || 0),
            sale_price: parseFloat(row.sale_price),
            currency: row.currency || 'USD',
            tax_rule_code: row.tax_rule_code || '',
            active: row.active === 'true' || row.active === 'TRUE' || row.active === '1'
          });
        }
        processedCount++;
      }
    }

    // Update import job
    await base44.asServiceRole.entities.ImportJob.update(importJob.id, {
      status: errors.length > 0 ? 'failed' : 'applied',
      summary_json: {
        total_rows: rows.length,
        processed: processedCount,
        errors: errors.length,
        warnings: warnings.length
      }
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      organization_id: user.organization_id || '',
      location_id: '',
      patient_id: '',
      module: 'BULK_IMPORT',
      action: 'apply',
      record_type: 'ImportJob',
      record_id: importJob.id,
      metadata: { import_type, processed: processedCount, errors: errors.length }
    });

    return Response.json({
      success: errors.length === 0,
      processed: processedCount,
      errors,
      warnings
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});