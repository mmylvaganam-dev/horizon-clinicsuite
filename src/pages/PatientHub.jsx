import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Users, Globe, Upload, FileText, Video, Stethoscope,
  Plus, Search, Eye, ArrowRight, MapPin, Phone, Mail, Link2, UserCheck, Building2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';
import ConsentModal from '../components/telehealth/ConsentModal';
import TelePatientProfileDialog from '../components/telemedicine/TelePatientProfileDialog';

export default function PatientHub() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showConsent, setShowConsent] = useState(false);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    name: '', email: '', phone: '', date_of_birth: '',
    gender: 'male', nationality: '', country_of_residence: '',
    region: 'OTHER', passport_number: '', medical_summary: '',
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['telePatients'],
    queryFn: () => base44.entities.TelePatient.list('-created_date', 100),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['teleAppointments'],
    queryFn: () => base44.entities.TeleAppointment.list('-created_date', 100),
  });

  const { data: secondOpinions = [] } = useQuery({
    queryKey: ['secondOpinionRequests'],
    queryFn: () => base44.entities.SecondOpinionRequest.list('-created_date', 100),
  });

  // Local EMR patients — to detect links and support "admit to clinic"
  const { data: localPatients = [] } = useQuery({
    queryKey: ['localPatientsForHub'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
  });

  const getLinkedLocalPatient = (telePatient) => {
    if (telePatient.patient_id) return localPatients.find(p => p.id === telePatient.patient_id);
    // Also try matching by email
    if (telePatient.email) return localPatients.find(p => p.email === telePatient.email);
    return null;
  };

  const createPatientMutation = useMutation({
    mutationFn: (data) => base44.entities.TelePatient.create({ ...data, tele_access_enabled: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['telePatients']);
      setShowAddPatient(false);
      setNewPatient({ name: '', email: '', phone: '', date_of_birth: '', gender: 'male', nationality: '', country_of_residence: '', region: 'OTHER', passport_number: '', medical_summary: '' });
      toast.success('Global patient registered successfully');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.country_of_residence?.toLowerCase().includes(search.toLowerCase())
  );

  const getRegionBadge = (region) => {
    const map = { EU: 'bg-blue-100 text-blue-800', USA: 'bg-red-100 text-red-800', CANADA: 'bg-red-50 text-red-700', SRI_LANKA: 'bg-yellow-100 text-yellow-800', OTHER: 'bg-slate-100 text-slate-700' };
    return map[region] || map.OTHER;
  };

  const patientAppointments = (pid) => appointments.filter(a => a.patient_id === pid);
  const patientOpinions = (pid) => secondOpinions.filter(s => s.patient_id === pid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Global Patient Hub</h1>
              <p className="text-teal-100 mt-1">Sri Lankan diaspora & medical tourism patients worldwide</p>
            </div>
          </div>
          <Button onClick={() => setShowAddPatient(true)} className="bg-white text-teal-700 hover:bg-teal-50 font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Register Patient
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Global Patients', value: patients.length, icon: Users, color: 'text-teal-600' },
          { label: 'EU Patients', value: patients.filter(p => p.region === 'EU').length, icon: Globe, color: 'text-blue-600' },
          { label: 'USA Patients', value: patients.filter(p => p.region === 'USA').length, icon: Globe, color: 'text-red-600' },
          { label: 'Medical Tourism Interest', value: secondOpinions.filter(s => s.medical_tourism_interested).length, icon: Stethoscope, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <s.icon className={`w-8 h-8 ${s.color} mb-2`} />
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients">All Patients</TabsTrigger>
          <TabsTrigger value="opinions">Second Opinions</TabsTrigger>
          <TabsTrigger value="tourism">Medical Tourism</TabsTrigger>
        </TabsList>

        {/* PATIENTS LIST */}
        <TabsContent value="patients" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by name, email, country..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Workflow explanation banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-1 flex items-center gap-2"><Link2 className="w-4 h-4" /> Global Patient → Local Clinic Workflow</p>
            <p className="text-blue-700">Global patients (overseas / telemedicine) are separate from local EMR patients. When a global patient visits Sri Lanka for treatment, use <strong>"Admit to Local Clinic"</strong> to create a linked EMR record at the physical clinic.</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading patients...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No patients found. Register your first global patient.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((patient) => {
                const linkedLocal = getLinkedLocalPatient(patient);
                return (
                  <Card key={patient.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold flex-shrink-0">
                            {patient.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{patient.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{patient.email}</span>
                              {patient.country_of_residence && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{patient.country_of_residence}</span>}
                            </div>
                            {/* Linked local patient indicator */}
                            {linkedLocal ? (
                              <Link to={createPageUrl(`PatientDetails?id=${linkedLocal.id}`)} className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 hover:bg-emerald-100 transition-colors">
                                <UserCheck className="w-3 h-3" />
                                Linked EMR: {linkedLocal.first_name} {linkedLocal.last_name} — PHN {linkedLocal.phn}
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
                                <Globe className="w-3 h-3" /> Global only — no local EMR record
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Badge className={getRegionBadge(patient.region)}>{patient.region || 'OTHER'}</Badge>
                            <Badge variant="outline" className="text-xs">{patientAppointments(patient.id).length} consults</Badge>
                            {patientOpinions(patient.id).length > 0 && <Badge className="bg-purple-100 text-purple-800 text-xs">2nd opinion</Badge>}
                          </div>
                          {!linkedLocal && (
                            <Link
                              to={createPageUrl(`Patients`)}
                              className="text-xs text-teal-700 border border-teal-300 rounded px-2 py-1 hover:bg-teal-50 flex items-center gap-1 transition-colors"
                              title="Go to Patients to register this person at a local clinic"
                            >
                              <Building2 className="w-3 h-3" /> Admit to Local Clinic
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SECOND OPINIONS */}
        <TabsContent value="opinions" className="space-y-4">
          {secondOpinions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No second opinion requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {secondOpinions.map((op) => (
                <Card key={op.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900">{op.patient_name}</p>
                          <Badge className={op.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}>{op.priority}</Badge>
                          <Badge className={
                            op.status === 'completed' ? 'bg-green-100 text-green-800' :
                            op.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>{op.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-600"><strong>Original diagnosis:</strong> {op.original_diagnosis}</p>
                        <p className="text-sm text-slate-500"><strong>Specialty needed:</strong> {op.specialty_required || 'General'}</p>
                        {op.assigned_provider_name && <p className="text-xs text-teal-700 mt-1">Assigned to: Dr. {op.assigned_provider_name}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {op.uploaded_reports?.length > 0 && (
                          <p className="flex items-center gap-1"><FileText className="w-3 h-3" />{op.uploaded_reports.length} files</p>
                        )}
                        {op.medical_tourism_interested && <Badge className="bg-purple-100 text-purple-800 mt-1">Medical Tourism</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MEDICAL TOURISM */}
        <TabsContent value="tourism" className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="font-semibold text-indigo-900 mb-1">Medical Tourism Pipeline</p>
            <p className="text-sm text-indigo-700">Patients who had a virtual consultation and are interested in visiting Sri Lanka for treatment.</p>
          </div>
          {secondOpinions.filter(s => s.medical_tourism_interested).length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No medical tourism interest recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {secondOpinions.filter(s => s.medical_tourism_interested).map((op) => (
                <Card key={op.id} className="border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{op.patient_name}</p>
                        <p className="text-sm text-slate-500">{op.original_country} → Sri Lanka</p>
                        <p className="text-sm text-slate-600 mt-1">{op.specialty_required}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-800">Interested</Badge>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Patient Dialog */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register Global Patient</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {[
              { label: 'Full Name *', key: 'name', type: 'text', colSpan: 2 },
              { label: 'Email *', key: 'email', type: 'email' },
              { label: 'Phone', key: 'phone', type: 'text' },
              { label: 'Date of Birth', key: 'date_of_birth', type: 'date' },
              { label: 'Passport Number', key: 'passport_number', type: 'text' },
              { label: 'Nationality', key: 'nationality', type: 'text' },
              { label: 'Country of Residence', key: 'country_of_residence', type: 'text' },
            ].map((field) => (
              <div key={field.key} className={field.colSpan === 2 ? 'col-span-2' : ''}>
                <Label>{field.label}</Label>
                <Input type={field.type} value={newPatient[field.key]} onChange={e => setNewPatient(p => ({ ...p, [field.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <Label>Gender</Label>
              <Select value={newPatient.gender} onValueChange={v => setNewPatient(p => ({ ...p, gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Region (for compliance)</Label>
              <Select value={newPatient.region} onValueChange={v => setNewPatient(p => ({ ...p, region: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EU">🇪🇺 European Union (GDPR)</SelectItem>
                  <SelectItem value="USA">🇺🇸 United States (HIPAA)</SelectItem>
                  <SelectItem value="CANADA">🇨🇦 Canada (PIPEDA)</SelectItem>
                  <SelectItem value="SRI_LANKA">🇱🇰 Sri Lanka</SelectItem>
                  <SelectItem value="OTHER">🌍 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Medical Summary / Reason for Consultation</Label>
              <textarea
                className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                value={newPatient.medical_summary}
                onChange={e => setNewPatient(p => ({ ...p, medical_summary: e.target.value }))}
                placeholder="Brief description of medical history or reason for seeking consultation..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowAddPatient(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={() => createPatientMutation.mutate(newPatient)}
              disabled={!newPatient.name || !newPatient.email || createPatientMutation.isPending}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {createPatientMutation.isPending ? 'Registering...' : 'Register Patient'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}