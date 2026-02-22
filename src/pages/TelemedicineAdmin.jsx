import React from 'react';
import { Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TelemedicineAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Telemedicine Admin</h1>
        <p className="text-slate-500 mt-1">Virtual hospital administration and configuration</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <Settings className="w-16 h-16 text-teal-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Admin Console</h2>
          <p className="text-slate-400 mt-2 max-w-md">Configure platform settings, manage integrations, review usage analytics, and control telemedicine operations. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}