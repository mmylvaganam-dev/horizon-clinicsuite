import React from 'react';
import { Video, Stethoscope, Heart, Brain, Eye, Baby } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TelemedicineServices() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Telemedicine Services</h1>
        <p className="text-slate-500 mt-1">Manage virtual care service offerings</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <Video className="w-16 h-16 text-teal-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Services Module</h2>
          <p className="text-slate-400 mt-2 max-w-md">Configure telemedicine service types, consultation categories, pricing, and availability. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}