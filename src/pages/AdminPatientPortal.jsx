import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Lock, Unlock, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminPatientPortal() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: portalAccounts = [] } = useQuery({
    queryKey: ['portalAccounts'],
    queryFn: () => base44.entities.PortalAccount.list('-created_at'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: loginLogs = [] } = useQuery({
    queryKey: ['portalLoginLogs'],
    queryFn: () => base44.entities.PortalLoginLog.list('-logged_in_at', 100),
  });

  const { data: viewLogs = [] } = useQuery({
    queryKey: ['portalViewLogs'],
    queryFn: () => base44.entities.PortalViewLog.list('-viewed_at', 100),
  });

  const activateMutation = useMutation({
    mutationFn: async (accountId) => {
      const user = await base44.auth.me();
      const account = await base44.entities.PortalAccount.update(accountId, {
        status: 'active',
        activated_at: new Date().toISOString(),
        activated_by: user.id
      });
      
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: account.organization_id || '',
        location_id: '',
        patient_id: account.patient_ref || '',
        module: 'PORTAL_ADMIN',
        action: 'activate_portal_account',
        record_type: 'PortalAccount',
        record_id: accountId,
        metadata: { email: account.email }
      });

      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalAccounts'] });
      toast.success('Account activated!');
    }
  });

  const lockMutation = useMutation({
    mutationFn: async (accountId) => {
      const user = await base44.auth.me();
      const account = await base44.entities.PortalAccount.update(accountId, {
        status: 'locked'
      });
      
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: account.organization_id || '',
        location_id: '',
        patient_id: account.patient_ref || '',
        module: 'PORTAL_ADMIN',
        action: 'lock_portal_account',
        record_type: 'PortalAccount',
        record_id: accountId,
        metadata: { email: account.email }
      });

      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalAccounts'] });
      toast.success('Account locked!');
    }
  });

  const unlockMutation = useMutation({
    mutationFn: async (accountId) => {
      const user = await base44.auth.me();
      const account = await base44.entities.PortalAccount.update(accountId, {
        status: 'active'
      });
      
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: account.organization_id || '',
        location_id: '',
        patient_id: account.patient_ref || '',
        module: 'PORTAL_ADMIN',
        action: 'unlock_portal_account',
        record_type: 'PortalAccount',
        record_id: accountId,
        metadata: { email: account.email }
      });

      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalAccounts'] });
      toast.success('Account unlocked!');
    }
  });

  const getPatientName = (patientRef) => {
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const viewDetails = (account) => {
    setSelectedAccount(account);
    setShowDetailsDialog(true);
  };

  const filteredAccounts = portalAccounts.filter(acc => 
    acc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPatientName(acc.patient_ref).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    locked: 'bg-rose-100 text-rose-700'
  };

  const accountLoginLogs = selectedAccount 
    ? loginLogs.filter(log => log.portal_account_id === selectedAccount.id)
    : [];

  const accountViewLogs = selectedAccount 
    ? viewLogs.filter(log => log.portal_account_id === selectedAccount.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Patient Portal Admin</h1>
        <p className="text-slate-500 mt-1">Manage patient portal accounts and access</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Accounts</p>
              <p className="text-2xl font-bold">
                {portalAccounts.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold">
                {portalAccounts.filter(a => a.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <Lock className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Locked</p>
              <p className="text-2xl font-bold">
                {portalAccounts.filter(a => a.status === 'locked').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by email, username, or patient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredAccounts.map((account) => (
          <Card key={account.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={statusColors[account.status]}>
                    {account.status}
                  </Badge>
                  <p className="font-semibold text-slate-900">{account.email}</p>
                </div>
                <p className="text-sm text-slate-600">
                  Patient: {getPatientName(account.patient_ref)}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>Created: {format(new Date(account.created_at), 'MMM d, yyyy')}</span>
                  {account.last_login_at && (
                    <span>Last login: {format(new Date(account.last_login_at), 'MMM d, yyyy')}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {account.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => activateMutation.mutate(account.id)}
                    disabled={activateMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                )}
                {account.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => lockMutation.mutate(account.id)}
                    disabled={lockMutation.isPending}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Lock
                  </Button>
                )}
                {account.status === 'locked' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unlockMutation.mutate(account.id)}
                    disabled={unlockMutation.isPending}
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => viewDetails(account)}>
                  Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Portal Account Details</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="logins">Login History</TabsTrigger>
                <TabsTrigger value="views">View History</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient</Label>
                    <p className="font-medium">{getPatientName(selectedAccount.patient_ref)}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={statusColors[selectedAccount.status]}>
                      {selectedAccount.status}
                    </Badge>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{selectedAccount.email}</p>
                  </div>
                  <div>
                    <Label>Username</Label>
                    <p className="font-medium">{selectedAccount.username || 'N/A'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="logins" className="space-y-3 mt-4">
                {accountLoginLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No login history</p>
                ) : (
                  accountLoginLogs.map((log) => (
                    <Card key={log.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">
                            {format(new Date(log.logged_in_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          <p className="text-xs text-slate-500">{log.ip_device || 'Unknown device'}</p>
                        </div>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="views" className="space-y-3 mt-4">
                {accountViewLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No view history</p>
                ) : (
                  accountViewLogs.map((log) => (
                    <Card key={log.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm capitalize">{log.view_type}</p>
                          <p className="text-xs text-slate-500">
                            {log.ref_type && `${log.ref_type}: ${log.ref_id}`}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {format(new Date(log.viewed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}