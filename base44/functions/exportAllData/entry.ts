import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ENTITIES = [
  // Clinical
  'Patient', 'Appointment', 'Encounter', 'Order', 'OrderItem', 'Result', 'ResultFlag',
  'SOAPNote', 'MedicalRecord', 'PatientDocument', 'PatientVital', 'EncounterVitals',
  'Prescription', 'DispenseEvent', 'PatientTask', 'PatientConsent', 'PatientSmartSummary',
  'CPPItem', 'MedicationItem', 'ImagingStudy', 'DiagnosticTest', 'ExternalLabReport',
  'LabResultEntry', 'Specimen', 'LabCollectionOrder', 'LabCollectionItem',
  'SignOff', 'ReleaseToPatient', 'CriticalAck', 'BreakGlassLog', 'RecordLink',
  'CardioResultExtension', 'SecondOpinionRequest', 'PrescriptionRenewalRequest',

  // Staff / Users / Roles
  'StaffProfile', 'UserRole', 'Role', 'Permission', 'RolePermission',
  'StaffCredentialDocument', 'ProviderSchedule', 'ProviderAvailability', 'ShiftRoster',

  // Organization
  'Organization', 'Location', 'Department', 'OrganizationConfig', 'OrganizationBranding',
  'OrganizationModuleAccess', 'CompanyProfile', 'CompanyModuleAccess',

  // Pharmacy
  'PharmacySale', 'PharmacySaleItem', 'PharmacyReceipt', 'PharmacySaleHeader',
  'PharmacySaleLine', 'PharmacyRefundVoid', 'PharmacyStock', 'PharmacyRequest',
  'DrugCatalog', 'Supplier', 'PurchaseOrder', 'PurchaseOrderLine',
  'GoodsReceived', 'GoodsReceivedLine', 'InventoryBalance', 'InventoryTxn',
  'StockBatch', 'BatchTxn', 'MedicineReturn',

  // Credit / Billing
  'CreditSale', 'CreditPayment', 'CreditMonthlyInvoice', 'Institution',
  'Invoice', 'InvoiceLine', 'Payment', 'RefundVoid', 'InvoiceHeader',
  'ServiceCatalog', 'TaxRule', 'NumberingRule', 'ChartOfAccounts',
  'JournalEntry', 'JournalLine', 'PostingRule', 'CashClosure',

  // Home Care
  'HomeCareSchedule', 'HomeCareReport', 'HomeCareCase', 'HomeCareAssignment',
  'HomeCareInvoice', 'HomeCareInvoiceLine', 'HomeCarePatientVisit', 'HomeCareService',
  'HomeCareBatch', 'HomeCareServiceCatalog',

  // Wholesale
  'WholesaleOrder', 'WholesaleOrderItem', 'WholesaleProduct', 'WholesaleDelivery',
  'WholesalePayment', 'WholesaleReturn', 'WholesaleGRN', 'WholesaleGRNLine',
  'WholesaleReturnLine', 'WholesaleProvider', 'WholesaleSubscription',
  'WholesaleCreditAccount', 'WholesaleConnection',

  // Telemedicine
  'TeleAppointment', 'TelePatient', 'TeleProvider', 'TeleProviderAvailability',
  'TeleProviderTimeOff', 'TeleEncounter', 'TeleClinicalNote',
  'TelePricingConfig', 'TelePaymentGatewayConfig', 'TeleConsultationBilling',
  'TeleSubscription', 'TeleAuditLog',

  // Audit / Logs
  'AuditLog', 'AppVersion', 'BackupRunLog', 'DocumentArtifact', 'ExportBundle',
  'GovernmentReportRun', 'GovernmentSubmissionLog',

  // Other
  'Notification', 'UserApproval', 'PendingInvitation', 'ConfigKey',
  'KnowledgeBaseArticle', 'HelpDeskTicket', 'HelpDeskMessage',
  'OutboundMessage', 'MessageTemplate', 'CallLog', 'FaxLog', 'SmsOutbox',
  'PayrollPeriod', 'PayrollLine', 'TimesheetEntry',
  'Expense', 'RevenueEntry', 'RevenueStream', 'MonthlyClose',
  'BankAccount', 'BankStatementUpload', 'BankBalanceLog', 'DepositLog',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { entity_name } = body;

    // Single entity export
    if (entity_name) {
      if (entity_name !== 'User' && entity_name !== 'BlockedUser' && !ENTITIES.includes(entity_name)) {
        return Response.json({ error: 'Unknown entity' }, { status: 400 });
      }
      try {
        const records = await base44.asServiceRole.entities[entity_name].list('-created_date', 10000);
        return Response.json({ entity: entity_name, count: records.length, records });
      } catch (e) {
        return Response.json({ entity: entity_name, count: 0, records: [], error: e.message });
      }
    }

    // Users export (no passwords ever stored - safe to export)
    if (entity_name === 'User') {
      try {
        const users = await base44.asServiceRole.entities.User.list('-created_date', 10000);
        return Response.json({ entity: 'User', count: users.length, records: users });
      } catch (e) {
        return Response.json({ entity: 'User', count: 0, records: [], error: e.message });
      }
    }

    // Summary mode: return counts for all entities
    const summary = [];
    for (const name of ['User', ...ENTITIES]) {
      try {
        summary.push({ entity: name, status: 'ok' });
      } catch (e) {
        summary.push({ entity: name, status: 'error', error: e.message });
      }
    }

    return Response.json({
      export_date: new Date().toISOString(),
      timezone: 'America/Toronto',
      entities: ['User', ...ENTITIES],
      summary,
      total_entities: ENTITIES.length + 1,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});