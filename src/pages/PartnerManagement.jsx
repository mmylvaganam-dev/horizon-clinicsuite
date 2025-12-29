import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PartnerManagement() {
  const queryClient = useQueryClient();
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    commission_rate: 0
  });
  const [codeForm, setCodeForm] = useState({ code: '', description: '' });
  const [settlementForm, setSettlementForm] = useState({
    partner_code: '',
    period_start: '',
    period_end: ''
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list('-created_at'),
  });

  const { data: partnerCodes = [] } = useQuery({
    queryKey: ['partnerCodes'],
    queryFn: () => base44.entities.PartnerCode.list(),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_at'),
  });

  const { data: settlements = [] } = useQuery({
    queryKey: ['settlements'],
    queryFn: () => base44.entities.Settlement.list('-created_at'),
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data) => {
      const partner = await base44.entities.Partner.create({
        ...data,
        is_active: true,
        created_at: new Date().toISOString()
      });

      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'PARTNER_MANAGEMENT',
        action: 'create_partner',
        record_type: 'Partner',
        record_id: partner.id,
        metadata: { name: data.name }
      });

      return partner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      resetPartnerForm();
      toast.success('Partner created!');
    }
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const partner = await base44.entities.Partner.update(id, data);
      
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PARTNER_MANAGEMENT',
        action: 'update_partner',
        record_type: 'Partner',
        record_id: id,
        metadata: { name: data.name }
      });

      return partner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      resetPartnerForm();
      toast.success('Partner updated!');
    }
  });

  const createCodeMutation = useMutation({
    mutationFn: async (data) => {
      const code = await base44.entities.PartnerCode.create({
        ...data,
        partner_id: selectedPartner.id,
        is_active: true,
        created_at: new Date().toISOString()
      });

      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PARTNER_MANAGEMENT',
        action: 'create_partner_code',
        record_type: 'PartnerCode',
        record_id: code.id,
        metadata: { code: data.code, partner_name: selectedPartner.name }
      });

      return code;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerCodes'] });
      setShowCodeDialog(false);
      setCodeForm({ code: '', description: '' });
      toast.success('Code created!');
    }
  });

  const generateSettlementMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateSettlement', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      setShowSettlementDialog(false);
      toast.success('Settlement generated!');
    }
  });

  const approveSettlementMutation = useMutation({
    mutationFn: async (settlementId) => {
      const user = await base44.auth.me();
      const settlement = await base44.entities.Settlement.update(settlementId, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: settlement.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'PARTNER_MANAGEMENT',
        action: 'approve_settlement',
        record_type: 'Settlement',
        record_id: settlementId,
        metadata: { amount: settlement.amount, partner_code: settlement.partner_code }
      });

      return settlement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Settlement approved!');
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async (settlementId) => {
      const user = await base44.auth.me();
      const settlement = await base44.entities.Settlement.update(settlementId, {
        status: 'paid',
        paid_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: settlement.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'PARTNER_MANAGEMENT',
        action: 'mark_settlement_paid',
        record_type: 'Settlement',
        record_id: settlementId,
        metadata: { amount: settlement.amount, partner_code: settlement.partner_code }
      });

      return settlement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Settlement marked as paid!');
    }
  });

  const resetPartnerForm = () => {
    setPartnerForm({ name: '', contact_name: '', contact_email: '', contact_phone: '', commission_rate: 0 });
    setEditingPartner(null);
    setShowPartnerDialog(false);
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      contact_name: partner.contact_name || '',
      contact_email: partner.contact_email || '',
      contact_phone: partner.contact_phone || '',
      commission_rate: partner.commission_rate || 0
    });
    setShowPartnerDialog(true);
  };

  const handleSavePartner = () => {
    if (!partnerForm.name) {
      toast.error('Please enter partner name');
      return;
    }

    if (editingPartner) {
      updatePartnerMutation.mutate({ id: editingPartner.id, data: partnerForm });
    } else {
      createPartnerMutation.mutate(partnerForm);
    }
  };

  const handleCreateCode = () => {
    if (!codeForm.code) {
      toast.error('Please enter code');
      return;
    }
    createCodeMutation.mutate(codeForm);
  };

  const handleGenerateSettlement = () => {
    if (!settlementForm.partner_code || !settlementForm.period_start || !settlementForm.period_end) {
      toast.error('Please fill all fields');
      return;
    }
    generateSettlementMutation.mutate(settlementForm);
  };

  const getPartnerCodes = (partnerId) => {
    return partnerCodes.filter(c => c.partner_id === partnerId);
  };

  const getReferralsForCode = (code) => {
    return referrals.filter(r => r.partner_code === code);
  };

  const statusColors = {
    draft: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Partner Management</h1>
        <p className="text-slate-500 mt-1">Manage referral partners and settlements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Partners</p>
              <p className="text-2xl font-bold">{partners.filter(p => p.is_active).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Referrals</p>
              <p className="text-2xl font-bold">{referrals.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Settlements</p>
              <p className="text-2xl font-bold">{settlements.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Amount</p>
              <p className="text-2xl font-bold">
                ${settlements.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.amount, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowPartnerDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Partner
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {partners.map((partner) => (
              <Card key={partner.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={partner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {partner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {partner.commission_rate > 0 && (
                        <Badge variant="outline">{partner.commission_rate}% commission</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">{partner.name}</p>
                    {partner.contact_email && (
                      <p className="text-sm text-slate-600">{partner.contact_email}</p>
                    )}
                    <div className="mt-2">
                      <p className="text-sm text-slate-500">
                        Codes: {getPartnerCodes(partner.id).length}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedPartner(partner);
                      setShowCodeDialog(true);
                    }}>
                      Add Code
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditPartner(partner)}>
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-3 mt-6">
          {referrals.map((referral) => (
            <Card key={referral.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Code: {referral.partner_code}</p>
                  <p className="text-sm text-slate-600">Patient: {referral.patient_ref}</p>
                  {referral.ref_type && (
                    <p className="text-sm text-slate-500">{referral.ref_type}: {referral.ref_id}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(referral.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {referral.commission_amount > 0 && (
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    ${referral.commission_amount.toFixed(2)}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowSettlementDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Settlement
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {settlements.map((settlement) => (
              <Card key={settlement.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={statusColors[settlement.status]}>
                        {settlement.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-900">Code: {settlement.partner_code}</p>
                    <p className="text-sm text-slate-600">
                      Period: {format(new Date(settlement.period_start), 'MMM d')} - {format(new Date(settlement.period_end), 'MMM d, yyyy')}
                    </p>
                    <p className="text-lg font-bold text-teal-600 mt-2">
                      ${settlement.amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {settlement.status === 'draft' && (
                      <Button size="sm" onClick={() => approveSettlementMutation.mutate(settlement.id)}>
                        Approve
                      </Button>
                    )}
                    {settlement.status === 'approved' && (
                      <Button size="sm" onClick={() => markPaidMutation.mutate(settlement.id)}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Partner Dialog */}
      <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Edit Partner' : 'New Partner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name *</Label>
              <Input value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input value={partnerForm.contact_name} onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })} />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input value={partnerForm.contact_email} onChange={(e) => setPartnerForm({ ...partnerForm, contact_email: e.target.value })} />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={partnerForm.contact_phone} onChange={(e) => setPartnerForm({ ...partnerForm, contact_phone: e.target.value })} />
            </div>
            <div>
              <Label>Commission Rate (%)</Label>
              <Input type="number" step="0.1" value={partnerForm.commission_rate} onChange={(e) => setPartnerForm({ ...partnerForm, commission_rate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetPartnerForm}>Cancel</Button>
              <Button onClick={handleSavePartner}>{editingPartner ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Partner Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Code *</Label>
              <Input value={codeForm.code} onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })} placeholder="e.g., REF123" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={codeForm.description} onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCodeDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateCode}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settlement Dialog */}
      <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Settlement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Partner Code *</Label>
              <select
                className="w-full p-2 border rounded"
                value={settlementForm.partner_code}
                onChange={(e) => setSettlementForm({ ...settlementForm, partner_code: e.target.value })}
              >
                <option value="">Select code</option>
                {partnerCodes.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start *</Label>
                <Input type="date" value={settlementForm.period_start} onChange={(e) => setSettlementForm({ ...settlementForm, period_start: e.target.value })} />
              </div>
              <div>
                <Label>Period End *</Label>
                <Input type="date" value={settlementForm.period_end} onChange={(e) => setSettlementForm({ ...settlementForm, period_end: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettlementDialog(false)}>Cancel</Button>
              <Button onClick={handleGenerateSettlement} disabled={generateSettlementMutation.isPending}>
                {generateSettlementMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}