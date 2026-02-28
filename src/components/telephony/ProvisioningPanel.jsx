/**
 * ProvisioningPanel
 * Shows PBX provisioning actions and sync buttons.
 * Used inside TelephonyAdmin page.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, RefreshCw, Phone, GitBranch, PhoneCall, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function ProvisioningPanel({ orgId, settings, onRefresh }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const run = async (key, fnName, payload = {}) => {
    setLoading(p => ({ ...p, [key]: true }));
    setResults(p => ({ ...p, [key]: null }));
    try {
      const res = await base44.functions.invoke(fnName, { org_id: orgId, ...payload });
      setResults(p => ({ ...p, [key]: { ok: true, data: res.data } }));
      if (onRefresh) onRefresh();
    } catch (e) {
      setResults(p => ({ ...p, [key]: { ok: false, error: e.message } }));
    } finally {
      setLoading(p => ({ ...p, [key]: false }));
    }
  };

  const isProvisioned = !!settings?.pbx_tenant_id;
  const isActive = settings?.status === 'active';

  const ResultBadge = ({ k }) => {
    const r = results[k];
    if (!r) return null;
    return r.ok
      ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Done</Badge>
      : <Badge className="bg-red-100 text-red-700 text-xs"><AlertTriangle className="w-3 h-3 mr-1 inline" />Error</Badge>;
  };

  const actions = [
    {
      key: 'provision',
      label: 'Provision PBX Tenant',
      description: isProvisioned ? `Tenant: ${settings.pbx_tenant_id}` : 'Set up PBX tenant and baseline objects',
      icon: Server,
      color: 'bg-violet-600 hover:bg-violet-700',
      fn: () => run('provision', 'telephonyProvisionTenant'),
      done: isProvisioned,
    },
    {
      key: 'syncExt',
      label: 'Sync Extensions',
      description: 'Push extension changes to PBX',
      icon: Phone,
      color: 'bg-blue-600 hover:bg-blue-700',
      fn: () => run('syncExt', 'telephonySyncExtensions'),
      disabled: !isProvisioned,
    },
    {
      key: 'syncQueues',
      label: 'Sync Queues & IVRs',
      description: 'Push queue and IVR config to PBX',
      icon: GitBranch,
      color: 'bg-amber-600 hover:bg-amber-700',
      fn: () => run('syncQueues', 'telephonySyncQueuesAndIVRs', { action: 'all' }),
      disabled: !isProvisioned,
    },
    {
      key: 'pullLogs',
      label: 'Pull Call Logs',
      description: 'Fetch latest call records from PBX',
      icon: PhoneCall,
      color: 'bg-green-600 hover:bg-green-700',
      fn: () => run('pullLogs', 'telephonyIngestCallLogs'),
      disabled: !isProvisioned,
    },
  ];

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-500" />
          <CardTitle className="text-base">PBX Provisioning & Sync</CardTitle>
          {isActive
            ? <Badge className="bg-green-100 text-green-700 text-xs ml-auto">Active</Badge>
            : <Badge className="bg-yellow-100 text-yellow-700 text-xs ml-auto">Pending</Badge>
          }
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isProvisioned && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>PBX tenant not yet provisioned. Click "Provision PBX Tenant" to initialize.</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map(a => (
            <div key={a.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <a.icon className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-slate-800">{a.label}</p>
                  {a.done && !results[a.key] && <Badge className="bg-green-100 text-green-700 text-xs">✓ Provisioned</Badge>}
                  <ResultBadge k={a.key} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{a.description}</p>
                {results[a.key]?.ok && results[a.key]?.data?.message && (
                  <p className="text-xs text-green-600 mt-1">{results[a.key].data.message}</p>
                )}
                {results[a.key]?.ok && results[a.key]?.data?.stub && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Running in stub mode</p>
                )}
                {results[a.key]?.error && (
                  <p className="text-xs text-red-600 mt-1">{results[a.key].error}</p>
                )}
              </div>
              <Button
                size="sm"
                className={`flex-shrink-0 text-white ${a.color} disabled:opacity-50`}
                disabled={loading[a.key] || a.disabled}
                onClick={a.fn}
              >
                {loading[a.key]
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <RefreshCw className="w-3 h-3" />
                }
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}