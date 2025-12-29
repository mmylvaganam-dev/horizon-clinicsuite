import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PatientPortal() {
  const [portalAccount, setPortalAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initPortal = async () => {
      try {
        const user = await base44.auth.me();
        
        // Find portal account for this user
        const accounts = await base44.entities.PortalAccount.filter({ email: user.email });
        
        if (accounts.length === 0) {
          toast.error('No portal account found');
          setLoading(false);
          return;
        }

        const account = accounts[0];
        
        if (account.status !== 'active') {
          toast.error('Portal account is not active');
          setLoading(false);
          return;
        }

        setPortalAccount(account);

        // Log portal login
        await base44.entities.PortalLoginLog.create({
          portal_account_id: account.id,
          patient_ref: account.patient_ref,
          logged_in_at: new Date().toISOString(),
          ip_device: navigator.userAgent,
          success: true
        });

        // Audit log
        await base44.entities.AuditLog.create({
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_email: user.email,
          organization_id: account.organization_id || '',
          location_id: '',
          patient_id: account.patient_ref || '',
          module: 'PATIENT_PORTAL',
          action: 'portal_login',
          record_type: 'PortalAccount',
          record_id: account.id,
          metadata: { device: navigator.userAgent }
        });

        // Update last login
        await base44.entities.PortalAccount.update(account.id, {
          last_login_at: new Date().toISOString()
        });

        setLoading(false);
      } catch (error) {
        console.error('Portal init error:', error);
        toast.error('Failed to initialize portal');
        setLoading(false);
      }
    };

    initPortal();
  }, []);

  const { data: patient } = useQuery({
    queryKey: ['patient', portalAccount?.patient_ref],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: portalAccount.patient_ref });
      return patients[0];
    },
    enabled: !!portalAccount
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['patientAppointments', portalAccount?.patient_ref],
    queryFn: () => base44.entities.Appointment.filter({ patient_id: portalAccount.patient_ref }),
    enabled: !!portalAccount
  });

  const { data: results = [] } = useQuery({
    queryKey: ['patientResults', portalAccount?.patient_ref],
    queryFn: async () => {
      // Get all releases for this patient
      const releases = await base44.entities.ReleaseToPatient.filter({ 
        patient_id: portalAccount.patient_ref 
      });
      
      const releasedResultIds = releases.map(r => r.result_id);
      
      // Get only released results
      const allResults = await base44.entities.Result.filter({ 
        patient_id: portalAccount.patient_ref 
      });
      
      return allResults.filter(r => releasedResultIds.includes(r.id));
    },
    enabled: !!portalAccount
  });

  const logView = async (viewType, refType, refId) => {
    if (!portalAccount) return;

    try {
      await base44.entities.PortalViewLog.create({
        portal_account_id: portalAccount.id,
        patient_ref: portalAccount.patient_ref,
        view_type: viewType,
        ref_type: refType || '',
        ref_id: refId || '',
        viewed_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: portalAccount.id,
        user_email: portalAccount.email,
        organization_id: portalAccount.organization_id || '',
        location_id: '',
        patient_id: portalAccount.patient_ref || '',
        module: 'PATIENT_PORTAL',
        action: `portal_view_${viewType}`,
        record_type: refType || viewType,
        record_id: refId || '',
        metadata: { view_type: viewType }
      });
    } catch (error) {
      console.error('View logging error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Loading portal...</p>
      </div>
    );
  }

  if (!portalAccount || portalAccount.status !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Portal Access Restricted</h2>
          <p className="text-slate-500">
            Your portal account is not active. Please contact your healthcare provider.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Portal</h1>
          <p className="text-slate-500 mt-1">
            Welcome, {patient?.first_name} {patient?.last_name}
          </p>
        </div>

        <Tabs defaultValue="results" onValueChange={(tab) => logView(tab, '', '')}>
          <TabsList>
            <TabsTrigger value="results">
              <FileText className="w-4 h-4 mr-2" />
              Test Results
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Calendar className="w-4 h-4 mr-2" />
              Appointments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4 mt-6">
            {results.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">No released test results available</p>
              </Card>
            ) : (
              results.map((result) => (
                <Card 
                  key={result.id} 
                  className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => logView('results', 'Result', result.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {result.result_type}
                        </Badge>
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        Date: {result.result_date ? format(new Date(result.result_date), 'MMM d, yyyy') : 'N/A'}
                      </p>
                      {result.narrative_text && (
                        <div className="bg-slate-50 p-3 rounded mt-2">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {result.narrative_text}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4 mt-6">
            {appointments.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">No appointments scheduled</p>
              </Card>
            ) : (
              appointments.map((appt) => (
                <Card 
                  key={appt.id} 
                  className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => logView('appointments', 'Appointment', appt.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {appt.type}
                        </Badge>
                        <Badge variant="outline" className={
                          appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          appt.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {appt.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(appt.start_time), 'MMM d, yyyy h:mm a')}
                      </p>
                      {appt.reason && (
                        <p className="text-sm text-slate-600 mt-1">{appt.reason}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}