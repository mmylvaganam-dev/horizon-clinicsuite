# Base44 Final Pharmacy and Medical Centre Backup Plan

Status: backup planning only

Base44 is expected to stop in about one week. Horizon must not lose pharmacy business history, prescription history, supply records, inventory records, credit sale records, delivery records, or patient/customer links. This plan is for full backup and preservation first. It does not import or transform real data.

## Rules

- Do not delete, disable, or manually clean Base44 before final backup is validated.
- Do not import real patient, prescription, pharmacy, billing, or document data until owner review.
- Keep the raw Base44 archive permanently.
- Preserve every exported record with its original Base44 ID.
- Treat pharmacy history as business-critical even when it is not immediately imported into Horizon.

## Backup Folder Structure

Create this folder outside Git. Do not commit real exports.

```text
Base44-Final-Backup/
  01_raw_entity_exports/
  02_pharmacy_sales/
  03_prescriptions/
  04_inventory_supply/
  05_credit_invoices/
  06_patient_customer_data/
  07_documents_files/
  08_screenshots_reports/
  09_validation_counts/
  10_horizon_import_ready/
```

## A. Full Backup and Archive Preservation

Purpose: preserve everything before Base44 shutdown.

Required:

- Export every entity listed in `BASE44_PHARMACY_ENTITY_EXPORT_CHECKLIST.csv`.
- Export all patient/customer and organization records linked to pharmacy activity.
- Export all document metadata and document files where available.
- Save screenshots of Base44 dashboard/report counts for sales, prescriptions, stock, invoices, patients, and credit accounts.
- Generate checksums for every exported file.
- Store a copy in at least two safe locations.

Raw archive output:

```text
Base44-Final-Backup/01_raw_entity_exports/
```

## B. Essential Data Needed for Horizon Go-Live

Purpose: keep the medical centre and pharmacy operational after Base44 stops.

Essential first-pass records:

- Users and staff profiles.
- Organizations, institutions, clinics, and pharmacies.
- Active patients/customers needed for operations.
- Upcoming/open appointments.
- Active prescriptions.
- Current stock/inventory balances.
- Open pharmacy requests and pending stock tasks.
- Open credit balances and unpaid invoices.
- Document metadata only, with file references preserved.

Review output only:

```text
Base44-Final-Backup/10_horizon_import_ready/
```

## C. Historical Pharmacy Migration Later

Purpose: preserve business history and migrate after reconciliation.

Do not rush these into Horizon without financial review:

- Historical pharmacy sale headers, sale items, sale lines, and receipts.
- Credit sales and monthly invoices.
- Wholesale orders, order items, deliveries, returns, payments, and messages.
- Purchase orders, purchase order lines, goods received records, and supplier history.
- Inventory transactions, stock batches, snapshots, adjustments, and returns.

Historical pharmacy output:

```text
Base44-Final-Backup/02_pharmacy_sales/
Base44-Final-Backup/04_inventory_supply/
Base44-Final-Backup/05_credit_invoices/
```

## Pharmacy Entity Groups

### Sales and Transactions

- PharmacySale
- PharmacySaleHeader
- PharmacySaleItem
- PharmacySaleLine
- PharmacyReceipt
- SaleDeletionRequest
- DailyClose
- ShiftCashSnapshot
- ShiftLog
- ShiftLogItem
- ShiftLogAttachment

### Prescriptions and Medicine Items

- Prescription
- PrescriptionRenewalRequest
- RxFavorite
- DrugCatalog
- Products
- ProductCatalog
- MedicineReturn

### Inventory, Stock, and Supply

- PharmacyStock
- PharmacyStockTask
- PharmacyProductUsage
- PharmacyRequest
- PharmacyReturnsPickup
- InventoryBalance
- InventoryTxn
- StockBatch
- StockSnapshot
- Supplier
- PurchaseOrder
- PurchaseOrderLine
- GoodsReceived

### Credit, Invoices, Payments, Billing Config

- CreditSale
- CreditPayment
- CreditMonthlyInvoice
- Invoice
- InvoiceHeader
- InvoiceLine
- Payment
- TeleConsultationBilling
- TelePaymentGatewayConfig
- Institution
- CompanyProfile

### Wholesale, Delivery, Returns, Messages

- WholesaleConnection
- WholesaleCreditAccount
- WholesaleDelivery
- WholesaleGRN
- WholesaleGRNLine
- WholesaleMessage
- WholesaleOrder
- WholesaleOrderItem
- WholesalePayment
- WholesaleProduct
- WholesaleProvider
- WholesaleReturn
- WholesaleReturnLine
- WholesaleSubscription

### Patient, Customer, Documents, Audit

- Patient
- PatientDocument
- DocumentArtifact
- StaffCredentialDocument
- AuditLog
- SignageAuditLog
- Message
- MessageThread
- MessageTemplate
- HelpDeskMessage
- OutboundMessage

## Validation Method

Use `BASE44_PHARMACY_COUNT_VALIDATION_TEMPLATE.csv`.

For every entity:

1. Record Base44 screen/report count.
2. Export JSON or CSV.
3. Run inventory script.
4. Compare exported file count to Base44 screen count.
5. Mark matched `yes` only when counts agree.
6. Write notes for missing files, duplicate rows, or known Base44 UI filters.

## Inventory Script

After export files are placed in `Base44-Final-Backup/`, run:

```bash
python3 scripts/migration/base44_pharmacy_backup_inventory.py \
  --backup-dir Base44-Final-Backup \
  --checklist docs/migration/BASE44_PHARMACY_ENTITY_EXPORT_CHECKLIST.csv \
  --output-dir Base44-Final-Backup/09_validation_counts
```

Expected outputs:

```text
Base44-Final-Backup/09_validation_counts/pharmacy_file_inventory.csv
Base44-Final-Backup/09_validation_counts/pharmacy_validation_summary.json
Base44-Final-Backup/09_validation_counts/pharmacy_missing_expected_entities.csv
```

## Exact Next Export Steps

1. Open Base44 while admin/platform owner access still works.
2. Run existing Google Drive backup/export functions if available:
   - `backupAllCompaniesToGoogleDrive`
   - `backupCompanyToGoogleDrive`
   - any Base44 export/download option for each entity
3. Download all backup JSON files from Google Drive.
4. Export or download the listed pharmacy/medical-centre entities as JSON or CSV.
5. Save sales exports under `02_pharmacy_sales`.
6. Save prescription exports under `03_prescriptions`.
7. Save stock/supply exports under `04_inventory_supply`.
8. Save credit/invoice exports under `05_credit_invoices`.
9. Save patient/customer exports under `06_patient_customer_data`.
10. Save documents/files under `07_documents_files`.
11. Save screenshots/reports under `08_screenshots_reports`.
12. Run the inventory script and review missing entities before Base44 shutdown.

## Shutdown Safety

Base44 can only be shut down after:

- Full raw archive exists.
- Pharmacy export checklist is complete or exceptions are owner-approved.
- Validation count sheet is reviewed.
- At least two archive copies exist.
- Horizon essential go-live import files are reviewed.
- Historical pharmacy migration is explicitly marked as preserved for later.
