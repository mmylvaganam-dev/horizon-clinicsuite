/**
 * TelephonyModuleGate
 * Wraps any telephony page — shows a "module disabled" message if telephony is OFF.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Phone, Lock } from 'lucide-react';

export default function TelephonyModuleGate({ children }) {
  const { selectedOrgId } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ['telephonyModuleCheck', selectedOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyAdminSettings', {
        action: 'get_settings',
        org_id: selectedOrgId
      });
      return res.data;
    },
    enabled: !!selectedOrgId,
  });

  if (!selectedOrgId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Please select an organization first.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.module_enabled) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">Telephony Module Disabled</h2>
          <p className="text-slate-500 text-sm">
            The Telephony module is not enabled for this organization. Contact your platform administrator to enable it.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}