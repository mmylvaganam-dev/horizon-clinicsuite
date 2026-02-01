import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Activity,
  ShoppingBag,
  DollarSign,
  MessageSquare,
  Mail,
  Building2,
  CheckSquare,
  TestTube,
  Package,
  Sparkles,
  ArrowLeft,
  Info,
  Globe,
  Crown,
  Shield
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';



export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userApproved, setUserApproved] = useState(null);
  const navigate = useNavigate();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    const checkApproval = async () => {
      try {
        const response = await base44.functions.invoke('checkUserApproval');
        // All authenticated users are approved - no access pending page
        setUserApproved(true);
      } catch (error) {
        console.error('Error checking approval:', error);
        // Allow access even if function fails
        setUserApproved(true);
      }
    };
    checkApproval();
  }, [navigate]);

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding'],
    queryFn: async () => {
      if (!userApproved) return null;
      const brandings = await base44.entities.OrganizationBranding.list();
      return brandings[0];
    },
    enabled: userApproved !== false,
  });

  const navigationGroups = [
    {
      category: 'Main',
      icon: ShoppingBag,
      items: [
        { name: 'New Sale', page: 'SalesWorkspace', icon: ShoppingBag, description: 'Process new sales - Pharmacy, GP, Specialist, Radiology, and Home Care services all in one place' },
        { name: 'Patient Hub', page: 'PatientHub', icon: Users, description: 'Central patient management - Search patients, view profiles, access EMR, Pharmacy, and Home Care services' },
      ]
    },
    {
      category: 'Dashboard',
      icon: LayoutDashboard,
      items: [
        { name: 'Home', page: 'Home', icon: LayoutDashboard, description: 'Main dashboard - Overview of sales, patients, and key metrics' },
        { name: 'Daily Operations', page: 'DailyOps', icon: Activity, description: 'Daily operations center - Track real-time patient flow, staff activities, and operational metrics' },
        { name: 'Provider Dashboard', page: 'ProviderDashboard', icon: Activity, description: 'For doctors and providers - View your appointments, patient queue, and clinical tasks' },
      ]
    },
    {
      category: 'Pharmacy',
      icon: ShoppingBag,
      items: [
        { name: 'Point of Sale', page: 'PharmacyBilling', icon: ShoppingBag, description: 'POS system - Sell medicines, process walk-in customers, generate invoices' },
        { name: 'Dashboard', page: 'PharmacyDashboard', icon: Activity, description: 'Pharmacy overview - Sales stats, stock alerts, and quick actions' },
        { name: 'Work Queue', page: 'PharmacyWorkQueue', icon: CheckSquare, description: 'Prescription queue - Review and verify doctor prescriptions, prepare orders for dispensing' },
        { name: 'Inventory', page: 'PharmacyInventory', icon: Package, description: 'Stock management - Track inventory levels, receive stock, adjust quantities, view transactions' },
        { name: 'Barcode Setup', page: 'BarcodeSetup', icon: Activity, description: 'Barcode configuration - Add barcodes to products, scan items, print labels' },
        { name: 'Product Import', page: 'PharmacyProductImport', icon: FileText, description: 'Bulk product upload - Import medicines from CSV file into the system' },
        { name: 'Operations', page: 'PharmacyOperations', icon: Activity, description: 'Daily operations - Schedule vendor visits, returns pickup, and stock tasks' },
        { name: 'Stock Import', page: 'PharmacyStockImport', icon: FileText, description: 'Bulk stock upload - Import stock batches with quantities from CSV file' },
        { name: 'Stock Taking', page: 'PharmacyStockTaking', icon: CheckSquare, description: 'Physical inventory count - Create and manage stock verification sessions' },
        { name: 'Requests', page: 'PharmacyRequests', icon: FileText, description: 'Stock requests - Manage inter-location transfers and reorder requests' },
        { name: 'Bill Card Reports', page: 'PharmacyBillCardReports', icon: BarChart3, description: 'Bill card tracking - Monitor stock movement, quantity in/out, and balances' },
        { name: 'Procurement', page: 'Procurement', icon: ShoppingBag, description: 'Purchase orders - Create POs, receive goods, manage vendors' },
      ]
    },
    {
      category: 'Home Care',
      icon: Users,
      items: [
        { name: 'Dashboard', page: 'HomeCareDashboard', icon: Activity, description: 'Home care overview - Active cases, scheduled visits, and staff assignments' },
        { name: 'Batch Management', page: 'HomeCareBatchManagement', icon: Users, description: 'Batch processing - Group and manage multiple home care referrals efficiently' },
        { name: 'Patients', page: 'HomeCarePatients', icon: Users, description: 'Home care patients - Manage patients receiving nursing or caretaker services at home' },
        { name: 'Nursing Staff', page: 'HomeCareStaff', icon: Users, description: 'Care staff management - Nursing officers and home care workers directory' },
        { name: 'Scheduling', page: 'HomeCareScheduling', icon: Calendar, description: 'Visit scheduling - Plan and assign home visits to nursing staff' },
        { name: 'Daily Reports', page: 'HomeCareReports', icon: FileText, description: 'Service documentation - Daily reports from home visits and care activities' },
      ]
    },
    {
      category: 'Clinical',
      icon: FileText,
      items: [
        { name: 'Appointments', page: 'Appointments', icon: Calendar, description: 'Appointment booking - Schedule, reschedule, and manage patient appointments' },
        { name: 'Patients', page: 'Patients', icon: Users, description: 'Patient registry - Register new patients, search and view patient records' },
        { name: 'EMR', page: 'EMR', icon: FileText, description: 'Electronic Medical Records - Clinical documentation, diagnoses, prescriptions, vitals' },
        { name: 'Dental', page: 'DentalModule', icon: Activity, description: 'Dental module - Complete dental practice management and charting' },
        { name: 'Dental Schedule', page: 'DentalSchedule', icon: Calendar, description: 'Dental appointments - Book patients to specific chairs and dentists' },
        { name: 'Dental Billing', page: 'DentalBilling', icon: DollarSign, description: 'Dental invoicing - Bill dental procedures and treatments' },
        { name: 'Sterilization', page: 'DentalSterilization', icon: Activity, description: 'Sterilization log - Track autoclave batches and instrument sterilization' },
        { name: 'Recalls', page: 'DentalRecalls', icon: Calendar, description: 'Dental recalls - Manage 6-month checkups and follow-up reminders' },
        { name: 'Medical Records', page: 'MedicalRecords', icon: FileText, description: 'Records archive - View historical medical records and documents' },
        { name: 'Task Management', page: 'TaskManagement', icon: CheckSquare, description: 'Clinical tasks - Patient follow-ups, referrals, and action items' },
      ]
    },
    {
      category: 'Laboratory',
      icon: TestTube,
      items: [
        { name: 'LIS Dashboard', page: 'LISDashboard', icon: Activity, description: 'Lab overview - Pending tests, sample tracking, and turnaround time metrics' },
        { name: 'Orders & Accessioning', page: 'LISOrders', icon: FileText, description: 'Lab orders - Receive test orders, assign accession numbers, print labels' },
        { name: 'Specimens', page: 'LISSpecimens', icon: TestTube, description: 'Sample tracking - Monitor specimen collection, transport, and status' },
        { name: 'Results', page: 'LISResults', icon: FileText, description: 'Result entry - Enter, verify, and approve lab test results' },
        { name: 'Analyzer Inbox', page: 'LISAnalyzerInbox', icon: Activity, description: 'Auto-result interface - Import results from lab analyzers and instruments' },
        { name: 'QC & Maintenance', page: 'LISQC', icon: CheckSquare, description: 'Quality control - Log QC runs, calibrations, and equipment maintenance' },
        { name: 'LIS Reports', page: 'LISReports', icon: BarChart3, description: 'Lab analytics - Test volumes, TAT analysis, and quality metrics' },
        { name: 'LIS Administration', page: 'LISAdmin', icon: Settings, description: 'Lab setup - Test catalog, reference ranges, analyzers, and templates' },
      ]
    },
    {
      category: 'Diagnostics',
      icon: Activity,
      items: [
        { name: 'Orders & Results', page: 'OrdersResults', icon: FileText, description: 'Diagnostics center - Manage radiology, ECG, ultrasound orders and results' },
        { name: 'Release Queue', page: 'ReleaseQueue', icon: FileText, description: 'Result approval - Review and release diagnostic reports to patients' },
        { name: 'Critical Queue', page: 'CriticalQueue', icon: Activity, description: 'Critical values - Urgent results requiring immediate physician notification' },
      ]
    },
    {
      category: 'Operations',
      icon: Activity,
      items: [
        { name: 'Shift Handover Book', page: 'ShiftHandover', icon: FileText, description: 'Shift logs - Document and handover important events between shifts' },
        { name: 'Daily Close', page: 'DailyClose', icon: DollarSign, description: 'End of day - Close daily operations, reconcile cash, and finalize transactions' },
        { name: 'HR Dashboard', page: 'HRDashboard', icon: Users, description: 'Human resources - Staff attendance, leave management, and HR metrics' },
        { name: 'Staff Directory', page: 'StaffDirectory', icon: Users, description: 'Employee registry - Manage staff profiles, credentials, and schedules' },
        { name: 'Payroll', page: 'PayrollManagement', icon: DollarSign, description: 'Salary processing - Calculate and manage staff payments and deductions' },
        { name: 'Third-Party Providers', page: 'ThirdPartyProviders', icon: Users, description: 'External providers - Manage visiting consultants and contract staff' },
        { name: 'Vendors', page: 'VendorManagement', icon: Building2, description: 'Vendor registry - Supplier contacts, purchase history, and agreements' },
        { name: 'Finance Dashboard', page: 'FinanceDashboard', icon: DollarSign, description: 'Financial overview - Revenue, expenses, and profitability metrics' },
        { name: 'Finance Ledger', page: 'FinanceLedger', icon: DollarSign, description: 'General ledger - Journal entries, accounts, and financial transactions' },
      ]
    },
    {
      category: 'Reports',
      icon: BarChart3,
      items: [
        { name: 'Reports', page: 'Reports', icon: FileText, description: 'Report library - Access all clinical, financial, and operational reports' },
        { name: 'Operations Reports', page: 'OperationsReports', icon: BarChart3, description: 'Operational analytics - Patient flow, appointments, and service utilization' },
        { name: 'Management Reports', page: 'ManagementReports', icon: FileText, description: 'Executive reports - KPIs, performance metrics, and strategic insights' },
        { name: 'Analytics', page: 'Analytics', icon: BarChart3, description: 'Data analytics - Trends, forecasts, and business intelligence dashboards' },
      ]
    },
    {
      category: 'Communications',
      icon: MessageSquare,
      items: [
        { name: 'Messages', page: 'Messaging', icon: MessageSquare, description: 'Internal messaging - Chat with staff, send secure messages within the organization' },
        { name: 'Communications', page: 'Communications', icon: Mail, description: 'Patient communications - Send SMS, emails, and appointment reminders to patients' },
      ]
    },
    {
      category: 'AI Assistant',
      icon: Sparkles,
      items: [
        { name: 'AI Assistant', page: 'AIAssistant', icon: Sparkles, description: 'AI-powered tools - Document analysis, report generation, and smart insights' },
      ]
    },
    {
      category: 'Platform Administration',
      icon: Globe,
      items: [
        { name: 'Platform Setup', page: 'PlatformSetup', icon: Building2, description: 'Create and manage multiple organizations/companies' },
        { name: 'Platform Billing', page: 'PlatformBilling', icon: DollarSign, description: 'Subscription billing for all organizations' },
        { name: 'Security & Compliance', page: 'PlatformSecurity', icon: Shield, description: 'Audit logs, break-glass, security validation, compliance checklists' },
        { name: 'Data Export Management', page: 'PlatformDataExport', icon: FileText, description: 'Export approvals, retention policies, archive management' },
        { name: 'External Integrations', page: 'PlatformIntegrations', icon: Activity, description: 'Patient portal, government reporting, partner management' },
        { name: 'All Users Management', page: 'UserManagement', icon: Users, description: 'View all users across all organizations, assign org admins' },
        { name: 'Final User Approvals', page: 'UserApprovals', icon: CheckSquare, description: 'Final approval for users after org admin approval' },
        { name: 'Transfer Ownership', page: 'PlatformOwnership', icon: Crown, description: 'Transfer platform ownership to another user' },
      ],
      platformOwnerOnly: true
    },
    {
      category: 'Organization Admin',
      icon: Settings,
      items: [
        { name: 'Organization Settings', page: 'Admin', icon: Settings, description: 'Organization administration - Staff, roles, branding, pricing, and configuration' },
        { name: 'User Access Approvals', page: 'UserApprovals', icon: CheckSquare, description: 'Approve or reject new user access requests for your organization' },
        { name: 'Pricing & Catalogs', page: 'PricingCatalogs', icon: DollarSign, description: 'Service pricing - Configure service fees, packages, and price lists' },
        { name: 'Patient Edit Approvals', page: 'PatientEditApprovals', icon: CheckSquare, description: 'Review and approve patient information edit requests' },
      ]
    },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
        transform transition-transform duration-300 ease-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Horizon</h1>
                <p className="text-xs text-teal-400 font-medium">ClinicSuite</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
                    <nav className="flex-1 p-4 overflow-y-auto">
                      <Accordion type="multiple" defaultValue={['Main', 'Pharmacy']} className="space-y-1">
                        {navigationGroups.filter(group => {
                          // Filter out Platform Administration for non-platform owners
                          if (group.platformOwnerOnly) {
                            const isPlatformOwner = user?.email === 'madhawaekanayake@gmail.com' || 
                                                    user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                                                    user?.is_platform_owner;
                            return isPlatformOwner;
                          }
                          return true;
                        }).map((group) => (
                <AccordionItem key={group.category} value={group.category} className="border-none">
                  <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-slate-700/50 rounded-lg text-slate-300 hover:text-white">
                    <div className="flex items-center gap-3">
                      <group.icon className="w-5 h-5" />
                      <span className="font-semibold text-sm">{group.category}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-1">
                    <div className="space-y-0.5 pl-2">
                      {group.items.map((item) => {
                        const isActive = currentPageName === item.page;
                        return (
                          <TooltipProvider key={item.page} delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  to={createPageUrl(item.page)}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`
                                    flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group
                                    ${isActive 
                                      ? 'bg-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/10' 
                                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }
                                  `}
                                >
                                  <item.icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                  <span className="text-sm">{item.name}</span>
                                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                                </Link>
                              </TooltipTrigger>
                              {item.description && (
                                <TooltipContent side="right" className="max-w-xs bg-slate-800 border-slate-700">
                                  <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-slate-200">{item.description}</p>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 lg:flex-none" />
            
            <div className="flex items-center gap-4">
              {branding?.primary_logo_file_ref && (
                <img 
                  src={branding.primary_logo_file_ref} 
                  alt="Organization Logo" 
                  className="h-12 w-auto object-contain"
                />
              )}
              {!branding?.primary_logo_file_ref && (
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-slate-900">Horizon ClinicSuite</p>
                  <p className="text-xs text-slate-500">Electronic Medical Records</p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>

        {/* Footer with version */}
        <footer className="border-t border-slate-200 p-4 text-center text-xs text-slate-500">
          {branding?.footer_text || 'Healthcare Management System'}
        </footer>
        </div>
        </div>
        );
        }