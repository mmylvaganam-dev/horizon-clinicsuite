import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Video, Globe, DollarSign, Shield, Users, FileText,
  Stethoscope, AlertCircle, CheckCircle, Clock, TrendingUp,
  Hospital, ArrowRight, Lock, Unlock
} from 'lucide-react';
import toast from 'react-hot-toast';

const VIRTUAL_HOSPITAL_FLAGS = [
  {
    key: 'VIRTUAL_HOSPITAL_ENABLED',
    label: 'Virtual Hospital Module',
    description: 'Master switch — enables the entire Virtual Hospital feature set. When OFF, clinics only see their regular EMR.',
    icon: Hospital,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    critical: true,
  },
  {
    key: 'TELE_SECOND_OPINION',
    label: 'Second Opinion Requests',
    description: 'Allow patients to submit second opinion requests for review by Sri Lankan specialists.',
    icon: Stethoscope,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
  },
  {
    key: 'TELE_PATIENT_HUB',
    label: 'Patient Self-Registration Hub',
    description: 'Allow global patients to self-register, upload their records, and book virtual consultations.',
    icon: Users,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-300',
  },
  {
    key: 'TELE_BILLING_50USD',
    label: '$50 Per-Consultation Billing',
    description: 'Auto-generate $50 USD billing records when a consultation is completed.',
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
  },
  {
    key: 'TELE_COMPLIANCE_CONSENT',
    label: 'Regional Compliance Consent Forms',
    description: 'Show GDPR (EU), HIPAA (USA), or PIPEDA (Canada) consent forms before consultations based on patient region.',
    icon: Shield,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
  },
  {
    key: 'TELE_CARE_CONTINUITY',
    label: 'Care Continuity Bridge',
    description: 'Allow linking virtual patients to physical clinic EMR when they visit a clinic in Sri Lanka.',
    icon: ArrowRight,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
  },
  {
    key: 'TELE_MEDICAL_TOURISM',
    label: 'Medical Tourism Workflow',
    description: 'Enable medical tourism interest tracking and preferred clinic selection for patients wishing to visit Sri Lanka.',
    icon: Globe,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
  },
];

