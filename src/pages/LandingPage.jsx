import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Users, Calendar, FileText, BarChart3, 
  TestTube, Monitor, Video, Activity, Shield, 
  Stethoscope, Package, MessageSquare, Heart,
  ChevronRight, Check, Star, Menu, X, ArrowRight,
  Phone, Mail, Globe, Zap, Lock, TrendingUp, Home,
  Scan, Pill, ClipboardList, Cpu, Wifi, Bell, 
  DollarSign, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const MODULES = [
  {
    icon: ShoppingBag,
    color: 'from-indigo-500 to-indigo-700',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    title: 'Unified Point of Sale',
    description: 'One screen to sell GP consultations, specialist visits, pharmacy items, lab tests, radiology, and health packages. Smart cart with auto-stock deduction, SMS/email receipts.',
    features: ['Multi-service cart', 'Patient linking', 'Receipt printing', 'Auto stock update'],
  },
  {
    icon: Pill,
    color: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    title: 'Pharmacy Management',
    description: 'Full pharmacy POS, inventory tracking, barcode scanning, purchase orders, goods receiving, stock taking, and bill card reports — all in one module.',
    features: ['Barcode scanning', 'Stock alerts', 'Purchase orders', 'Expiry tracking'],
  },
  {
    icon: FileText,
    color: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    title: 'Electronic Medical Records',
    description: 'AI-assisted SOAP notes with voice input, chronic problem lists, medication reconciliation, vitals trending, referrals, patient tasks, and smart clinical summaries.',
    features: ['AI SOAP notes', 'Voice transcription', 'ICD-10 coding', 'Vitals tracking'],
  },
  {
    icon: TestTube,
    color: 'from-cyan-500 to-cyan-700',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    title: 'Laboratory Information System',
    description: 'Complete LIS with order management, specimen tracking, analyzer integration, auto result import, critical value alerts, QC logging, and government report generation.',
    features: ['Analyzer integration', 'Critical alerts', 'QC management', 'Auto result entry'],
  },
  {
    icon: Scan,
    color: 'from-orange-500 to-orange-700',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    title: 'Diagnostics & Radiology',
    description: 'Manage radiology, ECG, ultrasound orders and results. Release queue for physician approval. Critical value escalation workflow with acknowledgement tracking.',
    features: ['Order management', 'Release workflow', 'Critical queue', 'Result archiving'],
  },
  {
    icon: Activity,
    color: 'from-rose-500 to-rose-700',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    title: 'Dental Clinic Suite',
    description: 'Tooth charting, periodontal charts, treatment planning, lab case tracking, sterilization log, recall management, and dental billing integrated into one workflow.',
    features: ['Tooth charting', 'Treatment plans', 'Recall system', 'Sterilization log'],
  },
  {
    icon: Home,
    color: 'from-pink-500 to-pink-700',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    title: 'Home Care Management',
    description: 'Manage home nursing cases, schedule visits, assign caregivers, track daily reports, and handle batch processing for referral agencies.',
    features: ['Visit scheduling', 'Care assignments', 'Daily reports', 'Batch billing'],
  },
  {
    icon: Video,
    color: 'from-violet-500 to-violet-700',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    title: 'Telemedicine Platform',
    description: 'Full virtual hospital capability — video consultations, second opinions, medical tourism coordination, global patient portal, and compliance with HIPAA, GDPR, and PIPEDA.',
    features: ['HD video calls', 'Second opinions', 'Medical tourism', 'Multi-jurisdiction compliance'],
  },
  {
    icon: Users,
    color: 'from-teal-500 to-teal-700',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    title: 'Queue Management',
    description: 'Real-time token issuance, multi-counter management, TV display boards, and patient calling — reduce waiting room chaos and improve patient experience.',
    features: ['Token system', 'TV display board', 'Multi-counter', 'Real-time updates'],
  },
  {
    icon: Monitor,
    color: 'from-slate-500 to-slate-700',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    title: 'Digital Signage',
    description: 'AI-generated clinic content, playlist management, emergency banners, health education slides, and remote screen control — turn waiting room TVs into engagement tools.',
    features: ['AI content creation', 'Playlist scheduling', 'Emergency banners', 'Remote control'],
  },
  {
    icon: DollarSign,
    color: 'from-green-500 to-green-700',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    title: 'Finance & Billing',
    description: 'General ledger, invoicing, payment tracking, payroll, bank statement management, financial dashboards, and revenue stream analytics for multi-company setups.',
    features: ['General ledger', 'Invoice management', 'Payroll processing', 'Revenue analytics'],
  },
  {
    icon: Shield,
    color: 'from-red-500 to-red-700',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    title: 'Security & Compliance',
    description: 'Full audit logging, break-glass access, data retention policies, export approvals, security posture reports, and user approval workflows for healthcare compliance.',
    features: ['Audit logs', 'Break-glass access', 'Data retention', 'Compliance reports'],
  },
  {
    icon: Phone,
    color: 'from-amber-500 to-amber-700',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    title: 'Telephony Integration',
    description: 'PBX configuration, softphone extensions, call queues, IVR menus, call logs, and fax inbox — full 3CX integration for clinic communication management.',
    features: ['PBX setup', 'Softphone extensions', 'IVR menus', 'Fax inbox'],
  },
  {
    icon: Package,
    color: 'from-fuchsia-500 to-fuchsia-700',
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
    title: 'Wholesale Platform',
    description: 'Built-in B2B marketplace for pharmaceutical suppliers and clinic buyers — product catalogs, order management, credit accounts, and supplier connection portal.',
    features: ['B2B marketplace', 'Credit accounts', 'Order tracking', 'Supplier portal'],
  },
  {
    icon: MessageSquare,
    color: 'from-sky-500 to-sky-700',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    title: 'Communications Hub',
    description: 'Bulk SMS via Dialog eSMS, patient appointment reminders, internal staff messaging, SMS delivery tracking, and opt-out management.',
    features: ['Bulk SMS', 'Appointment reminders', 'Staff messaging', 'Delivery tracking'],
  },
  {
    icon: Cpu,
    color: 'from-lime-500 to-lime-700',
    bg: 'bg-lime-50',
    text: 'text-lime-700',
    border: 'border-lime-200',
    title: 'AI Assistant',
    description: 'AI-powered document analysis, report generation, smart clinical summaries, drug interaction checking, and natural language querying across all clinical data.',
    features: ['Document analysis', 'Report generation', 'Drug interactions', 'Smart summaries'],
  },
];

