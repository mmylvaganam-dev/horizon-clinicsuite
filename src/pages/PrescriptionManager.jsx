import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pill, RefreshCw, ClipboardList, Plus } from 'lucide-react';
import PrescriptionDraftBuilder from '@/components/prescriptions/PrescriptionDraftBuilder';
import PrescriptionList from '@/components/prescriptions/PrescriptionList';
import RefillRequestsPanel from '@/components/prescriptions/RefillRequestsPanel';

export default function PrescriptionManager() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patient');
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [draftOpen, setDraftOpen] = useState(false);
  const [editPrescription, setEditPrescription] = useState(null);
  const queryClient = useQueryClient();

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: patientId });
      return patients[0];
    },
    enabled: !!patientId,
  });

  const { data: pendingRefills = [] } = useQuery({
    queryKey: ['refillRequests', patientId],
    queryFn: () => base44.entities.PrescriptionRenewalRequest.filter(
      patientId ? { patient_id: patientId, status: 'pending' } : { status: 'pending' },
      '-created_date', 50
    ),
  });

  const handleNewPrescription = () => {
    setEditPrescription(null);
    setDraftOpen(true);
  };

  const handleEdit = (rx) => {
    setEditPrescription(rx);
    setDraftOpen(true);
    setActiveTab('prescriptions');
  };

  const handleSaved = () => {
    setDraftOpen(false);
    setEditPrescription(null);
    queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    queryClient.invalidateQueries({ queryKey: ['patientPrescriptions'] });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prescription Manager</h1>
            {patient && (
              <p className="text-slate-500 text-sm">
                {patient.first_name} {patient.last_name}
                {patient.date_of_birth && (
                  <span className="ml-2 text-slate-400">
                    · DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                  </span>
                )}
                {patient.allergies && (
                  <span className="ml-2 text-rose-600 font-medium">⚠ Allergies: {patient.allergies}</span>
                )}
              </p>
            )}
            {!patientId && <p className="text-slate-500 text-sm">All patients — pending refill requests</p>}
          </div>
        </div>
        <Button onClick={handleNewPrescription} className="gap-2">
          <Plus className="w-4 h-4" />
          New Prescription
        </Button>
      </div>

      {/* Draft Builder Dialog */}
      {draftOpen && (
        <PrescriptionDraftBuilder
          patientId={patientId}
          patient={patient}
          editPrescription={editPrescription}
          onClose={() => { setDraftOpen(false); setEditPrescription(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="prescriptions" className="gap-2">
            <Pill className="w-4 h-4" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="refills" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refill Requests
            {pendingRefills.length > 0 && (
              <Badge className="bg-amber-500 text-white ml-1 text-xs">{pendingRefills.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="mt-4">
          <PrescriptionList
            patientId={patientId}
            patient={patient}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="refills" className="mt-4">
          <RefillRequestsPanel
            patientId={patientId}
            onApproved={() => queryClient.invalidateQueries({ queryKey: ['prescriptions'] })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}