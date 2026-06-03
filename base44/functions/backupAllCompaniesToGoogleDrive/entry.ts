import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Helper: upload a JSON file to a Google Drive folder
async function uploadToFolder(accessToken, folderId, fileName, data) {
  const jsonContent = JSON.stringify(data, null, 2);
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: folderId ? [folderId] : []
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([jsonContent], { type: 'application/json' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: form
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload failed for ${fileName}: ${err}`);
  }
  return await res.json();
}

// Helper: create a subfolder inside a parent folder
async function createFolder(accessToken, name, parentId) {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : []
  };
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });
  if (!res.ok) throw new Error(`Failed to create folder ${name}`);
  return await res.json();
}

// Helper: delete old daily backup folders (keep last 7)
async function cleanupOldFolders(accessToken, parentFolderId, prefix) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name contains '${prefix}'&orderBy=createdTime desc&fields=files(id,name,createdTime)`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (!res.ok) return;
    const { files = [] } = await res.json();
    const toDelete = files.slice(7); // keep 7 most recent
    for (const f of toDelete) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      console.log(`Deleted old backup folder: ${f.name}`);
    }
  } catch (e) {
    console.log('Cleanup warning:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    console.log('Starting comprehensive backup for all companies...');

    const allCompanies = await base44.asServiceRole.entities.CompanyProfile.filter({ status: 'active' });
    console.log(`Found ${allCompanies.length} active companies`);

    const results = [];
    const exportDate = new Date().toISOString().split('T')[0];

    for (const company of allCompanies) {
      try {
        console.log(`Backing up: ${company.company_legal_name}`);

        if (!company.google_drive_folder_id) {
          results.push({ company_name: company.company_legal_name, success: false, error: 'No Google Drive folder configured. Go to Platform Administration → Google Drive Backups to set one.' });
          continue;
        }

        const organizations = await base44.asServiceRole.entities.Organization.filter({ company_id: company.id });
        if (organizations.length === 0) {
          results.push({ company_name: company.company_legal_name, success: false, error: 'No organizations found' });
          continue;
        }

        const orgIds = organizations.map(o => o.id);

        // Create dated subfolder: CompanyFolder / 2026-06-03_Backup
        const dateFolder = await createFolder(accessToken, `${exportDate}_Backup`, company.google_drive_folder_id);
        const dateFolderId = dateFolder.id;

        // ── CLINICAL DATA ──────────────────────────────────────────────
        console.log('  Fetching clinical data...');
        const [patients, appointments, soapNotes, medRecords, prescriptions,
               patientDocs, patientVitals, encounters, orders, results_lab,
               specimens, labCollections, imagingStudies, diagnosticTests,
               cpps, medications, patientConsents, patientTasks] = await Promise.all([
          base44.asServiceRole.entities.Patient.list().catch(() => []),
          base44.asServiceRole.entities.Appointment.list().catch(() => []),
          base44.asServiceRole.entities.SOAPNote.list().catch(() => []),
          base44.asServiceRole.entities.MedicalRecord.list().catch(() => []),
          base44.asServiceRole.entities.Prescription.list().catch(() => []),
          base44.asServiceRole.entities.PatientDocument.list().catch(() => []),
          base44.asServiceRole.entities.PatientVital.list().catch(() => []),
          base44.asServiceRole.entities.Encounter.list().catch(() => []),
          base44.asServiceRole.entities.Order.list().catch(() => []),
          base44.asServiceRole.entities.Result.list().catch(() => []),
          base44.asServiceRole.entities.Specimen.list().catch(() => []),
          base44.asServiceRole.entities.LabCollectionOrder.list().catch(() => []),
          base44.asServiceRole.entities.ImagingStudy.list().catch(() => []),
          base44.asServiceRole.entities.DiagnosticTest.list().catch(() => []),
          base44.asServiceRole.entities.CPPItem.list().catch(() => []),
          base44.asServiceRole.entities.MedicationItem.list().catch(() => []),
          base44.asServiceRole.entities.PatientConsent.list().catch(() => []),
          base44.asServiceRole.entities.PatientTask.list().catch(() => []),
        ]);

        // Build patient-centric index (organized by patient name)
        const patientIndex = {};
        for (const p of patients) {
          const key = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.id;
          patientIndex[key] = {
            profile: p,
            appointments: appointments.filter(a => a.patient_id === p.id),
            soap_notes: soapNotes.filter(s => s.patient_id === p.id),
            medical_records: medRecords.filter(m => m.patient_id === p.id),
            prescriptions: prescriptions.filter(r => r.patient_id === p.id),
            vitals: patientVitals.filter(v => v.patient_id === p.id),
            documents: patientDocs.filter(d => d.patient_id === p.id),
            encounters: encounters.filter(e => e.patient_id === p.id),
            lab_orders: orders.filter(o => o.patient_id === p.id),
            lab_results: results_lab.filter(r => r.patient_id === p.id),
            imaging_studies: imagingStudies.filter(i => i.patient_id === p.id),
            diagnostic_tests: diagnosticTests.filter(t => t.patient_id === p.id),
            cpp_items: cpps.filter(c => c.patient_id === p.id),
            medications: medications.filter(m => m.patient_id === p.id),
            consents: patientConsents.filter(c => c.patient_id === p.id),
            tasks: patientTasks.filter(t => t.patient_id === p.id),
          };
        }

        await uploadToFolder(accessToken, dateFolderId, `clinical_patients_by_name.json`, {
          generated_at: new Date().toISOString(),
          organization: company.company_legal_name,
          total_patients: patients.length,
          note: 'Data organized alphabetically by patient full name',
          patients: patientIndex
        });

        // ── PHARMACY DATA ──────────────────────────────────────────────
        console.log('  Fetching pharmacy data...');
        const [pharmacySales, pharmacySaleHeaders, pharmacySaleLines, pharmacyStock,
               drugCatalog, purchaseOrders, goodsReceived, inventoryTxns, stockBatches,
               medicineReturns, pharmacyReceipts] = await Promise.all([
          base44.asServiceRole.entities.PharmacySale.list().catch(() => []),
          base44.asServiceRole.entities.PharmacySaleHeader.list().catch(() => []),
          base44.asServiceRole.entities.PharmacySaleLine.list().catch(() => []),
          base44.asServiceRole.entities.PharmacyStock.list().catch(() => []),
          base44.asServiceRole.entities.DrugCatalog.list().catch(() => []),
          base44.asServiceRole.entities.PurchaseOrder.list().catch(() => []),
          base44.asServiceRole.entities.GoodsReceived.list().catch(() => []),
          base44.asServiceRole.entities.InventoryTxn.list().catch(() => []),
          base44.asServiceRole.entities.StockBatch.list().catch(() => []),
          base44.asServiceRole.entities.MedicineReturn.list().catch(() => []),
          base44.asServiceRole.entities.PharmacyReceipt.list().catch(() => []),
        ]);

        await uploadToFolder(accessToken, dateFolderId, `pharmacy_complete.json`, {
          generated_at: new Date().toISOString(),
          sales: pharmacySales,
          sale_headers: pharmacySaleHeaders,
          sale_lines: pharmacySaleLines,
          stock: pharmacyStock,
          drug_catalog: drugCatalog,
          purchase_orders: purchaseOrders,
          goods_received: goodsReceived,
          inventory_transactions: inventoryTxns,
          stock_batches: stockBatches,
          medicine_returns: medicineReturns,
          receipts: pharmacyReceipts,
        });

        // ── STAFF & USERS ──────────────────────────────────────────────
        console.log('  Fetching staff & user data...');
        const [staffProfiles, userRoles, staffDocs, providerSchedules,
               userApprovals, pendingInvitations, blockedUsers] = await Promise.all([
          base44.asServiceRole.entities.StaffProfile.list().catch(() => []),
          base44.asServiceRole.entities.UserRole.list().catch(() => []),
          base44.asServiceRole.entities.StaffCredentialDocument.list().catch(() => []),
          base44.asServiceRole.entities.ProviderSchedule.list().catch(() => []),
          base44.asServiceRole.entities.UserApproval.list().catch(() => []),
          base44.asServiceRole.entities.PendingInvitation.list().catch(() => []),
          base44.asServiceRole.entities.BlockedUser.list().catch(() => []),
        ]);

        await uploadToFolder(accessToken, dateFolderId, `staff_and_access.json`, {
          generated_at: new Date().toISOString(),
          staff_profiles: staffProfiles,
          user_roles: userRoles,
          staff_credential_documents: staffDocs,
          provider_schedules: providerSchedules,
          user_approvals: userApprovals,
          pending_invitations: pendingInvitations,
          blocked_users: blockedUsers,
        });

        // ── BILLING & FINANCE ──────────────────────────────────────────
        console.log('  Fetching billing & finance data...');
        const [invoices, invoiceLines, payments, invoiceHeaders, creditSales,
               creditPayments, institutions, journalEntries, cashClosures,
               expenses, bankAccounts, bankStatements] = await Promise.all([
          base44.asServiceRole.entities.Invoice.list().catch(() => []),
          base44.asServiceRole.entities.InvoiceLine.list().catch(() => []),
          base44.asServiceRole.entities.Payment.list().catch(() => []),
          base44.asServiceRole.entities.InvoiceHeader.list().catch(() => []),
          base44.asServiceRole.entities.CreditSale.list().catch(() => []),
          base44.asServiceRole.entities.CreditPayment.list().catch(() => []),
          base44.asServiceRole.entities.Institution.list().catch(() => []),
          base44.asServiceRole.entities.JournalEntry.list().catch(() => []),
          base44.asServiceRole.entities.CashClosure.list().catch(() => []),
          base44.asServiceRole.entities.Expense.list().catch(() => []),
          base44.asServiceRole.entities.BankAccount.list().catch(() => []),
          base44.asServiceRole.entities.BankStatementUpload.list().catch(() => []),
        ]);

        await uploadToFolder(accessToken, dateFolderId, `billing_and_finance.json`, {
          generated_at: new Date().toISOString(),
          invoices,
          invoice_lines: invoiceLines,
          payments,
          invoice_headers: invoiceHeaders,
          credit_sales: creditSales,
          credit_payments: creditPayments,
          institutions,
          journal_entries: journalEntries,
          cash_closures: cashClosures,
          expenses,
          bank_accounts: bankAccounts,
          bank_statements: bankStatements,
        });

        // ── AUDIT & ACCESS LOGS ────────────────────────────────────────
        console.log('  Fetching audit logs...');
        const [auditLogs, callLogs, faxLogs, smsOutbox, helpDeskTickets, notifications] = await Promise.all([
          base44.asServiceRole.entities.AuditLog.list().catch(() => []),
          base44.asServiceRole.entities.CallLog.list().catch(() => []),
          base44.asServiceRole.entities.FaxLog.list().catch(() => []),
          base44.asServiceRole.entities.SmsOutbox.list().catch(() => []),
          base44.asServiceRole.entities.HelpDeskTicket.list().catch(() => []),
          base44.asServiceRole.entities.Notification.list().catch(() => []),
        ]);

        await uploadToFolder(accessToken, dateFolderId, `audit_and_access_logs.json`, {
          generated_at: new Date().toISOString(),
          audit_logs: auditLogs,
          call_logs: callLogs,
          fax_logs: faxLogs,
          sms_outbox: smsOutbox,
          helpdesk_tickets: helpDeskTickets,
          notifications,
        });

        // ── ORGANIZATION CONFIG ────────────────────────────────────────
        await uploadToFolder(accessToken, dateFolderId, `organization_config.json`, {
          generated_at: new Date().toISOString(),
          company: company,
          organizations,
        });

        // Write backup manifest
        await uploadToFolder(accessToken, dateFolderId, `_MANIFEST.json`, {
          backup_date: exportDate,
          backup_time: new Date().toISOString(),
          company: company.company_legal_name,
          files: [
            'clinical_patients_by_name.json — All patients with full clinical history, organized by patient name',
            'pharmacy_complete.json — All pharmacy sales, inventory, POs, drug catalog',
            'staff_and_access.json — Staff profiles, user roles, credentials, access logs',
            'billing_and_finance.json — Invoices, payments, credit sales, journal entries',
            'audit_and_access_logs.json — System audit trail, call logs, SMS, help desk',
            'organization_config.json — Company & organization settings',
          ],
          total_patients: patients.length,
          total_sales: pharmacySales.length + pharmacySaleHeaders.length,
          total_staff: staffProfiles.length,
        });

        // Cleanup old backup folders (keep 7 days)
        await cleanupOldFolders(accessToken, company.google_drive_folder_id, '2026');

        await base44.asServiceRole.entities.CompanyProfile.update(company.id, {
          last_backup_date: new Date().toISOString(),
          last_backup_drive_file_id: dateFolder.id
        });

        console.log(`✅ Backup successful for ${company.company_legal_name}`);
        results.push({
          company_name: company.company_legal_name,
          success: true,
          folder_name: `${exportDate}_Backup`,
          drive_folder_id: dateFolderId,
          patients_backed_up: patients.length,
          organizations_backed_up: organizations.length,
          files_created: 6
        });

      } catch (companyError) {
        console.error(`❌ Error backing up ${company.company_legal_name}:`, companyError.message);
        results.push({ company_name: company.company_legal_name, success: false, error: companyError.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      message: `Backup completed: ${successful} successful, ${failed} failed`,
      summary: { total_companies: allCompanies.length, successful, failed },
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});