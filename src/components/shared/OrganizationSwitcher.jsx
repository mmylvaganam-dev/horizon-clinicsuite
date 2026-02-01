import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function OrganizationSwitcher({ onOrgChange }) {
  const [selectedOrg, setSelectedOrg] = useState(null);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['platformOrganizations'],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs || [];
    },
  });

  const handleOrgChange = (orgId) => {
    setSelectedOrg(orgId);
    if (onOrgChange) {
      onOrgChange(orgId);
    }
    // Store selected org in sessionStorage so it persists during session
    sessionStorage.setItem('selectedOrgId', orgId);
  };

  if (isLoading) {
    return (
      <div className="w-48 h-9 bg-slate-200 rounded-md animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-slate-600" />
      <Select value={selectedOrg || ''} onValueChange={handleOrgChange}>
        <SelectTrigger className="w-48 bg-white border-slate-200">
          <SelectValue placeholder="Select Organization" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>All Organizations</SelectItem>
          {organizations?.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}