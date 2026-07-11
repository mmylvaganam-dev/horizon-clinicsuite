import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Download, Database, CheckCircle2, XCircle, Loader2, FileJson, AlertTriangle, RefreshCw, Zap, Cloud
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const ENTITY_GROUPS = {
  'Users & Access': [
    'User', 'UserRole', 'Role', 'Permission', 'RolePermission',
    'UserApproval', 'PendingInvitation', 'BlockedUser',
  ],
  'Clinical': [
    'Patient', 'Appointment', 'Encounter', 'Order', 'OrderItem', 'Result', 'ResultFlag',
    'SOAPNote', 'MedicalRecord', 'PatientDocument', 'PatientVital', 'EncounterVitals',
    'Prescription', 'DispenseEvent', 'PatientTask', 'PatientConsent', 'PatientSmartSummary',
    'CPPItem', 'MedicationItem', 'ImagingStudy', 'DiagnosticTest', 'ExternalLabReport',
    'LabResultEntry', 'Specimen', 'LabCollectionOrder', 'LabCollectionItem',
    'SignOff', 'ReleaseToPatient', 'CriticalAck', 'BreakGlassLog', 'RecordLink',
    'CardioResultExtension', 'SecondOpinionRequest', 'PrescriptionRenewalRequest',
  ],
  'Staff & Organization': [
    'StaffProfile', 'StaffCredentialDocument', 'ProviderSchedule', 'ProviderAvailability', 'ShiftRoster',
    'Organization', 'Location', 'Department', 'OrganizationConfig', 'OrganizationBranding',
    'OrganizationModuleAccess', 'CompanyProfile', 'CompanyModuleAccess',
  ],
  'Pharmacy': [
    'PharmacySale', 'PharmacySaleItem', 'PharmacyReceipt', 'PharmacySaleHeader',
    'PharmacySaleLine', 'PharmacyRefundVoid', 'PharmacyStock', 'PharmacyRequest',
    'DrugCatalog', 'Supplier', 'PurchaseOrder', 'PurchaseOrderLine',
    'GoodsReceived', 'GoodsReceivedLine', 'InventoryBalance', 'InventoryTxn',
    'StockBatch', 'BatchTxn', 'MedicineReturn',
  ],
  'Billing & Finance': [
    'CreditSale', 'CreditPayment', 'CreditMonthlyInvoice', 'Institution',
    'Invoice', 'InvoiceLine', 'Payment', 'RefundVoid', 'InvoiceHeader',
    'ServiceCatalog', 'TaxRule', 'NumberingRule', 'ChartOfAccounts',
    'JournalEntry', 'JournalLine', 'PostingRule', 'CashClosure',
    'Expense', 'RevenueEntry', 'RevenueStream', 'MonthlyClose',
    'BankAccount', 'BankStatementUpload', 'BankBalanceLog', 'DepositLog',
  ],
  'Home Care': [
    'HomeCareSchedule', 'HomeCareReport', 'HomeCareCase', 'HomeCareAssignment',
    'HomeCareInvoice', 'HomeCareInvoiceLine', 'HomeCarePatientVisit', 'HomeCareService',
    'HomeCareBatch', 'HomeCareServiceCatalog',
  ],
  'Wholesale': [
    'WholesaleOrder', 'WholesaleOrderItem', 'WholesaleProduct', 'WholesaleDelivery',
    'WholesalePayment', 'WholesaleReturn', 'WholesaleGRN', 'WholesaleGRNLine',
    'WholesaleReturnLine', 'WholesaleProvider', 'WholesaleSubscription',
    'WholesaleCreditAccount', 'WholesaleConnection',
  ],
  'Telemedicine': [
    'TeleAppointment', 'TelePatient', 'TeleProvider', 'TeleProviderAvailability',
    'TeleProviderTimeOff', 'TeleEncounter', 'TeleClinicalNote',
    'TelePricingConfig', 'TelePaymentGatewayConfig', 'TeleConsultationBilling',
    'TeleSubscription', 'TeleAuditLog',
  ],
  'Audit & Logs': [
    'AuditLog', 'AppVersion', 'BackupRunLog', 'DocumentArtifact', 'ExportBundle',
    'GovernmentReportRun', 'GovernmentSubmissionLog',
    'Notification', 'ConfigKey',
    'KnowledgeBaseArticle', 'HelpDeskTicket', 'HelpDeskMessage',
    'OutboundMessage', 'MessageTemplate', 'CallLog', 'FaxLog', 'SmsOutbox',
    'PayrollPeriod', 'PayrollLine', 'TimesheetEntry',
  ],
};

