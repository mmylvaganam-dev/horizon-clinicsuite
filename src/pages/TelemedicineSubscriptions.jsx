import React from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TelemedicineSubscriptions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
        <p className="text-slate-500 mt-1">Manage telemedicine subscription plans</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <CreditCard className="w-16 h-16 text-teal-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Subscription Plans</h2>
          <p className="text-slate-400 mt-2 max-w-md">Create and manage individual, family, and corporate subscription packages for telemedicine access. Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}