import React from 'react';
import { Stethoscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TelemedicineProviderPortal() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Provider Portal</h1>
        <p className="text-slate-500 mt-1">Virtual hospital provider-facing portal management</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <Stethoscope className="w-16 h-16 text-teal-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Provider Portal</h2>
          <p className="text-slate-400 mt-2 max-w-md">Manage doctor dashboards, virtual waiting rooms, consultation workflows, e-prescriptions, and earnings. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}