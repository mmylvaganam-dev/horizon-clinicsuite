# Base44 Entity to PostgreSQL Migration Mapping

Status: planning only. No production data import should run from this document.

This plan maps the current Base44 entity definitions under `base44/entities/` into the independent Horizon stack:

- Firebase Auth for authentication
- PostgreSQL for structured operational data
- Firebase Storage for files, images, recordings, generated PDFs, and uploaded documents

Patient records, clinical results, prescriptions, billing records, pharmacy records, and wholesale financial data must not be migrated until validation, privacy review, and rollback procedures are complete.

## Entities Found

Total Base44 entity definitions found: 28

All entities:

| Entity | Category | Target PostgreSQL table/module | Priority | Risk | Firebase Storage? |
| --- | --- | --- | --- | --- | --- |
| PendingInvitation | identity/admin | `pending_invitations`, user onboarding module | Phase 1 | Low | No |
| StaffProfile | identity/admin | `staff_profiles`, linked to `users` and `organizations` | Phase 1 | Medium | Yes, for profile photo/signature/seal URLs |
| Institution | identity/admin | `institutions` / organization relationships | Phase 1 | Medium | No |
| StaffCredentialDocument | documents/files | `document_metadata`, `staff_credential_documents` | Phase 2 | Medium | Yes, credential files |
| WholesaleDelivery | documents/files | `wholesale_deliveries`, document metadata for proof of delivery | Phase 2 or 6 | Medium | Yes, proof of delivery image |
| CreditSale | documents/files and billing/pharmacy | `credit_sales`, document metadata for invoice PDF | Phase 6 | High | Yes, invoice PDF |
| TeleAppointment | appointments/tasks and clinical/patient | `tele_appointments` | Phase 4 or 5 | High | Yes, pre-consult files and recordings |
| HomeCareSchedule | appointments/tasks | `home_care_schedules` | Phase 4 | High | No |
| TeleProviderAvailability | appointments/tasks | `provider_availability` | Phase 4 | Low | No |
| TeleProviderTimeOff | appointments/tasks | `provider_time_off` | Phase 4 | Low | No |
| WholesaleMessage | appointments/tasks or wholesale operations | `wholesale_messages` | Phase 4 or 6 | Medium | No |
| Patient | clinical/patient | `patients` | Phase 5 | High | Yes, photo URL |
| Result | clinical/patient | `results`, `lab_results` | Phase 5 | High | Possibly, attached reports if present later |
| LabResultEntry | clinical/patient | `lab_result_entries` | Phase 5 | High | No |
| Prescription | clinical/patient and billing/pharmacy | `prescriptions` | Phase 5 or 6 | High | No, unless generated prescription PDFs are added |
| HomeCareReport | clinical/patient | `home_care_reports` | Phase 5 | High | No |
| RxFavorite | settings/config | `rx_favorites` / prescription templates | Phase 3 | Medium | No |
| TelePricingConfig | settings/config | `tele_pricing_configs` | Phase 3 | Low | No |
| TelePaymentGatewayConfig | settings/config | `payment_gateway_configs` | Phase 3 | High | No; secrets must not be imported blindly |
| TeleSubscription | billing/pharmacy | `tele_subscriptions` | Phase 6 | High | No |
| TeleConsultationBilling | billing/pharmacy | `tele_consultation_billing` | Phase 6 | High | No |
| CreditMonthlyInvoice | billing/pharmacy | `credit_monthly_invoices` | Phase 6 | High | Possibly, generated invoice PDFs if added |
| PurchaseOrder | billing/pharmacy | `purchase_orders` | Phase 6 | High | No |
| WholesaleSubscription | billing/pharmacy | `wholesale_subscriptions` | Phase 6 | High | No |
| WholesaleGRN | billing/pharmacy | `wholesale_grns` | Phase 6 | High | No |
| WholesaleGRNLine | billing/pharmacy | `wholesale_grn_lines` | Phase 6 | High | No |
| WholesaleReturn | billing/pharmacy | `wholesale_returns` | Phase 6 | High | No |
| WholesaleReturnLine | billing/pharmacy | `wholesale_return_lines` | Phase 6 | High | No |

## Category Mapping

### Identity/Admin

Entities:

- `PendingInvitation`
- `StaffProfile`
- `Institution`

Recommended target:

- `users`
- `organizations`
- `roles`
- `user_roles`
- `staff_profiles`
- `institutions`
- `pending_invitations`

Priority: Phase 1

Risk level:

- `PendingInvitation`: Low
- `StaffProfile`: Medium, because it can include credential and contact details
- `Institution`: Medium, because it may affect credit workflows and organization relationships

Firebase Storage:

- `StaffProfile` has `e_signature_url`, `seal_url`, and `profile_photo_url`; files should move to Firebase Storage.
- `PendingInvitation` and `Institution` are structured data only.

