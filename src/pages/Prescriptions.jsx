import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Pill, AlertTriangle, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Prescriptions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patient');

  const [formData, setFormData] = useState({
    drug_name: '',
    strength: '',
    quantity: '',
    directions: '',
    refills: 0,
    prescribed_date: new Date().toISOString().split('T')[0],
  });

  const [interactionCheck, setInteractionCheck] = useState(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const drugInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !drugInputRef.current?.contains(e.target)) {
        setShowDrugDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: patientId });
      return patients[0];
    },
    enabled: !!patientId,
  });

  const { data: currentMeds = [] } = useQuery({
    queryKey: ['patientCurrentMeds', patientId],
    queryFn: () => base44.entities.Prescription.filter({ 
      patient_id: patientId,
      status: 'Verified'
    }),
    enabled: !!patientId,
  });

  const { data: drugCatalog = [] } = useQuery({
    queryKey: ['drugCatalog'],
    queryFn: () => base44.entities.DrugCatalog.list(),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStockForRx'],
    queryFn: () => base44.entities.PharmacyStock.list('-updated_date', 500),
  });

  // Merged, deduplicated drug list from DrugCatalog + PharmacyStock
  const allDrugs = useMemo(() => {
    const seen = new Set();
    const list = [];
    drugCatalog.forEach(d => {
      const label = d.drug_name + (d.strength ? ` ${d.strength}` : '');
      if (!seen.has(label)) { seen.add(label); list.push({ label, source: 'catalog', strength: d.strength || '' }); }
    });
    pharmacyStock.forEach(s => {
      const label = s.display_name + (s.generic_name && s.generic_name !== s.display_name ? ` (${s.generic_name})` : '');
      if (!seen.has(label)) { seen.add(label); list.push({ label, source: 'stock', strength: '' }); }
    });
    return list;
  }, [drugCatalog, pharmacyStock]);

  const filteredDrugs = useMemo(() => {
    if (!drugSearch.trim()) return allDrugs.slice(0, 30);
    const q = drugSearch.toLowerCase();
    return allDrugs.filter(d => d.label.toLowerCase().includes(q)).slice(0, 40);
  }, [allDrugs, drugSearch]);

  const checkInteractions = async (drugName) => {
    const drug = drugName || formData.drug_name;
    if (!drug || !patientId) return;
    setCheckingInteractions(true);
    setInteractionCheck(null);
    try {
      const response = await base44.functions.invoke('checkDrugInteractions', {
        patient_id: patientId,
        new_drug_name: drug,
      });
      setInteractionCheck(response.data);
    } catch (error) {
      toast.error('Failed to check interactions');
    }
    setCheckingInteractions(false);
  };

  const selectDrug = (drug) => {
    setFormData({ ...formData, drug_name: drug.label, strength: drug.strength || formData.strength });
    setDrugSearch(drug.label);
    setShowDrugDropdown(false);
    checkInteractions(drug.label);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createPrescription', {
        patient_id: patientId,
        provider_email: user.email,
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientPrescriptions', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patientCurrentMeds', patientId] });
      toast.success('Prescription created');
      navigate(-1);
    },
    onError: () => {
      toast.error('Failed to create prescription');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (!patient) {
    return <div className="p-8">Loading patient...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Prescription</h1>
          <p className="text-slate-500">{patient.first_name} {patient.last_name}</p>
        </div>
      </div>

      {patient.allergies && (
        <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
          <div className="flex items-center gap-2 text-amber-800 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-bold">ALLERGIES</p>
          </div>
          <p className="text-amber-900">{patient.allergies}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              Prescription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Drug Name *</Label>
              <Select
                value={formData.drug_name}
                onValueChange={(value) => {
                  setFormData({ ...formData, drug_name: value });
                  setInteractionCheck(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select drug" />
                </SelectTrigger>
                <SelectContent>
                  {drugCatalog.map((drug) => (
                    <SelectItem key={drug.id} value={drug.drug_name}>
                      {drug.drug_name} {drug.strength && `(${drug.strength})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.drug_name && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={checkInteractions}
                  disabled={checkingInteractions}
                  className="mt-2"
                >
                  {checkingInteractions ? 'Checking...' : 'Check Drug Interactions'}
                </Button>
              )}
            </div>

            {interactionCheck && (
              <div className={`p-4 rounded-lg border-2 ${
                interactionCheck.has_interactions 
                  ? 'bg-rose-50 border-rose-300' 
                  : 'bg-emerald-50 border-emerald-300'
              }`}>
                <p className={`font-semibold mb-2 ${
                  interactionCheck.has_interactions ? 'text-rose-900' : 'text-emerald-900'
                }`}>
                  {interactionCheck.has_interactions ? '⚠️ Drug Interactions Detected' : '✓ No Interactions Found'}
                </p>
                {interactionCheck.has_interactions && (
                  <p className="text-sm text-rose-800">{interactionCheck.interaction_summary}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Strength</Label>
                <Input
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  placeholder="e.g., 500mg"
                />
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g., 30"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Directions *</Label>
              <Textarea
                value={formData.directions}
                onChange={(e) => setFormData({ ...formData, directions: e.target.value })}
                placeholder="e.g., Take 1 tablet by mouth twice daily with food"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Refills</Label>
                <Input
                  type="number"
                  value={formData.refills}
                  onChange={(e) => setFormData({ ...formData, refills: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div>
                <Label>Prescribed Date</Label>
                <Input
                  type="date"
                  value={formData.prescribed_date}
                  onChange={(e) => setFormData({ ...formData, prescribed_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Prescription'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {currentMeds.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Current Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentMeds.map((med) => (
                <div key={med.id} className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium">{med.drug_name}</p>
                  <p className="text-sm text-slate-600">{med.directions}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}