const STATS = [
  { label: 'Clinical Modules', value: '16+', icon: Activity },
  { label: 'Organizations Supported', value: 'Multi-tenant', icon: Globe },
  { label: 'Compliance Standards', value: 'HIPAA, GDPR, PIPEDA', icon: Shield },
  { label: 'Uptime SLA', value: '99.9%', icon: Wifi },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Priya Ananthan',
    role: 'Medical Director, Anantham Healthcare',
    text: 'Horizon ClinicSuite replaced 5 different systems. Everything from pharmacy to EMR to lab is now in one place. Our staff efficiency improved by 40% in the first month.',
    rating: 5,
  },
  {
    name: 'Mr. Rajan Selvam',
    role: 'Operations Manager, Premier Health',
    text: 'The telemedicine module opened a completely new revenue stream for us. We now serve patients across Sri Lanka and internationally through the virtual hospital.',
    rating: 5,
  },
  {
    name: 'Dr. Kumari Wickramasinghe',
    role: 'Chief Pharmacist, City Medical Centre',
    text: 'Inventory management is a breeze. Barcode scanning, expiry tracking, purchase orders — we have not had a stockout since going live.',
    rating: 5,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState(null);
  const [visibleModules, setVisibleModules] = useState(6);

  const handleLogin = () => {
    base44.auth.redirectToLogin('/');
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="https://media.base44.com/images/public/695228df6df3d4ab96a83f88/408e3fc4c_generated_image.png"
              alt="Horizon ClinicSuite" 
              className="h-9 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-base font-bold text-slate-900 leading-tight">Horizon</p>
              <p className="text-xs text-teal-600 font-semibold leading-tight">ClinicSuite</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-teal-600 transition-colors">Features</a>
            <a href="#modules" className="hover:text-teal-600 transition-colors">Modules</a>
            <a href="#testimonials" className="hover:text-teal-600 transition-colors">Testimonials</a>
            <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleLogin} className="bg-teal-600 hover:bg-teal-700 text-white px-5">
              Sign In
            </Button>
            <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3">
            {['features', 'modules', 'testimonials', 'contact'].map(s => (
              <a key={s} href={`#${s}`} onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-700 capitalize hover:text-teal-600">
                {s}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-100 rounded-full opacity-40 blur-3xl" />
          <div className="absolute top-10 right-0 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-cyan-100 rounded-full opacity-30 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="bg-teal-50 text-teal-700 border border-teal-200 mb-6 px-4 py-1.5 text-sm">
              🏥 Complete Healthcare Management Platform
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              The All-in-One<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600">
                Clinical Suite
              </span><br />
              for Modern Clinics
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              From pharmacy to telemedicine, laboratory to digital signage — Horizon ClinicSuite unifies every department of your healthcare organization into one intelligent platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleLogin} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-base font-semibold rounded-xl shadow-lg shadow-teal-200">
                Sign In to Your Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <a href="#modules">
                <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 px-8 py-4 text-base font-semibold rounded-xl">
                  Explore Features
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Hero illustration / dashboard mock */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900">
              {/* Mock browser chrome */}
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 bg-slate-700 rounded px-3 py-1 text-xs text-slate-400">horizon.clinicsuite.com</div>
              </div>
              {/* Mock dashboard */}
              <div className="bg-slate-50 p-4 grid grid-cols-4 gap-3 min-h-64">
                {/* Sidebar mock */}
                <div className="col-span-1 bg-white rounded-xl p-3 shadow-sm space-y-2">
                  <div className="h-8 bg-teal-600 rounded-lg" />
                  {['bg-slate-200','bg-slate-100','bg-teal-100','bg-slate-100','bg-slate-100'].map((c,i) => (
                    <div key={i} className={`h-6 ${c} rounded`} />
                  ))}
                </div>
                {/* Main content mock */}
                <div className="col-span-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {c:'bg-teal-500', w:'Rs 284,500', l:'Today Revenue'},
                      {c:'bg-indigo-500', w:'47', l:'Patients Today'},
                      {c:'bg-emerald-500', w:'12', l:'Pending Tests'},
                    ].map((s,i)=>(
                      <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                        <div className={`w-8 h-8 ${s.c} rounded-lg mb-2`} />
                        <p className="text-xs text-slate-500">{s.l}</p>
                        <p className="font-bold text-slate-900">{s.w}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="h-3 bg-slate-200 rounded w-1/3 mb-3" />
                    <div className="space-y-2">
                      {[80, 60, 90, 45, 70].map((w,i)=>(
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded" />
                          <div className={`h-2 bg-teal-${400+i*100} rounded`} style={{width:`${w}%`}} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -left-4 top-1/3 bg-white rounded-xl shadow-lg p-3 border border-slate-100 hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Lab Result Ready</p>
                <p className="text-xs text-slate-500">Patient Kumari, CBC</p>
              </div>
            </div>
            <div className="absolute -right-4 top-1/4 bg-white rounded-xl shadow-lg p-3 border border-slate-100 hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">New Appointment</p>
                <p className="text-xs text-slate-500">Dr. Priya — 2:30 PM</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="features" className="py-16 bg-gradient-to-r from-teal-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center text-white">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl lg:text-3xl font-extrabold mb-1">{value}</p>
                <p className="text-sm text-white/80">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY HORIZON ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 mb-4">Why Horizon?</Badge>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">Built for Real Clinical Workflows</h2>
            <p className="text-slate-500 mt-3 text-lg max-w-2xl mx-auto">Not a generic SaaS product adapted for healthcare — purpose-built from the ground up for clinics, hospitals, and diagnostic centers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Multi-Tenant Architecture', desc: 'Serve multiple organizations, clinics, or branches under one platform. Each gets their own data, branding, and module access.', color: 'text-amber-500', bg: 'bg-amber-50' },
              { icon: Lock, title: 'Healthcare-Grade Security', desc: 'Role-based access control, audit logging, break-glass access, data retention policies, and compliance checklists built-in from day one.', color: 'text-red-500', bg: 'bg-red-50' },
              { icon: TrendingUp, title: 'AI-Powered Intelligence', desc: 'AI-generated SOAP notes, document analysis, drug interaction checking, report generation, and smart clinical summaries across all modules.', color: 'text-teal-600', bg: 'bg-teal-50' },
              { icon: RefreshCw, title: 'Real-Time Everywhere', desc: 'Live patient queues, instant lab alerts, real-time inventory updates, and push notifications keep every team member synchronized.', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: Globe, title: 'Telemedicine Ready', desc: 'Built-in HD video consultations, global patient portal, second opinion requests, and medical tourism coordination out of the box.', color: 'text-violet-500', bg: 'bg-violet-50' },
              { icon: Package, title: 'From POS to Payroll', desc: 'A complete financial stack — invoicing, payments, general ledger, payroll, bank reconciliation, and revenue analytics all integrated.', color: 'text-green-600', bg: 'bg-green-50' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section id="modules" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="bg-teal-50 text-teal-700 border-teal-200 mb-4">Full Module Suite</Badge>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">Everything Your Clinic Needs</h2>
            <p className="text-slate-500 mt-3 text-lg max-w-2xl mx-auto">16+ integrated modules — enable only what you need, scale as you grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.slice(0, visibleModules).map((mod, idx) => (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white rounded-2xl border ${mod.border} p-6 hover:shadow-xl transition-all cursor-pointer group`}
                onClick={() => setActiveModule(activeModule === mod.title ? null : mod.title)}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4 shadow-md`}>
                  <mod.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">{mod.title}</h3>
                <p className="text-slate-500 text-sm mb-4 leading-relaxed">{mod.description}</p>
                <div className={`grid grid-cols-2 gap-1.5 overflow-hidden transition-all ${activeModule === mod.title ? 'max-h-40' : 'max-h-40'}`}>
                  {mod.features.map(f => (
                    <div key={f} className={`flex items-center gap-1.5 text-xs ${mod.text} ${mod.bg} px-2 py-1 rounded-full`}>
                      <Check className="w-3 h-3 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {visibleModules < MODULES.length && (
            <div className="text-center mt-10">
              <Button variant="outline" size="lg" onClick={() => setVisibleModules(MODULES.length)}
                className="border-teal-300 text-teal-700 hover:bg-teal-50 px-8">
                Show All {MODULES.length} Modules
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 mb-4">Trusted by Healthcare Leaders</Badge>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">What Our Clients Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(({ name, role, text, rating }) => (
              <div key={name} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-5 italic">"{text}"</p>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{name}</p>
                  <p className="text-slate-500 text-xs">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-br from-teal-600 via-teal-700 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">Ready to Transform Your Clinic?</h2>
          <p className="text-teal-100 text-lg mb-8">Sign in to access your personalized Horizon ClinicSuite dashboard and manage every aspect of your healthcare organization.</p>
          <Button onClick={handleLogin} size="lg" className="bg-white text-teal-700 hover:bg-teal-50 px-10 py-4 text-base font-bold rounded-xl shadow-xl">
            Sign In to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://media.base44.com/images/public/695228df6df3d4ab96a83f88/408e3fc4c_generated_image.png"
                  alt="Horizon ClinicSuite" className="h-10 w-auto object-contain bg-white rounded-lg p-1" />
                <div>
                  <p className="text-white font-bold">Horizon ClinicSuite</p>
                  <p className="text-teal-400 text-xs">Complete Healthcare Platform</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed">A comprehensive, multi-tenant clinical management platform serving pharmacies, hospitals, diagnostic centers, and virtual healthcare providers.</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-3 text-sm">Modules</p>
              <ul className="space-y-2 text-sm">
                {['Pharmacy POS', 'EMR & SOAP Notes', 'Laboratory LIS', 'Telemedicine', 'Digital Signage', 'Dental Suite'].map(m => (
                  <li key={m}><a href="#modules" className="hover:text-teal-400 transition-colors">{m}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-3 text-sm">Contact</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-teal-400" /> info@horizonclinicsuite.com</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-teal-400" /> +94 77 XXX XXXX</li>
                <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-teal-400" /> horizonclinicsuite.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>© 2026 Horizon ClinicSuite. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-teal-400 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-teal-400 transition-colors">HIPAA Compliance</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}