import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Plus, Trash2, Settings, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ProvisioningPanel from '@/components/telephony/ProvisioningPanel';
import SipRequirementsPanel from '@/components/telephony/SipRequirementsPanel';

export default function TelephonyAdmin() {
  const { selectedOrgId, isPlatformOwner } = useOrganization();
  const queryClient = useQueryClient();
  const [newDID, setNewDID] = useState({ number: '', label: '', route_type: 'queue' });
  const [formSettings, setFormSettings] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['telephonyAdmin', selectedOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('telephonyAdminSettings', {
        action: 'get_settings',
        org_id: selectedOrgId
      });
      return res.data;
    },
    enabled: !!selectedOrgId,
    onSuccess: (data) => {
      if (data?.settings && !formSettings) {
        setFormSettings(data.settings);
      } else if (!formSettings) {
        setFormSettings({
          pbx_vendor: 'telnyx',
          sip_provider_name: 'Telnyx',
          sip_trunk_label: '',
          pbx_base_url: '',
          pbx_api_client_id: '',
          pbx_tenant_id: '',
          did_numbers: [],
          default_inbound_route_type: 'queue',
          timezone: 'Asia/Colombo',
          status: 'pending'
        });
      }
    }
  });

  React.useEffect(() => {
    if (data?.settings && !formSettings) {
      setFormSettings(data.settings);
    } else if (data && !data.settings && !formSettings) {
      setFormSettings({
        pbx_vendor: 'telnyx',
        sip_provider_name: 'Telnyx',
        sip_trunk_label: '',
        pbx_base_url: '',
        pbx_api_client_id: '',
        pbx_tenant_id: '',
        did_numbers: [],
        default_inbound_route_type: 'queue',
        timezone: 'Asia/Colombo',
        status: 'pending'
      });
    }
  }, [data]);

  const toggleMutation = useMutation({
    mutationFn: async (enable) => {
      const res = await base44.functions.invoke('telephonyAdminSettings', {
        action: enable ? 'enable_module' : 'disable_module',
        org_id: selectedOrgId
      });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['telephonyAdmin', selectedOrgId])
  });

  const saveMutation = useMutation({
    mutationFn: async (settings) => {
      const res = await base44.functions.invoke('telephonyAdminSettings', {
        action: 'save_settings',
        org_id: selectedOrgId,
        settings
      });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['telephonyAdmin', selectedOrgId])
  });

  const addDID = () => {
    if (!newDID.number) return;
    setFormSettings(prev => ({
      ...prev,
      did_numbers: [...(prev.did_numbers || []), { ...newDID }]
    }));
    setNewDID({ number: '', label: '', route_type: 'queue' });
  };

  const removeDID = (index) => {
    setFormSettings(prev => ({
      ...prev,
      did_numbers: prev.did_numbers.filter((_, i) => i !== index)
    }));
  };

  if (!selectedOrgId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Please select an organization first.</p>
      </div>
    );
  }

  const moduleEnabled = data?.module_enabled === true;
  const statusColor = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
          <Phone className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Telephony Module</h1>
          <p className="text-sm text-slate-500">PBX / SIP trunk configuration for this organization</p>
        </div>
      </div>

      {/* Module Toggle */}
      <Card className="border-2 border-violet-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-violet-600" />
              <CardTitle className="text-base">Module Access</CardTitle>
            </div>
            <Badge className={moduleEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
              {moduleEnabled ? '✓ Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Telephony Module</p>
              <p className="text-sm text-slate-500">
                {moduleEnabled
                  ? 'Telephony APIs and softphone UI are active for this org.'
                  : 'All telephony features and APIs are blocked for this org.'}
              </p>
            </div>
            <Switch
              checked={moduleEnabled}
              onCheckedChange={(val) => toggleMutation.mutate(val)}
              disabled={toggleMutation.isPending}
            />
          </div>
          {!moduleEnabled && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">Telephony is off. Enable it to configure SIP trunks and softphone features.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {moduleEnabled && formSettings && (
      <>
      {/* Account Mode Toggle */}
      <Card className="border-2 border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            Account Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 flex-1 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="account_mode"
                  checked={formSettings.use_master_account !== false}
                  onChange={() => setFormSettings(prev => ({ ...prev, use_master_account: true }))}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium text-slate-900">Use Master Account</p>
                  <p className="text-xs text-slate-500">Platform-managed 3CX (DIDs and extensions allocated from master)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 flex-1 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="account_mode"
                  checked={formSettings.use_master_account === false}
                  onChange={() => setFormSettings(prev => ({ ...prev, use_master_account: false }))}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium text-slate-900">Use Your Own PBX</p>
                  <p className="text-xs text-slate-500">Configure your own 3CX or other PBX system</p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                Provisioning Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formSettings.status}
                onValueChange={(v) => setFormSettings(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-2">
                Set to <strong>active</strong> once SIP trunk is configured and tested.
              </p>
            </CardContent>
          </Card>

          {/* PBX / Provider Settings */}
          {formSettings.use_master_account === false ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                Your PBX Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PBX Vendor</Label>
                  <Select value={formSettings.pbx_vendor} onValueChange={(v) => setFormSettings(prev => ({ ...prev, pbx_vendor: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telnyx">Telnyx</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="3cx">3CX</SelectItem>
                      <SelectItem value="asterisk">Asterisk</SelectItem>
                      <SelectItem value="freepbx">FreePBX</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>SIP Provider (DID)</Label>
                  <Select value={formSettings.sip_provider_name || ''} onValueChange={(v) => setFormSettings(prev => ({ ...prev, sip_provider_name: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Telnyx">Telnyx</SelectItem>
                      <SelectItem value="Twilio">Twilio</SelectItem>
                      <SelectItem value="SLT">SLT (Sri Lanka)</SelectItem>
                      <SelectItem value="Dialog">Dialog (Sri Lanka)</SelectItem>
                      <SelectItem value="DIDWW">DIDWW</SelectItem>
                      <SelectItem value="TechGates">TechGates.lk</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SIP Trunk Label</Label>
                  <Input
                    placeholder="e.g. Main Reception Trunk"
                    value={formSettings.sip_trunk_label || ''}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, sip_trunk_label: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>PBX Tenant ID</Label>
                  <Input
                    placeholder="Tenant/Account ID (if applicable)"
                    value={formSettings.pbx_tenant_id || ''}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, pbx_tenant_id: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>PBX Base URL</Label>
                <Input
                  placeholder="https://your-pbx.example.com/api"
                  value={formSettings.pbx_base_url || ''}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, pbx_base_url: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>API Client ID</Label>
                  <Input
                    placeholder="Client/App ID"
                    value={formSettings.pbx_api_client_id || ''}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, pbx_api_client_id: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>API Secret <span className="text-xs text-slate-400">(stored as reference only)</span></Label>
                  <Input
                    type="password"
                    placeholder="Stored securely — enter to update"
                    onChange={(e) => setFormSettings(prev => ({ ...prev, pbx_api_secret_ref: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Inbound Route</Label>
                  <Select value={formSettings.default_inbound_route_type} onValueChange={(v) => setFormSettings(prev => ({ ...prev, default_inbound_route_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="queue">Queue</SelectItem>
                      <SelectItem value="ivr">IVR</SelectItem>
                      <SelectItem value="extension">Direct Extension</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={formSettings.timezone || 'Asia/Colombo'} onValueChange={(v) => setFormSettings(prev => ({ ...prev, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Colombo">Asia/Colombo (LK)</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/Toronto">America/Toronto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </CardContent>
              </Card>
              ) : (
              <Card className="border-2 border-green-100 bg-green-50">
              <CardHeader>
              <CardTitle className="text-base text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Master Account Active
              </CardTitle>
              </CardHeader>
              <CardContent>
              <p className="text-sm text-green-800">
                You're using the platform's managed 3CX master account. Configure DIDs and extensions below.
              </p>
              </CardContent>
              </Card>
              )}

              {/* DID Numbers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                DID / Phone Numbers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(formSettings.did_numbers || []).length === 0 && (
                <p className="text-sm text-slate-400">No DID numbers configured yet.</p>
              )}
              {(formSettings.did_numbers || []).map((did, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium text-slate-800">{did.number}</p>
                    <p className="text-xs text-slate-500">{did.label} · Route: <span className="capitalize">{did.route_type}</span></p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeDID(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* Add DID */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Input
                  placeholder="+94 11 XXXXXXX"
                  className="font-mono"
                  value={newDID.number}
                  onChange={(e) => setNewDID(prev => ({ ...prev, number: e.target.value }))}
                />
                <Input
                  placeholder="Label (e.g. Reception)"
                  value={newDID.label}
                  onChange={(e) => setNewDID(prev => ({ ...prev, label: e.target.value }))}
                />
                <Select value={newDID.route_type} onValueChange={(v) => setNewDID(prev => ({ ...prev, route_type: v }))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="queue">Queue</SelectItem>
                    <SelectItem value="ivr">IVR</SelectItem>
                    <SelectItem value="extension">Extension</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={addDID}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sri Lanka SIP Onboarding Requirements */}
          <SipRequirementsPanel
            value={formSettings.sip_requirements || {}}
            onChange={(v) => setFormSettings(prev => ({ ...prev, sip_requirements: v }))}
          />

          {/* PBX Provisioning Panel */}
          <ProvisioningPanel
            orgId={selectedOrgId}
            settings={formSettings}
            onRefresh={() => queryClient.invalidateQueries(['telephonyAdmin', selectedOrgId])}
          />

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate(formSettings)}
              disabled={saveMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Telephony Settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}