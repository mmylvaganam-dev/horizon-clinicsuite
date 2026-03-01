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
          Configure 3CX master account credentials. Organizations will use this account unless they configure their own.
        </p>
      </div>

      <div className="grid gap-6">
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            This is the master 3CX account configuration. All organizations can use this unless they choose to configure their own PBX.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>3CX Master Account Configuration</CardTitle>
            <CardDescription>
              Enter your 3CX master account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="vendor">PBX Vendor</Label>
              <Select value={formData.pbx_vendor} onValueChange={(value) => setFormData({ ...formData, pbx_vendor: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
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
                id="base_url"
                type="url"
                placeholder="https://your-3cx-domain.com"
                value={formData.pbx_base_url}
                onChange={(e) => setFormData({ ...formData, pbx_base_url: e.target.value })}
                className="mt-2"
              />
              <p className="text-sm text-slate-500 mt-1">The API endpoint for your 3CX instance</p>
            </div>

            <div>
              <Label htmlFor="client_id">3CX API Client ID *</Label>
              <Input
                id="client_id"
                type="text"
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
                type="text"
                placeholder="THREE_CX_API_SECRET"
                value={formData.pbx_api_secret_ref}
                onChange={(e) => setFormData({ ...formData, pbx_api_secret_ref: e.target.value })}
                className="mt-2"
              />
              <p className="text-sm text-slate-500 mt-1">Reference to the secret stored in your platform settings</p>
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
                {saveStatus.type === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                <AlertDescription>
                  {saveStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-blue-900">
            <p>1. Configure the master 3CX account above</p>
            <p>2. Organizations see "Use Master Account" as default in their Telephony Settings</p>
            <p>3. Organizations can allocate DIDs and extensions from the master account</p>
            <p>4. Organizations can optionally configure their own PBX by toggling "Use Own Account"</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}