Notes:

- This category is the safest first because it supports login, roles, organization membership, and administration before touching clinical or financial records.
- `StaffProfile` should be linked to Firebase-authenticated `users` where email matches.

### Documents/Files

Entities:

- `StaffCredentialDocument`
- `WholesaleDelivery`
- `CreditSale`
- file-related fields inside `TeleAppointment`, `Patient`, and `StaffProfile`

Recommended target:

- `document_metadata`
- `staff_credential_documents`
- resource-specific modules such as `wholesale_deliveries` and `credit_sales`

Priority: Phase 2

Risk level:

- Medium for staff credential files
- High for invoices, delivery proofs, patient photos, telehealth recordings, and pre-consult files

Firebase Storage:

- Yes. Uploaded files, generated PDFs, images, recordings, and credential documents should be moved to Firebase Storage.
- Structured metadata should be stored in PostgreSQL.

Notes:

- Files should be migrated only after classifying whether they contain patient, employment, financial, or operational data.
- Store checksums, original Base44 URL/path, Firebase path, size, MIME type, and migration timestamp.

### Appointments/Tasks

Entities:

- `TeleAppointment`
- `HomeCareSchedule`
- `TeleProviderAvailability`
- `TeleProviderTimeOff`
- `WholesaleMessage`

Recommended target:

- `appointments`
- `tele_appointments`
- `home_care_schedules`
- `provider_availability`
- `provider_time_off`
- `messages` or `wholesale_messages`

Priority: Phase 4

Risk level:

- Low for provider availability/time-off
- Medium for wholesale messages
- High for teleappointments and home care schedules because they may include patient identity, clinical notes, and care timing

Firebase Storage:

- `TeleAppointment` file URLs and recording URLs should move to Firebase Storage.
- Other entities are mostly structured data.

Notes:

- Appointment and schedule data should migrate only after identity/admin and configuration foundations are stable.
- Teleappointment data overlaps with clinical, billing, consent, and file storage.

### Clinical/Patient

Entities:

- `Patient`
- `Result`
- `LabResultEntry`
- `Prescription`
- `HomeCareReport`
- clinical fields in `TeleAppointment`

Recommended target:

- `patients`
- `lab_results`
- `lab_result_entries`
- `prescriptions`
- `home_care_reports`
- clinical document modules

Priority: Phase 5

Risk level: High

Firebase Storage:

- Yes for patient photos, clinical documents, generated reports, and any attachments.
- Structured clinical values must go to PostgreSQL, not Firebase Storage files.

Notes:

- This category requires PHIPA/privacy review, field-level validation, sample record comparison, access-control validation, and rollback readiness.
- Do not migrate clinical/patient data during scaffold work.

### Billing/Pharmacy

Entities:

- `CreditSale`
- `CreditMonthlyInvoice`
- `TeleSubscription`
- `TeleConsultationBilling`
- `PurchaseOrder`
- `WholesaleSubscription`
- `WholesaleGRN`
- `WholesaleGRNLine`
- `WholesaleReturn`
- `WholesaleReturnLine`
- billing fields inside `TeleAppointment`
- pharmacy-linked `Prescription`

Recommended target:

- `credit_sales`
- `credit_monthly_invoices`
- `payments`
- `tele_billing`
- `purchase_orders`
- `wholesale_grns`
- `wholesale_returns`
- `pharmacy_transactions`

Priority: Phase 6

Risk level: High

Firebase Storage:

- Yes for generated invoices, credit notes, receipt images, or proof documents.
- Structured money, stock, invoice, payment, and transaction records must go to PostgreSQL.

Notes:

- Delay until data reconciliation procedures are ready.
- Requires amount totals, line-item counts, balance validation, and audit logs.

### Settings/Config

Entities:

- `RxFavorite`
- `TelePricingConfig`
- `TelePaymentGatewayConfig`

Recommended target:

- `rx_favorites`
- `pricing_configs`
- `payment_gateway_configs`
- settings/config module tables

Priority: Phase 3

Risk level:

- `TelePricingConfig`: Low
- `RxFavorite`: Medium, because templates may influence prescribing behavior
- `TelePaymentGatewayConfig`: High, because it references payment provider configuration and bank details

Firebase Storage:

- No for these definitions.

Notes:

- Do not import secrets. The gateway schema says only partial secret values should be stored, but every gateway record still needs manual review before migration.

### High-Risk/Unknown

Entities:

- `Patient`
- `Result`
- `LabResultEntry`
- `Prescription`
- `HomeCareReport`
- `TeleAppointment`
- `TeleConsultationBilling`
- `TeleSubscription`
- `CreditSale`
- `CreditMonthlyInvoice`
- `PurchaseOrder`
- `WholesaleGRN`
- `WholesaleGRNLine`
- `WholesaleReturn`
- `WholesaleReturnLine`
- `TelePaymentGatewayConfig`

