import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Pill, AlertTriangle, CheckCircle, Loader2, Search, Send, Save, PenLine,
  Building2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import DrugInteractionChecker from './DrugInteractionChecker';

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Patch', 'Suppository', 'Other'];

export default function PrescriptionDraftBuilder({ patientId, patient, editPrescription, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const drugInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    drug_name: '',
    strength: '',
    dosage_form: '',
    quantity: '',
    directions: '',
    refills: 0,
    notes: '',
    prescribed_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'New',
    target_pharmacy_org_id: '',
    target_pharmacy_name: '',
    delivery_requested: false,
  });

  const [drugSearch, setDrugSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [interactionResult, setInteractionResult] = useState(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [showPharmacySelector, setShowPharmacySelector] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editPrescription) {
      setFormData({
        drug_name: editPrescription.drug_name || '',
        strength: editPrescription.strength || '',
        dosage_form: editPrescription.dosage_form || '',
        quantity: editPrescription.quantity || '',
        directions: editPrescription.directions || '',
        refills: editPrescription.refills || 0,
        notes: editPrescription.notes || '',
        prescribed_date: editPrescription.prescribed_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        expiry_date: editPrescription.expiry_date || '',
        status: editPrescription.status || 'New',
        target_pharmacy_org_id: editPrescription.target_pharmacy_org_id || '',
        target_pharmacy_name: editPrescription.target_pharmacy_name || '',
        delivery_requested: editPrescription.delivery_requested || false,
      });
      setDrugSearch(editPrescription.drug_name || '');
    }
  }, [editPrescription]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !drugInputRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: drugCatalog = [] } = useQuery({
    queryKey: ['drugCatalog'],
    queryFn: () => base44.entities.DrugCatalog.list(),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStockForRx'],
    queryFn: () => base44.entities.PharmacyStock.list('-updated_date', 500),
  });

  const { data: pharmacyOrgs = [] } = useQuery({
    queryKey: ['pharmacyOrgs'],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.filter(o => o.type === 'pharmacy' && o.status === 'active');
    },
  });

  const allDrugs = useMemo(() => {
    const seen = new Set();
    const list = [];
    drugCatalog.forEach(d => {
      const label = d.drug_name + (d.strength ? ` ${d.strength}` : '');
      if (!seen.has(label)) { seen.add(label); list.push({ label, source: 'catalog', strength: d.strength || '', form: d.dosage_form || '' }); }
    });
    pharmacyStock.forEach(s => {
      const label = s.display_name;
      if (!seen.has(label)) { seen.add(label); list.push({ label, source: 'stock', strength: '', form: '' }); }
    });
    return list;
  }, [drugCatalog, pharmacyStock]);

  const filteredDrugs = useMemo(() => {
    if (!drugSearch.trim()) return allDrugs.slice(0, 30);
    const q = drugSearch.toLowerCase();
    return allDrugs.filter(d => d.label.toLowerCase().includes(q)).slice(0, 40);
  }, [allDrugs, drugSearch]);

  const checkInteractions = async (drugName) => {
    if (!drugName || !patientId) return;
    setCheckingInteractions(true);
    setInteractionResult(null);
    try {
      const res = await base44.functions.invoke('checkDrugInteractions', {
        patient_id: patientId,
        new_drug_name: drugName,
      });
      setInteractionResult(res.data);
    } catch {
      toast.error('Interaction check failed');
    }
    setCheckingInteractions(false);
  };

  const selectDrug = (drug) => {
    setFormData(prev => ({ ...prev, drug_name: drug.label, strength: drug.strength || prev.strength, dosage_form: drug.form || prev.dosage_form }));
    setDrugSearch(drug.label);
    setShowDropdown(false);
    checkInteractions(drug.label);
  };

  const saveMutation = useMutation({
    mutationFn: async (status) => {
      const payload = {
        ...formData,
        patient_id: patientId,
        prescriber_id: user?.id || user?.email,
        provider_email: user?.email,
        status,
        quantity: parseFloat(formData.quantity) || 0,
        refills: parseInt(formData.refills) || 0,
        prescribed_date: new Date(formData.prescribed_date).toISOString(),
        delivery_requested: !!formData.target_pharmacy_org_id,
      };
      if (editPrescription) {
        return base44.entities.Prescription.update(editPrescription.id, payload);
      }
      return base44.entities.Prescription.create(payload);
    },
    onSuccess: (_, status) => {
      toast.success(status === 'Verified' ? 'Prescription signed & saved' : 'Draft saved');
      onSaved();
    },
    onError: () => toast.error('Failed to save prescription'),
  });

  const sendToPharmacyMutation = useMutation({
    mutationFn: async () => {
      if (!formData.target_pharmacy_org_id) { toast.error('Select a pharmacy first'); return; }
      const payload = {
        ...formData,
        patient_id: patientId,
        prescriber_id: user?.id || user?.email,
        provider_email: user?.email,
        status: 'Verified',
        quantity: parseFloat(formData.quantity) || 0,
        refills: parseInt(formData.refills) || 0,
        prescribed_date: new Date(formData.prescribed_date).toISOString(),
        delivery_requested: true,
        delivery_status: 'pending',
        delivery_sent_at: new Date().toISOString(),
      };
      if (editPrescription) {
        return base44.entities.Prescription.update(editPrescription.id, payload);
      }
      return base44.entities.Prescription.create(payload);
    },
    onSuccess: () => {
      toast.success(`Prescription signed & sent to ${formData.target_pharmacy_name}`);
      onSaved();
    },
    onError: () => toast.error('Failed to send prescription'),
  });

  const isLoading = saveMutation.isPending || sendToPharmacyMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            {editPrescription ? 'Edit Prescription' : 'New Prescription'}
            {editPrescription && (
              <Badge variant="outline" className="text-xs capitalize ml-2">{editPrescription.status}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Allergy Banner */}
          {patient?.allergies && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-rose-800">ALLERGIES: {patient.allergies}</span>
            </div>
          )}

          {/* Drug Search */}
          <div>
            <Label>Drug Name *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <Input
                ref={drugInputRef}
                value={drugSearch}
                onChange={(e) => {
                  setDrugSearch(e.target.value);
                  setFormData(prev => ({ ...prev, drug_name: e.target.value }));
                  setShowDropdown(true);
                  setInteractionResult(null);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search drug catalog or pharmacy stock..."
                className="pl-9"
              />
              {checkingInteractions && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500 animate-spin" />
              )}
              {showDropdown && filteredDrugs.length > 0 && (
                <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredDrugs.map((drug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-teal-50 flex items-center justify-between text-sm border-b border-slate-50 last:border-0"
                      onMouseDown={() => selectDrug(drug)}
                    >
                      <span className="font-medium text-slate-800">{drug.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${drug.source === 'stock' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {drug.source === 'stock' ? 'In Stock' : 'Catalog'}
                      </span>
                    </button>
                  ))}
                  {drugSearch && !allDrugs.find(d => d.label.toLowerCase() === drugSearch.toLowerCase()) && (
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-sm text-amber-700 border-t"
                      onMouseDown={() => selectDrug({ label: drugSearch, strength: '', form: '' })}
                    >
                      + Use "{drugSearch}" as custom drug
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interaction Checker */}
          <DrugInteractionChecker result={interactionResult} loading={checkingInteractions} />

          {/* Drug Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Strength</Label>
              <Input value={formData.strength} onChange={e => setFormData(p => ({ ...p, strength: e.target.value }))} placeholder="e.g., 500mg" />
            </div>
            <div>
              <Label>Dosage Form</Label>
              <Select value={formData.dosage_form} onValueChange={v => setFormData(p => ({ ...p, dosage_form: v }))}>
                <SelectTrigger><SelectValue placeholder="Select form" /></SelectTrigger>
                <SelectContent>
                  {DOSAGE_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="e.g., 30" />
            </div>
          </div>

          <div>
            <Label>Directions *</Label>
            <Textarea
              value={formData.directions}
              onChange={e => setFormData(p => ({ ...p, directions: e.target.value }))}
              placeholder="e.g., Take 1 tablet by mouth twice daily with food for 7 days"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Refills Allowed</Label>
              <Input type="number" min="0" value={formData.refills} onChange={e => setFormData(p => ({ ...p, refills: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Prescribed Date</Label>
              <Input type="date" value={formData.prescribed_date} onChange={e => setFormData(p => ({ ...p, prescribed_date: e.target.value }))} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={formData.expiry_date} onChange={e => setFormData(p => ({ ...p, expiry_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Notes for Pharmacist</Label>
            <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional instructions, substitution allowed, etc." rows={2} />
          </div>

          {/* Send to Pharmacy */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="w-4 h-4" />
              Send to Pharmacy (optional)
            </div>
            {formData.target_pharmacy_org_id ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-teal-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">{formData.target_pharmacy_name}</span>
                </div>
                <button onClick={() => setFormData(p => ({ ...p, target_pharmacy_org_id: '', target_pharmacy_name: '' }))}
                  className="text-slate-400 hover:text-rose-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {patient?.preferred_pharmacy_org_id && (
                  <Button variant="outline" size="sm" className="border-teal-300 text-teal-700"
                    onClick={() => setFormData(p => ({
                      ...p,
                      target_pharmacy_org_id: patient.preferred_pharmacy_org_id,
                      target_pharmacy_name: patient.preferred_pharmacy_name || 'Preferred Pharmacy'
                    }))}>
                    Use Preferred Pharmacy
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowPharmacySelector(true)}>
                  Select Pharmacy
                </Button>
              </div>
            )}
            {showPharmacySelector && (
              <div className="border border-slate-200 rounded-lg bg-white max-h-40 overflow-y-auto">
                {pharmacyOrgs.length === 0 && <p className="text-sm text-slate-400 p-3">No pharmacies found</p>}
                {pharmacyOrgs.map(org => (
                  <button key={org.id} type="button"
                    className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm border-b last:border-0"
                    onClick={() => {
                      setFormData(p => ({ ...p, target_pharmacy_org_id: org.id, target_pharmacy_name: org.name }));
                      setShowPharmacySelector(false);
                    }}>
                    <span className="font-medium">{org.name}</span>
                    <span className="text-slate-400 ml-2">{org.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button variant="outline" onClick={() => saveMutation.mutate('New')} disabled={isLoading || !formData.drug_name}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button variant="secondary" onClick={() => saveMutation.mutate('Verified')} disabled={isLoading || !formData.drug_name || !formData.quantity || !formData.directions}>
              <PenLine className="w-4 h-4 mr-2" />
              Sign Only
            </Button>
            <Button
              className="ml-auto bg-teal-600 hover:bg-teal-700"
              onClick={() => sendToPharmacyMutation.mutate()}
              disabled={isLoading || !formData.drug_name || !formData.quantity || !formData.directions || !formData.target_pharmacy_org_id}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Sign & Send to Pharmacy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}