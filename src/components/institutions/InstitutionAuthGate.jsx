import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function InstitutionAuthGate({ children, authorized, message }) {
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
              <p className="text-sm text-slate-600 mt-2">
                {message || 'You do not have access to this portal'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}