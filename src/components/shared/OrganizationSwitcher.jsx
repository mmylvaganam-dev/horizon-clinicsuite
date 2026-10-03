import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/components/OrganizationProvider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';

export default function OrganizationSwitcher() {
  const { selectedOrgId, organizations, onOrgChange, isPlatformOwner } = useOrganization();
  const queryClient = useQueryClient();

  // Still loading organizations
  if (isPlatformOwner && !organizations) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading organizations...
      </div>
    );
  }

  // No organizations available
  if (!organizations || organizations.length === 0) {
    return null;
  }

  const handleChange = (orgId) => {
    onOrgChange(orgId);
    queryClient.invalidateQueries();
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-slate-600" />
      <Select value={selectedOrgId || ''} onValueChange={handleChange}>
        <SelectTrigger className="w-56 bg-white border-slate-200">
          <SelectValue placeholder="Select Organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations?.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center justify-between w-full">
                <span>{org.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  org.status === 'active' ? 'bg-green-100 text-green-700' : 
                  org.status === 'inactive' ? 'bg-gray-100 text-gray-700' : 
                  'bg-red-100 text-red-700'
                }`}>
                  {org.status}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}