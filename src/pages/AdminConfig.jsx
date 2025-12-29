import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, ArrowLeft, Plus, Edit, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

export default function AdminConfig() {
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [configFormOpen, setConfigFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configFormData, setConfigFormData] = useState({
    config_key_id: '', value: ''
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: configKeys = [], isLoading: loadingKeys } = useQuery({
    queryKey: ['configKeys'],
    queryFn: () => base44.entities.ConfigKey.list(),
  });

  const { data: orgConfigs = [] } = useQuery({
    queryKey: ['orgConfigs'],
    queryFn: () => base44.entities.OrganizationConfig.list(),
    enabled: !!selectedOrg,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      let result;
      if (id) {
        result = await base44.entities.OrganizationConfig.update(id, data);
      } else {
        result = await base44.entities.OrganizationConfig.create(data);
      }

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: data.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: id ? 'update_config' : 'create_config',
        record_type: 'OrganizationConfig',
        record_id: result.id,
        metadata: { config_key_id: data.config_key_id, value: data.value }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgConfigs'] });
      setConfigFormOpen(false);
      setEditingConfig(null);
      setConfigFormData({ config_key_id: '', value: '' });
    },
  });

  const handleSaveConfig = (e) => {
    e.preventDefault();
    const data = {
      organization_id: selectedOrg.id,
      ...configFormData
    };
    saveConfigMutation.mutate({ id: editingConfig?.id, data });
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    setConfigFormData({
      config_key_id: config.config_key_id,
      value: config.value
    });
    setConfigFormOpen(true);
  };

  const getConfigKeyName = (keyId) => {
    const key = configKeys.find(k => k.id === keyId);
    return key ? key.key : keyId;
  };

  const getConfigKeyDetails = (keyId) => {
    return configKeys.find(k => k.id === keyId);
  };

  const filteredOrgConfigs = selectedOrg
    ? orgConfigs.filter(oc => oc.organization_id === selectedOrg.id)
    : [];

  const groupedConfigs = filteredOrgConfigs.reduce((acc, config) => {
    const key = configKeys.find(k => k.id === config.config_key_id);
    const category = key?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuration</h1>
          <p className="text-slate-500 mt-1">Manage organization settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 p-4 bg-white border-0 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-900 mb-3">Organizations</h3>
          <div className="space-y-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedOrg?.id === org.id
                    ? 'bg-indigo-100 text-indigo-900'
                    : 'hover:bg-slate-100'
                }`}
              >
                <p className="font-medium text-sm">{org.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{org.code}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3">
          {!selectedOrg ? (
            <Card className="p-12 text-center bg-white border-0 shadow-sm">
              <Settings className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Select an organization</h3>
              <p className="text-slate-500 mt-1">Choose an organization to manage settings</p>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4 bg-white border-0 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900">Configuration for {selectedOrg.name}</h3>
                  <Button onClick={() => { setEditingConfig(null); setConfigFormData({ config_key_id: '', value: '' }); setConfigFormOpen(true); }} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Config
                  </Button>
                </div>
              </Card>

              {loadingKeys ? (
                <Skeleton className="h-48 rounded-xl" />
              ) : Object.keys(groupedConfigs).length === 0 ? (
                <Card className="p-8 text-center bg-white border-0 shadow-sm">
                  <Settings className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No configuration set for this organization</p>
                </Card>
              ) : (
                Object.entries(groupedConfigs).map(([category, configs]) => (
                  <Card key={category} className="p-5 bg-white border-0 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-4 capitalize">{category.replace('_', ' ')}</h4>
                    <div className="space-y-3">
                      {configs.map((config) => (
                        <div key={config.id} className="flex items-start justify-between p-3 rounded-lg hover:bg-slate-50">
                          <div>
                            <p className="font-medium text-sm text-slate-900">{getConfigKeyName(config.config_key_id)}</p>
                            <p className="text-sm text-slate-600 mt-1">{config.value}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleEditConfig(config)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={configFormOpen} onOpenChange={setConfigFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Edit Configuration' : 'Add Configuration'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-2">
              <Label>Configuration Key *</Label>
              <Select
                value={configFormData.config_key_id}
                onValueChange={(v) => setConfigFormData({...configFormData, config_key_id: v})}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select configuration key" /></SelectTrigger>
                <SelectContent>
                  {configKeys.map(key => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.key} ({key.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {configFormData.config_key_id && (
                <p className="text-xs text-slate-500">
                  {getConfigKeyDetails(configFormData.config_key_id)?.description}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Value *</Label>
              <Textarea
                value={configFormData.value}
                onChange={(e) => setConfigFormData({...configFormData, value: e.target.value})}
                placeholder="Configuration value"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setConfigFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}