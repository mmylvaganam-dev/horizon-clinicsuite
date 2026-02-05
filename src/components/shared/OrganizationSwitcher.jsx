import React from 'react';
import { useOrganization } from '@/components/OrganizationProvider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function OrganizationSwitcher() {
  const { selectedOrgId, organizations, onOrgChange } = useOrganization();

  console.log('🟢 OrganizationSwitcher - Rendering with:', {
    selectedOrgId,
    orgCount: organizations?.length,
    organizations: organizations?.map(o => `${o.name} (${o.status})`)
  });

  if (!organizations || organizations.length === 0) {
    console.log('⚠️ OrganizationSwitcher - No organizations available, hiding dropdown');
    return null;
  }

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);
  console.log('🟢 OrganizationSwitcher - Selected org:', selectedOrg?.name, selectedOrg?.status);

  const handleChange = (orgId) => {
    console.log('Switching to organization:', orgId);
    onOrgChange(orgId);
    window.location.reload();
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