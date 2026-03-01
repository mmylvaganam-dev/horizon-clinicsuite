import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Save, CheckCircle2, AlertCircle, Network, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlatformTelephonyConfig() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    pbx_vendor: '3cx',
    pbx_base_url: '',
    pbx_api_client_id: '',
    pbx_api_secret_ref: 'THREE_CX_API_SECRET'
  });
  const [sipData, setSipData] = useState({
    sip_provider: 'telnyx',
    sip_host: '',
    sip_username: '',
    sip_port: '5060',
    sip_transport: 'UDP',
    sip_codecs: 'G.711, G.722',
    sip_max_channels: '10',
    sip_caller_id: '',
    sip_registrar: '',
    sip_outbound_proxy: '',
  });
  const [saveStatus, setSaveStatus] = useState(null);
  const [sipSaveStatus, setSipSaveStatus] = useState(null);

  const { data: platformConfig } = useQuery({
    queryKey: ['platformTelephonyConfig'],
    queryFn: async () => {
      const configs = await base44.entities.ConfigKey.filter({ key: 'PLATFORM_TELEPHONY_CONFIG' });
      if (configs.length > 0) {
        const config = JSON.parse(configs[0].value || '{}');
        setFormData(prev => ({ ...prev, ...config }));
        return config;
      }
      return null;
    },
  });

  useQuery({
    queryKey: ['platformSIPConfig'],
    queryFn: async () => {
      const configs = await base44.entities.ConfigKey.filter({ key: 'PLATFORM_SIP_TRUNK_CONFIG' });
      if (configs.length > 0) {
        const config = JSON.parse(configs[0].value || '{}');
        setSipData(prev => ({ ...prev, ...config }));
        return config;
      }
      return null;
    },
  });

  const saveSIPMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.ConfigKey.filter({ key: 'PLATFORM_SIP_TRUNK_CONFIG' });
      if (existing.length > 0) {
        return base44.entities.ConfigKey.update(existing[0].id, { value: JSON.stringify(data) });
      }
      return base44.entities.ConfigKey.create({ key: 'PLATFORM_SIP_TRUNK_CONFIG', value: JSON.stringify(data) });
    },
    onSuccess: () => {
      setSipSaveStatus({ type: 'success', message: 'SIP trunk configuration saved!' });
      toast.success('SIP trunk config saved!');
      setTimeout(() => setSipSaveStatus(null), 3000);
    },
    onError: (error) => {
      setSipSaveStatus({ type: 'error', message: error.message });
      toast.error('Failed: ' + error.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return base44.functions.invoke('platformTelephonyConfig', { 
        action: 'save',
        config: data 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['platformTelephonyConfig']);
      setSaveStatus({ type: 'success', message: 'Master telephony configuration saved!' });
      toast.success('Master telephony config saved!');
      setTimeout(() => setSaveStatus(null), 3000);
    },
    onError: (error) => {
      setSaveStatus({ type: 'error', message: error.message });
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleSave = () => {
    if (!formData.pbx_base_url || !formData.pbx_api_client_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Phone className="w-8 h-8 text-teal-600" />
          Platform Telephony Master Account
        </h1>
        <p className="text-slate-600 mt-2">
          Configure the master PBX account and SIP trunk used by all organizations.
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          This is the master telephony configuration. All organizations use these credentials unless they configure their own PBX.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="pbx">
        <TabsList className="mb-6">
          <TabsTrigger value="pbx" className="flex items-center gap-2">
            <Phone className="w-4 h-4" /> PBX / Master Account
          </TabsTrigger>
          <TabsTrigger value="sip" className="flex items-center gap-2">
            <Network className="w-4 h-4" /> SIP Trunk
          </TabsTrigger>
        </TabsList>

        {/* ── PBX TAB ── */}
        <TabsContent value="pbx" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>3CX Master Account Configuration</CardTitle>
              <CardDescription>Enter your 3CX master account API credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="vendor">PBX Vendor</Label>
                <Select value={formData.pbx_vendor} onValueChange={(v) => setFormData({ ...formData, pbx_vendor: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3cx">3CX</SelectItem>
                    <SelectItem value="asterisk">Asterisk</SelectItem>
                    <SelectItem value="freepbx">FreePBX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="base_url">3CX Base URL *</Label>
                <Input
                  id="base_url" type="url"
                  placeholder="https://your-3cx-domain.com"
                  value={formData.pbx_base_url}
                  onChange={(e) => setFormData({ ...formData, pbx_base_url: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">The API endpoint for your 3CX instance</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">API Client ID *</Label>
                  <Input
                    id="client_id"
                    placeholder="Your 3CX API Client ID"
                    value={formData.pbx_api_client_id}
                    onChange={(e) => setFormData({ ...formData, pbx_api_client_id: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="secret_ref">API Secret Reference</Label>
                  <Input
                    id="secret_ref"
                    placeholder="THREE_CX_API_SECRET"
                    value={formData.pbx_api_secret_ref}
                    onChange={(e) => setFormData({ ...formData, pbx_api_secret_ref: e.target.value })}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Secret key name stored in platform secrets</p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !formData.pbx_base_url || !formData.pbx_api_client_id}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Master Configuration'}
              </Button>

              {saveStatus && (
                <Alert variant={saveStatus.type === 'error' ? 'destructive' : 'default'}>
                  {saveStatus.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  <AlertDescription>{saveStatus.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader><CardTitle className="text-blue-900">How It Works</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-900">
              <p>1. Configure the master 3CX account above</p>
              <p>2. Organizations see "Use Master Account" as default in their Telephony Settings</p>
              <p>3. Organizations can allocate DIDs and extensions from the master account</p>
              <p>4. Organizations can optionally configure their own PBX by toggling "Use Own Account"</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SIP TRUNK TAB ── */}
        <TabsContent value="sip" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5 text-teal-600" />
                SIP Trunk Configuration
              </CardTitle>
              <CardDescription>
                Configure the master SIP trunk — handles all inbound and outbound PSTN calls across organizations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SIP Provider</Label>
                  <Select value={sipData.sip_provider} onValueChange={(v) => setSipData(p => ({ ...p, sip_provider: v }))}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telnyx">Telnyx</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="slt">SLT (Sri Lanka)</SelectItem>
                      <SelectItem value="dialog">Dialog (Sri Lanka)</SelectItem>
                      <SelectItem value="didww">DIDWW</SelectItem>
                      <SelectItem value="techgates">TechGates.lk</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transport Protocol</Label>
                  <Select value={sipData.sip_transport} onValueChange={(v) => setSipData(p => ({ ...p, sip_transport: v }))}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UDP">UDP</SelectItem>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="TLS">TLS (recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SIP Server / Host *</Label>
                  <Input
                    placeholder="sip.telnyx.com"
                    value={sipData.sip_host}
                    onChange={e => setSipData(p => ({ ...p, sip_host: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>SIP Port</Label>
                  <Input
                    placeholder="5060"
                    value={sipData.sip_port}
                    onChange={e => setSipData(p => ({ ...p, sip_port: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SIP Username / Auth ID *</Label>
                  <Input
                    placeholder="trunk username or account SID"
                    value={sipData.sip_username}
                    onChange={e => setSipData(p => ({ ...p, sip_username: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Outbound Caller ID</Label>
                  <Input
                    placeholder="+1 416 XXXXXXX"
                    value={sipData.sip_caller_id}
                    onChange={e => setSipData(p => ({ ...p, sip_caller_id: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Registrar URI <span className="text-xs text-slate-400">(optional)</span></Label>
                  <Input
                    placeholder="registrar.provider.com"
                    value={sipData.sip_registrar}
                    onChange={e => setSipData(p => ({ ...p, sip_registrar: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Outbound Proxy <span className="text-xs text-slate-400">(optional)</span></Label>
                  <Input
                    placeholder="proxy.provider.com"
                    value={sipData.sip_outbound_proxy}
                    onChange={e => setSipData(p => ({ ...p, sip_outbound_proxy: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Codecs</Label>
                  <Input
                    placeholder="G.711, G.722, Opus"
                    value={sipData.sip_codecs}
                    onChange={e => setSipData(p => ({ ...p, sip_codecs: e.target.value }))}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated in priority order</p>
                </div>
                <div>
                  <Label>Max Concurrent Channels</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={sipData.sip_max_channels}
                    onChange={e => setSipData(p => ({ ...p, sip_max_channels: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Security note:</strong> SIP passwords/credentials are stored by reference only. Store the actual secret in your platform environment secrets as <code className="bg-amber-100 px-1 rounded">PLATFORM_SIP_SECRET</code>.
                </p>
              </div>

              <Button
                onClick={() => saveSIPMutation.mutate(sipData)}
                disabled={saveSIPMutation.isPending || !sipData.sip_host || !sipData.sip_username}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveSIPMutation.isPending ? 'Saving...' : 'Save SIP Trunk Configuration'}
              </Button>

              {sipSaveStatus && (
                <Alert variant={sipSaveStatus.type === 'error' ? 'destructive' : 'default'}>
                  {sipSaveStatus.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  <AlertDescription>{sipSaveStatus.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}