import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
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

  if (!organizations || organizations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-slate-600" />
      <Select value={selectedOrgId || ''} onValueChange={onOrgChange}>
        <SelectTrigger className="w-56 bg-white border-slate-200">
          <SelectValue placeholder="Select Organization" />
        </SelectTrigger>
        <SelectContent>
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