const ALL_ENTITIES = Object.values(ENTITY_GROUPS).flat();

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(records, filename) {
  if (!records || records.length === 0) {
    downloadJSON([], filename.replace('.csv', '.json'));
    return;
  }
  const headers = Object.keys(records[0]);
  const rows = records.map(r =>
    headers.map(h => {
      const v = r[h];
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExportManager() {
  const { toast } = useToast();
  const [status, setStatus] = useState({}); // { entityName: { count, loading, error, done } }
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportLog, setExportLog] = useState([]);
  const [format_, setFormat] = useState('json');
  const [fullBundle, setFullBundle] = useState(null);
  const [driveBackingUp, setDriveBackingUp] = useState(false);

  const fetchEntity = async (name) => {
    setStatus(prev => ({ ...prev, [name]: { loading: true } }));
    try {
      const res = await base44.functions.invoke('exportAllData', { entity_name: name });
      const { records, count, error } = res.data;
      setStatus(prev => ({ ...prev, [name]: { count: count ?? 0, done: true, error: error || null } }));
      return { entity: name, count: count ?? 0, records: records || [], error: error || null };
    } catch (e) {
      setStatus(prev => ({ ...prev, [name]: { count: 0, done: true, error: e.message } }));
      return { entity: name, count: 0, records: [], error: e.message };
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    setExportLog([]);
    setFullBundle(null);
    setStatus({});
    setProgress(0);

    const allData = {};
    const log = [];

    for (let i = 0; i < ALL_ENTITIES.length; i++) {
      const name = ALL_ENTITIES[i];
      const result = await fetchEntity(name);
      allData[name] = result.records;
      log.push({ entity: name, count: result.count, error: result.error });
      setExportLog([...log]);
      setProgress(Math.round(((i + 1) / ALL_ENTITIES.length) * 100));
    }

    const bundle = {
      export_date: new Date().toISOString(),
      timezone: 'America/Toronto',
      app: 'Horizon ClinicSuite',
      total_entities: ALL_ENTITIES.length,
      summary: log,
      data: allData,
    };
    setFullBundle(bundle);
    setExporting(false);
    // Auto-download immediately after export
    const ts = format(new Date(), 'yyyy-MM-dd_HHmm');
    downloadJSON(bundle, `horizon_clinicsuite_export_${ts}.json`);
  };

  const handleDownloadAll = () => {
    if (!fullBundle) return;
    const ts = format(new Date(), 'yyyy-MM-dd_HHmm');
    downloadJSON(fullBundle, `horizon_clinicsuite_export_${ts}.json`);
  };

  const handleDownloadEntity = async (name) => {
    const result = await fetchEntity(name);
    const ts = format(new Date(), 'yyyy-MM-dd');
    if (format_ === 'csv') {
      downloadCSV(result.records, `${name}_${ts}.csv`);
    } else {
      downloadJSON({ entity: name, count: result.count, records: result.records }, `${name}_${ts}.json`);
    }
  };

  const handleDriveBackupNow = async () => {
    setDriveBackingUp(true);
    try {
      const res = await base44.functions.invoke('backupAllCompaniesToGoogleDrive', {});
      const { summary, results } = res.data;
      toast({
        title: `Google Drive Backup Complete`,
        description: `${summary.successful}/${summary.total_companies} companies backed up successfully.${summary.failed > 0 ? ` ${summary.failed} failed — check folder config.` : ''}`,
      });
    } catch (e) {
      toast({ title: 'Backup Failed', description: e.message, variant: 'destructive' });
    }
    setDriveBackingUp(false);
  };

  const totalCount = Object.values(status).reduce((s, v) => s + (v.count || 0), 0);
  const doneCount = Object.values(status).filter(v => v.done).length;
  const errorCount = Object.values(status).filter(v => v.error).length;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-teal-600" />
            Data Export Manager
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Export all entity data from Horizon ClinicSuite as JSON or CSV.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={format_}
            onChange={e => setFormat(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-slate-700"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <Button
            onClick={handleExportAll}
            disabled={exporting}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {exporting ? `Exporting... ${progress}%` : 'Export All Entities'}
          </Button>
          {fullBundle && (
            <Button onClick={handleDownloadAll} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Download Full Bundle
            </Button>
          )}
          <Button
            onClick={async () => {
              await handleExportAll();
            }}
            disabled={exporting}
            className="bg-violet-600 hover:bg-violet-700"
            title="One-click: fetch all data then download immediately"
          >
            <Zap className="w-4 h-4 mr-2" />
            One-Click Full Download
          </Button>
          <Button
            onClick={handleDriveBackupNow}
            disabled={driveBackingUp}
            variant="outline"
            className="border-teal-500 text-teal-700 hover:bg-teal-50"
          >
            {driveBackingUp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cloud className="w-4 h-4 mr-2" />}
            {driveBackingUp ? 'Backing up...' : 'Backup to Drive Now'}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {exporting && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Exporting entities... {doneCount}/{ALL_ENTITIES.length}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Summary after export */}
      {fullBundle && !exporting && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="pt-4 flex flex-wrap gap-6 items-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-700">{totalCount.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Records</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{doneCount - errorCount}</p>
              <p className="text-xs text-slate-500">Entities OK</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{errorCount}</p>
              <p className="text-xs text-slate-500">Errors</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{format(new Date(fullBundle.export_date), 'MMM d, yyyy HH:mm')} ET</p>
              <p className="text-xs text-slate-500">Export Date/Time</p>
            </div>
            <Button onClick={handleDownloadAll} className="ml-auto bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Download Full JSON Bundle
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entity groups */}
      {Object.entries(ENTITY_GROUPS).map(([group, entities]) => (
        <Card key={group}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800">{group}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {entities.map(name => {
                const s = status[name];
                return (
                  <div key={name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      {s?.loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                      {s?.done && !s?.error && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {s?.done && s?.error && <XCircle className="w-4 h-4 text-red-400" />}
                      {!s && <FileJson className="w-4 h-4 text-slate-300" />}
                      <span className="text-sm text-slate-700 font-mono">{name}</span>
                      {s?.done && !s?.error && (
                        <Badge variant="outline" className="text-xs">{s.count} records</Badge>
                      )}
                      {s?.error && (
                        <span className="text-xs text-red-400">{s.error}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={exporting}
                      onClick={() => handleDownloadEntity(name)}
                      className="text-xs h-7"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="text-xs text-slate-400 text-center pb-4">
        <AlertTriangle className="w-3 h-3 inline mr-1" />
        File URLs/references are included in the export. Actual file binaries must be downloaded separately from their URLs.
        Passwords are never exported.
      </div>
    </div>
  );
}