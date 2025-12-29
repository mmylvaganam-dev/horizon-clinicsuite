import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function ShareholderView() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shareholderProfile } = useQuery({
    queryKey: ['shareholderProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.ShareholderProfile.filter({ email: user.email });
      return profiles[0];
    },
    enabled: !!user,
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['shareholderInvestments', shareholderProfile?.id],
    queryFn: () => base44.entities.InvestmentEvent.filter({ shareholder_ref: shareholderProfile.id }),
    enabled: !!shareholderProfile,
  });

  const { data: capTable } = useQuery({
    queryKey: ['latestCapTable'],
    queryFn: async () => {
      const snapshots = await base44.entities.CapTableSnapshot.list('-snapshot_date', 1);
      return snapshots[0];
    },
  });

  if (!shareholderProfile) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No shareholder profile found for your account</p>
      </Card>
    );
  }

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const ownershipPct = capTable?.snapshot_json?.[shareholderProfile.id]?.ownership_percentage || 0;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Your Investment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Total Invested</p>
              <p className="text-2xl font-bold text-slate-900">${totalInvested.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Ownership</p>
              <p className="text-2xl font-bold text-blue-600">{ownershipPct.toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Investment History</CardTitle>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No investments recorded</p>
          ) : (
            <div className="space-y-2">
              {investments.map((inv) => (
                <div key={inv.id} className="p-3 rounded-lg border bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-1">{inv.investment_type}</Badge>
                      <p className="text-sm text-slate-600">{format(new Date(inv.investment_date), 'MMM d, yyyy')}</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">${inv.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECURITY: Payroll data is NOT visible to shareholders */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-slate-500">
            <Lock className="w-5 h-5" />
            <p className="text-sm">Payroll and expense details are restricted to finance administrators only.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}