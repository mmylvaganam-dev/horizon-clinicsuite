import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  FlaskConical, Scan, Mail, ClipboardList, Plus, Trash2, FileText, ExternalLink
} from 'lucide-react';
import { useOrganization } from '@/components/OrganizationProvider';
import ClinicalDocumentPrint from './ClinicalDocumentPrint';
import { format } from 'date-fns';

const DOC_TYPES = [
  { value: 'prescription', label: 'Prescription', icon: ClipboardList, color: 'bg-teal-600' },
  { value: 'lab_request', label: 'Lab Request', icon: FlaskConical, color: 'bg-blue-600' },
  { value: 'diagnostic_request', label: 'Diagnostic / Imaging Request', icon: Scan, color: 'bg-purple-600' },
  { value: 'referral_letter', label: 'Referral Letter', icon: ExternalLink, color: 'bg-amber-600' },
  { value: 'patient_letter', label: 'Patient Letter', icon: Mail, color: 'bg-rose-600' },
];

function emptyContent(docType) {
  if (docType === 'prescription') return { drug_name: '', strength: '', dosage_form: '', directions: '', quantity: '', refills: 0, notes: '', date: format(new Date(), 'yyyy-MM-dd'), expiry_date: '' };
  if (docType === 'lab_request') return { tests: [{ name: '', code: '', notes: '' }], urgency: 'routine', clinical_notes: '', date: format(new Date(), 'yyyy-MM-dd') };
  if (docType === 'diagnostic_request') return { tests: [{ name: '', modality: '', notes: '' }], urgency: 'routine', clinical_notes: '', date: format(new Date(), 'yyyy-MM-dd') };
  if (docType === 'referral_letter') return { referred_to: '', referred_specialty: '', reason: '', urgency: 'routine', clinical_notes: '', date: format(new Date(), 'yyyy-MM-dd') };
  if (docType === 'patient_letter') return { subject: '', body: '', date: format(new Date(), 'yyyy-MM-dd') };
  return {};
}

/**
 * Props:
 *   patientId  - patient record ID
 *   encounterId - optional encounter ID for context
 */
