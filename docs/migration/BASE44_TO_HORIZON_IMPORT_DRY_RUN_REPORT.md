# Base44 To Horizon Import Dry Run Report

Status: DRY RUN ONLY - NO IMPORT PERFORMED

Generated at: 2026-06-04T03:35:20.594877+00:00
Source directory: `Base44-Final-Backup/01_raw_entity_exports`
Output directory: `Base44-Final-Backup/10_horizon_import_ready`

## Safety Status

- No PostgreSQL connection was opened.
- No Horizon production data was modified.
- No Firebase Storage upload was performed.
- No Base44 data was modified or deleted.
- Outputs contain PHI and pharmacy/business data and must be stored securely.

## Source Files

- `base44_Anantham_Health_Centre_2026-06-03.json`
- `base44_CrossBorder_Health_Network_2026-06-03.json`
- `base44_Premier_Pharma_2026-06-03.json`

## Mapped Record Counts

| Entity | Dry-run records | Output file |
|---|---:|---|
| Appointment | 522 | `Base44-Final-Backup/10_horizon_import_ready/appointments_review_phi.json` |
| CompanyProfile | 9 | `Base44-Final-Backup/10_horizon_import_ready/companies_review.json` |
| Organization | 9 | `Base44-Final-Backup/10_horizon_import_ready/organizations_review.json` |
| Patient | 564 | `Base44-Final-Backup/10_horizon_import_ready/patients_review_phi.json` |
| PatientDocument | 27 | `Base44-Final-Backup/10_horizon_import_ready/patient_document_metadata_review_phi.json` |
| PharmacySale | 135 | `Base44-Final-Backup/10_horizon_import_ready/pharmacy_sales_review.json` |
| PharmacySaleHeader | 1311 | `Base44-Final-Backup/10_horizon_import_ready/pharmacy_sale_headers_review.json` |
| PharmacySaleItem | 42 | `Base44-Final-Backup/10_horizon_import_ready/pharmacy_sale_items_review.json` |
| PharmacyStock | 2616 | `Base44-Final-Backup/10_horizon_import_ready/pharmacy_stock_review.json` |
| Prescription | 78 | `Base44-Final-Backup/10_horizon_import_ready/prescriptions_review_phi.json` |
| Role | 105 | `Base44-Final-Backup/10_horizon_import_ready/roles_review.json` |
| StaffProfile | 48 | `Base44-Final-Backup/10_horizon_import_ready/staff_profiles_review.json` |
| TeleAppointment | 0 | `Base44-Final-Backup/10_horizon_import_ready/tele_appointments_review_phi.json` |
| User | 24 | `Base44-Final-Backup/10_horizon_import_ready/users_review.json` |
| UserRole | 201 | `Base44-Final-Backup/10_horizon_import_ready/user_roles_review.json` |

## Missing Required Fields

### PharmacyStock
- `item_name`: 2616

## Skipped Records

No skipped records were recorded by the dry run.

## High-Risk Mappings

- Appointment
- Patient
- PatientDocument
- PharmacySale
- PharmacySaleHeader
- PharmacySaleItem
- Prescription
- TeleAppointment

## Blockers Before Real Import

- Owner must review all PHI/patient/prescription/pharmacy outputs.
- Target PostgreSQL schemas for patients, prescriptions, pharmacy stock, pharmacy sales, and document metadata must be finalized.
- Firebase Auth user linking must be reviewed by email before creating production users.
- Patient document files must not be moved to Firebase Storage until PHI-approved storage rules are reviewed.
- Rollback and count validation must be approved before any staging or production import.
