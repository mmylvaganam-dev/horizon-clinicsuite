import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Users, CreditCard, Calendar, Plus, Star } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import toast from 'react-hot-toast';

// Sri Lanka market-researched subscription plans
// Based on: oDoc (Rs.499 GP, Rs.5999 family), market demand, diaspora USD pricing
const PLANS = [
  {
    code: 'GP_MONTHLY',
    name: 'GP Care',
    tagline: 'Essential primary care',
    billing: 'monthly',
    lkr: 1200,
    usd: 4,
    max_members: 1,
    color: 'teal',
    popular: false,
    features: [
      'Unlimited GP video consultations',
      '1 member covered',
      'Follow-up visits included',
      'E-prescription on every visit',
      'Valid 30 days',
    ],
    note: 'Based on oDoc GP plan (Rs.499/mo). Premium pricing reflects platform quality.',
  },
  {
    code: 'FAMILY_MONTHLY',
    name: 'Family Care',
    tagline: 'Cover your whole family',
    billing: 'monthly',
    lkr: 3500,
    usd: 12,
    max_members: 4,
    color: 'blue',
    popular: true,
    features: [
      'Unlimited GP consultations',
      'Up to 4 family members',
      'Paediatrics included',
      'Nutrition consultation (1/month)',
      'Priority booking',
      'E-prescription on every visit',
    ],
    note: 'Based on oDoc Family Rs.5,999/mo. Competitive entry pricing.',
  },
  {
    code: 'SPECIALIST_MONTHLY',
    name: 'Specialist Plus',
    tagline: 'Access to specialists',
    billing: 'monthly',
    lkr: 5500,
    usd: 18,
    max_members: 1,
    color: 'purple',
    popular: false,
    features: [
      'Unlimited GP consultations',
      '2 specialist consultations/month',
      'Dermatology & Mental Health access',
      'Priority 24hr booking',
      'E-prescription + referral letters',
      '1 member covered',
    ],
    note: 'Aligns with oDoc Specialist plans ~$22-28/month.',
  },
  {
    code: 'GP_ANNUAL',
    name: 'GP Annual Saver',
    tagline: 'Best value for individuals',
    billing: 'annual',
    lkr: 10800,
    lkr_monthly_equiv: 900,
    usd: 36,
    usd_monthly_equiv: 3,
    max_members: 1,
    color: 'green',
    popular: false,
    features: [
      'Unlimited GP consultations for 12 months',
      '1 member covered',
      'Save Rs.3,600 vs monthly',
      'Follow-up visits included',
      'E-prescription on every visit',
    ],
    note: '10% savings vs monthly. oDoc annual GP ~$22.50/yr.',
  },
  {
    code: 'FAMILY_ANNUAL',
    name: 'Family Annual',
    tagline: 'Maximum savings for families',
    billing: 'annual',
    lkr: 36000,
    lkr_monthly_equiv: 3000,
    usd: 120,
    usd_monthly_equiv: 10,
    max_members: 6,
    color: 'orange',
    popular: false,
    features: [
      'Unlimited GP consultations for 12 months',
      'Up to 6 family members',
      'Paediatrics & Nutrition included',
      '2 specialist consultations/year per member',
      'Save Rs.6,000 vs monthly plan',
      'Priority customer support',
    ],
    note: 'Premium annual family plan. Up to 6 members including elderly parents.',
  },
  {
    code: 'CORPORATE',
    name: 'Corporate Wellness',
    tagline: 'For businesses & organisations',
    billing: 'monthly',
    lkr: null,
    usd: null,
    lkr_display: 'From Rs. 25,000',
    usd_display: 'From USD 85',
    max_members: 50,
    color: 'slate',
    popular: false,
    features: [
      '10–200 employee coverage',
      'Dedicated account manager',
      'Unlimited GP consultations per employee',
      '4 specialist sessions per employee/year',
      'Mental health & wellbeing sessions',
      'Monthly utilisation reports',
      'Customised pricing based on headcount',
    ],
    note: 'Quote-based. Common in SL: banks, corporates, NGOs, embassies.',
  },
];