export default function ClinicalDocumentLauncher({ patientId, encounterId }) {
  const { selectedOrgId } = useOrganization();
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [content, setContent] = useState({});
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ['patientForDoc', patientId],
    queryFn: async () => { const r = await base44.entities.Patient.filter({ id: patientId }); return r[0]; },
    enabled: !!patientId,
  });

  const { data: organization } = useQuery({
    queryKey: ['orgForDoc', selectedOrgId],
    queryFn: async () => { const r = await base44.entities.Organization.filter({ id: selectedOrgId }); return r[0] || null; },
    enabled: !!selectedOrgId,
  });

  const { data: branding } = useQuery({
    queryKey: ['brandingForDoc', selectedOrgId],
    queryFn: async () => { const r = await base44.entities.OrganizationBranding.filter({ organization_id: selectedOrgId }); return r[0] || null; },
    enabled: !!selectedOrgId,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctorsForDoc', selectedOrgId],
    queryFn: () => base44.entities.StaffProfile.filter({ organization_id: selectedOrgId, status: 'active' }),
    enabled: !!selectedOrgId,
  });

  const prescribingDoctors = doctors.filter(d =>
    ['PHYSICIAN_GP', 'CONSULT_SPECIALIST', 'RADIOLOGIST', 'NURSE'].includes(d.staff_type)
  );

  const selectedDoctor = prescribingDoctors.find(d => d.id === selectedDoctorId) || null;

  function openType(type) {
    setSelectedType(type);
    setContent(emptyContent(type));
    setShowTypeSelector(false);
  }

  function handlePrint() {
    if (!selectedDoctorId) { alert('Please select the issuing doctor first'); return; }
    setShowPrint(true);
  }

  return (
    <>
      {/* Trigger Button */}
      <Button variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50" onClick={() => setShowTypeSelector(true)}>
        <FileText className="w-4 h-4" /> Issue Clinical Document
      </Button>

      {/* Document Type Selector */}
      <Dialog open={showTypeSelector} onOpenChange={setShowTypeSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Select Document Type</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {DOC_TYPES.map(dt => (
              <button
                key={dt.value}
                onClick={() => openType(dt.value)}
                className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-slate-50 text-left transition-colors group"
              >
                <div className={`w-9 h-9 rounded-lg ${dt.color} flex items-center justify-center flex-shrink-0`}>
                  <dt.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-slate-800 group-hover:text-teal-700">{dt.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Editor */}
      {selectedType && !showPrint && (
        <Dialog open={true} onOpenChange={() => setSelectedType(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{DOC_TYPES.find(d => d.value === selectedType)?.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">

              {/* Doctor selector */}
              <div>
                <Label>Issuing Doctor / Provider *</Label>
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {prescribingDoctors.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}{d.credentials_text ? `, ${d.credentials_text}` : ''} — {d.staff_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDoctor && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    {selectedDoctor.e_signature_url
                      ? <span className="text-emerald-600 font-medium">✓ E-Signature on file</span>
                      : <span className="text-amber-600">⚠ No e-signature — doctor should upload via Staff Directory</span>
                    }
                    {selectedDoctor.seal_url
                      ? <span className="text-emerald-600 font-medium ml-3">✓ Seal on file</span>
                      : <span className="text-amber-600 ml-3">⚠ No seal</span>
                    }
                  </div>
                )}
              </div>

              {/* Content form by type */}
              <ContentForm docType={selectedType} content={content} onChange={setContent} />

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedType(null)}>Cancel</Button>
                <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700">
                  Preview & Print
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Print View */}
      {showPrint && selectedType && (
        <ClinicalDocumentPrint
          docType={selectedType}
          patient={patient}
          doctor={selectedDoctor}
          organization={organization}
          branding={branding}
          content={content}
          onClose={() => { setShowPrint(false); setSelectedType(null); }}
        />
      )}
    </>
  );
}

function ContentForm({ docType, content, onChange }) {
  function set(field, val) { onChange({ ...content, [field]: val }); }

  function setTest(i, field, val) {
    const tests = [...(content.tests || [])];
    tests[i] = { ...tests[i], [field]: val };
    onChange({ ...content, tests });
  }

  function addTest() {
    const tests = [...(content.tests || [])];
    if (docType === 'lab_request') tests.push({ name: '', code: '', notes: '' });
    else tests.push({ name: '', modality: '', notes: '' });
    onChange({ ...content, tests });
  }

  function removeTest(i) {
    const tests = (content.tests || []).filter((_, idx) => idx !== i);
    onChange({ ...content, tests });
  }

  if (docType === 'prescription') return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Drug Name *</Label><Input value={content.drug_name} onChange={e => set('drug_name', e.target.value)} placeholder="e.g. Amoxicillin" /></div>
        <div><Label>Strength</Label><Input value={content.strength} onChange={e => set('strength', e.target.value)} placeholder="e.g. 500mg" /></div>
      </div>
      <div><Label>Dosage Form</Label><Input value={content.dosage_form} onChange={e => set('dosage_form', e.target.value)} placeholder="e.g. Capsules, Syrup" /></div>
      <div><Label>Directions / Sig *</Label><Textarea value={content.directions} onChange={e => set('directions', e.target.value)} placeholder="e.g. Take 1 capsule three times daily after meals for 7 days" rows={2} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Quantity</Label><Input value={content.quantity} onChange={e => set('quantity', e.target.value)} placeholder="21 caps" /></div>
        <div><Label>Refills</Label><Input type="number" min={0} value={content.refills} onChange={e => set('refills', e.target.value)} /></div>
        <div><Label>Valid Until</Label><Input type="date" value={content.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
      </div>
      <div><Label>Notes for Pharmacist</Label><Textarea value={content.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
    </div>
  );

  if (docType === 'lab_request' || docType === 'diagnostic_request') {
    const isLab = docType === 'lab_request';
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Label>Urgency</Label>
          <Select value={content.urgency} onValueChange={v => set('urgency', v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="stat">STAT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{isLab ? 'Tests to Request' : 'Studies to Request'}</Label>
          {(content.tests || []).map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Input placeholder={isLab ? 'Test name' : 'Study name'} value={t.name} onChange={e => setTest(i, 'name', e.target.value)} />
                <Input placeholder={isLab ? 'Code' : 'Modality (X-Ray, CT…)'} value={t.code || t.modality} onChange={e => setTest(i, isLab ? 'code' : 'modality', e.target.value)} />
                <Input placeholder="Special instructions" value={t.notes} onChange={e => setTest(i, 'notes', e.target.value)} />
              </div>
              <button onClick={() => removeTest(i)} className="text-red-400 hover:text-red-600 mt-2"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addTest} className="gap-1">
            <Plus className="w-3 h-3" /> Add {isLab ? 'Test' : 'Study'}
          </Button>
        </div>
        <div><Label>Clinical Notes / Indication</Label><Textarea value={content.clinical_notes} onChange={e => set('clinical_notes', e.target.value)} rows={3} placeholder="Reason for investigation, relevant clinical history…" /></div>
      </div>
    );
  }

  if (docType === 'referral_letter') return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Referred To (Doctor/Dept)</Label><Input value={content.referred_to} onChange={e => set('referred_to', e.target.value)} placeholder="Dr. Smith / Cardiology Dept" /></div>
        <div><Label>Specialty</Label><Input value={content.referred_specialty} onChange={e => set('referred_specialty', e.target.value)} placeholder="Cardiology" /></div>
      </div>
      <div className="flex items-center gap-3">
        <Label>Urgency</Label>
        <Select value={content.urgency} onValueChange={v => set('urgency', v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="routine">Routine</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Reason for Referral *</Label><Textarea value={content.reason} onChange={e => set('reason', e.target.value)} rows={3} placeholder="Chief complaint and reason for referral…" /></div>
      <div><Label>Clinical Summary</Label><Textarea value={content.clinical_notes} onChange={e => set('clinical_notes', e.target.value)} rows={4} placeholder="Relevant history, examination findings, investigations done so far…" /></div>
    </div>
  );

  if (docType === 'patient_letter') return (
    <div className="space-y-3">
      <div><Label>Subject / Re:</Label><Input value={content.subject} onChange={e => set('subject', e.target.value)} placeholder="Medical Fitness Certificate, Sick Leave, etc." /></div>
      <div><Label>Letter Body *</Label><Textarea value={content.body} onChange={e => set('body', e.target.value)} rows={10} placeholder="Dear Sir/Madam,&#10;&#10;This is to certify that…" /></div>
    </div>
  );

  return null;
}