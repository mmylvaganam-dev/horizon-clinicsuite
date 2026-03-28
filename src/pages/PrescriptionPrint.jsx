import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import PrescriptionPrintView from '@/components/prescriptions/PrescriptionPrintView';

export default function PrescriptionPrint() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const rxId = urlParams.get('id');

  const { data: prescription, isLoading: rxLoading, error: rxError } = useQuery({
    queryKey: ['prescriptionPrint', rxId],
    queryFn: async () => {
      const items = await base44.entities.Prescription.filter({ id: rxId });
      return items[0];
    },
    enabled: !!rxId,
  });

  const { data: patient } = useQuery({
    queryKey: ['patientForPrint', prescription?.patient_id],
    queryFn: async () => {
      const items = await base44.entities.Patient.filter({ id: prescription.patient_id });
      return items[0];
    },
    enabled: !!prescription?.patient_id,
  });

  const { data: organization } = useQuery({
    queryKey: ['orgForPrint'],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs[0];
    },
  });

  const { data: branding } = useQuery({
    queryKey: ['brandingForPrint', organization?.id],
    queryFn: async () => {
      const brandings = await base44.entities.OrganizationBranding.filter({ organization_id: organization.id });
      return brandings[0] || null;
    },
    enabled: !!organization?.id,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!rxId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <p className="text-slate-600">No prescription ID provided.</p>
          <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Go Back</Button>
        </div>
      </div>
    );
  }

  if (rxLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (rxError || !prescription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <p className="text-slate-600">Prescription not found.</p>
          <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <PrescriptionPrintView
      prescription={prescription}
      patient={patient}
      organization={organization}
      branding={branding}
      provider={user}
      onClose={() => navigate(-1)}
    />
  );
}