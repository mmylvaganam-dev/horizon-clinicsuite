import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lock, Activity, FileText, TestTube, ShoppingBag, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';

export default function AdminOrganizationActivity() {
  const navigate = useNavigate();
  const [selectedOrg, setSelectedOrg] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', currentUser?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: currentUser.id });
      return roles;
    },
    enabled: !!currentUser,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'PLATFORM_OWNER';
  });

  useEffect(() => {
    if (currentUser && !isPlatformOwner) {
      toast.error('Access denied: PLATFORM_OWNER role required');
      navigate(createPageUrl('Admin'));
      return;
    }

    if (currentUser && isPlatformOwner) {
      base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'view',
        record_type: 'OrganizationActivity',
        record_id: '',
        metadata: { page: 'organization_activity_dashboard' }
      }).catch(err => console.error('Audit log error:', err));
    }
  }, [currentUser, isPlatformOwner, navigate]);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isPlatformOwner,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs', selectedOrg],
    queryFn: async () => {
      if (selectedOrg === 'all') {
        return await base44.entities.AuditLog.list('-timestamp', 10000);
      }
      return await base44.entities.AuditLog.filter({ organization_id: selectedOrg }, '-timestamp', 10000);
    },
    enabled: isPlatformOwner,
  });

  const { data: encounters = [] } = useQuery({
    queryKey: ['encounters', selectedOrg],
    queryFn: async () => {
      if (selectedOrg === 'all') {
        return await base44.entities.Encounter.list();
      }
      return await base44.entities.Encounter.filter({ organization_id: selectedOrg });
    },
    enabled: isPlatformOwner,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', selectedOrg],
    queryFn: async () => {
      if (selectedOrg === 'all') {
        return await base44.entities.Order.list();
      }
      return await base44.entities.Order.filter({ organization_id: selectedOrg });
    },
    enabled: isPlatformOwner,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', selectedOrg],
    queryFn: async () => {
      if (selectedOrg === 'all') {
        return await base44.entities.Result.list();
      }
      return await base44.entities.Result.filter({ organization_id: selectedOrg });
    },
    enabled: isPlatformOwner,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedOrg],
    queryFn: async () => {
      if (selectedOrg === 'all') {
        return await base44.entities.Invoice.list();
      }
      return await base44.entities.Invoice.filter({ organization_id: selectedOrg });
    },
    enabled: isPlatformOwner,
  });

  const { data: pharmacySales = [] } = useQuery({
    queryKey: ['pharmacySales', selectedOrg],
    queryFn: async () => {
      if (selectedOrg === 'all') {
        return await base44.entities.PharmacySale.list();
      }
      return await base44.entities.PharmacySale.filter({ organization_id: selectedOrg });
    },
    enabled: isPlatformOwner,
  });

  if (!isPlatformOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">PLATFORM_OWNER role required</p>
        </Card>
      </div>
    );
  }

  // Calculate metrics
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const loginLogs = auditLogs.filter(log => log.action === 'login');
  const logins7Days = loginLogs.filter(log => new Date(log.timestamp) >= sevenDaysAgo).length;
  const logins30Days = loginLogs.filter(log => new Date(log.timestamp) >= thirtyDaysAgo).length;

  const encountersCreated = encounters.length;
  const ordersPlaced = orders.length;
  const resultsSigned = results.filter(r => r.status === 'Signed' || r.status === 'Reviewed').length;
  const invoicesIssued = invoices.length;
  const invoicesPaid = invoices.filter(i => i.status === 'paid' || i.status === 'completed').length;
  const invoicesTotal = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const paidTotal = invoices.filter(i => i.status === 'paid' || i.status === 'completed').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const pharmacySalesCount = pharmacySales.length;
  const labVolume = results.filter(r => r.result_type === 'LAB').length;

  const metrics = [
    {
      title: 'Logins (7 Days)',
      value: logins7Days,
      icon: Activity,
      color: 'from-blue-500 to-blue-600',
      badge: `${logins30Days} in 30 days`
    },
    {
      title: 'Encounters Created',
      value: encountersCreated,
      icon: FileText,
      color: 'from-teal-500 to-teal-600'
    },
    {
      title: 'Orders Placed',
      value: ordersPlaced,
      icon: Calendar,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Results Signed',
      value: resultsSigned,
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Invoices Issued',
      value: invoicesIssued,
      icon: DollarSign,
      color: 'from-indigo-500 to-indigo-600',
      badge: `${invoicesPaid} paid`
    },
    {
      title: 'Invoice Totals',
      value: `$${invoicesTotal.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      badge: `$${paidTotal.toLocaleString()} collected`
    },
    {
      title: 'Pharmacy Sales',
      value: pharmacySalesCount,
      icon: ShoppingBag,
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Lab Volume',
      value: labVolume,
      icon: TestTube,
      color: 'from-cyan-500 to-cyan-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Activity Dashboard</h1>
          <p className="text-slate-500 mt-1">Aggregate activity metrics by organization</p>
        </div>
        <Badge className="bg-rose-100 text-rose-700">PLATFORM_OWNER ONLY</Badge>
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Privacy Protection</p>
              <p className="text-sm text-amber-800 mt-1">
                This dashboard displays aggregate counts only. No patient names, patient IDs, or patient-level details are shown.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.organization_name || org.name || `Org-${org.id.substring(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${metric.color}`} />
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-1">{metric.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                  {metric.badge && (
                    <Badge variant="outline" className="mt-2">
                      {metric.badge}
                    </Badge>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center flex-shrink-0`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}