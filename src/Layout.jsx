import React, { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding'],
    queryFn: async () => {
      const brandings = await base44.entities.OrganizationBranding.list();
      return brandings[0];
    },
  });

  const navigationGroups = [
    {
      category: 'Dashboards',
      icon: LayoutDashboard,
      items: [
        { name: 'Home', page: 'Home', icon: LayoutDashboard },
        { name: 'Daily Ops', page: 'DailyOps', icon: Activity },
      ]
    },
    {
      category: 'Workspaces',
      icon: Activity,
      items: [
        { name: 'Provider Dashboard', page: 'ProviderDashboard', icon: Activity },
        { name: 'Sales', page: 'SalesWorkspace', icon: DollarSign },
      ]
    },
    {
      category: 'Pharmacy',
      icon: ShoppingBag,
      items: [
        { name: 'Dashboard', page: 'PharmacyDashboard', icon: Activity },
        { name: 'Work Queue', page: 'PharmacyWorkQueue', icon: CheckSquare },
        { name: 'Point of Sale', page: 'PharmacyBilling', icon: ShoppingBag },
        { name: 'Inventory', page: 'PharmacyInventory', icon: Package },
        { name: 'Barcode Setup', page: 'BarcodeSetup', icon: Activity },
        { name: 'Product Import', page: 'PharmacyProductImport', icon: FileText },
        { name: 'Operations', page: 'PharmacyOperations', icon: Activity },
        { name: 'Stock Import', page: 'PharmacyStockImport', icon: FileText },
        { name: 'Stock Taking', page: 'PharmacyStockTaking', icon: CheckSquare },
        { name: 'Requests', page: 'PharmacyRequests', icon: FileText },
        { name: 'Bill Card Reports', page: 'PharmacyBillCardReports', icon: BarChart3 },
        { name: 'Procurement', page: 'Procurement', icon: ShoppingBag },
      ]
    },
    {
      category: 'Home Care',
      icon: Users,
      items: [
        { name: 'Dashboard', page: 'HomeCareDashboard', icon: Activity },
        { name: 'Batch Management', page: 'HomeCareBatchManagement', icon: Users },
        { name: 'Patients', page: 'HomeCarePatients', icon: Users },
        { name: 'Nursing Staff', page: 'HomeCareStaff', icon: Users },
        { name: 'Scheduling', page: 'HomeCareScheduling', icon: Calendar },
        { name: 'Daily Reports', page: 'HomeCareReports', icon: FileText },
      ]
    },
    {
      category: 'Clinical',
      icon: FileText,
      items: [
        { name: 'Appointments', page: 'Appointments', icon: Calendar },
        { name: 'Patients', page: 'Patients', icon: Users },
        { name: 'EMR', page: 'EMR', icon: FileText },
        { name: 'Dental', page: 'DentalModule', icon: Activity },
        { name: 'Dental Schedule', page: 'DentalSchedule', icon: Calendar },
        { name: 'Dental Billing', page: 'DentalBilling', icon: DollarSign },
        { name: 'Sterilization', page: 'DentalSterilization', icon: Activity },
        { name: 'Recalls', page: 'DentalRecalls', icon: Calendar },
        { name: 'Medical Records', page: 'MedicalRecords', icon: FileText },
        { name: 'Task Management', page: 'TaskManagement', icon: CheckSquare },
      ]
    },
    {
      category: 'Laboratory',
      icon: TestTube,
      items: [
        { name: 'LIS Dashboard', page: 'LISDashboard', icon: Activity },
        { name: 'Orders & Accessioning', page: 'LISOrders', icon: FileText },
        { name: 'Specimens', page: 'LISSpecimens', icon: TestTube },
        { name: 'Results', page: 'LISResults', icon: FileText },
        { name: 'Analyzer Inbox', page: 'LISAnalyzerInbox', icon: Activity },
        { name: 'QC & Maintenance', page: 'LISQC', icon: CheckSquare },
        { name: 'LIS Reports', page: 'LISReports', icon: BarChart3 },
        { name: 'LIS Administration', page: 'LISAdmin', icon: Settings },
      ]
    },
    {
      category: 'Diagnostics',
      icon: Activity,
      items: [
        { name: 'Orders & Results', page: 'OrdersResults', icon: FileText },
        { name: 'Release Queue', page: 'ReleaseQueue', icon: FileText },
        { name: 'Critical Queue', page: 'CriticalQueue', icon: Activity },
      ]
    },
    {
      category: 'Operations',
      icon: Activity,
      items: [
        { name: 'Shift Handover Book', page: 'ShiftHandover', icon: FileText },
        { name: 'Daily Close', page: 'DailyClose', icon: DollarSign },
        { name: 'HR Dashboard', page: 'HRDashboard', icon: Users },
        { name: 'Staff Directory', page: 'StaffDirectory', icon: Users },
        { name: 'Payroll', page: 'PayrollManagement', icon: DollarSign },
        { name: 'Third-Party Providers', page: 'ThirdPartyProviders', icon: Users },
        { name: 'Vendors', page: 'VendorManagement', icon: Building2 },
        { name: 'Finance Dashboard', page: 'FinanceDashboard', icon: DollarSign },
        { name: 'Finance Ledger', page: 'FinanceLedger', icon: DollarSign },
      ]
    },
    {
      category: 'Reports',
      icon: BarChart3,
      items: [
        { name: 'Reports', page: 'Reports', icon: FileText },
        { name: 'Operations Reports', page: 'OperationsReports', icon: BarChart3 },
        { name: 'Management Reports', page: 'ManagementReports', icon: FileText },
        { name: 'Analytics', page: 'Analytics', icon: BarChart3 },
      ]
    },
    {
      category: 'Communications',
      icon: MessageSquare,
      items: [
        { name: 'Messages', page: 'Messaging', icon: MessageSquare },
        { name: 'Communications', page: 'Communications', icon: Mail },
      ]
    },
    {
      category: 'AI Assistant',
      icon: Sparkles,
      items: [
        { name: 'AI Assistant', page: 'AIAssistant', icon: Sparkles },
      ]
    },
    {
      category: 'Administration',
      icon: Settings,
      items: [
        { name: 'Company Profile', page: 'FinanceCompanies', icon: Building2 },
        { name: 'Pricing & Catalogs', page: 'PricingCatalogs', icon: DollarSign },
        { name: 'Admin', page: 'Admin', icon: Settings },
      ]
    },
    {
      category: 'Platform Owner',
      icon: Building2,
      items: [
        { name: 'Platform Billing', page: 'PlatformBilling', icon: DollarSign },
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
            <Accordion type="multiple" defaultValue={['Dashboards', 'Pharmacy']} className="space-y-1">
              {navigationGroups.map((group) => (
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
                          <Link
                            key={item.page}
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