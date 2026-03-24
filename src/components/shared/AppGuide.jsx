import React, { useState } from 'react';
import { Info, X, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const modules = [
  {
    id: 'new_sale',
    title: 'New Sale',
    emoji: '🛒',
    category: 'Quick Access',
    summary: 'Unified POS — sell pharmacy, GP, specialist, radiology, and home care services all in one place.',
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
    title: 'Patient Hub',
    emoji: '👥',
    category: 'Quick Access',
    summary: 'Central patient search — find any patient and jump to their profile, EMR, Pharmacy, or Home Care records.',
    steps: [
      { step: 'Search', detail: 'Type the patient\'s name, PHN, phone, or NIC in the search bar. Results filter as you type.' },
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
    steps: [
      { step: 'View stock', detail: 'All products listed with quantity, batch, expiry, and unit price. Filter by low stock or near-expiry alerts.' },
      { step: 'Receive stock', detail: 'Click "Receive Stock" → enter supplier, batch number, expiry date, quantity, and cost price. Stock is updated immediately.' },
      { step: 'Adjust stock', detail: 'For corrections (damage, theft, counting errors), use "Adjust" on any item. Enter reason and new quantity.' },
      { step: 'Stock taking', detail: 'Go to Stock Taking tab → create a new session → count physical stock → submit. Discrepancies are flagged.' },
      { step: 'Import stock', detail: 'Use the "Stock Import" page to upload a CSV for bulk batch entry.' },
    ],
  },
  {
    id: 'queue_mgmt',
    title: 'Queue Management',
    emoji: '🔢',
    category: 'Queue Management',
    summary: 'Manage patient flow with virtual tokens across OPD, Lab, Pharmacy, and Doctor counters.',
    steps: [
      { step: 'Create a counter', detail: 'Click "Add Counter" → set name, type (OPD/Lab/Pharmacy…), code, and token prefix (e.g. A → tokens become A001, A002…).' },
      { step: 'Open Display Board', detail: 'Click "Display Board" to open the full-screen TV view. Place it on a waiting room screen — it updates in real time.' },
      { step: 'Issue a token', detail: 'Click "+ Issue Token" on any counter. Optionally link a patient and today\'s appointment. Set priority (Normal/Urgent/Elderly).' },
      { step: 'Call patient', detail: 'In the Waiting column, click "Call". The display board immediately shows that token number.' },
      { step: 'Serve & complete', detail: 'Click "Serving" when the patient arrives, then "Complete" when done. "Skip" moves them to the skipped column for recall.' },
    ],
  },
  {
    id: 'emr',
    title: 'EMR',
    emoji: '📋',
    category: 'Clinical',
    summary: 'Electronic Medical Records — document consultations, vitals, diagnoses, prescriptions, and track patient history.',
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
    title: 'Home Care',
    emoji: '🏠',
    category: 'Home Care',
    summary: 'Manage home nursing and caretaker services — cases, visit scheduling, and daily reports.',
    steps: [
      { step: 'Create a case', detail: 'In Home Care Patients → Add Case → link patient, select services required, assign primary nurse.' },
      { step: 'Schedule visits', detail: 'In Scheduling, assign nursing staff to visit dates and times. Staff see their schedule on their profile.' },
      { step: 'Log daily report', detail: 'After each visit, staff submit a Daily Report with activities performed, patient condition, and any concerns.' },
      { step: 'Batch management', detail: 'Group multiple patient referrals into a batch for efficient processing and bulk scheduling.' },
      { step: 'View dashboard', detail: 'Home Care Dashboard shows active cases, today\'s scheduled visits, and staff assignments at a glance.' },
    ],
  },
  {
    id: 'dental',
    title: 'Dental Module',
    emoji: '🦷',
    category: 'Dental',
    summary: 'Full dental practice management — encounter documentation, tooth charting, treatment plans, and billing.',
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
    steps: [
      { step: 'Create order', detail: 'In Orders & Results → New Order → select patient, modality (X-Ray, ECG, Ultrasound…), and body part/indication.' },
      { step: 'Perform study', detail: 'Technologist marks the study as In-Progress. Images or reports are attached to the order.' },
      { step: 'Report results', detail: 'Radiologist/Specialist opens the order → enters findings and impressions → flags critical values if needed.' },
      { step: 'Release report', detail: 'Verified reports move to the Release Queue → supervisor approves → report is available to the referring provider.' },
    ],
  },
  {
    id: 'send_sms',
    title: 'Send SMS',
    emoji: '📱',
    category: 'Communications',
    summary: 'Send bulk SMS to patients via Dialog eSMS — campaigns, reminders, and notifications.',
    steps: [
      { step: 'Configure SMS', detail: 'Go to Platform SMS Settings → enter Dialog eSMS username, password, and sender ID for your organization.' },
      { step: 'Select recipients', detail: 'In Send SMS, choose patient groups by filter (all patients, appointment date, etc.) or manually enter numbers.' },
      { step: 'Write message', detail: 'Type your message (max 160 chars for single SMS). A character counter shows the cost in SMS units.' },
      { step: 'Send & monitor', detail: 'Click Send. Go to SMS Logs to see delivery status, campaign ID, and per-number status updates.' },
    ],
  },
  {
    id: 'shift_handover',
    title: 'Shift Handover',
    emoji: '📝',
    category: 'Operations',
    summary: 'Document and hand over important events, tasks, and cash balances between shifts.',
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
    steps: [
      { step: 'Review transactions', detail: 'Daily Close shows all sales, payments, and refunds for the day grouped by payment method.' },
      { step: 'Count cash', detail: 'Enter your physical cash count. The system shows expected vs actual and highlights any discrepancy.' },
      { step: 'Reconcile', detail: 'Investigate and note any discrepancies. Attach supporting documents if needed.' },
      { step: 'Close day', detail: 'Click "Close Day" to finalize. Closed days are locked and visible in the Finance Ledger.' },
    ],
  },
  {
    id: 'admin',
    title: 'Organization Admin',
    emoji: '⚙️',
    category: 'Administration',
    summary: 'Manage your organization — invite staff, assign roles, configure modules, branding, and billing settings.',
    steps: [
      { step: 'Invite staff', detail: 'Click "Invite User" → enter email and role (User/Admin). Platform owner invites are immediate; org admin invites require platform approval.' },
      { step: 'Assign roles', detail: 'In Role Assignment, select a staff member → toggle roles ON/OFF (Physician, Pharmacist, Lab Tech, etc.).' },
      { step: 'Enable modules', detail: 'In Module Toggles, enable the modules your organization uses (Pharmacy, LIS, Dental, Home Care, Queue Management…).' },
      { step: 'Configure branding', detail: 'In Branding, upload your logo, set colors, and customize the footer text shown on invoices and receipts.' },
      { step: 'Set pricing', detail: 'In Pricing & Catalogs, configure service fees, consultation charges, and tax rules for your organization.' },
    ],
  },
  {
    id: 'analytics',
    title: 'Sales Analytics & Reports',
    emoji: '📊',
    category: 'Reports',
    summary: 'View revenue trends, pharmacy sales analytics, and management reports across all modules.',
    steps: [
      { step: 'Sales Analytics', detail: 'Shows pharmacy revenue by day/week/month, top-selling products, and payment method breakdown. Filter by date range.' },
      { step: 'Operations Reports', detail: 'Patient flow, appointment utilization, staff activity, and service delivery metrics.' },
      { step: 'Management Reports', detail: 'Executive KPI summaries — revenue vs target, cost of goods, gross margin, and outstanding balances.' },
      { step: 'Export data', detail: 'Most report views have a CSV/Excel export. For full data exports, use Data Export Management (platform admin).' },
    ],
  },
  {
    id: 'platform_admin',
    title: 'Platform Administration',
    emoji: '🌐',
    category: 'Platform (Owner Only)',
    summary: 'Platform-level control — manage all organizations, users, billing, security, and global module availability.',
    steps: [
      { step: 'Platform Setup', detail: 'Create new organizations and companies. Each organization gets its own data, branding, and module set.' },
      { step: 'User Approvals', detail: 'Review and approve pending user access requests from org admins. Two-level approval: org admin first, then platform owner.' },
      { step: 'Global Module Control', detail: 'In Module Toggles, turn modules ON globally to make them available to all organizations.' },
      { step: 'Security & Audit', detail: 'Review audit logs, break-glass events, and run security validation checks from Security & Compliance.' },
      { step: 'Platform Billing', detail: 'Manage subscription billing and usage logs for all organizations on the platform.' },
    ],
  },
  {
    id: 'digital_signage',
    title: 'Digital Signage',
    emoji: '📺',
    category: 'Digital Signage',
    summary: 'Manage clinic TV screens, playlists, emergency banners, and health education content. Supports Raspberry Pi kiosk displays.',
    steps: [
      { step: 'Enable the module', detail: 'Go to Organization Admin → Module Toggles → enable "Digital Signage". The Signage section will appear in the sidebar.' },
      { step: 'Create a Screen', detail: 'Go to Digital Signage → Screens → Add Screen. Set the name, clinic, location type (Waiting Room, Reception…), orientation (Landscape or Portrait), and theme. A unique Screen Key is auto-generated.' },
      { step: 'Build a Playlist', detail: 'Go to Playlists → New Playlist. Add content items from the Content Library. Set display duration per slide. Enable "Health Education Mode" to show only approved patient education content.' },
      { step: 'Assign Playlist to Screen', detail: 'Edit the screen → Assign Playlist → select the playlist you built. The screen will start showing that playlist immediately.' },
      { step: 'Get the Player URL', detail: 'On the Screens page, click "Copy URL" next to the screen. This is the URL to open on your TV or Raspberry Pi. It runs in a full-screen browser with no login required.' },
      { step: 'Set up Raspberry Pi (Kiosk Mode)', detail: 'Install Raspberry Pi OS → open Terminal → install Chromium: sudo apt install chromium-browser. Then set it to auto-open in kiosk mode on boot. See the "Raspberry Pi Setup" guide step below.' },
      { step: 'Raspberry Pi — Auto-start kiosk', detail: 'Edit /etc/xdg/lxsession/LXDE-pi/autostart → add: @chromium-browser --noerrdialogs --disable-infobars --kiosk "YOUR_PLAYER_URL". Replace YOUR_PLAYER_URL with the URL copied from the Screens page. Reboot the Pi — Chromium will open full-screen to your signage.' },
      { step: 'Raspberry Pi — Prevent screen sleep', detail: 'In the same autostart file, also add: @xset s off   @xset -dpms   @xset s noblank. This keeps the screen on 24/7.' },
      { step: 'Emergency Banners', detail: 'Go to Emergency Banners → New Banner. Set the title, message, and severity (Info / Warning / Urgent). Activate it — it will overlay on ALL screens within 60 seconds automatically.' },
      { step: 'Remote Refresh', detail: 'On the Screens page, click the "Refresh" button next to any screen. The player on that screen will reload its content within 60 seconds without anyone touching the TV or Pi.' },
      { step: 'Monitor heartbeat', detail: 'The Dashboard shows Online (green) if the screen checked in within the last 5 minutes, Offline (red) if not. If a screen goes offline, check that the Pi has internet and the browser is still running.' },
    ],
  },
  {
    id: 'home_care_invoicing',
    title: 'Home Care Invoicing & Billing',
    emoji: '🧾',
    category: 'Home Care',
    summary: 'Bill patients for daily home care charges, pharmacy supplies, lab tests, and other services — print 80mm thermal receipts.',
    steps: [
      { step: 'Open module', detail: 'Go to Home Care → Invoicing & Billing from the sidebar.' },
      { step: 'Create invoice', detail: 'Click "New Invoice" → search and select the patient → set the service period (From / To dates — days auto-calculate).' },
      { step: 'Set daily rate & days', detail: 'Enter the agreed daily care rate (e.g. Rs 3,500/day). The system multiplies by the number of days to get the daily subtotal.' },
      { step: 'Add line items', detail: 'After creating, click "Add Items" on the invoice. Add additional charges: Home Services (catheter change, wound dressing…), Pharmacy Supplies, Lab Tests, or Other. Quick-tap buttons for common services.' },
      { step: 'Issue & collect payment', detail: 'Click "Issue Invoice" to confirm it. Once payment is received, click "Mark Paid". Status tracks: Draft → Issued → Paid.' },
      { step: 'Print receipt', detail: 'Click "Print" to generate a formatted 80mm thermal receipt showing patient details, service period, daily breakdown, itemized charges, and balance due.' },
    ],
  },
  {
    id: 'credit_sales',
    title: 'Credit Sales (Institutions)',
    emoji: '🏥',
    category: 'Pharmacy',
    summary: 'Sell on credit to hospitals, corporates, and clinics — track outstanding balances and record payments.',
    steps: [
      { step: 'Add institution', detail: 'Go to Credit Sale Institutions → Add → enter institution name, type (Hospital/Corporate/Clinic), contact person, credit limit, and payment terms (days).' },
      { step: 'Make a credit sale', detail: 'At Pharmacy POS, select the institution as the customer. Choose "Credit" as the payment method. The sale is recorded against that institution\'s account.' },
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
    steps: [
      { step: 'Add supplier', detail: 'Go to Vendors → Add Vendor → enter supplier name, contact, and payment terms.' },
      { step: 'Raise a PO', detail: 'In Procurement → New Purchase Order → select supplier → add products with quantity and agreed price. Submit the PO.' },
      { step: 'Receive goods', detail: 'When goods arrive, open the PO → click "Receive Goods" → enter actual quantities received, batch numbers, and expiry dates. Stock is updated automatically.' },
      { step: 'Partial receipts', detail: 'You can receive a PO in multiple deliveries. Each receipt logs the partial quantities. The PO shows what\'s still outstanding.' },
      { step: 'View transactions', detail: 'Goods received are visible in Pharmacy Inventory under the relevant product\'s batch history.' },
    ],
  },
  {
    id: 'hr_payroll',
    title: 'HR & Payroll',
    emoji: '👩‍💼',
    category: 'Operations',
    summary: 'Manage staff profiles, attendance, payroll periods, and salary payments.',
    steps: [
      { step: 'Staff directory', detail: 'Go to Staff Directory → Add Staff → fill in personal details, job title, department, bank details, and contract type.' },
      { step: 'Payroll profile', detail: 'Each staff member has a Payroll Profile with base salary, allowances, and deductions configured.' },
      { step: 'Open payroll period', detail: 'In Payroll → New Period → set the period dates (e.g. March 1–31). The system calculates gross pay for each staff member.' },
      { step: 'Review & adjust', detail: 'Review each staff member\'s payroll line. Adjust for bonuses, leave without pay, or OT. All changes are logged.' },
      { step: 'Approve & pay', detail: 'Once reviewed, approve the payroll period. Record payment against each employee to mark them as paid.' },
      { step: 'HR Dashboard', detail: 'The HR Dashboard shows headcount, attendance trends, and payroll cost summaries for the period.' },
    ],
  },
  {
    id: 'wholesale',
    title: 'Wholesale Pharma',
    emoji: '🏭',
    category: 'Wholesale',
    summary: 'B2B pharmaceutical wholesale — suppliers manage catalogs and orders; buyers browse and purchase from the marketplace.',
    steps: [
      { step: 'Platform Admin setup', detail: 'Platform Admin → Wholesale Platform Admin → approve wholesale providers and link retail pharmacies to suppliers.' },
      { step: 'Supplier: manage catalog', detail: 'As a supplier, go to My Supplier Portal → Products → add your wholesale products with SKU, unit price, MRP, and package options.' },
      { step: 'Supplier: process orders', detail: 'Incoming orders appear in My Supplier Portal → Orders. Review, confirm, and mark as dispatched.' },
      { step: 'Buyer: browse marketplace', detail: 'Go to Wholesale → Marketplace → browse connected suppliers\' catalogs. Filter by category, brand, or product name.' },
      { step: 'Buyer: place order', detail: 'Add items to cart → confirm quantities → submit order. The supplier is notified immediately.' },
      { step: 'Buyer: track order', detail: 'In Marketplace → My Orders, track order status from Pending → Confirmed → Dispatched → Delivered.' },
      { step: 'Credit accounts', detail: 'Suppliers can set up credit accounts for trusted buyers with credit limits and payment terms.' },
    ],
  },
  {
    id: 'telemedicine',
    title: 'Telemedicine',
    emoji: '📹',
    category: 'Telemedicine',
    summary: 'Virtual consultations — schedule and conduct video calls with patients, manage prescriptions, and bill online.',
    steps: [
      { step: 'Enable telemedicine', detail: 'Go to Organization Admin → Module Toggles → enable Telemedicine. For virtual hospitals (no physical location), also enable Virtual Hospital mode.' },
      { step: 'Set up doctors', detail: 'Go to Telemedicine → Doctors → Add Doctor. Set availability hours, consultation fee, and speciality.' },
      { step: 'Patient books appointment', detail: 'Patients access the Patient Portal → select a doctor → choose a time slot → complete payment. An OTP login is used for patient authentication.' },
      { step: 'Start consultation', detail: 'At the appointment time, both doctor and patient click the video link. Powered by Whereby — no software install needed, works in browser.' },
      { step: 'Clinical documentation', detail: 'During/after the call, the doctor adds a SOAP note, prescription, and lab orders directly in the Provider Portal.' },
      { step: 'Billing', detail: 'Telemedicine billing is auto-processed at booking. Go to Telemedicine Billing to view revenue and manage refunds.' },
    ],
  },
  {
    id: 'ai_assistant',
    title: 'AI Assistant',
    emoji: '🤖',
    category: 'AI Tools',
    summary: 'AI-powered tools — analyze lab reports, generate SOAP notes, summarize documents, and extract structured data.',
    steps: [
      { step: 'Open AI Assistant', detail: 'Click "AI Assistant" in the sidebar. This is a general-purpose AI chat interface for clinical and operational queries.' },
      { step: 'Document analysis', detail: 'Upload a PDF (lab report, referral letter, discharge summary) → the AI extracts key clinical findings and summarizes them.' },
      { step: 'SOAP note generation', detail: 'In EMR → SOAP Notes tab, click "AI Generate" → paste or dictate the consultation summary → the AI formats it into a proper SOAP note.' },
      { step: 'Smart insights', detail: 'On reports and dashboards, look for the "AI Insights" button — it analyzes current data and surfaces trends and anomalies.' },
      { step: 'Signage content creation', detail: 'In Digital Signage → AI Content Creator, paste raw health info → AI converts it into formatted clinic signboard text with layout suggestions.' },
    ],
  },
  {
    id: 'helpdesk',
    title: 'Help Desk',
    emoji: '🎫',
    category: 'Support',
    summary: 'Submit IT support tickets, view knowledge base articles, and get remote assistance.',
    steps: [
      { step: 'Create a ticket', detail: 'Go to Help Desk → New Ticket → select category (Technical / Billing / Training / Other) → describe the issue. Attach screenshots if needed.' },
      { step: 'Track status', detail: 'Your ticket appears in My Tickets with status: Open → In Progress → Resolved. You\'ll see agent replies in the ticket thread.' },
      { step: 'Knowledge Base', detail: 'Before raising a ticket, search the Knowledge Base. Many common issues have step-by-step articles already available.' },
      { step: 'Remote support', detail: 'If the agent needs to see your screen, they\'ll share a HopToDesk session code. Install HopToDesk on your PC and enter the code to allow the agent to connect.' },
      { step: 'Screenshots', detail: 'You can upload screenshots directly in the ticket chat. This helps agents diagnose UI or data issues faster.' },
    ],
  },
  {
    id: 'bank_statements',
    title: 'Bank Statement Manager',
    emoji: '🏦',
    category: 'Operations',
    summary: 'Upload bank statements, track cash flow, and view financial KPIs from actual bank data.',
    steps: [
      { step: 'Upload statement', detail: 'Go to Bank Statements → Upload → select the bank and upload your CSV or Excel statement export.' },
      { step: 'View transactions', detail: 'All transactions are listed with date, description, debit, credit, and running balance. Filter by date range or transaction type.' },
      { step: 'Financial KPIs', detail: 'The dashboard shows total credits, total debits, net cash flow, and opening/closing balances for the selected period.' },
      { step: 'Match to invoices', detail: 'Use the statement data to verify that expected payments (from credit institution accounts, insurance, etc.) have been received.' },
    ],
  },
  {
    id: 'daily_ops',
    title: 'Daily Operations',
    emoji: '⚡',
    category: 'Operations',
    summary: 'Real-time operational dashboard — track patient flow, active appointments, staff on duty, and department status.',
    steps: [
      { step: 'Overview panel', detail: 'Daily Ops shows today\'s appointments, patients currently checked in, and pending tasks across all departments.' },
      { step: 'Patient flow', detail: 'See patients by status: Scheduled → Checked In → In Progress → Completed. Identify bottlenecks in real time.' },
      { step: 'Department status', detail: 'Each department (OPD, Lab, Pharmacy, Radiology) shows current queue depth and average wait time.' },
      { step: 'Quick actions', detail: 'From Daily Ops, you can check in patients, open their EMR, assign to a provider, or mark as completed without navigating away.' },
    ],
  },
  {
    id: 'platform_telephony_config',
    title: 'Platform Telephony Config',
    emoji: '☎️',
    category: 'Platform (Owner Only)',
    summary: 'Platform-level telephony — configure the master 3CX account that all organizations can use or manage DIDs and SIP trunks.',
    steps: [
      { step: 'Set up master 3CX', detail: 'Enter your 3CX tenant ID, base URL, and API credentials (Client ID and Secret). These are used by all organizations that choose the master account.' },
      { step: 'Configure SIP provider', detail: 'Select your SIP provider (Dialog, Telnyx, Twilio, etc.) and enter trunk credentials. This handles inbound/outbound calling for all orgs.' },
      { step: 'Provision tenant', detail: 'Click "Provision Master Tenant" to initialize the 3CX master account with the platform. This happens once during setup.' },
      { step: 'Sync extensions', detail: 'After provisioning, click "Sync Extensions" to pull all extensions from the master 3CX into the platform database.' },
      { step: 'Manage master DIDs', detail: 'Add DIDs at the platform level that can be allocated to organizations. Each DID is tied to this master account.' },
      { step: 'Monitor sync', detail: 'Use "Sync Queues & IVRs" and "Pull Call Logs" to keep platform data in sync with the 3CX master.' },
    ],
  },
  {
    id: 'org_telephony_settings',
    title: 'Organization Telephony Settings',
    emoji: '📞',
    category: 'Telephony',
    summary: 'Organization-level telephony — choose to use the platform master account or bring your own PBX, then configure DIDs, extensions, queues, and IVR.',
    steps: [
      { step: 'Choose account mode', detail: 'Toggle "Use Master Account" ON if you want to use the platform\'s shared 3CX. Toggle OFF if you bring your own PBX system.' },
      { step: 'If using master account', detail: 'No PBX credentials needed. The platform handles all backend 3CX management. You just configure what happens with calls.' },
      { step: 'If using own PBX', detail: 'Enter your PBX credentials (3CX tenant ID, base URL, API client ID, and secret) for your isolated system.' },
      { step: 'Add DIDs', detail: 'Add phone numbers this organization uses. Set a label (e.g., "Reception"), and choose the default inbound route (queue/IVR/extension).' },
      { step: 'Create extensions', detail: 'Go to "Telephony > Extensions" → add softphone extensions for staff. Each gets a number (e.g., 101, 102) and is assigned to a staff member.' },
      { step: 'Set up call queues', detail: 'In "Telephony > Call Queues", create inbound queues (e.g., Reception, Support). Assign extensions to each queue and choose the ring strategy (ring all / hunt / round robin).' },
      { step: 'Build IVR menu', detail: 'In "Telephony > IVR Menus", create automated attendants with digit options (e.g., press 1 for Reception, 2 for Support). Map each digit to a queue or extension.' },
      { step: 'View call logs', detail: 'In "Telephony > Call Logs", see all inbound/outbound call history. Filter by date, caller, or extension. Track call duration and disposition.' },
      { step: 'Manage fax', detail: 'In "Telephony > Fax Inbox", receive and manage incoming faxes. Triage, assign, and archive fax documents.' },
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
      m.summary.toLowerCase().includes(search.toLowerCase());
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
                  <h2 className="text-xl font-bold">Horizon ClinicSuite — Full App Guide</h2>
                  <p className="text-teal-200 text-sm mt-0.5">Step-by-step guide for every module</p>
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
                    placeholder="Search modules…"
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
                          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                            <p className="text-xs text-slate-600 mb-3">{mod.summary}</p>
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 border-t text-center flex-shrink-0">
                <button onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-700 underline">
                  Close guide
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}