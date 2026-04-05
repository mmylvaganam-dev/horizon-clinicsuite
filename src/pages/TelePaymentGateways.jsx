import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CreditCard, Globe, Building2, CheckCircle, AlertCircle,
  Settings, Plus, Zap, Shield, ArrowUpRight, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Gateway catalogue ────────────────────────────────────────────────────────
const GATEWAY_CATALOGUE = [
  // International
  {
    code: 'stripe',
    name: 'Stripe',
    region: 'international',
    logo: '💳',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    description: 'Global leader — cards, Apple Pay, Google Pay, SEPA, BACS',
    fields: ['public_key', 'secret_key_hint', 'webhook_secret_hint', 'environment'],
    docs: 'https://stripe.com/docs',
    popular: true,
  },
  {
    code: 'paypal',
    name: 'PayPal',
    region: 'international',
    logo: '🅿️',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    description: 'PayPal Checkout & PayPal Express — widely trusted by diaspora',
    fields: ['public_key', 'secret_key_hint', 'environment'],
    docs: 'https://developer.paypal.com',
    popular: true,
  },
  // Sri Lanka IPGs
  {
    code: 'payhere',
    name: 'PayHere',
    region: 'srilanka',
    logo: '🇱🇰',
    currencies: ['LKR', 'USD'],
    description: 'Sri Lanka\'s most popular IPG — cards, FriMi, eZ Cash',
    fields: ['public_key', 'secret_key_hint', 'merchant_id', 'environment'],
    docs: 'https://support.payhere.lk',
    popular: true,
  },
  {
    code: 'genie',
    name: 'Genie by Dialog',
    region: 'srilanka',
    logo: '📱',
    currencies: ['LKR'],
    description: 'Dialog Axiata mobile wallet & QR — Genie checkout',
    fields: ['merchant_id', 'secret_key_hint', 'environment'],
    docs: 'https://www.dialog.lk/genie',
    popular: false,
  },
  {
    code: 'webxpay',
    name: 'WebXPay',
    region: 'srilanka',
    logo: '🔵',
    currencies: ['LKR', 'USD'],
    description: 'PCI-DSS Level 1 Sri Lanka gateway — major banks supported',
    fields: ['public_key', 'secret_key_hint', 'merchant_id', 'environment'],
    docs: 'https://www.webxpay.com',
    popular: false,
  },
  {
    code: 'ipg_sampath',
    name: 'Sampath Bank IPG',
    region: 'srilanka',
    logo: '🏦',
    currencies: ['LKR'],
    description: 'Sampath Bank internet payment gateway — local cards',
    fields: ['merchant_id', 'secret_key_hint', 'environment'],
    docs: 'https://www.sampath.lk',
    popular: false,
  },
  {
    code: 'ipg_hns',
    name: 'HNB eGateway',
    region: 'srilanka',
    logo: '🏦',
    currencies: ['LKR'],
    description: 'Hatton National Bank internet payment gateway',
    fields: ['merchant_id', 'secret_key_hint', 'environment'],
    docs: 'https://www.hnb.net',
    popular: false,
  },
  {
    code: 'ipg_cargills',
    name: 'Cargills Cash',
    region: 'srilanka',
    logo: '🛒',
    currencies: ['LKR'],
    description: 'Cargills Bank digital wallet & payment gateway',
    fields: ['merchant_id', 'secret_key_hint', 'environment'],
    docs: null,
    popular: false,
  },
  // Manual / offline
  {
    code: 'manual_bank',
    name: 'Bank Transfer (Manual)',
    region: 'both',
    logo: '🏛️',
    currencies: ['LKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    description: 'International wire transfer or local CEFTS — admin confirms receipt manually',
    fields: ['bank_name', 'bank_account_name', 'bank_account_number', 'bank_swift_code', 'bank_branch'],
    docs: null,
    popular: false,
  },
];

const FIELD_LABELS = {
  public_key: 'Publishable / Client ID',
  secret_key_hint: 'Secret Key (last 4 chars only)',
  webhook_secret_hint: 'Webhook Secret (last 4 chars only)',
  merchant_id: 'Merchant ID',
  environment: 'Environment',
  bank_name: 'Bank Name',
  bank_account_name: 'Account Holder Name',
  bank_account_number: 'Account Number',
  bank_swift_code: 'SWIFT / BIC Code',
  bank_branch: 'Branch Name / Code',
};

const REGION_LABELS = { international: '🌍 International', srilanka: '🇱🇰 Sri Lanka', both: '🌐 Both' };

export default function TelePaymentGateways() {
  const { selectedOrgId } = useOrganization();
  const qc = useQueryClient();
  const [editGateway, setEditGateway] = useState(null); // catalogue entry being configured
  const [editRecord, setEditRecord] = useState(null);   // existing DB record (if any)
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('international');

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['telePaymentGateways', selectedOrgId],
    queryFn: () => base44.entities.TelePaymentGatewayConfig.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editRecord?.id) {
        return base44.entities.TelePaymentGatewayConfig.update(editRecord.id, data);
      }
      return base44.entities.TelePaymentGatewayConfig.create({ ...data, organization_id: selectedOrgId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telePaymentGateways', selectedOrgId] });
      toast.success('Payment gateway saved');
      setEditGateway(null);
      setEditRecord(null);
    },
    onError: (e) => toast.error('Save failed: ' + e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.TelePaymentGatewayConfig.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telePaymentGateways', selectedOrgId] }),
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, type }) => {
      // Un-set others first, then set this one
      const field = type === 'international' ? 'is_default_international' : 'is_default_local';
      const others = configs.filter(c => c.id !== id && c[field]);
      await Promise.all(others.map(c => base44.entities.TelePaymentGatewayConfig.update(c.id, { [field]: false })));
      return base44.entities.TelePaymentGatewayConfig.update(id, { [field]: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telePaymentGateways', selectedOrgId] });
      toast.success('Default gateway updated');
    },
  });

  const openConfigure = (gatewayDef) => {
    const existing = configs.find(c => c.gateway_code === gatewayDef.code);
    setEditGateway(gatewayDef);
    setEditRecord(existing || null);
    setFormData(existing ? { ...existing } : {
      gateway_code: gatewayDef.code,
      display_name: gatewayDef.name,
      region: gatewayDef.region,
      supported_currencies: gatewayDef.currencies,
      environment: 'sandbox',
      is_active: false,
    });
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const getConfig = (code) => configs.find(c => c.gateway_code === code);

  const internationalGateways = GATEWAY_CATALOGUE.filter(g => g.region === 'international');
  const localGateways = GATEWAY_CATALOGUE.filter(g => g.region === 'srilanka');
  const bothGateways = GATEWAY_CATALOGUE.filter(g => g.region === 'both');

  const activeIntl = configs.filter(c => c.is_active && (c.region === 'international' || c.region === 'both'));
  const activeLocal = configs.filter(c => c.is_active && (c.region === 'srilanka' || c.region === 'both'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-teal-600" />
          Payment Gateway Setup
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure payment methods for international diaspora patients (USD/EUR/GBP) and Sri Lanka local patients (LKR). Each virtual hospital can have its own gateway setup.
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-teal-700">{activeIntl.length}</p>
            <p className="text-xs text-teal-600 mt-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Active International</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-blue-700">{activeLocal.length}</p>
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Active Local (LKR)</p>
          </CardContent>
        </Card>
        <Card className={activeIntl.length === 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="py-4">
            {activeIntl.length > 0
              ? <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
              : <AlertCircle className="w-6 h-6 text-red-400 mb-1" />}
            <p className={`text-xs font-medium ${activeIntl.length > 0 ? 'text-green-700' : 'text-red-600'}`}>
              {activeIntl.length > 0 ? 'International ready' : 'No intl gateway active'}
            </p>
          </CardContent>
        </Card>
        <Card className={activeLocal.length === 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="py-4">
            {activeLocal.length > 0
              ? <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
              : <AlertCircle className="w-6 h-6 text-amber-400 mb-1" />}
            <p className={`text-xs font-medium ${activeLocal.length > 0 ? 'text-green-700' : 'text-amber-700'}`}>
              {activeLocal.length > 0 ? 'Local LKR ready' : 'No local gateway active'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Security note:</strong> Store only publishable/public keys here. Secret keys and webhook secrets should be set as <strong>environment secrets</strong> in your app settings (e.g. <code className="bg-blue-100 px-1 rounded">STRIPE_SECRET_KEY</code>). The "last 4 chars" fields here are just for your reference to confirm which key is in use.
          </div>
        </CardContent>
      </Card>

      {/* Gateway Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="international" className="flex items-center gap-1.5">
            <Globe className="w-4 h-4" /> International
          </TabsTrigger>
          <TabsTrigger value="srilanka" className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Sri Lanka IPGs
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Offline / Other
          </TabsTrigger>
        </TabsList>

        {/* ── International ── */}
        <TabsContent value="international" className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">For overseas patients paying in USD, EUR, GBP, CAD, AUD.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {internationalGateways.map(gw => (
              <GatewayCard
                key={gw.code}
                gw={gw}
                config={getConfig(gw.code)}
                onConfigure={() => openConfigure(gw)}
                onToggle={(id, val) => toggleActive.mutate({ id, is_active: val })}
                onSetDefault={(id) => setDefaultMutation.mutate({ id, type: 'international' })}
                defaultType="international"
              />
            ))}
          </div>
        </TabsContent>

        {/* ── Sri Lanka ── */}
        <TabsContent value="srilanka" className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">For local patients paying in LKR, or cross-border patients using Sri Lanka bank cards.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localGateways.map(gw => (
              <GatewayCard
                key={gw.code}
                gw={gw}
                config={getConfig(gw.code)}
                onConfigure={() => openConfigure(gw)}
                onToggle={(id, val) => toggleActive.mutate({ id, is_active: val })}
                onSetDefault={(id) => setDefaultMutation.mutate({ id, type: 'local' })}
                defaultType="local"
              />
            ))}
          </div>
        </TabsContent>

        {/* ── Offline / Other ── */}
        <TabsContent value="other" className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">Manual / offline payment methods where your admin confirms receipt.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bothGateways.map(gw => (
              <GatewayCard
                key={gw.code}
                gw={gw}
                config={getConfig(gw.code)}
                onConfigure={() => openConfigure(gw)}
                onToggle={(id, val) => toggleActive.mutate({ id, is_active: val })}
                onSetDefault={null}
                defaultType={null}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configure Dialog */}
      <Dialog open={!!editGateway} onOpenChange={(o) => { if (!o) { setEditGateway(null); setEditRecord(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{editGateway?.logo}</span>
              Configure {editGateway?.name}
            </DialogTitle>
          </DialogHeader>

          {editGateway && (
            <div className="space-y-4">
              {/* Info */}
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                <span>{editGateway.description}</span>
              </div>

              {/* Display name */}
              <div>
                <Label className="text-xs">Display Name (shown to patients)</Label>
                <Input
                  value={formData.display_name || ''}
                  onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
                  className="mt-1"
                  placeholder={editGateway.name}
                />
              </div>

              {/* Supported currencies */}
              <div>
                <Label className="text-xs">Supported Currencies</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'LKR'].map(cur => {
                    const active = (formData.supported_currencies || []).includes(cur);
                    const available = editGateway.currencies.includes(cur);
                    if (!available) return null;
                    return (
                      <button
                        key={cur}
                        onClick={() => {
                          const current = formData.supported_currencies || [];
                          setFormData(p => ({
                            ...p,
                            supported_currencies: active
                              ? current.filter(c => c !== cur)
                              : [...current, cur]
                          }));
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-teal-400'
                        }`}
                      >
                        {cur}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Environment */}
              {editGateway.fields.includes('environment') && (
                <div>
                  <Label className="text-xs">Environment</Label>
                  <Select
                    value={formData.environment || 'sandbox'}
                    onValueChange={v => setFormData(p => ({ ...p, environment: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">🧪 Sandbox / Test</SelectItem>
                      <SelectItem value="live">🚀 Live / Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Gateway-specific fields */}
              {editGateway.fields.filter(f => !['environment'].includes(f)).map(field => (
                <div key={field}>
                  <Label className="text-xs">{FIELD_LABELS[field] || field}</Label>
                  <Input
                    value={formData[field] || ''}
                    onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                    className="mt-1"
                    placeholder={
                      field === 'secret_key_hint' ? 'e.g. k4J9 (last 4 chars only)' :
                      field === 'webhook_secret_hint' ? 'e.g. 8xYZ (last 4 chars only)' :
                      field === 'public_key' ? editGateway.code === 'stripe' ? 'pk_live_...' :
                        editGateway.code === 'paypal' ? 'AX...' : '' : ''
                    }
                  />
                  {(field === 'secret_key_hint' || field === 'webhook_secret_hint') && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Set the full secret in App Settings → Environment Variables as{' '}
                      <code className="bg-amber-50 px-1 rounded">
                        {editGateway.code.toUpperCase()}_{field === 'secret_key_hint' ? 'SECRET_KEY' : 'WEBHOOK_SECRET'}
                      </code>
                    </p>
                  )}
                </div>
              ))}

              {/* Notes */}
              <div>
                <Label className="text-xs">Admin Notes (optional)</Label>
                <Input
                  value={formData.notes || ''}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g. Premier Health Canada account"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-800">Activate this gateway</p>
                  <p className="text-xs text-slate-500">Enable for patients to see and use this payment method</p>
                </div>
                <Switch
                  checked={!!formData.is_active}
                  onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))}
                />
              </div>

              {/* Docs link */}
              {editGateway.docs && (
                <a href={editGateway.docs} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-teal-600 hover:underline">
                  <ArrowUpRight className="w-3 h-3" />
                  {editGateway.name} developer docs
                </a>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setEditGateway(null); setEditRecord(null); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : editRecord ? 'Update Gateway' : 'Save Gateway'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Gateway Card component ────────────────────────────────────────────────────
function GatewayCard({ gw, config, onConfigure, onToggle, onSetDefault, defaultType }) {
  const isConfigured = !!config;
  const isActive = config?.is_active;
  const isDefaultIntl = config?.is_default_international;
  const isDefaultLocal = config?.is_default_local;
  const isDefault = defaultType === 'international' ? isDefaultIntl : defaultType === 'local' ? isDefaultLocal : false;

  return (
    <Card className={`border-2 transition-colors ${isActive ? 'border-teal-200 bg-teal-50/30' : 'border-slate-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{gw.logo}</span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 text-sm">{gw.name}</p>
                {gw.popular && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Popular</Badge>}
                {isDefault && <Badge className="bg-teal-600 text-white border-0 text-xs">Default</Badge>}
              </div>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {gw.currencies.map(c => (
                  <span key={c} className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </div>
          </div>
          {isConfigured && (
            <Switch
              checked={!!isActive}
              onCheckedChange={(v) => onToggle(config.id, v)}
              className="flex-shrink-0"
            />
          )}
        </div>

        <p className="text-xs text-slate-500 mb-3">{gw.description}</p>

        {config && (
          <div className="text-xs text-slate-500 bg-white rounded border p-2 mb-3 space-y-0.5">
            {config.environment && (
              <p>Mode: <span className={`font-semibold ${config.environment === 'live' ? 'text-green-600' : 'text-amber-600'}`}>
                {config.environment === 'live' ? '🚀 Live' : '🧪 Sandbox'}
              </span></p>
            )}
            {config.public_key && <p>Key: <span className="font-mono">{config.public_key.slice(0, 12)}...</span></p>}
            {config.merchant_id && <p>Merchant: <span className="font-mono">{config.merchant_id}</span></p>}
            {config.bank_account_name && <p>Account: {config.bank_account_name}</p>}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="text-xs flex-1" onClick={onConfigure}>
            <Settings className="w-3 h-3 mr-1" />
            {isConfigured ? 'Edit' : 'Configure'}
          </Button>
          {isConfigured && isActive && onSetDefault && !isDefault && (
            <Button size="sm" variant="outline" className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
              onClick={() => onSetDefault(config.id)}>
              Set Default
            </Button>
          )}
          {!isConfigured && (
            <Badge variant="outline" className="text-xs text-slate-400 border-dashed">Not configured</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}