Recommended target:

- Domain-specific PostgreSQL modules after manual review.

Priority: Delay until later phases.

Risk level: High

Firebase Storage:

- Only for files generated by or attached to these records.
- The main structured records belong in PostgreSQL.

## First 10 Safest Entities to Migrate

Recommended first 10, in order:

1. `PendingInvitation`
2. `TeleProviderAvailability`
3. `TeleProviderTimeOff`
4. `TelePricingConfig`
5. `StaffProfile`
6. `Institution`
7. `RxFavorite`
8. `StaffCredentialDocument`
9. `WholesaleMessage`
10. `HomeCareSchedule`

Why these first:

- They are mostly administrative, scheduling, configuration, or metadata-heavy.
- They avoid direct financial ledgers and deep clinical result data.
- They support the independent auth, organization, RBAC, document metadata, and audit scaffolds already created.

Important caution:

- `StaffCredentialDocument` includes uploaded files and credential data, so it should migrate only after Firebase Storage metadata registration is working.
- `HomeCareSchedule` can expose patient and care timing details, so it is safer than clinical records but still needs privacy validation.

## High-Risk Entities to Delay

Delay these until later phases:

- `Patient`
- `Result`
- `LabResultEntry`
- `Prescription`
- `HomeCareReport`
- `TeleAppointment`
- `TeleConsultationBilling`
- `TeleSubscription`
- `CreditSale`
- `CreditMonthlyInvoice`
- `PurchaseOrder`
- `WholesaleGRN`
- `WholesaleGRNLine`
- `WholesaleReturn`
- `WholesaleReturnLine`
- `TelePaymentGatewayConfig`

Reasons:

- Patient/clinical data needs privacy and consent handling.
- Billing/pharmacy data needs financial reconciliation.
- Wholesale stock and return data needs inventory count validation.
- Payment gateway records need manual security review.

## Entities Needing Manual Review

- `TelePaymentGatewayConfig`: bank details, gateway keys, and payment configuration.
- `Patient`: identifiers, PHN, national ID, consent, medical history.
- `Result` and `LabResultEntry`: clinical interpretation and diagnostic values.
- `Prescription`: medication instructions and pharmacy routing.
- `TeleAppointment`: consent fields, SOAP notes, recordings, billing, diagnosis.
- `HomeCareReport`: patient condition, care observations, pharmacy notes, staff performance.
- `CreditSale` and `CreditMonthlyInvoice`: invoices, payment status, balances.
- `WholesaleGRN`, `WholesaleGRNLine`, `WholesaleReturn`, `WholesaleReturnLine`: inventory and credit impact.
- `StaffCredentialDocument`: credential files and ID documents.

## Recommended Migration Order

### Phase 1: Identity/Admin

- `PendingInvitation`
- `StaffProfile`
- `Institution`
- Link to PostgreSQL `users`, `organizations`, `roles`, and `user_roles`.

### Phase 2: Documents/Files

- `StaffCredentialDocument`
- File fields in `StaffProfile`
- File fields in `TeleAppointment`
- Proof/invoice file URLs in `WholesaleDelivery` and `CreditSale`
- Store files in Firebase Storage and metadata in PostgreSQL.

### Phase 3: Settings/Config

- `TelePricingConfig`
- `RxFavorite`
- Manually reviewed `TelePaymentGatewayConfig` records only.

### Phase 4: Appointments/Tasks

- `TeleProviderAvailability`
- `TeleProviderTimeOff`
- `HomeCareSchedule`
- `WholesaleMessage`
- Non-clinical portions of `TeleAppointment` only after review.

### Phase 5: Clinical/Patient

- `Patient`
- `Result`
- `LabResultEntry`
- `Prescription`
- `HomeCareReport`
- Clinical portions of `TeleAppointment`

### Phase 6: Billing/Pharmacy

- `CreditSale`
- `CreditMonthlyInvoice`
- `TeleSubscription`
- `TeleConsultationBilling`
- `PurchaseOrder`
- `WholesaleSubscription`
- `WholesaleGRN`
- `WholesaleGRNLine`
- `WholesaleReturn`
- `WholesaleReturnLine`

## Validation Requirements Before Any Data Import

- Inventory export files from Google Drive.
- Classify each export as structured data, file data, archive, or unknown.
- Validate entity counts before and after import.
- Validate sample records per entity.
- Validate foreign key mapping for organization, user, patient, staff, and provider references.
- Validate file checksums and Firebase Storage paths.
- Record audit logs for every import batch.
- Prepare rollback scripts before import.

## Explicit Non-Actions

- No real data import was run.
- No production migration was run.
- No patient data was accessed.
- No app code was modified for this mapping.
