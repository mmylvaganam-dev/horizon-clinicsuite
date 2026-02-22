import React from 'react';
import { UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TelemedicineDoctors() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Virtual Doctors</h1>
        <p className="text-slate-500 mt-1">Manage doctors available for virtual consultations</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <UserCheck className="w-16 h-16 text-teal-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Doctors Directory</h2>
          <p className="text-slate-400 mt-2 max-w-md">Onboard and manage doctors, their specialties, availability slots, and consultation fees for virtual care. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}