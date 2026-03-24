import React, { useState } from 'react';
import { Info, X, ChevronRight, Search, Lightbulb, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const modules = [
  {
    id: 'new_sale',
    title: 'New Sale (Sales Workspace)',
    emoji: '🛒',
    category: 'Quick Access',
    summary: 'Unified POS — sell pharmacy, GP, specialist, radiology, and home care services all in one place.',
    whenWhere: 'Use this as your PRIMARY daily billing screen. Suitable for front-desk staff and cashiers. Works for walk-in patients and registered patients across all service types.',
    steps: [
      { step: 'Select a module', detail: 'Choose the service type (Pharmacy, GP, Specialist, Radiology, or Home Care) from the top tabs.' },
      { step: 'Search or add patient', detail: 'Search an existing patient by name/PHN or create a walk-in entry. All billing is attached to the patient.' },
      { step: 'Add items/services', detail: 'Scan a barcode, search by name, or pick from the service catalog. Quantities and prices auto-populate.' },
      { step: 'Apply discounts & finalize', detail: 'Apply line-level or header discounts, select payment method (Cash, Card, Insurance), then click Confirm Sale.' },
      { step: 'Print / send receipt', detail: 'Print or email the receipt. For pharmacy, an SMS option is available if mobile is on file.' },
    ],
  },
  {
    id: 'patient_hub',
    title: 'Patient Hub (Patients)',
    emoji: '👥',
    category: 'Quick Access',
    summary: 'Central patient search — find any patient and jump to their profile, EMR, Pharmacy, or Home Care records.',
    whenWhere: 'Use this when you need to look up a patient record, check their history, book an appointment, or navigate to any of their clinical records. Used by reception, nurses, and doctors.',
    steps: [
      { step: 'Search', detail: "Type the patient's name, PHN, phone, or NIC in the search bar. Results filter as you type." },
      { step: 'Open profile', detail: 'Click a patient card to open their full profile with tabs for Overview, Appointments, Records, Labs, and more.' },
      { step: 'Take action', detail: 'From the profile you can book an appointment, open their EMR, go to Pharmacy POS pre-loaded with that patient, or add a Home Care case.' },
    ],
  },
  {
    id: 'pharmacy_pos',
    title: 'Pharmacy POS',
    emoji: '💊',
    category: 'Pharmacy',
    summary: 'Point of sale for dispensing medicines — scan barcodes, search products, bill and print receipts.',
    whenWhere: 'Used by pharmacists and pharmacy assistants for every retail dispensing transaction. Open this whenever a patient or walk-in customer comes to collect medicines or buy OTC products.',
    steps: [
      { step: 'Select patient (optional)', detail: 'Search and link an existing patient, or proceed as a walk-in. Walk-in patients can be registered on the spot.' },
      { step: 'Search products', detail: 'Use the Name, Generic, or Barcode tab to find items. Scan a barcode with any USB scanner for instant lookup.' },
      { step: 'Add to cart', detail: 'Click "+ Add" on a product. Adjust quantity and unit price directly in the cart. Line totals calculate automatically.' },
      { step: 'Process payment', detail: 'Select Cash, Card, Transfer, or Insurance. Enter amount tendered to see change. Click "Confirm Sale".' },
      { step: 'Receipt options', detail: 'Print thermal receipt, email PDF invoice, or send SMS with sale summary.' },
    ],
  },
  {
    id: 'pharmacy_inventory',
    title: 'Pharmacy Inventory',
    emoji: '📦',
    category: 'Pharmacy',
    summary: 'Track stock levels, receive new batches, adjust quantities, and view expiry alerts.',
    whenWhere: 'Used by pharmacy managers and stock controllers. Open this when receiving new stock from suppliers, performing stock-takes, investigating discrepancies, or checking expiry dates. NOT for daily selling — use POS for that.',
    steps: [
      { step: 'View stock', detail: 'All products listed with quantity, batch, expiry, and unit price. Filter by low stock or near-expiry alerts.' },
      { step: 'Receive stock', detail: 'Click "Receive Stock" → enter supplier, batch number, expiry date, quantity, and cost price. Stock is updated immediately.' },
      { step: 'Adjust stock', detail: 'For corrections (damage, theft, counting errors), use "Adjust" on any item. Enter reason and new quantity.' },
      { step: 'Stock taking', detail: 'Go to Stock Taking tab → create a new session → count physical stock → submit. Discrepancies are flagged.' },
      { step: 'Import stock', detail: 'Use the "Stock Import" page to upload a CSV for bulk batch entry.' },
    ],
  },
  {
    id: 'stock_monitoring',
    title: 'Stock Monitoring',
    emoji: '🔔',
    category: 'Pharmacy',
    summary: 'Monitor items below minimum stock threshold — identify what needs to be reordered before you run out.',
    whenWhere: 'Use this every morning or before placing supplier orders. The pharmacy manager should review this daily to catch low-stock items early and prevent stockouts.',
    steps: [
      { step: 'Open Stock Monitoring', detail: 'Go to Pharmacy → Stock Monitoring in the sidebar.' },
      { step: 'Review alerts', detail: 'All items with quantity at or below the minimum stock level are listed with current qty, minimum level, and the gap.' },
      { step: 'Flag for reorder', detail: 'Mark items as "Flagged for Reorder" — this lets you track what you have already actioned.' },
      { step: 'Create PO', detail: 'Use the flagged list to raise a Purchase Order in the Procurement module.' },
    ],
  },
  {
    id: 'barcode_setup',
    title: 'Barcode Setup',
    emoji: '📷',
    category: 'Pharmacy',
    summary: 'Assign barcodes to products and print barcode labels for shelf or packaging use.',
    whenWhere: 'Use when adding new products to the system that do not yet have a barcode assigned, or when you need to print shelf labels for a product batch. Done by pharmacy manager or stock controller — typically a one-time setup per product.',
    steps: [
      { step: 'Search product', detail: 'Find the product you want to assign a barcode to.' },
      { step: 'Assign barcode', detail: 'Enter or scan the barcode value and save it to the product.' },
      { step: 'Print label', detail: 'Click "Print Label" to print the barcode on your label printer. The label includes product name, price, and barcode.' },
      { step: 'Test scan', detail: 'At the Pharmacy POS, switch to the Barcode tab and scan to confirm it resolves to the correct product.' },
    ],
  },
  {
    id: 'pharmacy_work_queue',
    title: 'Pharmacy Work Queue',
    emoji: '✅',
    category: 'Pharmacy',
    summary: "Review doctor prescriptions, verify them, and prepare orders for dispensing.",
    whenWhere: 'Used by the lead pharmacist or verifying pharmacist. Open this after receiving prescriptions from doctors (via EMR or walk-in). Verify each prescription before it is dispensed at POS.',
    steps: [
      { step: 'View queue', detail: 'All new prescriptions sent from the EMR or uploaded manually appear here in Pending status.' },
      { step: 'Verify prescription', detail: 'Review drug name, dose, instructions, and prescriber. Check for drug interactions using the AI check.' },
      { step: 'Approve or flag', detail: 'Approve to mark it ready for dispensing, or flag it with a note to call the prescribing doctor.' },
      { step: 'Dispense', detail: 'Pharmacist at POS can see verified prescriptions linked to the patient and dispense directly.' },
    ],
  },
  {
    id: 'credit_sales',
    title: 'Credit Sales (Institutions)',
    emoji: '🏥',
    category: 'Pharmacy',
    summary: 'Sell on credit to hospitals, corporates, and clinics — track outstanding balances and record payments.',
    whenWhere: 'Use when a hospital, corporate, or clinic has an account with you and pays at month-end instead of at time of sale. The pharmacist selects the institution at POS; the manager reviews accounts and records payments when received.',
    steps: [
      { step: 'Add institution', detail: 'Go to Credit Sale Institutions → Add → enter institution name, type (Hospital/Corporate/Clinic), contact person, credit limit, and payment terms (days).' },
      { step: 'Make a credit sale', detail: "At Pharmacy POS, select the institution as the customer. Choose \"Credit\" as the payment method. The sale is recorded against that institution's account." },
      { step: 'View accounts', detail: 'Go to Credit Sales Accounts → select an institution to see all outstanding invoices, payments made, and current balance.' },
      { step: 'Record payment', detail: 'When payment is received, click "Record Payment" → enter amount, date, method (Cheque/Bank Transfer/Cash), and reference number.' },
      { step: 'Statement', detail: 'Download the account statement showing all transactions, running balance, and overdue amounts.' },
    ],
  },
  {
    id: 'procurement',
    title: 'Procurement',
    emoji: '🛒',
    category: 'Pharmacy',
    summary: 'Manage purchase orders from suppliers — raise POs, receive goods, and update stock automatically.',
    whenWhere: 'Used by pharmacy manager or purchase officer when ordering from suppliers. Raise a PO before the delivery; receive goods against that PO when the delivery arrives. Stock levels update automatically on receipt.',
    steps: [
      { step: 'Add supplier', detail: 'Go to Vendors → Add Vendor → enter supplier name, contact, and payment terms.' },
      { step: 'Raise a PO', detail: 'In Procurement → New Purchase Order → select supplier → add products with quantity and agreed price. Submit the PO.' },
      { step: 'Receive goods', detail: 'When goods arrive, open the PO → click "Receive Goods" → enter actual quantities received, batch numbers, and expiry dates. Stock is updated automatically.' },
      { step: 'Partial receipts', detail: "You can receive a PO in multiple deliveries. Each receipt logs the partial quantities. The PO shows what's still outstanding." },
      { step: 'View transactions', detail: "Goods received are visible in Pharmacy Inventory under the relevant product's batch history." },
    ],
  },
  {
    id: 'queue_mgmt',
    title: 'Queue Management',
    emoji: '🔢',
    category: 'Queue Management',
    summary: 'Manage patient flow with virtual tokens across OPD, Lab, Pharmacy, and Doctor counters.',
    whenWhere: 'Use in busy outpatient departments, labs, or pharmacies where patients wait in line. Reception issues tokens; each counter calls patients from their queue. The Display Board (open on any TV) shows the currently called number.',
    steps: [
      { step: 'Create a counter', detail: 'Click "Add Counter" → set name, type (OPD/Lab/Pharmacy…), code, and token prefix (e.g. A → tokens become A001, A002…).' },
      { step: 'Open Display Board', detail: 'Click "Display Board" to open the full-screen TV view. Place it on a waiting room screen — it updates in real time.' },
      { step: 'Issue a token', detail: "Click \"+ Issue Token\" on any counter. Optionally link a patient and today's appointment. Set priority (Normal/Urgent/Elderly)." },
      { step: 'Call patient', detail: 'In the Waiting column, click "Call". The display board immediately shows that token number.' },
      { step: 'Serve & complete', detail: 'Click "Serving" when the patient arrives, then "Complete" when done. "Skip" moves them to the skipped column for recall.' },
    ],
  },
  {
    id: 'emr',
    title: 'EMR (Electronic Medical Records)',
    emoji: '📋',
    category: 'Clinical',
    summary: 'Document consultations, vitals, diagnoses, prescriptions, and track patient history.',
    whenWhere: 'Used by doctors and nurses during every patient consultation. Open the EMR immediately after a patient is checked in. Document findings, issue prescriptions, and order tests — all linked to the patient record.',
    steps: [
      { step: 'Find patient', detail: 'Search by name or PHN in the left panel. Click the patient to load their full record.' },
      { step: 'Review summary', detail: 'The top bar shows active medications, allergies, chronic conditions, and recent vitals at a glance.' },
      { step: 'Add SOAP note', detail: 'Switch to the SOAP tab → fill in Subjective, Objective, Assessment, Plan. Use AI to auto-generate a draft from voice or typed notes.' },
      { step: 'Record vitals', detail: 'Click "Add Vitals" to log BP, HR, temperature, weight, height, and SpO2.' },
      { step: 'Issue prescription', detail: 'In the Medications tab, add drugs with dosage and instructions. Prescriptions link directly to the Pharmacy work queue.' },
    ],
  },
  {
    id: 'appointments',
    title: 'Appointments',
    emoji: '📅',
    category: 'Clinical',
    summary: 'Book, reschedule, and track patient appointments for all providers and services.',
    whenWhere: 'Used by reception staff to book new appointments and by providers to view their daily schedule. Also used when a patient calls to reschedule or cancel. Open the calendar view at the start of each shift to plan the day.',
    steps: [
      { step: 'Book appointment', detail: 'Click "+ New" → search patient → select provider → choose date and time slot → set appointment type and reason.' },
      { step: 'Check availability', detail: 'The calendar view shows provider availability. Blocked slots appear greyed out based on provider schedules.' },
      { step: 'Update status', detail: 'Mark appointments as Confirmed, Checked-In, In-Progress, Completed, Cancelled, or No-Show as the patient moves through.' },
      { step: 'Send reminders', detail: 'Use the Communications module to send SMS or email reminders to patients about upcoming appointments.' },
    ],
  },
  {
    id: 'lis',
    title: 'Laboratory (LIS)',
    emoji: '🧪',
    category: 'Laboratory',
    summary: 'Full lab information system — order tests, accession samples, enter results, and release reports.',
    whenWhere: 'Used exclusively by lab staff. Order creation happens when a doctor requests a test; specimen accessioning is done at the lab front desk when samples arrive; result entry is done by lab technicians; sign-off is done by the lab pathologist.',
    steps: [
      { step: 'Create order', detail: 'In Orders & Accessioning, click "+ New Order" → select patient → choose tests/panels → print barcode label.' },
      { step: 'Receive specimen', detail: 'Scan or search the accession number → mark specimen as received → log collection time and collector.' },
      { step: 'Enter results', detail: 'In Results, find the order → enter values for each parameter. Abnormal flags auto-apply based on reference ranges.' },
      { step: 'Verify & sign off', detail: 'Lab supervisor verifies each result → signs off → report becomes available for release.' },
      { step: 'Release report', detail: 'In Release Queue, review and approve reports to make them visible to the patient and referring physician.' },
    ],
  },
  {
    id: 'home_care',
    title: 'Home Care Management',
    emoji: '🏠',
    category: 'Home Care',
    summary: 'Manage home nursing and caretaker services — cases, visit scheduling, and daily reports.',
    whenWhere: 'Used by the home care coordinator and nursing staff. Create a case when a patient is enrolled for home services. Use Scheduling to assign nurses to visits. Nurses submit Daily Reports after each visit. Coordinators monitor from the Dashboard.',
    steps: [
      { step: 'Create a case', detail: 'In Home Care Patients → Add Case → link patient, select services required, assign primary nurse.' },
      { step: 'Schedule visits', detail: 'In Scheduling, assign nursing staff to visit dates and times. Staff see their schedule on their profile.' },
      { step: 'Log daily report', detail: 'After each visit, staff submit a Daily Report with activities performed, patient condition, and any concerns.' },
      { step: 'Batch management', detail: 'Group multiple patient referrals into a batch for efficient processing and bulk scheduling.' },
      { step: 'View dashboard', detail: "Home Care Dashboard shows active cases, today's scheduled visits, and staff assignments at a glance." },
    ],
  },
  {
    id: 'home_care_invoicing',
    title: 'Home Care Invoicing & Billing',
    emoji: '🧾',
    category: 'Home Care',
    summary: 'Bill patients for daily home care charges, pharmacy supplies, lab tests, and other services — print 80mm thermal receipts.',
    whenWhere: 'Used at the end of each billing period (weekly or monthly) by the home care billing officer. Create one invoice per patient covering their daily care rate plus any extra services/supplies provided during that period.',
    steps: [
      { step: 'Open module', detail: 'Go to Home Care → Invoicing & Billing from the sidebar.' },
      { step: 'Create invoice', detail: 'Click "New Invoice" → search and select the patient → set the service period (From / To dates — days auto-calculate).' },
      { step: 'Set daily rate & days', detail: 'Enter the agreed daily care rate (e.g. Rs 3,500/day). The system multiplies by the number of days to get the daily subtotal.' },
      { step: 'Add line items', detail: 'After creating, click "Add Items" on the invoice. Add additional charges: Home Services (catheter change, wound dressing…), Pharmacy Supplies, Lab Tests, or Other.' },
      { step: 'Issue & collect payment', detail: 'Click "Issue Invoice" to confirm it. Once payment is received, click "Mark Paid". Status tracks: Draft → Issued → Paid.' },
      { step: 'Print receipt', detail: 'Click "Print" to generate a formatted 80mm thermal receipt showing patient details, service period, daily breakdown, itemized charges, and balance due.' },
    ],
  },
  {
    id: 'dental',
    title: 'Dental Module',
    emoji: '🦷',
    category: 'Dental',
    summary: 'Full dental practice management — encounter documentation, tooth charting, treatment plans, and billing.',
    whenWhere: 'Used by dentists and dental nurses. Open Dental Dashboard at the start of each patient encounter. Document tooth chart and treatment plan during the visit. Bill at the end using Dental Billing.',
    steps: [
      { step: 'Create encounter', detail: 'In Dental Dashboard → New Encounter → select patient and assign to a chair and dentist.' },
      { step: 'Tooth chart', detail: 'Use the interactive tooth chart to mark conditions (cavities, missing, crown, etc.) per tooth.' },
      { step: 'Treatment plan', detail: 'Add planned procedures per tooth. Prioritize and schedule them across multiple visits.' },
      { step: 'Record procedure', detail: 'After performing work, mark procedures as Completed in the treatment plan. Notes and images can be attached.' },
      { step: 'Bill patient', detail: 'Go to Dental Billing → the completed procedures auto-populate the invoice. Apply insurance and process payment.' },
    ],
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    emoji: '🩻',
    category: 'Diagnostics',
    summary: 'Manage radiology, ECG, ultrasound orders and results — order, report, and release.',
    whenWhere: 'Used by radiology technologists and reporting doctors. Technologists receive orders and mark studies as performed; reporting doctors enter findings; supervisors release final reports to the requesting clinician.',
    steps: [
      { step: 'Create order', detail: 'In Orders & Results → New Order → select patient, modality (X-Ray, ECG, Ultrasound…), and body part/indication.' },
      { step: 'Perform study', detail: 'Technologist marks the study as In-Progress. Images or reports are attached to the order.' },
      { step: 'Report results', detail: 'Radiologist/Specialist opens the order → enters findings and impressions → flags critical values if needed.' },
      { step: 'Release report', detail: 'Verified reports move to the Release Queue → supervisor approves → report is available to the referring provider.' },
    ],
  },
  {
    id: 'send_sms',
    title: 'Send SMS / Communications',
    emoji: '📱',
    category: 'Communications',
    summary: 'Send bulk SMS to patients via Dialog eSMS — campaigns, reminders, and notifications.',
    whenWhere: 'Used by the communications officer or front desk manager. Send appointment reminders the day before, health promotion campaigns, or service announcements. Also used for individual patient notifications when needed.',
    steps: [
      { step: 'Configure SMS', detail: 'Go to Platform SMS Settings → enter Dialog eSMS username, password, and sender ID for your organization.' },
      { step: 'Select recipients', detail: 'In Send SMS, choose patient groups by filter (all patients, appointment date, etc.) or manually enter numbers.' },
      { step: 'Write message', detail: 'Type your message (max 160 chars for single SMS). A character counter shows the cost in SMS units.' },
      { step: 'Send & monitor', detail: 'Click Send. Go to SMS Logs to see delivery status, campaign ID, and per-number status updates.' },
    ],
  },
  {
    id: 'shift_handover',
    title: 'Shift Handover Book',
    emoji: '📝',
    category: 'Operations',
    summary: 'Document and hand over important events, tasks, and cash balances between shifts.',
    whenWhere: 'Used at the END of every shift by the outgoing shift-in-charge. The incoming shift reads and acknowledges the log before starting work. Critical for 24-hour facilities and multi-shift pharmacies.',
    steps: [
      { step: 'Start handover entry', detail: 'In Shift Handover Book → New Entry → select your shift (Morning/Evening/Night) and department.' },
      { step: 'Log events', detail: 'Add log items — patient incidents, equipment issues, pending tasks, important communications. Each item has a category and severity.' },
      { step: 'Cash snapshot', detail: 'Record the cash balance at shift end. This links to Daily Close for reconciliation.' },
      { step: 'Submit & notify', detail: 'Submit the handover log. Incoming shift staff can view and acknowledge the log.' },
    ],
  },
  {
    id: 'daily_close',
    title: 'Daily Close',
    emoji: '🔒',
    category: 'Operations',
    summary: 'End-of-day process — reconcile cash, finalize transactions, and close the business day.',
    whenWhere: 'Done ONCE per day by the cashier or manager at the close of business. Always done after the last transaction of the day. Do NOT close the day mid-day — it locks all transactions for that date.',
    steps: [
      { step: 'Review transactions', detail: 'Daily Close shows all sales, payments, and refunds for the day grouped by payment method.' },
      { step: 'Count cash', detail: 'Enter your physical cash count. The system shows expected vs actual and highlights any discrepancy.' },
      { step: 'Reconcile', detail: 'Investigate and note any discrepancies. Attach supporting documents if needed.' },
      { step: 'Close day', detail: 'Click "Close Day" to finalize. Closed days are locked and visible in the Finance Ledger.' },
    ],
  },
  {
    id: 'daily_ops',
    title: 'Daily Operations',
    emoji: '⚡',
    category: 'Operations',
    summary: 'Real-time operational dashboard — track patient flow, active appointments, staff on duty, and department status.',
    whenWhere: 'Used by the operations manager or duty manager throughout the day. Open at the start of each shift to get a real-time picture of the facility. Monitor bottlenecks, check in patients, and handle urgent tasks without switching between modules.',
    steps: [
      { step: 'Overview panel', detail: "Daily Ops shows today's appointments, patients currently checked in, and pending tasks across all departments." },
      { step: 'Patient flow', detail: 'See patients by status: Scheduled → Checked In → In Progress → Completed. Identify bottlenecks in real time.' },
      { step: 'Department status', detail: 'Each department (OPD, Lab, Pharmacy, Radiology) shows current queue depth and average wait time.' },
      { step: 'Quick actions', detail: "From Daily Ops, you can check in patients, open their EMR, assign to a provider, or mark as completed without navigating away." },
    ],
  },
  {
    id: 'hr_payroll',
    title: 'HR & Payroll',
    emoji: '👩‍💼',
    category: 'Operations',
    summary: 'Manage staff profiles, attendance, payroll periods, and salary payments.',
    whenWhere: 'Used by the HR manager and finance officer. Staff directory is maintained continuously; payroll is processed ONCE per month at the end of the pay period. The HR Dashboard is reviewed weekly for attendance and staffing metrics.',
    steps: [
      { step: 'Staff directory', detail: 'Go to Staff Directory → Add Staff → fill in personal details, job title, department, bank details, and contract type.' },
      { step: 'Payroll profile', detail: 'Each staff member has a Payroll Profile with base salary, allowances, and deductions configured.' },
      { step: 'Open payroll period', detail: 'In Payroll → New Period → set the period dates (e.g. March 1–31). The system calculates gross pay for each staff member.' },
      { step: 'Review & adjust', detail: "Review each staff member's payroll line. Adjust for bonuses, leave without pay, or OT. All changes are logged." },
      { step: 'Approve & pay', detail: 'Once reviewed, approve the payroll period. Record payment against each employee to mark them as paid.' },
      { step: 'HR Dashboard', detail: 'The HR Dashboard shows headcount, attendance trends, and payroll cost summaries for the period.' },
    ],
  },
  {
    id: 'bank_statements',
    title: 'Bank Statement Manager',
    emoji: '🏦',
    category: 'Operations',
    summary: 'Upload bank statements, track cash flow, and view financial KPIs from actual bank data.',
    whenWhere: 'Used by the finance manager, typically at the end of each week or month. Upload your bank statement to verify that all payments received (card settlements, bank transfers, credit institution payments) match the system records.',
    steps: [
      { step: 'Upload statement', detail: 'Go to Bank Statements → Upload → select the bank and upload your CSV or Excel statement export.' },
      { step: 'View transactions', detail: 'All transactions are listed with date, description, debit, credit, and running balance. Filter by date range or transaction type.' },
      { step: 'Financial KPIs', detail: 'The dashboard shows total credits, total debits, net cash flow, and opening/closing balances for the selected period.' },
      { step: 'Match to invoices', detail: 'Use the statement data to verify that expected payments (from credit institution accounts, insurance, etc.) have been received.' },
    ],
  },
  {
    id: 'analytics',
    title: 'Sales Analytics & Reports',
    emoji: '📊',
    category: 'Reports',
    summary: 'View revenue trends, pharmacy sales analytics, and management reports across all modules.',
    whenWhere: 'Used by managers and owners to review performance. Sales Analytics is reviewed daily or weekly; Management Reports are reviewed monthly for KPIs; Operations Reports are used when investigating service delivery issues.',
    steps: [
      { step: 'Sales Analytics', detail: 'Shows pharmacy revenue by day/week/month, top-selling products, and payment method breakdown. Filter by date range.' },
      { step: 'Operations Reports', detail: 'Patient flow, appointment utilization, staff activity, and service delivery metrics.' },
      { step: 'Management Reports', detail: 'Executive KPI summaries — revenue vs target, cost of goods, gross margin, and outstanding balances.' },
      { step: 'Export data', detail: 'Most report views have a CSV/Excel export. For full data exports, use Data Export Management (platform admin).' },
    ],
  },
  {
    id: 'admin',
    title: 'Organization Admin',
    emoji: '⚙️',
    category: 'Administration',
    summary: 'Manage your organization — invite staff, assign roles, configure modules, branding, and billing settings.',
    whenWhere: 'Used only by organization administrators (Admin role). Access this when onboarding new staff, changing module settings, updating branding, or configuring pricing. NOT a daily-use screen — only when configuration changes are needed.',
    steps: [
      { step: 'Invite staff', detail: 'Click "Invite User" → enter email and role (User/Admin). Platform owner invites are immediate; org admin invites require platform approval.' },
      { step: 'Assign roles', detail: 'In Role Assignment, select a staff member → toggle roles ON/OFF (Physician, Pharmacist, Lab Tech, etc.).' },
      { step: 'Enable modules', detail: 'In Module Toggles, enable the modules your organization uses (Pharmacy, LIS, Dental, Home Care, Queue Management…).' },
      { step: 'Configure branding', detail: 'In Branding, upload your logo, set colors, and customize the footer text shown on invoices and receipts.' },
      { step: 'Set pricing', detail: 'In Pricing & Catalogs, configure service fees, consultation charges, and tax rules for your organization.' },
    ],
  },
  {
    id: 'digital_signage',
    title: 'Digital Signage',
    emoji: '📺',
    category: 'Digital Signage',
    summary: 'Manage clinic TV screens, playlists, emergency banners, and health education content.',
    whenWhere: 'Used by the marketing/communications team or clinic manager. Set up screens once; then update content and playlists as needed. Emergency banners are used by management to broadcast urgent messages to all screens instantly.',
    steps: [
      { step: 'Enable the module', detail: 'Go to Organization Admin → Module Toggles → enable "Digital Signage".' },
      { step: 'Create a Screen', detail: 'Go to Digital Signage → Screens → Add Screen. Set the name, clinic, location type, orientation, and theme.' },
      { step: 'Build a Playlist', detail: 'Go to Playlists → New Playlist. Add content items from the Content Library. Set display duration per slide.' },
      { step: 'Assign Playlist to Screen', detail: 'Edit the screen → Assign Playlist → select the playlist you built.' },
      { step: 'Get the Player URL', detail: 'On the Screens page, click "Copy URL". Open this on your TV or Raspberry Pi browser in kiosk mode.' },
      { step: 'Raspberry Pi kiosk', detail: "Edit /etc/xdg/lxsession/LXDE-pi/autostart → add: @chromium-browser --noerrdialogs --disable-infobars --kiosk \"YOUR_PLAYER_URL\". Reboot the Pi." },
      { step: 'Emergency Banners', detail: 'Go to Emergency Banners → New Banner. Activate it — it overlays ALL screens within 60 seconds.' },
    ],
  },
  {
    id: 'wholesale',
    title: 'Wholesale Pharma',
    emoji: '🏭',
    category: 'Wholesale',
    summary: 'B2B pharmaceutical wholesale — suppliers manage catalogs and orders; buyers browse and purchase from the marketplace.',
    whenWhere: 'Wholesale suppliers use "My Supplier Portal" to manage their product catalog and process incoming orders. Retail pharmacy buyers use the "Marketplace" to browse suppliers and place orders. Platform Admin manages supplier approvals.',
    steps: [
      { step: 'Platform Admin setup', detail: 'Platform Admin → Wholesale Platform Admin → approve wholesale providers and link retail pharmacies to suppliers.' },
      { step: 'Supplier: manage catalog', detail: 'As a supplier, go to My Supplier Portal → Products → add your wholesale products with SKU, unit price, MRP, and package options.' },
      { step: 'Supplier: process orders', detail: 'Incoming orders appear in My Supplier Portal → Orders. Review, confirm, and mark as dispatched.' },
      { step: 'Buyer: browse marketplace', detail: "Go to Wholesale → Marketplace → browse connected suppliers' catalogs." },
      { step: 'Buyer: place order', detail: 'Add items to cart → confirm quantities → submit order. The supplier is notified immediately.' },
      { step: 'Buyer: track order', detail: 'In Marketplace → My Orders, track order status from Pending → Confirmed → Dispatched → Delivered.' },
    ],
  },
  {
    id: 'telemedicine',
    title: 'Telemedicine',
    emoji: '📹',
    category: 'Telemedicine',
    summary: 'Virtual consultations — schedule and conduct video calls with patients, manage prescriptions, and bill online.',
    whenWhere: 'Used when patients cannot visit in person — overseas patients, mobility-limited patients, or routine follow-ups. Doctors use the Provider Portal during the consultation; patients use the Patient Portal to book and attend. Suitable for GP consultations, specialist follow-ups, and second opinions.',
    steps: [
      { step: 'Enable telemedicine', detail: 'Go to Organization Admin → Module Toggles → enable Telemedicine.' },
      { step: 'Set up doctors', detail: 'Go to Telemedicine → Doctors → Add Doctor. Set availability hours, consultation fee, and speciality.' },
      { step: 'Patient books appointment', detail: 'Patients access the Patient Portal → select a doctor → choose a time slot → complete payment.' },
      { step: 'Start consultation', detail: 'At the appointment time, both doctor and patient click the video link. Powered by Whereby — works in browser, no install needed.' },
      { step: 'Clinical documentation', detail: 'Doctor adds a SOAP note, prescription, and lab orders directly in the Provider Portal.' },
      { step: 'Billing', detail: 'Billing is auto-processed at booking. Go to Telemedicine Billing to view revenue.' },
    ],
  },
  {
    id: 'ai_assistant',
    title: 'AI Assistant',
    emoji: '🤖',
    category: 'AI Tools',
    summary: 'AI-powered tools — analyze lab reports, generate SOAP notes, summarize documents, and extract structured data.',
    whenWhere: 'Used by doctors for SOAP note generation and document analysis. Used by managers for smart insights on reports. The AI Content Creator in Digital Signage is used by marketing staff. Available to all staff for general clinical and operational queries.',
    steps: [
      { step: 'Open AI Assistant', detail: 'Click "AI Assistant" in the sidebar for a general-purpose AI chat for clinical and operational queries.' },
      { step: 'Document analysis', detail: 'Upload a PDF (lab report, referral letter, discharge summary) → the AI extracts key clinical findings and summarizes them.' },
      { step: 'SOAP note generation', detail: 'In EMR → SOAP Notes tab, click "AI Generate" → paste or dictate the consultation summary → formatted into a proper SOAP note.' },
      { step: 'Smart insights', detail: 'On reports and dashboards, look for the "AI Insights" button — it analyzes current data and surfaces trends and anomalies.' },
    ],
  },
  {
    id: 'helpdesk',
    title: 'Help Desk',
    emoji: '🎫',
    category: 'Support',
    summary: 'Submit IT support tickets, view knowledge base articles, and get remote assistance.',
    whenWhere: 'Used by any staff member who encounters a technical issue, needs training guidance, or wants to report a bug. Before calling IT, search the Knowledge Base — most common issues have step-by-step answers already documented.',
    steps: [
      { step: 'Create a ticket', detail: 'Go to Help Desk → New Ticket → select category (Technical / Billing / Training / Other) → describe the issue.' },
      { step: 'Track status', detail: "Your ticket appears in My Tickets with status: Open → In Progress → Resolved. You'll see agent replies in the ticket thread." },
      { step: 'Knowledge Base', detail: 'Search the Knowledge Base before raising a ticket. Many common issues have step-by-step articles.' },
      { step: 'Remote support', detail: "If the agent needs to see your screen, they'll share a HopToDesk session code. Install HopToDesk on your PC and enter the code." },
    ],
  },
  {
    id: 'platform_admin',
    title: 'Platform Administration',
    emoji: '🌐',
    category: 'Platform (Owner Only)',
    summary: 'Platform-level control — manage all organizations, users, billing, security, and global module availability.',
    whenWhere: 'ONLY for the platform owner (super admin). Used when onboarding a new organization, approving user access, managing global module availability, or reviewing platform-wide security and audit logs. Not accessible to regular org staff.',
    steps: [
      { step: 'Platform Setup', detail: 'Create new organizations and companies. Each organization gets its own data, branding, and module set.' },
      { step: 'User Approvals', detail: 'Review and approve pending user access requests. Two-level approval: org admin first, then platform owner.' },
      { step: 'Global Module Control', detail: 'In Module Toggles, turn modules ON globally to make them available to all organizations.' },
      { step: 'Security & Audit', detail: 'Review audit logs, break-glass events, and run security validation checks from Security & Compliance.' },
      { step: 'Platform Billing', detail: 'Manage subscription billing and usage logs for all organizations on the platform.' },
    ],
  },
  {
    id: 'platform_telephony_config',
    title: 'Platform Telephony Config',
    emoji: '☎️',
    category: 'Platform (Owner Only)',
    summary: 'Platform-level telephony — configure the master 3CX account that all organizations can use.',
    whenWhere: 'ONLY for the platform owner. Configure ONCE during initial setup. Used again only when changing SIP providers, adding new master DIDs, or troubleshooting telephony sync issues.',
    steps: [
      { step: 'Set up master 3CX', detail: 'Enter your 3CX tenant ID, base URL, and API credentials (Client ID and Secret).' },
      { step: 'Configure SIP provider', detail: 'Select your SIP provider (Dialog, Telnyx, Twilio, etc.) and enter trunk credentials.' },
      { step: 'Provision tenant', detail: 'Click "Provision Master Tenant" to initialize the 3CX master account. This happens once during setup.' },
      { step: 'Sync extensions', detail: 'Click "Sync Extensions" to pull all extensions from the master 3CX into the platform database.' },
      { step: 'Monitor sync', detail: 'Use "Sync Queues & IVRs" and "Pull Call Logs" to keep platform data in sync with the 3CX master.' },
    ],
  },
  {
    id: 'org_telephony_settings',
    title: 'Organization Telephony',
    emoji: '📞',
    category: 'Telephony',
    summary: 'Organization-level telephony — configure DIDs, extensions, call queues, and IVR menus.',
    whenWhere: 'Used by the org admin during initial telephony setup. Once configured, extensions and queues are managed on an as-needed basis (e.g. when a new staff member joins). Call Logs and Fax Inbox are reviewed daily by the front desk or reception.',
    steps: [
      { step: 'Choose account mode', detail: "Toggle \"Use Master Account\" ON to use the platform's shared 3CX, or OFF to bring your own PBX." },
      { step: 'Add DIDs', detail: 'Add phone numbers this organization uses. Set a label and choose the default inbound route.' },
      { step: 'Create extensions', detail: "Go to Telephony > Extensions → add softphone extensions for staff. Each gets a number (e.g., 101, 102)." },
      { step: 'Set up call queues', detail: "In Telephony > Call Queues, create inbound queues (e.g., Reception, Support). Choose ring strategy." },
      { step: 'Build IVR menu', detail: "In Telephony > IVR Menus, create automated attendants (e.g., press 1 for Reception, 2 for Support)." },
      { step: 'View call logs & fax', detail: "In Telephony > Call Logs, see all call history. In Fax Inbox, receive and manage incoming faxes." },
    ],
  },
];

const categories = [...new Set(modules.map(m => m.category))];

export default function AppGuide() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = modules.filter(m => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.summary.toLowerCase().includes(search.toLowerCase()) ||
      m.whenWhere?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || m.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors"
        title="View complete app guide"
      >
        <Info className="w-4 h-4" />
        How To Guide
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="fixed inset-x-3 top-6 bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-2xl flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold">Horizon ClinicSuite — Module Guide</h2>
                  <p className="text-teal-200 text-sm mt-0.5">When, where & how to use every module</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pt-4 pb-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by module name, role, or use-case…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setExpanded(null); }}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Category pills */}
              <div className="px-4 pb-3 flex gap-2 flex-wrap flex-shrink-0">
                {['All', ...categories].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setExpanded(null); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Module list */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">No modules match your search.</div>
                )}
                {filtered.map(mod => (
                  <div key={mod.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpanded(expanded === mod.id ? null : mod.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-2xl w-8 flex-shrink-0">{mod.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{mod.title}</span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline">{mod.category}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{mod.summary}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${expanded === mod.id ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded === mod.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-4">

                            {/* When & Where section */}
                            {mod.whenWhere && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                                <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">When &amp; Where to Use</p>
                                  <p className="text-sm text-amber-900">{mod.whenWhere}</p>
                                </div>
                              </div>
                            )}

                            {/* Steps */}
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">How to Operate</p>
                              {mod.steps.map((s, i) => (
                                <div key={i} className="flex gap-3">
                                  <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <div>
                                    <span className="text-sm font-semibold text-slate-700">{s.step} — </span>
                                    <span className="text-sm text-slate-600">{s.detail}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 border-t text-center flex-shrink-0">
                <p className="text-xs text-slate-400">{modules.length} modules covered · Click any module to expand</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}