export default function VirtualHospitalAdmin() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['platformFeatureFlags'],
    queryFn: () => base44.entities.PlatformFeatureFlag.list(),
  });

  const { data: billingRecords = [] } = useQuery({
    queryKey: ['teleConsultationBilling'],
    queryFn: () => base44.entities.TeleConsultationBilling.list('-created_date', 50),
  });

  const { data: secondOpinions = [] } = useQuery({
    queryKey: ['secondOpinionRequests'],
    queryFn: () => base44.entities.SecondOpinionRequest.list('-created_date', 50),
  });

  const { data: teleAppointments = [] } = useQuery({
    queryKey: ['teleAppointments'],
    queryFn: () => base44.entities.TeleAppointment.list('-created_date', 100),
  });

  const getFlag = (key) => flags.find(f => f.flag_name === key);
  const isFlagEnabled = (key) => getFlag(key)?.enabled === true;
  const masterEnabled = isFlagEnabled('VIRTUAL_HOSPITAL_ENABLED');

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }) => {
      const existing = getFlag(key);
      const payload = {
        flag_name: key,
        enabled,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || 'unknown',
        updated_by_email: user?.email || 'unknown',
      };
      if (existing) {
        return base44.entities.PlatformFeatureFlag.update(existing.id, payload);
      } else {
        return base44.entities.PlatformFeatureFlag.create(payload);
      }
    },
    onSuccess: (_, { key, enabled }) => {
      queryClient.invalidateQueries(['platformFeatureFlags']);
      toast.success(`${enabled ? '✅ Enabled' : '🔴 Disabled'}: ${VIRTUAL_HOSPITAL_FLAGS.find(f => f.key === key)?.label}`);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  // Stats
  const totalBilled = billingRecords.reduce((sum, r) => sum + (r.amount_usd || 0), 0);
  const paidBilled = billingRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.amount_usd || 0), 0);
  const completedConsults = teleAppointments.filter(a => a.status === 'COMPLETED').length;
  const pendingOpinions = secondOpinions.filter(s => ['submitted', 'under_review'].includes(s.status)).length;

  const isPlatformOwner = user?.email === 'madhawaekanayake@gmail.com' ||
    user?.email === 'mmylvaganam@premierhealthcanada.ca' ||
    user?.is_platform_owner === true;

  if (!isPlatformOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-700">Platform Owner Access Required</h2>
          <p className="text-slate-500 mt-2">This section is restricted to platform owners only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Hospital className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Virtual Hospital Control Center</h1>
            <p className="text-blue-100 mt-1">Platform Owner — Turn features ON/OFF. Regular clinics will not see these unless enabled.</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold text-sm ${masterEnabled ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
            {masterEnabled ? '🟢 MODULE ACTIVE' : '🔴 MODULE OFF'}
          </div>
        </div>
      </div>

      {/* How it works banner */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
        <p className="font-bold text-amber-900 mb-2">📌 HOW THIS WORKS — Regular Clinics Are NOT Affected</p>
        <div className="grid md:grid-cols-3 gap-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>YOU control all Virtual Hospital features from here</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Regular clinic staff see ONLY their normal EMR/pharmacy/lab</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Virtual Hospital features appear ONLY when you enable them here</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="features">Feature Controls</TabsTrigger>
          <TabsTrigger value="billing">Billing Dashboard</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Guide</TabsTrigger>
        </TabsList>

        {/* FEATURE CONTROLS */}
        <TabsContent value="features" className="space-y-4">
          {VIRTUAL_HOSPITAL_FLAGS.map((flag) => {
            const enabled = isFlagEnabled(flag.key);
            const isDisabledByMaster = flag.key !== 'VIRTUAL_HOSPITAL_ENABLED' && !masterEnabled;
            const Icon = flag.icon;

            return (
              <div
                key={flag.key}
                className={`rounded-xl border-2 p-5 transition-all ${
                  isDisabledByMaster ? 'opacity-50 bg-slate-50 border-slate-200' :
                  enabled ? `${flag.bg} ${flag.border}` : 'bg-white border-slate-200'
                } ${flag.critical ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${enabled && !isDisabledByMaster ? flag.bg : 'bg-slate-100'}`}>
                      <Icon className={`w-6 h-6 ${enabled && !isDisabledByMaster ? flag.color : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{flag.label}</h3>
                        {flag.critical && <Badge className="bg-blue-600 text-white text-xs">MASTER SWITCH</Badge>}
                        {enabled && !isDisabledByMaster && <Badge className="bg-green-600 text-white text-xs">ACTIVE</Badge>}
                        {isDisabledByMaster && <Badge variant="outline" className="text-xs text-slate-400">Enable Master Switch First</Badge>}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{flag.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={isDisabledByMaster || toggleMutation.isPending}
                    onCheckedChange={(val) => toggleMutation.mutate({ key: flag.key, enabled: val })}
                    className="flex-shrink-0"
                  />
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* BILLING DASHBOARD */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Completed Consults', value: completedConsults, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Billed', value: `$${totalBilled.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Collected', value: `$${paidBilled.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pending Opinions', value: pendingOpinions, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((stat, i) => (
              <Card key={i} className={`border-2 ${stat.bg}`}>
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Recent Billing Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No billing records yet. Billing records are auto-created when consultations complete.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {billingRecords.slice(0, 20).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div>
                        <p className="font-medium text-slate-900">{record.patient_name}</p>
                        <p className="text-xs text-slate-500">{record.consultation_date} · {record.appointment_type} · {record.patient_region}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">${record.amount_usd} USD</p>
                        <Badge className={
                          record.status === 'paid' ? 'bg-green-100 text-green-800' :
                          record.status === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>{record.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPLIANCE GUIDE */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                region: '🇪🇺 EU Patients (GDPR)',
                requirements: [
                  'Explicit consent before data collection',
                  'Right to be forgotten (data deletion on request)',
                  'Data processing transparency',
                  'DPA (Data Processing Agreement) if applicable',
                ],
                what: 'Consent modal shown before consultation with GDPR wording',
                color: 'border-blue-400 bg-blue-50',
                badge: 'bg-blue-600',
              },
              {
                region: '🇺🇸 USA Patients (HIPAA)',
                requirements: [
                  'HIPAA Notice of Privacy Practices',
                  'Minimum necessary data collection',
                  'Detailed access audit logs',
                  'Secure transmission (TLS)',
                ],
                what: 'HIPAA notice acknowledged before consultation + audit log created',
                color: 'border-red-400 bg-red-50',
                badge: 'bg-red-600',
              },
              {
                region: '🇨🇦 Canada Patients (PIPEDA)',
                requirements: [
                  'Consent before collection/use',
                  'Right to access personal information',
                  'Data accuracy obligation',
                  'Safeguards against unauthorized access',
                ],
                what: 'PIPEDA consent form shown + patient can request data export',
                color: 'border-red-300 bg-red-50',
                badge: 'bg-red-700',
              },
              {
                region: '🌍 All Other Patients',
                requirements: [
                  'General telemedicine consent',
                  'Data storage disclosure',
                  'Purpose of data collection explained',
                ],
                what: 'Standard general consent form shown before consultation',
                color: 'border-slate-300 bg-slate-50',
                badge: 'bg-slate-600',
              },
            ].map((item, i) => (
              <Card key={i} className={`border-2 ${item.color}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.region}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1">
                    {item.requirements.map((req, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {req}
                      </li>
                    ))}
                  </ul>
                  <div className="bg-white rounded-lg p-3 border text-xs text-slate-600">
                    <strong>System does:</strong> {item.what}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Important: Data Residency
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>✅ <strong>All patient data is stored in Sri Lanka</strong> (single server location)</p>
              <p>✅ <strong>EU/USA/Canada compliance is handled at application level</strong> — consent, audit logs, and data export workflows</p>
              <p>✅ <strong>No data is physically transferred to EU/USA/Canada servers</strong> — compliance is consent + audit based</p>
              <p>⚠️ <strong>For EU patients specifically</strong>, consider consulting a GDPR legal advisor if processing data of EU residents at scale, as GDPR technically applies to EU residents regardless of where data is stored.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}