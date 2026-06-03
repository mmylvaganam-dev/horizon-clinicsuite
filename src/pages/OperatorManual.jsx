import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen, Video, Search, ChevronDown, ChevronRight,
  ShoppingBag, Users, TestTube, Activity, FileText,
  Settings, Globe, DollarSign, Calendar, MessageSquare,
  AlertTriangle, CheckCircle, Info, Play, Clock, Monitor,
  Link, X, Pencil
} from 'lucide-react';

// Convert a YouTube/Vimeo watch URL to an embed URL
function toEmbedUrl(raw) {
  if (!raw) return '';
  raw = raw.trim();
  // Already an embed URL
  if (raw.includes('/embed/') || raw.includes('player.vimeo')) return raw;
  // YouTube: https://www.youtube.com/watch?v=ID or https://youtu.be/ID
  const ytMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&autoplay=1`;
  // Vimeo: https://vimeo.com/ID
  const vimeoMatch = raw.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return raw;
}

const STORAGE_KEY = 'operator_manual_video_urls';

const MANUAL_SECTIONS = [
  {
    id: 'getting-started',
    icon: Activity,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    title: 'Getting Started',
    steps: [
      {
        title: 'Logging In',
        content: 'Navigate to the system URL and enter your email address. Click "Send OTP" or enter your password. First-time users will receive an email invitation from an administrator. Your account must be approved before you can access the system.',
        tips: ['Use a modern browser (Chrome, Firefox, Edge)', 'Enable notifications for real-time alerts', 'Contact your admin if login fails after 3 attempts'],
      },
      {
        title: 'Navigating the Dashboard',
        content: 'The left sidebar organises all modules. Click any category to expand its sub-pages. The top bar shows your current organisation, notifications, and a back button. On mobile, tap the hamburger menu (☰) to open the sidebar.',
        tips: ['Use the back arrow (←) to return to the previous screen', 'Pull down on mobile to refresh data', 'The organisation switcher (top-right) lets platform owners switch between clinics'],
      },
      {
        title: 'Understanding Your Role',
        content: 'Your role determines which modules and actions you can access. Common roles include Pharmacist, Receptionist, Doctor, Lab Technician, and Administrator. Contact your Organisation Admin to request role changes.',
        tips: ['Admin users see all modules', 'Platform owners can switch between organisations', 'Roles can be organisation-specific'],
      },
    ],
  },
  {
    id: 'pharmacy',
    icon: ShoppingBag,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Pharmacy & Point of Sale',
    steps: [
      {
        title: 'Processing a Sale (POS)',
        content: 'Go to Pharmacy → Point of Sale. Search for a product by name or barcode. Enter the quantity and click Add to Cart. Select the payment method (Cash, Card, Credit). Click Complete Sale to print the receipt. Walk-in patients can be registered on the spot.',
        tips: ['Scan barcodes using a USB barcode scanner', 'Press F2 to quickly focus the product search', 'Credit sales require the patient to have a linked institution account'],
      },
      {
        title: 'Managing Inventory',
        content: 'Go to Pharmacy → Inventory to view all stock levels. Use Stock Taking to perform physical counts. Receive new stock via Procurement → Goods Received. The system automatically flags items below minimum threshold.',
        tips: ['Set minimum stock levels in product settings', 'Use Stock Import to bulk-upload from CSV', 'Batch tracking is available for expiry management'],
      },
      {
        title: 'Prescription Work Queue',
        content: 'Prescriptions from doctors appear in Pharmacy → Work Queue. Review each prescription, verify the drug, dose, and directions. Click Verify then Dispense to mark it as dispensed. Cancelled prescriptions are archived automatically.',
        tips: ['Check for drug interactions using the AI checker', 'Partial dispenses are supported', 'Notify the doctor via the message system if a drug is out of stock'],
      },
      {
        title: 'Credit Sales',
        content: 'Credit sales allow registered institutions (hospitals, corporates) to purchase on account. Go to Pharmacy → Credit Sale Institutions to manage accounts. Monthly invoices are auto-generated and can be emailed to institutions.',
        tips: ['Set a credit limit per institution to reduce risk', 'Use the Credit Usage Dashboard to monitor overdue accounts', 'Send overdue notifications from the system automatically'],
      },
    ],
  },
  {
    id: 'clinical',
    icon: FileText,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Clinical & EMR',
    steps: [
      {
        title: 'Registering a Patient',
        content: 'Go to Clinical → Patients → Register New Patient. Fill in the required fields: First Name, Last Name, Date of Birth, and Gender. The system auto-generates a Patient Health Number (PHN). Add contact details, allergies, and insurance information as needed.',
        tips: ['Search before registering to avoid duplicates', 'PHN is unique and permanent — never edit it manually', 'Upload a patient photo for quick identification at reception'],
      },
      {
        title: 'Creating a SOAP Note',
        content: 'Open a patient record and go to the Encounters tab. Click New Encounter. Fill in Subjective (patient complaint), Objective (vitals/findings), Assessment (diagnosis), and Plan (treatment). Click Save & Sign to finalise.',
        tips: ['Use the AI Transcriber to dictate SOAP notes by voice', 'Drag in lab results to auto-populate the Objective section', 'Sign-off locks the note — contact admin to amend a signed note'],
      },
      {
        title: 'Writing a Prescription',
        content: 'Inside an encounter, click Add Prescription. Search for the drug by name or generic. Set dose, frequency, duration, and quantity. Click Check Interactions to verify safety. Click Sign & Send to route it to the pharmacy.',
        tips: ['Favourite prescriptions appear at the top for fast re-prescribing', 'Prescriptions can be sent to any network pharmacy', 'Patients can request renewals via the patient portal'],
      },
      {
        title: 'Viewing Lab Results',
        content: 'In the patient EMR, navigate to the Labs tab. Results from the LIS (Laboratory Information System) appear automatically. AI-extracted results from uploaded PDF documents also appear here. Click any result to view the trend chart.',
        tips: ['Abnormal values are highlighted in red', 'Use the trend chart to track results over time', 'Acknowledge critical results to clear the critical queue alert'],
      },
    ],
  },
  {
    id: 'laboratory',
    icon: TestTube,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Laboratory (LIS)',
    steps: [
      {
        title: 'Receiving a Lab Order',
        content: 'Go to Laboratory → Orders & Accessioning. New orders appear from the clinical module. Click Accession to assign a lab number and print a specimen label. Assign the order to the appropriate analyzer or technician.',
        tips: ['Print barcode labels directly from the accession screen', 'Stat orders are highlighted in red for urgent processing', 'Bulk accession is available for batch samples'],
      },
      {
        title: 'Entering Results',
        content: 'Go to Laboratory → Results. Select the order and click Enter Results. Type or paste values for each test parameter. The system auto-flags values outside the reference range. Click Save Draft first, then Verify when confident.',
        tips: ['Reference ranges are configured per age and gender in LIS Admin', 'Critical values trigger automatic notifications to the ordering doctor', 'Use Analyzer Inbox for auto-import of results from connected machines'],
      },
      {
        title: 'Releasing Results',
        content: 'Go to Laboratory → Release Queue. Review all verified results before releasing to the patient. A supervisor or senior tech must sign off before release. Released results are visible in the patient EMR and patient portal instantly.',
        tips: ['Batch release is available for high-volume labs', 'Results can be printed or emailed directly to the patient', 'Amended results create a clear audit trail'],
      },
    ],
  },
  {
    id: 'appointments',
    icon: Calendar,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    title: 'Appointments & Scheduling',
    steps: [
      {
        title: 'Booking an Appointment',
        content: 'Go to Clinical → Appointments → New Appointment. Select the patient (or register a new one). Choose the provider, date, time slot, and appointment type. Add notes if needed. Click Save to confirm. An SMS/email confirmation is sent automatically.',
        tips: ['Provider availability is shown in real-time', 'Double-bookings are prevented by the system', 'Walk-in appointments can be added without a specific time slot'],
      },
      {
        title: 'Managing the Daily Schedule',
        content: 'The Provider Dashboard shows today\'s appointment list. Click on any appointment to view patient details, check-in, or update status. Use the status flow: Booked → Confirmed → In Progress → Completed. Cancellations send automatic notifications.',
        tips: ['Colour codes indicate appointment status at a glance', 'Drag-and-drop rescheduling is available in week view', 'No-shows can be marked to track patient patterns'],
      },
    ],
  },
  {
    id: 'homecare',
    icon: Users,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    title: 'Home Care',
    steps: [
      {
        title: 'Creating a Home Care Case',
        content: 'Go to Home Care → Dashboard → New Case. Select or register the patient. Assign a nursing officer or home care worker. Set the service type (nursing, wound care, physiotherapy, etc.) and schedule the first visit.',
        tips: ['Cases can be linked to existing EMR records', 'Batch management allows assigning multiple patients at once', 'Division/area assignment helps dispatch workers efficiently'],
      },
      {
        title: 'Shift Reports',
        content: 'After each visit, the assigned staff submits a shift report via Home Care → Daily Reports. Caretaker reports, family reports, and supervisor sign-offs are separate forms. All reports are timestamped and linked to the case.',
        tips: ['Supervisors can view and sign off reports remotely', 'Family members can submit daily updates via the family report form', 'Reports can be exported as PDF for insurance or billing purposes'],
      },
      {
        title: 'Home Care Invoicing',
        content: 'Go to Home Care → Invoicing & Billing. Select the patient and date range. Add line items (nursing days, pharmacy supplies, lab tests). Click Generate Invoice to create a printable 80mm receipt or A4 invoice.',
        tips: ['Rates can be configured per service type in settings', 'Invoices support partial payments', 'Print receipts directly from an 80mm thermal printer'],
      },
    ],
  },
  {
    id: 'operations',
    icon: Activity,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    title: 'Operations & Admin',
    steps: [
      {
        title: 'Daily Close',
        content: 'At end of day, go to Operations → Daily Close. Review the sales summary, cash collected, and credit sales. Enter the actual cash count. Any discrepancy is flagged. Click Close Day to finalise. This locks the day\'s transactions.',
        tips: ['Only one daily close per day is allowed', 'The supervisor must approve before close', 'Previous day closes can be reviewed but not edited'],
      },
      {
        title: 'Shift Handover',
        content: 'Go to Operations → Shift Handover Book. The outgoing shift logs key events, pending tasks, and cash balances. The incoming nurse/staff reviews and acknowledges. All handovers are timestamped.',
        tips: ['Add attachments (photos, documents) to handover entries', 'Mark critical items as escalations', 'Management can review all handovers for compliance'],
      },
      {
        title: 'User Management',
        content: 'Go to Organisation Admin → User Management. Invite new staff by email. Assign roles per organisation or location. Pending invitations are tracked and followed up automatically. Blocked users cannot log in.',
        tips: ['Users must accept their invitation email to activate their account', 'Role changes take effect immediately', 'Use the approval workflow for high-sensitivity role assignments'],
      },
    ],
  },
  {
    id: 'telemedicine',
    icon: Globe,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'Telemedicine',
    steps: [
      {
        title: 'Setting Up a Virtual Consultation',
        content: 'Go to Telemedicine → Doctors to ensure the provider has availability configured. Patients book via the Patient Portal or staff can book from Tele Appointments. The system creates a Whereby video room automatically at the scheduled time.',
        tips: ['Test your camera and microphone before the call', 'Consultation recordings can be stored to the patient record', 'Set up payment gateways before accepting paid consultations'],
      },
      {
        title: 'Global Patient Hub',
        content: 'The Global Patient Hub manages overseas patients (diaspora, medical tourism). Register global patients separately from local EMR patients. Use "Admit to Local Clinic" to create a linked EMR record when the patient visits in person.',
        tips: ['Compliance flags (GDPR, HIPAA, PIPEDA) are set per region automatically', 'Second opinion requests can be escalated to specialists', 'Medical tourism interest is tracked for pipeline management'],
      },
    ],
  },
];

const VIDEO_LIBRARY = [
  {
    category: 'Getting Started',
    icon: Play,
    videos: [
      { title: 'System Overview & Navigation', duration: '4:32', description: 'Tour of the main dashboard, sidebar navigation, and key modules.', url: '' },
      { title: 'Logging In & User Roles', duration: '2:15', description: 'How to log in, what each role can access, and how to request a role change.', url: '' },
      { title: 'Mobile App Usage', duration: '3:10', description: 'Using Horizon ClinicSuite on a mobile device — pull to refresh, bottom tabs, and offline tips.', url: '' },
    ],
  },
  {
    category: 'Pharmacy',
    icon: ShoppingBag,
    videos: [
      { title: 'Point of Sale Walkthrough', duration: '6:45', description: 'Full POS demo: scanning barcodes, adding items, selecting payment, printing receipt.', url: '' },
      { title: 'Receiving Stock & GRN', duration: '5:20', description: 'How to receive goods from a purchase order and update inventory levels.', url: '' },
      { title: 'Credit Sales & Monthly Invoicing', duration: '4:55', description: 'Setting up institution credit accounts and generating monthly statements.', url: '' },
    ],
  },
  {
    category: 'Clinical / EMR',
    icon: FileText,
    videos: [
      { title: 'Registering a New Patient', duration: '3:30', description: 'Step-by-step patient registration including PHN generation and photo upload.', url: '' },
      { title: 'Writing a SOAP Note', duration: '5:10', description: 'Creating a complete clinical encounter with diagnosis, plan, and sign-off.', url: '' },
      { title: 'Prescribing Medications', duration: '4:00', description: 'Drug search, favourites, interaction checker, and sending to pharmacy.', url: '' },
      { title: 'Voice Transcription (AI)', duration: '3:45', description: 'Using the AI voice transcriber to dictate SOAP notes hands-free during a consultation.', url: '' },
    ],
  },
  {
    category: 'Laboratory',
    icon: TestTube,
    videos: [
      { title: 'Accession & Specimen Tracking', duration: '4:20', description: 'Receiving lab orders, assigning accession numbers, and printing specimen labels.', url: '' },
      { title: 'Entering & Verifying Results', duration: '5:00', description: 'Manual result entry, auto-flagging abnormal values, and verification workflow.', url: '' },
      { title: 'Connecting an Analyzer', duration: '6:30', description: 'Setting up the Analyzer Inbox to auto-import results from lab instruments.', url: '' },
    ],
  },
  {
    category: 'Home Care',
    icon: Users,
    videos: [
      { title: 'Creating a Home Care Case', duration: '4:10', description: 'Assigning staff, setting up the care schedule, and configuring service types.', url: '' },
      { title: 'Daily Reports & Shift Handover', duration: '3:55', description: 'How caretakers and nurses submit daily reports and how supervisors sign off.', url: '' },
    ],
  },
  {
    category: 'Administration',
    icon: Settings,
    videos: [
      { title: 'Inviting & Managing Staff', duration: '3:25', description: 'How to invite users, assign roles, and manage access permissions.', url: '' },
      { title: 'Daily Close & Cash Reconciliation', duration: '4:40', description: 'End-of-day cash count, discrepancy review, and closing the shift.', url: '' },
      { title: 'Organisation Branding & Settings', duration: '3:15', description: 'Uploading logos, configuring footer text, and organisation-level settings.', url: '' },
    ],
  },
];

function ManualSection({ section }) {
  const [openSteps, setOpenSteps] = useState({});
  const toggle = (i) => setOpenSteps(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="space-y-3">
      {section.steps.map((step, i) => (
        <Card key={i} className="overflow-hidden">
          <button
            className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            onClick={() => toggle(i)}
          >
            <div className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${section.color} ${section.bg} border flex-shrink-0`}>
                {i + 1}
              </span>
              <span className="font-semibold text-slate-800">{step.title}</span>
            </div>
            {openSteps[i] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          {openSteps[i] && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <p className="text-slate-700 text-sm leading-relaxed mt-3 mb-3">{step.content}</p>
              {step.tips?.length > 0 && (
                <div className={`rounded-lg p-3 ${section.bg} space-y-1`}>
                  <p className={`text-xs font-semibold ${section.color} flex items-center gap-1 mb-1`}>
                    <Info className="w-3.5 h-3.5" /> Tips
                  </p>
                  {step.tips.map((tip, ti) => (
                    <p key={ti} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-500" />
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function VideoCard({ video, savedUrl, onSaveUrl }) {
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inputUrl, setInputUrl] = useState(savedUrl || video.url || '');

  const activeUrl = savedUrl || video.url || '';
  const embedUrl = toEmbedUrl(activeUrl);

  const handleSave = () => {
    onSaveUrl(inputUrl.trim());
    setEditing(false);
    setPlaying(false);
  };

  const handleClear = () => {
    onSaveUrl('');
    setInputUrl('');
    setEditing(false);
    setPlaying(false);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="bg-slate-900 aspect-video flex items-center justify-center relative group cursor-pointer"
        onClick={() => embedUrl && !editing ? setPlaying(true) : null}
      >
        {playing && embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={video.title}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900/60 to-slate-900/80" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-white">
              <div className={`w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40 transition-colors ${embedUrl ? 'group-hover:bg-white/30' : 'opacity-40'}`}>
                <Play className="w-6 h-6 fill-white" />
              </div>
              {embedUrl
                ? <span className="text-xs text-white/70">Click to play</span>
                : <span className="text-xs text-white/50">No video added yet</span>
              }
            </div>
            {!embedUrl && (
              <div className="absolute bottom-2 right-2">
                <Badge className="bg-amber-500/90 text-white text-xs">No URL</Badge>
              </div>
            )}
            {embedUrl && (
              <div className="absolute bottom-2 right-2">
                <Badge className="bg-green-600/90 text-white text-xs">Ready</Badge>
              </div>
            )}
          </>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        <p className="font-semibold text-sm text-slate-900">{video.title}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{video.description}</p>

        {editing ? (
          <div className="space-y-2 pt-1">
            <Input
              placeholder="Paste YouTube or Vimeo URL..."
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              className="text-xs h-8"
              autoFocus
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleSave}>
                Save
              </Button>
              {activeUrl && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={handleClear}>
                  <X className="w-3 h-3" />
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" /> {video.duration}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => { setEditing(true); setPlaying(false); }}
            >
              <Pencil className="w-3 h-3" />
              {activeUrl ? 'Change URL' : 'Add Video URL'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OperatorManual() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');
  const [videoUrls, setVideoUrls] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });

  const saveVideoUrl = (catIdx, vidIdx, url) => {
    const key = `${catIdx}-${vidIdx}`;
    const updated = { ...videoUrls, [key]: url };
    setVideoUrls(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const filteredSections = MANUAL_SECTIONS.filter(s =>
    !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.steps.some(step =>
      step.title.toLowerCase().includes(search.toLowerCase()) ||
      step.content.toLowerCase().includes(search.toLowerCase())
    )
  );

  const filteredVideos = VIDEO_LIBRARY.map(cat => ({
    ...cat,
    videos: cat.videos.filter(v =>
      !search ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      cat.category.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.videos.length > 0);

  const activeManualSection = filteredSections.find(s => s.id === activeSection) || filteredSections[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-teal-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Operator Manual & Training Library</h1>
            <p className="text-slate-200 mt-1">Step-by-step guides and video tutorials for all system modules</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <Input
            placeholder="Search guides, topics, or video titles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-300 focus:bg-white/20"
          />
        </div>
      </div>

      <Tabs defaultValue="manual">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Operator Manual
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="w-4 h-4" /> Video Library
          </TabsTrigger>
        </TabsList>

        {/* MANUAL TAB */}
        <TabsContent value="manual" className="mt-4">
          <div className="flex gap-6">
            {/* Sidebar nav */}
            <div className="hidden lg:block w-56 flex-shrink-0">
              <div className="space-y-1 sticky top-4">
                {filteredSections.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                        activeSection === section.id
                          ? 'bg-teal-600 text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Mobile section picker */}
              <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto pb-2">
                {filteredSections.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        activeSection === section.id
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {section.title}
                    </button>
                  );
                })}
              </div>

              {activeManualSection ? (
                <div>
                  <div className={`flex items-center gap-3 mb-4 p-4 rounded-xl ${activeManualSection.bg}`}>
                    <activeManualSection.icon className={`w-6 h-6 ${activeManualSection.color}`} />
                    <div>
                      <h2 className="font-bold text-slate-900 text-lg">{activeManualSection.title}</h2>
                      <p className="text-sm text-slate-500">{activeManualSection.steps.length} step{activeManualSection.steps.length !== 1 ? 's' : ''} — click each to expand</p>
                    </div>
                  </div>
                  <ManualSection section={activeManualSection} />
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No sections match your search.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* VIDEOS TAB */}
        <TabsContent value="videos" className="mt-4 space-y-8">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No videos match your search.</p>
            </div>
          ) : (
            filteredVideos.map((cat, catIdx) => {
              const Icon = cat.icon;
              return (
                <div key={cat.category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-teal-600" />
                    <h3 className="font-bold text-slate-800 text-lg">{cat.category}</h3>
                    <Badge variant="outline" className="text-xs ml-1">{cat.videos.length} videos</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cat.videos.map((video, i) => (
                      <VideoCard
                        key={i}
                        video={video}
                        savedUrl={videoUrls[`${catIdx}-${i}`] || ''}
                        onSaveUrl={(url) => saveVideoUrl(catIdx, i, url)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* How to add videos */}
          <Card className="border-dashed border-2 border-teal-200 bg-teal-50/40">
            <CardContent className="p-5 flex items-start gap-3">
              <Link className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-teal-800 mb-1">How to add videos</p>
                <p className="text-sm text-teal-700">
                  Click <strong>"Add Video URL"</strong> on any card above and paste a <strong>YouTube</strong> or <strong>Vimeo</strong> link (e.g. <code className="bg-teal-100 px-1 rounded">https://www.youtube.com/watch?v=...</code>).
                  The URL is saved automatically and persists for this browser. Videos are embedded inline and play on click.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}