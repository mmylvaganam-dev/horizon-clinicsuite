# Base44 Final Backup Validation Report

Status: BACKUP VALIDATED - NO IMPORT RUN

Backup date: 2026-06-03
Backup source: Base44 in-app JSON export
Backup files:
- base44_CrossBorder_Health_Network_2026-06-03.json
- base44_Premier_Pharma_2026-06-03.json
- base44_Anantham_Health_Centre_2026-06-03.json

## Validation Summary

- Company export files: 3
- Export format: Combined JSON exports
- Entities found: 154
- Pharmacy checklist expected entities: 67
- Expected pharmacy entities present: 50
- Expected pharmacy entities missing: 17
- Import performed: No

## Key Record Counts

| Entity | Count |
|---|---:|
| User | 24 |
| UserRole | 201 |
| Role | 105 |
| CompanyProfile | 9 |
| Organization | 9 |
| StaffProfile | 48 |
| Patient | 564 |
| PatientDocument | 27 |
| Appointment | 522 |
| TeleAppointment | 0 |
| TeleProviderAvailability | 0 |
| Prescription | 78 |
| PharmacySale | 135 |
| PharmacySaleHeader | 1311 |
| PharmacySaleItem | 42 |
| PharmacyStock | 2616 |
| InventoryBalance | 0 |
| InventoryTxn | 0 |
| StockBatch | 0 |
| Supplier | 3 |
| PurchaseOrder | 3 |
| PurchaseOrderLine | 3 |
| GoodsReceived | 0 |
| CreditSale | 0 |
| CreditPayment | 3 |
| CreditMonthlyInvoice | 9 |
| Invoice | 0 |
| InvoiceHeader | 27 |
| InvoiceLine | 33 |
| WholesaleOrder | 3 |
| WholesaleOrderItem | 3 |
| WholesaleProduct | 3 |
| WholesaleDelivery | 0 |
| WholesalePayment | 0 |
| WholesaleReturn | 0 |
| AuditLog | 609 |

## Missing Expected Entities

The following expected entities were not found in the export. They may be unused, renamed, or not included by the export tool:

- SaleDeletionRequest
- DailyClose
- ShiftCashSnapshot
- ShiftLog
- ShiftLogItem
- ShiftLogAttachment
- RxFavorite
- Products
- ProductCatalog
- PharmacyStockTask
- PharmacyProductUsage
- PharmacyReturnsPickup
- StockSnapshot
- WholesaleMessage
- SignageAuditLog
- Message
- MessageThread

## Safety Notes

- No Horizon import has been run.
- No production Base44 data has been modified by validation.
- Raw JSON files must be retained permanently.
- Do not upload PHI/patient documents to Firebase until storage rules and PHI approval are complete.

## Next Recommended Step

Prepare import dry-run mapping for:
1. Organizations
2. Users/staff/roles
3. Patients
4. Appointments
5. Prescriptions
6. Pharmacy stock
7. Pharmacy sales headers/items
8. Patient document metadata

