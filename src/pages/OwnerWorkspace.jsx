import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Users, DollarSign, Activity, TrendingUp, Package,
  TestTube, Home, Calendar, FileText, Heart, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from 'date-fns';

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function KPICard({ title, value, subtitle, icon: Icon, color = 'teal', trend }) {
  const colorMap = {
    teal: 'bg-teal-100 text-teal-600',
    blue: 'bg-blue-100 text-blue-600',
    violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-600',
  };
  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm font-medium text-slate-600 mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export default function OwnerWorkspace() {
  const [selectedOrg, setSelectedOrg] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const rangeStart = useMemo(() => new Date(dateFrom + 'T00:00:00'), [dateFrom]);
  const rangeEnd = useMemo(() => new Date(dateTo + 'T23:59:59'), [dateTo]);

  // ── Data Fetches ──────────────────────────────────────────────────
  const { data: organizations = [] } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['all-patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.Appointment.list('-created_date', 500),
  });

  const { data: pharmacySales = [] } = useQuery({
    queryKey: ['all-pharmacy-sales'],
    queryFn: () => base44.entities.PharmacySaleHeader.list('-created_date', 500),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['all-invoices'],
    queryFn: () => base44.entities.InvoiceHeader.list('-created_date', 500),
  });

  const { data: homeCaseCases = [] } = useQuery({
    queryKey: ['all-homecare-cases'],
    queryFn: () => base44.entities.HomeCareCase.list('-created_date', 300),
  });

  const { data: labOrders = [] } = useQuery({
    queryKey: ['all-lab-orders'],
    queryFn: () => base44.entities.Order.filter({ order_type: 'LAB' }, '-created_date', 500),
  });

  const { data: shiftSnapshots = [] } = useQuery({
    queryKey: ['all-shift-snapshots'],
    queryFn: () => base44.entities.ShiftCashSnapshot.list('-created_date', 500),
  });

  const { data: shiftLogs = [] } = useQuery({
    queryKey: ['all-shift-logs'],
    queryFn: () => base44.entities.ShiftLog.list('-created_date', 200),
  });

  const { data: homeCareAssignments = [] } = useQuery({
    queryKey: ['all-homecare-assignments'],
    queryFn: () => base44.entities.HomeCareAssignment.list('-created_date', 300),
  });

  // ── Helpers ───────────────────────────────────────────────────────
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      return d >= rangeStart && d <= rangeEnd;
    } catch { return false; }
  };

  const forOrg = (item) => selectedOrg === 'ALL' || item.organization_id === selectedOrg;

  // ── Filtered Data ─────────────────────────────────────────────────
  const filteredSales = useMemo(() =>
    pharmacySales.filter(s => forOrg(s) && inRange(s.created_date)), [pharmacySales, selectedOrg, rangeStart, rangeEnd]);

  const filteredInvoices = useMemo(() =>
    invoices.filter(i => forOrg(i) && inRange(i.created_date)), [invoices, selectedOrg, rangeStart, rangeEnd]);

  const filteredPatients = useMemo(() =>
    patients.filter(p => forOrg(p) && inRange(p.created_date)), [patients, selectedOrg, rangeStart, rangeEnd]);

  const filteredAppointments = useMemo(() =>
    appointments.filter(a => forOrg(a) && inRange(a.start_time || a.created_date)), [appointments, selectedOrg, rangeStart, rangeEnd]);

  const filteredHomeCare = useMemo(() =>
    homeCaseCases.filter(c => inRange(c.created_date)), [homeCaseCases, rangeStart, rangeEnd]);

  const filteredLab = useMemo(() =>
    labOrders.filter(o => forOrg(o) && inRange(o.created_date)), [labOrders, selectedOrg, rangeStart, rangeEnd]);

  // Shift snapshots: join to shift_log for org filter
  const orgShiftLogIds = useMemo(() => {
    if (selectedOrg === 'ALL') return new Set(shiftLogs.map(s => s.id));
    return new Set(shiftLogs.filter(s => s.organization_id === selectedOrg).map(s => s.id));
  }, [shiftLogs, selectedOrg]);

  const filteredSnapshots = useMemo(() =>
    shiftSnapshots.filter(s => orgShiftLogIds.has(s.shift_log_ref) && inRange(s.created_date)),
    [shiftSnapshots, orgShiftLogIds, rangeStart, rangeEnd]);

  // ── KPIs ──────────────────────────────────────────────────────────
  const totalPharmacyRevenue = filteredSales.reduce((s, x) => s + (x.total || 0), 0);
  const totalInvoiceRevenue = filteredInvoices.reduce((s, x) => s + (x.total || 0), 0);
  const totalRevenue = totalPharmacyRevenue + totalInvoiceRevenue;

  const takeoverCash = filteredSnapshots.filter(s => s.snapshot_type === 'TAKEOVER').reduce((s, x) => s + (x.amount || 0), 0);
  const handoverCash = filteredSnapshots.filter(s => s.snapshot_type === 'HANDOVER').reduce((s, x) => s + (x.amount || 0), 0);

  // ── Monthly Revenue Trend ─────────────────────────────────────────
  const last6Months = useMemo(() => eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() }), []);

  const monthlyRevenue = useMemo(() => last6Months.map(month => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const inMonth = (dateStr) => { try { const d = new Date(dateStr); return d >= start && d <= end; } catch { return false; } };
    const orgMatch = (item) => selectedOrg === 'ALL' || item.organization_id === selectedOrg;
    const pharmRev = pharmacySales.filter(s => orgMatch(s) && inMonth(s.created_date)).reduce((s, x) => s + (x.total || 0), 0);
    const invRev = invoices.filter(i => orgMatch(i) && inMonth(i.created_date)).reduce((s, x) => s + (x.total || 0), 0);
    return { month: format(month, 'MMM yy'), pharmacy: pharmRev, clinical: invRev, total: pharmRev + invRev };
  }), [pharmacySales, invoices, selectedOrg, last6Months]);

  // ── Revenue by Company ────────────────────────────────────────────
  const revenueByOrg = useMemo(() => organizations.map(org => {
    const orgSales = pharmacySales.filter(s => s.organization_id === org.id && inRange(s.created_date));
    const orgInv = invoices.filter(i => i.organization_id === org.id && inRange(i.created_date));
    const revenue = [...orgSales, ...orgInv].reduce((s, x) => s + (x.total || 0), 0);
    const patientsCount = patients.filter(p => p.organization_id === org.id && inRange(p.created_date)).length;
    return { name: org.name, revenue, patients: patientsCount, type: org.type };
  }).sort((a, b) => b.revenue - a.revenue), [organizations, pharmacySales, invoices, patients, rangeStart, rangeEnd]);

  // ── Credit Sales Breakdown ────────────────────────────────────────
  const creditSales = useMemo(() => {
    const credits = filteredSnapshots.filter(s => s.stream_code === 'CREDIT_SALES' && s.snapshot_type === 'TAKEOVER');
    const grouped = {};
    credits.forEach(c => {
      const label = c.credit_account_label || 'Other';
      grouped[label] = (grouped[label] || 0) + (c.amount || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredSnapshots]);

  // ── Patient Registration by Month ─────────────────────────────────
  const monthlyPatients = useMemo(() => last6Months.map(month => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const count = patients.filter(p => {
      const orgMatch = selectedOrg === 'ALL' || p.organization_id === selectedOrg;
      if (!orgMatch) return false;
      try { const d = new Date(p.created_date); return d >= start && d <= end; } catch { return false; }
    }).length;
    return { month: format(month, 'MMM yy'), count };
  }), [patients, selectedOrg, last6Months]);

  // ── Appointment Status Mix ────────────────────────────────────────
  const apptStatusData = useMemo(() => {
    const map = {};
    filteredAppointments.forEach(a => { const s = a.status || 'scheduled'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/-/g, ' '), value }));
  }, [filteredAppointments]);

  // ── Home Care: caretaker replacement activity ─────────────────────
  const replacedCases = useMemo(() =>
    homeCareAssignments.filter(a => a.assignment_status === 'replaced' && inRange(a.created_date)).length,
    [homeCareAssignments, rangeStart, rangeEnd]);

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
  const fmtCurrency = (n) => `LKR ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Owner & Investor Dashboard</h1>
          <p className="text-slate-500 mt-1">Cross-company performance — all modules, live data</p>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">🏢 All Companies</SelectItem>
              {organizations.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 text-sm" />
            <span className="text-slate-400 text-sm">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 text-sm" />
          </div>
        </div>
      </div>

      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard title="Total Revenue" value={fmtCurrency(totalRevenue)} icon={DollarSign} color="emerald" subtitle="Pharmacy + Clinical" />
        <KPICard title="Pharmacy Sales" value={fmtCurrency(totalPharmacyRevenue)} icon={Package} color="teal" subtitle={`${filteredSales.length} sales`} />
        <KPICard title="Clinical Revenue" value={fmtCurrency(totalInvoiceRevenue)} icon={FileText} color="blue" subtitle={`${filteredInvoices.length} invoices`} />
        <KPICard title="New Patients" value={fmt(filteredPatients.length)} icon={Users} color="violet" />
        <KPICard title="Appointments" value={fmt(filteredAppointments.length)} icon={Calendar} color="amber" />
        <KPICard title="Lab Orders" value={fmt(filteredLab.length)} icon={TestTube} color="rose" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Home Care Cases" value={fmt(filteredHomeCare.length)} icon={Home} color="teal" />
        <KPICard title="Caretaker Replacements" value={replacedCases} icon={Activity} color="amber" subtitle="This period" />
        <KPICard title="Shift Takeover Cash" value={fmtCurrency(takeoverCash)} icon={TrendingUp} color="emerald" />
        <KPICard title="Shift Handover Cash" value={fmtCurrency(handoverCash)} icon={TrendingUp} color="blue" />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="revenue">
        <TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-flex mb-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Monthly Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => `LKR ${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="pharmacy" name="Pharmacy" fill="#14b8a6" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="clinical" name="Clinical" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Credit Sales by Institution</CardTitle></CardHeader>
              <CardContent>
                {creditSales.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <DollarSign className="w-8 h-8" />
                    <p className="text-sm">No credit sales recorded in shift logs for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {creditSales.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium text-slate-800">{c.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{fmtCurrency(c.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50 border border-teal-200 mt-2">
                      <span className="text-sm font-semibold text-teal-800">Total Credit Sales</span>
                      <span className="font-bold text-teal-800">{fmtCurrency(creditSales.reduce((s, c) => s + c.value, 0))}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-6">
          <SectionHeader title="Company Performance Breakdown" subtitle="Revenue and patient acquisition per organization" />
          <div className="space-y-3">
            {revenueByOrg.map((org, i) => (
              <Card key={org.name} className="border-0 shadow-sm">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: COLORS[i % COLORS.length] + '22' }}>
                        <Building2 className="w-5 h-5" style={{ color: COLORS[i % COLORS.length] }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{org.name}</p>
                        <Badge variant="outline" className="text-xs capitalize mt-0.5">{org.type?.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-8">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Revenue</p>
                        <p className="font-bold text-emerald-600">{fmtCurrency(org.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">New Patients</p>
                        <p className="font-bold text-slate-800">{org.patients}</p>
                      </div>
                    </div>
                  </div>
                  {/* mini revenue bar */}
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${revenueByOrg[0]?.revenue > 0 ? Math.min(100, (org.revenue / revenueByOrg[0].revenue) * 100) : 0}%`,
                        background: COLORS[i % COLORS.length]
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Revenue by Company</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByOrg} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip formatter={v => `LKR ${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#14b8a6" radius={[0, 4, 4, 0]}>
                    {revenueByOrg.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical Tab */}
        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">New Patient Registrations</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyPatients}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Patients" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Appointment Status Mix</CardTitle></CardHeader>
              <CardContent>
                {apptStatusData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No appointments in range</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={apptStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {apptStatusData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Home Care Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Home Care Module — Period Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Cases', value: filteredHomeCare.length, color: 'text-teal-600' },
                  { label: 'Active / Assigned', value: filteredHomeCare.filter(c => ['assigned', 'scheduled'].includes(c.status)).length, color: 'text-blue-600' },
                  { label: 'Completed', value: filteredHomeCare.filter(c => c.status === 'completed').length, color: 'text-emerald-600' },
                  { label: 'Caretaker Replacements', value: replacedCases, color: 'text-amber-600' },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <SectionHeader title="Shift Cash Reconciliation" subtitle="Takeover vs Handover cash by stream across shift logs" />

          {/* Cash by stream */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['CLINIC_CASH', 'PHARMACY_CASH', 'LAB_CASH', 'CREDIT_SALES'].map(stream => {
              const streamSnaps = filteredSnapshots.filter(s => s.stream_code === stream);
              const takeover = streamSnaps.filter(s => s.snapshot_type === 'TAKEOVER').reduce((s, x) => s + (x.amount || 0), 0);
              const handover = streamSnaps.filter(s => s.snapshot_type === 'HANDOVER').reduce((s, x) => s + (x.amount || 0), 0);
              const diff = takeover - handover;
              const labels = { CLINIC_CASH: 'OPD / Clinic Cash', PHARMACY_CASH: 'Pharmacy Cash', LAB_CASH: 'Lab Cash', CREDIT_SALES: 'Credit Sales (Institutions)' };
              return (
                <Card key={stream} className="border-0 shadow-sm">
                  <CardContent className="pt-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3">{labels[stream]}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-500">Takeover</p>
                        <p className="font-bold text-blue-700 text-sm mt-1">{fmtCurrency(takeover)}</p>
                      </div>
                      <div className="bg-teal-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-500">Handover</p>
                        <p className="font-bold text-teal-700 text-sm mt-1">{fmtCurrency(handover)}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${diff === 0 ? 'bg-slate-50' : diff > 0 ? 'bg-amber-50' : 'bg-rose-50'}`}>
                        <p className="text-xs text-slate-500">Variance</p>
                        <p className={`font-bold text-sm mt-1 ${diff === 0 ? 'text-slate-600' : diff > 0 ? 'text-amber-700' : 'text-rose-700'}`}>{fmtCurrency(Math.abs(diff))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Credit sales detail */}
          {creditSales.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Credit Sales — Institution Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {creditSales.map((c, i) => (
                    <div key={c.name} className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-semibold text-slate-700">{c.name}</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900">{fmtCurrency(c.value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}