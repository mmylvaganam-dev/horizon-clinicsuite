import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

export default function PreferredPharmacySelector({ patient }) {
  const qc = useQueryClient();

  const { data: orgs = [] } = useQuery({
    queryKey: ['pharmacyOrgs'],
    queryFn: () => base44.entities.Organization.filter({ type: 'pharmacy', status: 'active' }),
  });

  const mutation = useMutation({
    mutationFn: ({ orgId, orgName }) =>
      base44.entities.Patient.update(patient.id, {
        preferred_pharmacy_org_id: orgId,
        preferred_pharmacy_name: orgName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', patient.id] });
      toast.success('Preferred pharmacy saved');
    },
  });

  const handleChange = (orgId) => {
    const org = orgs.find(o => o.id === orgId);
    mutation.mutate({ orgId, orgName: org?.name || '' });
  };

  if (orgs.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-slate-600">
        <Building2 className="w-4 h-4" />
        Preferred Pharmacy (Network)
      </Label>
      <Select
        value={patient.preferred_pharmacy_org_id || ''}
        onValueChange={handleChange}
        disabled={mutation.isPending}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a pharmacy..." />
        </SelectTrigger>
        <SelectContent>
          {orgs.map(org => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center gap-2">
                {patient.preferred_pharmacy_org_id === org.id && (
                  <Check className="w-3 h-3 text-teal-600" />
                )}
                {org.name}
                {org.address && <span className="text-slate-400 text-xs">— {org.address}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {patient.preferred_pharmacy_name && (
        <Badge className="bg-teal-50 text-teal-700 border-teal-200 border text-xs">
          <Check className="w-3 h-3 mr-1" />
          {patient.preferred_pharmacy_name}
        </Badge>
      )}
    </div>
  );
}