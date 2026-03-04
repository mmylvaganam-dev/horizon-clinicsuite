import React, { useEffect } from 'react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (err) {
        console.error('Auth error:', err);
        return null;
      }
    },
  });

  useEffect(() => {
    // Once user is loaded, redirect to Daily Ops dashboard
    if (user) {
      navigate(createPageUrl('DailyOps'));
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
        <Card className="p-8">
          <CardContent className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-slate-600 font-medium">Loading Horizon ClinicSuite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <Card className="p-8 text-center max-w-md shadow-xl">
        <CardContent>
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Horizon ClinicSuite</h2>
            <p className="text-slate-600">Redirecting to your dashboard...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}