const COLOR_MAP = {
  teal: { badge: 'bg-teal-100 text-teal-800', ring: 'ring-teal-400', header: 'bg-teal-600', btn: 'bg-teal-600 hover:bg-teal-700' },
  blue: { badge: 'bg-blue-100 text-blue-800', ring: 'ring-blue-400', header: 'bg-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
  purple: { badge: 'bg-purple-100 text-purple-800', ring: 'ring-purple-400', header: 'bg-purple-600', btn: 'bg-purple-600 hover:bg-purple-700' },
  green: { badge: 'bg-green-100 text-green-800', ring: 'ring-green-400', header: 'bg-green-600', btn: 'bg-green-600 hover:bg-green-700' },
  orange: { badge: 'bg-orange-100 text-orange-800', ring: 'ring-orange-400', header: 'bg-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' },
  slate: { badge: 'bg-slate-100 text-slate-800', ring: 'ring-slate-400', header: 'bg-slate-700', btn: 'bg-slate-700 hover:bg-slate-800' },
};

export default function TelemedicineSubscriptions() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('plans');
  const [currency, setCurrency] = useState('LKR');
  const [assignDialog, setAssignDialog] = useState(null); // plan code
  const [form, setForm] = useState({ patient_email: '', patient_name: '', currency: 'LKR' });

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['teleSubscriptions'],
    queryFn: () => base44.entities.TeleSubscription.list('-created_date', 100),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['telePatients'],
    queryFn: () => base44.entities.TelePatient.list('-created_date', 200),
  });

  const createSubMutation = useMutation({
    mutationFn: async ({ planCode, patientId, patientName, patientEmail, currency }) => {
      const plan = PLANS.find(p => p.code === planCode);
      const startDate = new Date();
      const endDate = plan.billing === 'annual' ? addYears(startDate, 1) : addMonths(startDate, 1);
      const nextBilling = plan.billing === 'annual' ? addYears(startDate, 1) : addMonths(startDate, 1);

      return base44.entities.TeleSubscription.create({
        patient_id: patientId,
        patient_name: patientName,
        patient_email: patientEmail,
        plan_code: planCode,
        plan_name: plan.name,
        billing_cycle: plan.billing,
        amount_lkr: plan.lkr,
        amount_usd: plan.usd,
        currency,
        max_members: plan.max_members,
        covered_members: [patientId],
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        next_billing_date: format(nextBilling, 'yyyy-MM-dd'),
        status: 'pending_payment',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleSubscriptions'] });
      toast.success('Subscription created — pending payment confirmation');
      setAssignDialog(null);
      setForm({ patient_email: '', patient_name: '', currency: 'LKR' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TeleSubscription.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teleSubscriptions'] });
      toast.success('Subscription updated');
    },
  });

  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const pendingCount = subscriptions.filter(s => s.status === 'pending_payment').length;
  const revenueMonthlyLKR = subscriptions
    .filter(s => s.status === 'active' && s.billing_cycle === 'monthly' && s.currency === 'LKR')
    .reduce((sum, s) => sum + (s.amount_lkr || 0), 0);

  const STATUS_COLORS = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-100 text-red-700',
    pending_payment: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 text-sm mt-1">Sri Lanka & overseas diaspora pricing model · Based on 2025 market research</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">View in:</span>
          <Button size="sm" variant={currency === 'LKR' ? 'default' : 'outline'} onClick={() => setCurrency('LKR')} className={currency === 'LKR' ? 'bg-teal-600 hover:bg-teal-700' : ''}>LKR</Button>
          <Button size="sm" variant={currency === 'USD' ? 'default' : 'outline'} onClick={() => setCurrency('USD')} className={currency === 'USD' ? 'bg-blue-600 hover:bg-blue-700' : ''}>USD</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="plans">Plan Catalogue</TabsTrigger>
          <TabsTrigger value="subscribers">
            Subscribers
            {activeCount > 0 && <span className="ml-1.5 bg-teal-600 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">{activeCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Plan Catalogue */}
        <TabsContent value="plans" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {PLANS.map(plan => {
              const colors = COLOR_MAP[plan.color];
              return (
                <Card key={plan.code} className={`relative overflow-hidden ${plan.popular ? `ring-2 ${colors.ring}` : ''}`}>
                  {plan.popular && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-yellow-400 text-yellow-900 border-0 text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" /> Most Popular
                      </Badge>
                    </div>
                  )}
                  <div className={`${colors.header} text-white p-4`}>
                    <p className="font-bold text-lg">{plan.name}</p>
                    <p className="text-white/80 text-xs">{plan.tagline}</p>
                    <div className="mt-3">
                      {plan.lkr ? (
                        currency === 'LKR' ? (
                          <div>
                            <span className="text-3xl font-extrabold">Rs. {plan.lkr.toLocaleString()}</span>
                            <span className="text-white/70 text-sm">/{plan.billing === 'annual' ? 'year' : 'month'}</span>
                            {plan.lkr_monthly_equiv && (
                              <p className="text-white/70 text-xs mt-0.5">≈ Rs. {plan.lkr_monthly_equiv.toLocaleString()}/mo</p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-3xl font-extrabold">USD {plan.usd}</span>
                            <span className="text-white/70 text-sm">/{plan.billing === 'annual' ? 'year' : 'month'}</span>
                            {plan.usd_monthly_equiv && (
                              <p className="text-white/70 text-xs mt-0.5">≈ USD {plan.usd_monthly_equiv}/mo</p>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-2xl font-extrabold">{currency === 'LKR' ? plan.lkr_display : plan.usd_display}</span>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5" /> Up to {plan.max_members} member{plan.max_members > 1 ? 's' : ''}
                      <Calendar className="w-3.5 h-3.5 ml-2" /> {plan.billing === 'annual' ? 'Annual' : 'Monthly'}
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {plan.note && (
                      <p className="text-xs text-slate-400 italic border-t pt-2">{plan.note}</p>
                    )}
                    <Button
                      className={`w-full text-white ${colors.btn}`}
                      onClick={() => setAssignDialog(plan.code)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {plan.code === 'CORPORATE' ? 'Request Quote' : 'Assign to Patient'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Market research note */}
          <Card className="mt-6 bg-slate-50 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">📊 Pricing Rationale — Sri Lanka Market 2025</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 space-y-1">
              <p>• <strong>oDoc GP subscription:</strong> Rs. 499/month (unlimited, 4 family). Our GP plan Rs. 1,200 reflects higher platform quality & video recording.</p>
              <p>• <strong>PHSRC regulation:</strong> Specialist fees Rs. 250–2,000 (2023). Inflation-adjusted 2025: Rs. 1,500–5,000 for senior consultants.</p>
              <p>• <strong>oDoc Dermatology/Paediatrics:</strong> USD 27.75–37/month per specialist. Our Specialist Plus at Rs. 5,500/USD 18 is competitive entry-level.</p>
              <p>• <strong>Diaspora USD pricing:</strong> USD 4–12/month aligns with oDoc USD plans. Overseas SL community is a strong revenue segment.</p>
              <p>• <strong>Corporate:</strong> From Rs. 25,000/month for 10+ employees — standard in Colombo corporate health benefit programs.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscribers List */}
        <TabsContent value="subscribers" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                <p className="text-xs text-slate-500">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                <p className="text-xs text-slate-500">Pending Payment</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{subscriptions.length}</p>
                <p className="text-xs text-slate-500">Total</p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No subscriptions yet. Assign a plan to a patient from the Plans tab.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map(sub => (
                <Card key={sub.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">{sub.patient_name}</p>
                          <Badge className={STATUS_COLORS[sub.status] || 'bg-slate-100 text-slate-600'}>{sub.status}</Badge>
                          <Badge variant="outline" className="text-xs">{sub.plan_name}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{sub.patient_email}</p>
                        <div className="flex gap-3 text-xs text-slate-400 mt-1">
                          <span>{sub.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} · {sub.currency === 'LKR' ? `Rs. ${(sub.amount_lkr || 0).toLocaleString()}` : `USD ${sub.amount_usd}`}</span>
                          {sub.end_date && <span>Expires: {sub.end_date}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {sub.status === 'pending_payment' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs"
                            onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'active' })}>
                            Mark Paid
                          </Button>
                        )}
                        {sub.status === 'active' && (
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 text-xs"
                            onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'cancelled' })}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Revenue Overview */}
        <TabsContent value="revenue" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-5">
                <p className="text-xs text-slate-500 mb-1">Monthly Recurring (LKR)</p>
                <p className="text-2xl font-bold text-teal-700">Rs. {revenueMonthlyLKR.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Active monthly subs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <p className="text-xs text-slate-500 mb-1">Active Subscribers</p>
                <p className="text-2xl font-bold text-blue-700">{activeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <p className="text-xs text-slate-500 mb-1">Pending Revenue</p>
                <p className="text-2xl font-bold text-yellow-600">
                  Rs. {subscriptions.filter(s => s.status === 'pending_payment').reduce((sum, s) => sum + (s.amount_lkr || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">Awaiting payment</p>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-sm text-amber-800">
              <strong>💳 Payment Gateway Note:</strong> Online card payments via Sri Lanka IPG (LankaPay, Sampath, ComBank) or PayHere can be integrated. For now, admin marks subscriptions as paid after manual bank transfer confirmation. Contact your bank's merchant team to enable IPG.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Subscription Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Subscription — {PLANS.find(p => p.code === assignDialog)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              <Select onValueChange={v => {
                const p = patients.find(p => p.id === v);
                setForm(f => ({ ...f, patient_id: v, patient_name: p?.name || '', patient_email: p?.email || '' }));
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select existing patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-center text-slate-400 text-xs">— or enter new patient details —</div>
            <div>
              <Label>Patient Name</Label>
              <Input className="mt-1" value={form.patient_name || ''} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <Label>Patient Email</Label>
              <Input className="mt-1" type="email" value={form.patient_email || ''} onChange={e => setForm(f => ({ ...f, patient_email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <Label>Billing Currency</Label>
              <Select value={form.currency || 'LKR'} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LKR">LKR — Sri Lankan Rupee (local)</SelectItem>
                  <SelectItem value="USD">USD — US Dollar (overseas diaspora)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignDialog && (() => {
              const plan = PLANS.find(p => p.code === assignDialog);
              return plan?.lkr ? (
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-slate-700">{plan.name}</p>
                  <p className="text-slate-500">
                    {form.currency === 'LKR' ? `Rs. ${plan.lkr.toLocaleString()}` : `USD ${plan.usd}`} / {plan.billing === 'annual' ? 'year' : 'month'}
                  </p>
                </div>
              ) : null;
            })()}
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
              disabled={!form.patient_name || !form.patient_email || createSubMutation.isPending}
              onClick={() => createSubMutation.mutate({
                planCode: assignDialog,
                patientId: form.patient_id || `new-${Date.now()}`,
                patientName: form.patient_name,
                patientEmail: form.patient_email,
                currency: form.currency || 'LKR',
              })}
            >
              {createSubMutation.isPending ? 'Creating...' : 'Create Subscription'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}