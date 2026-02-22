import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TelemedicinePatientPortal() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Patient Portal</h1>
        <p className="text-slate-500 mt-1">Virtual hospital patient-facing portal management</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="w-16 h-16 text-teal-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Patient Portal</h2>
          <p className="text-slate-400 mt-2 max-w-md">Manage patient access, virtual consultation history, prescriptions, lab results, and messaging. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}