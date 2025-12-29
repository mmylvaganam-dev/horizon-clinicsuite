import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  CheckSquare
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { name: 'EMR', page: 'EMR', icon: FileText },
    { name: 'Patients', page: 'Patients', icon: Users },
    { name: 'Appointments', page: 'Appointments', icon: Calendar },
    { name: 'Medical Records', page: 'MedicalRecords', icon: FileText },
    { name: 'Orders & Results', page: 'OrdersResults', icon: FileText },
    { name: 'Release Queue', page: 'ReleaseQueue', icon: FileText },
    { name: 'Critical Queue', page: 'CriticalQueue', icon: Activity },
    { name: 'Task Management', page: 'TaskManagement', icon: CheckSquare },

    { name: '─ PHARMACY ─', page: null, icon: null, divider: true },
    { name: 'Pharmacy Dashboard', page: 'PharmacyDashboard', icon: Activity },
    { name: 'Point of Sale', page: 'PharmacyPOS', icon: ShoppingBag },
    { name: 'Inventory', page: 'PharmacyInventory', icon: Activity },
    { name: 'Procurement', page: 'Procurement', icon: ShoppingBag },

    { name: '─ FINANCE ─', page: null, icon: null, divider: true },
    { name: 'Finance Dashboard', page: 'FinanceDashboard', icon: DollarSign },
    { name: 'Companies', page: 'FinanceCompanies', icon: Building2 },
    { name: 'Billing', page: 'Billing', icon: DollarSign },

    { name: '─ COMMUNICATIONS ─', page: null, icon: null, divider: true },
    { name: 'Messages', page: 'Messaging', icon: MessageSquare },
    { name: 'Communications', page: 'Communications', icon: Mail },

    { name: '─ REPORTS ─', page: null, icon: null, divider: true },
    { name: 'Daily Ops', page: 'DailyOps', icon: Activity },
    { name: 'Reports', page: 'Reports', icon: FileText },
    { name: 'Management Reports', page: 'ManagementReports', icon: FileText },
    { name: 'Analytics', page: 'Analytics', icon: BarChart3 },

    { name: '─ ADMIN ─', page: null, icon: null, divider: true },
    { name: 'Admin', page: 'Admin', icon: Settings },
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
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              if (item.divider) {
                return (
                  <div key={`divider-${index}`} className="px-4 py-2">
                    <p className="text-xs font-semibold text-slate-500 tracking-wider">{item.name}</p>
                  </div>
                );
              }

              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/10' 
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="font-medium">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex-1 lg:flex-none" />
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">Horizon ClinicSuite</p>
                <p className="text-xs text-slate-500">Electronic Medical Records</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>

        {/* Footer with version */}
        <footer className="border-t border-slate-200 p-4 text-center text-xs text-slate-500">
          Asia ClinicSuite v1.0 — Production Ready
        </footer>
        </div>
        </div>
        );
        }