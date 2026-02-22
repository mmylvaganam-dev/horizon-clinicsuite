import React from 'react';
import { Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TelemedicineCorporates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Corporate Clients</h1>
        <p className="text-slate-500 mt-1">Manage corporate telemedicine partnerships</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="w-16 h-16 text-teal-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Corporate Accounts</h2>
          <p className="text-slate-400 mt-2 max-w-md">Onboard companies, manage employee coverage, bulk subscriptions, and corporate billing for virtual hospital services. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}