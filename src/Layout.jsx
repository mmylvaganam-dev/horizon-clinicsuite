import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Shield,
  AlertTriangle,
  RefreshCw,
  Cloud,
  Monitor,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import OrganizationSwitcher from '@/components/shared/OrganizationSwitcher';
import { useOrganization, OrganizationProvider } from '@/components/OrganizationProvider';
import AppGuide from '@/components/shared/AppGuide';



function LayoutContent({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userApproved, setUserApproved] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const mainContentRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isPlatformOwner, user: contextUser } = useOrganization();

  // Auto-refresh all data every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.refetchQueries();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Pull-to-refresh mechanism
  const handleTouchStart = (e) => {
    if (mainContentRef.current?.scrollTop === 0) {
      setPullStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (pullStart > 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStart;
      if (distance > 0 && distance < 150) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await queryClient.refetchQueries();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setPullStart(0);
      }, 1000);
    } else {
      setPullDistance(0);
      setPullStart(0);
    }
  };
  
  const { data: user, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const userData = await base44.auth.me();
        console.log('✅ Auth.me() success:', userData);
        return userData;
      } catch (error) {
        console.error('❌ Auth.me() failed:', error);
        // Return a mock user with email from JWT token
        const token = localStorage.getItem('base44_token') || sessionStorage.getItem('base44_token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
              email: payload.sub,
              is_platform_owner: payload.sub === 'mmylvaganam@premierhealthcanada.ca' || 
                                 payload.sub === 'mylvaganam@premierhealthcanada.ca'
            };
          } catch (e) {
            console.error('Failed to decode JWT:', e);
          }
        }
        return null;
      }
    },
  });
  
  if (userError) {
    console.error('User query error:', userError);
  }

  // DEBUG: Log current user and platform owner status
  console.log('🔍 Layout Debug - User email:', user?.email, contextUser?.email);
  console.log('🔍 Layout Debug - isPlatformOwner from context:', isPlatformOwner);

  // CRITICAL: Use contextUser (from OrganizationProvider) as fallback since it loads faster
  const currentUserEmail = user?.email || contextUser?.email;
  
  // CRITICAL: Platform owner status is PERMANENT - check email FIRST, independent of organization/company status
  // ONLY these two emails are platform owners
  const isDefinitelyPlatformOwner = currentUserEmail === 'mmylvaganam@premierhealthcanada.ca' || 
    currentUserEmail === 'mylvaganam@premierhealthcanada.ca' ||
    isPlatformOwner === true ||
    user?.is_platform_owner === true;
  
  console.log('🔴 Layout - PLATFORM OWNER STATUS:', isDefinitelyPlatformOwner, '(This should ALWAYS be true for platform owner, regardless of org/company status)');

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      if (!isDefinitelyPlatformOwner) return [];
      const all = await base44.entities.UserApproval.filter({ final_status: 'pending_platform' });
      return all;
    },
    enabled: isDefinitelyPlatformOwner,
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    const checkApproval = async () => {
      try {
        // Check if user is blocked first
        const blockCheck = await base44.functions.invoke('checkUserBlocked');
        if (blockCheck.data.blocked) {
          setIsBlocked(true);
          setUserApproved(false);
          return;
        }
        
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

  const { selectedOrgId } = useOrganization();
  
  const { data: branding } = useQuery({
    queryKey: ['organizationBranding', selectedOrgId],
    queryFn: async () => {
      if (!userApproved || !selectedOrgId) return null;
      console.log('Fetching branding for org:', selectedOrgId);
      const brandings = await base44.entities.OrganizationBranding.filter({ organization_id: selectedOrgId });
      console.log('Branding loaded:', brandings[0]);
      return brandings[0] || null;
    },
    enabled: userApproved !== false && !!selectedOrgId,
  });

  const { data: currentOrganization } = useQuery({
    queryKey: ['currentOrganization', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      console.log('Fetching organization:', selectedOrgId);
      const allOrgs = await base44.entities.Organization.list();
      const org = allOrgs.find(o => o.id === selectedOrgId);
      console.log('Organization loaded:', org);
      return org;
    },
    enabled: !!selectedOrgId,
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
      category: 'Queue Management',
      icon: Users,
      items: [
        { name: 'Queue Dashboard', page: 'QueueManagement', icon: Users, description: 'Real-time queue control — manage tokens, call patients, view waiting lists for all counters' },
        { name: 'Display Board', page: 'QueueDisplay', icon: Monitor, description: 'TV display board — shows currently called tokens and waiting count for each counter' },
      ]
    },
    {
      category: 'Clinical',
      icon: FileText,
      items: [
        { name: 'Appointments', page: 'Appointments', icon: Calendar, description: 'Appointment booking - Schedule, reschedule, and manage patient appointments' },
        { name: 'Patients', page: 'Patients', icon: Users, description: 'Patient registry - Register new patients, search and view patient records' },
        { name: 'EMR', page: 'EMR', icon: FileText, description: 'Electronic Medical Records - Clinical documentation, diagnoses, prescriptions, vitals' },
        { name: 'Medical Records', page: 'MedicalRecords', icon: FileText, description: 'Records archive - View historical medical records and documents' },
        { name: 'Task Management', page: 'TaskManagement', icon: CheckSquare, description: 'Clinical tasks - Patient follow-ups, referrals, and action items' },
      ]
    },
    {
      category: 'Dental Clinic',
      icon: Activity,
      items: [
        { name: 'Dental Dashboard', page: 'DentalModule', icon: Activity, description: 'Dental overview - Encounters, treatment plans, and active problems' },
        { name: 'Dental Schedule', page: 'DentalSchedule', icon: Calendar, description: 'Dental appointments - Book patients to specific chairs and dentists' },
        { name: 'Dental Billing', page: 'DentalBilling', icon: DollarSign, description: 'Dental invoicing - Bill dental procedures and treatments' },
        { name: 'Sterilization', page: 'DentalSterilization', icon: Activity, description: 'Sterilization log - Track autoclave batches and instrument sterilization' },
        { name: 'Recalls', page: 'DentalRecalls', icon: Calendar, description: 'Dental recalls - Manage 6-month checkups and follow-up reminders' },
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
        { name: 'Bank Statements', page: 'BankStatementManager', icon: Building2, description: 'Bank statement management - Upload statements, track cash flow, view financial KPIs and charts' },
        { name: 'Finance Dashboard', page: 'FinanceDashboard', icon: DollarSign, description: 'Financial overview - Revenue, expenses, and profitability metrics' },
        { name: 'Finance Ledger', page: 'FinanceLedger', icon: DollarSign, description: 'General ledger - Journal entries, accounts, and financial transactions' },
      ]
    },
    {
      category: 'Reports',
      icon: BarChart3,
      items: [
        { name: 'Sales Analytics', page: 'SalesAnalytics', icon: DollarSign, description: 'Pharmacy revenue analytics - View sales trends, request deletions' },
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
        { name: 'Send SMS', page: 'SendSMS', icon: MessageSquare, description: 'Send bulk SMS via Dialog eSMS - Send messages to patients and customers' },
        { name: 'SMS Logs', page: 'SmsLogs', icon: FileText, description: 'View SMS history - Track sent messages, delivery status, and campaign IDs' },
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
      category: 'Telemedicine',
      icon: Video,
      items: [
        { name: 'Services', page: 'TelemedicineServices', icon: Video, description: 'Manage virtual care service types and offerings' },
        { name: 'Doctors', page: 'TelemedicineDoctors', icon: Users, description: 'Manage doctors available for virtual consultations' },
        { name: 'Subscriptions', page: 'TelemedicineSubscriptions', icon: DollarSign, description: 'Individual, family and corporate subscription plans' },
        { name: 'Corporates', page: 'TelemedicineCorporates', icon: Building2, description: 'Corporate client accounts and employee coverage' },
        { name: 'Patient Portal', page: 'TelemedicinePatientPortal', icon: Users, description: 'Patient-facing virtual hospital portal' },
        { name: 'Patient Login Page', page: 'TeleLogin', icon: Video, description: 'Patient OTP login page for the telemedicine portal' },
        { name: 'Provider Portal', page: 'TelemedicineProviderPortal', icon: Activity, description: 'Doctor-facing virtual consultation portal' },
        { name: 'Admin', page: 'TelemedicineAdmin', icon: Settings, description: 'Virtual hospital administration and configuration' },
      ]
    },
    {
      category: 'Premier Wholesale',
      icon: Package,
      items: [
        { name: 'Platform Admin', page: 'WholesalePlatformAdmin', icon: Shield, description: 'Manage wholesale providers, approve connections, link buyers to suppliers (Platform Owner Only)' },
        { name: 'My Provider Portal', page: 'WholesaleProviderAdmin', icon: Package, description: 'Wholesale provider admin — manage your products, orders, buyers, credit & payments' },
        { name: 'Marketplace', page: 'WholesaleMarketplace', icon: Package, description: 'Browse all wholesale providers, place orders, and manage your supplier connections' },
      ],
      platformOwnerOnly: false
    },
    {
      category: 'Platform Administration',
      icon: Globe,
      items: [
        { name: 'Platform Setup', page: 'PlatformSetup', icon: Building2, description: 'Create and manage multiple organizations/companies' },
        { name: 'Finance Companies', page: 'FinanceCompanies', icon: Building2, description: 'Activate/deactivate companies and manage company status' },
        { name: 'Platform SMS Settings', page: 'PlatformSmsSettings', icon: MessageSquare, description: 'Configure Dialog eSMS credentials for each company' },
        { name: 'Google Drive Backups', page: 'PlatformBackupSettings', icon: Cloud, description: 'Configure automated backups to Google Drive for each company' },
        { name: 'Platform Billing', page: 'PlatformBilling', icon: DollarSign, description: 'Subscription billing for all organizations' },
        { name: 'Org Admin Audit Report', page: 'OrgAdminAuditReport', icon: Shield, description: 'Track all deletion actions by organization administrators' },
        { name: 'Security & Compliance', page: 'PlatformSecurity', icon: Shield, description: 'Audit logs, break-glass, security validation, compliance checklists' },
        { name: 'Data Export Management', page: 'PlatformDataExport', icon: FileText, description: 'Export approvals, retention policies, archive management' },
        { name: 'External Integrations', page: 'PlatformIntegrations', icon: Activity, description: 'Patient portal, government reporting, partner management' },
        { name: 'Platform Users', page: 'PlatformUserManagement', icon: Users, description: 'View and manage all users across all organizations' },
        { name: 'User Approvals', page: 'UserApprovals', icon: CheckSquare, description: 'Approve or reject pending user access requests' },
        { name: 'Blocked Users', page: 'BlockedUsers', icon: Shield, description: 'Permanently block users from accessing the platform' },
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
        { name: 'Sale Deletion Requests', page: 'SaleDeletionRequests', icon: CheckSquare, description: 'Review and approve staff sale deletion requests' },
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
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200
        transform transition-transform duration-300 ease-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Horizon</h1>
                <p className="text-xs text-teal-600 font-medium">ClinicSuite</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
                    <nav className="flex-1 p-4 overflow-y-auto bg-slate-50">
                      <Accordion type="multiple" defaultValue={['Main', 'Pharmacy', 'Platform Administration']} className="space-y-1">
                        {navigationGroups.filter(group => {
                          // CRITICAL: Platform Administration visibility is based ONLY on user email - never organization or company status
                          if (group.platformOwnerOnly) {
                            console.log('🔴 Filtering Platform Administration - isPlatformOwner:', isDefinitelyPlatformOwner);
                            return isDefinitelyPlatformOwner;
                          }
                          return true;
                        }).map((group) => (
                <AccordionItem key={group.category} value={group.category} className="border-none">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-white rounded-lg text-slate-700 hover:text-slate-900">
                    <div className="flex items-center gap-3">
                      <group.icon className="w-4 h-4" />
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
                                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group
                                    ${isActive 
                                      ? 'bg-teal-600 text-white' 
                                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                    }
                                  `}
                                >
                                  <item.icon className={`w-4 h-4`} />
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
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-slate-600 hover:text-slate-900 hover:bg-white"
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
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
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
              <AppGuide />
              {isDefinitelyPlatformOwner && pendingApprovals.length > 0 && (
                <Button
                  variant="outline"
                  className="relative border-red-600 text-red-700 hover:bg-red-50"
                  onClick={() => window.location.href = createPageUrl('UserApprovals')}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {pendingApprovals.length} Pending
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {pendingApprovals.length}
                  </span>
                </Button>
              )}
              
              {/* PLATFORM OWNER ONLY: Organization Switcher */}
              {isDefinitelyPlatformOwner && !currentPageName?.startsWith('Platform') && !currentPageName?.includes('UserManagement') && !currentPageName?.includes('UserApprovals') && !currentPageName?.includes('BlockedUsers') && (
                <div className="border border-teal-600 rounded-lg p-1 bg-teal-50">
                  <OrganizationSwitcher />
                </div>
              )}
              
              {/* EVERYONE: Show current organization info */}
              {selectedOrgId && !currentPageName?.startsWith('Platform') && !currentPageName?.includes('UserManagement') && !currentPageName?.includes('UserApprovals') && !currentPageName?.includes('BlockedUsers') && (
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-slate-200">
                  {branding?.primary_logo_file_ref ? (
                    <img 
                      src={branding.primary_logo_file_ref} 
                      alt="Logo" 
                      className="h-8 w-auto object-contain"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-teal-600" />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">
                      {currentOrganization?.name || 'Loading...'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {currentOrganization?.type?.replace('_', ' ') || ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main 
          ref={mainContentRef}
          className="p-4 lg:p-8 pb-24 lg:pb-8 relative" 
          style={{ overscrollBehavior: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull to refresh indicator */}
          {pullDistance > 0 && (
            <div 
              className="absolute top-0 left-0 right-0 flex justify-center items-center transition-all"
              style={{ 
                transform: `translateY(${Math.min(pullDistance - 60, 40)}px)`,
                opacity: Math.min(pullDistance / 80, 1)
              }}
            >
              <div className="bg-white rounded-full p-2 shadow-lg">
                <RefreshCw className={`w-6 h-6 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </div>
            </div>
          )}
          {isBlocked ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="max-w-md text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
                <p className="text-slate-600">
                  Your account has been blocked by the platform administrator.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => base44.auth.logout()}
                  className="mt-4"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Mobile Bottom Tabs with History Preservation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => navigate(createPageUrl('DailyOps'))}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                currentPageName === 'DailyOps' ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <Activity className="w-6 h-6" />
              <span className="text-xs mt-1">Daily Ops</span>
            </button>
            <button
              onClick={() => navigate(createPageUrl('PatientHub'))}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                currentPageName === 'PatientHub' ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs mt-1">Patients</span>
            </button>
            <button
              onClick={() => navigate(createPageUrl('PharmacyBilling'))}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                currentPageName === 'PharmacyBilling' ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <ShoppingBag className="w-6 h-6" />
              <span className="text-xs mt-1">POS</span>
            </button>
            <button
              onClick={() => navigate(createPageUrl('Admin'))}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                currentPageName === 'Admin' ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-xs mt-1">Admin</span>
            </button>
          </div>
        </div>

        {/* Footer with version */}
        <footer className="border-t border-slate-200 p-4 text-center text-xs text-slate-500">
          {branding?.footer_text || 'Healthcare Management System'}
        </footer>
        </div>
        </div>
        );
        }

        export default function Layout({ children, currentPageName }) {
        return (
        <OrganizationProvider>
        <LayoutContent children={children} currentPageName={currentPageName} />
        </OrganizationProvider>
        );
        }