import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Settings, Flag, FileText, Plus, Edit, Trash2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function PlatformConfiguration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [configDialog, setConfigDialog] = useState(false);
  const [flagDialog, setFlagDialog] = useState(false);
  const [noteDialog, setNoteDialog] = useState(false);
  
  const [editingConfig, setEditingConfig] = useState(null);
  const [editingFlag, setEditingFlag] = useState(null);
  
  const [configForm, setConfigForm] = useState({ key: '', value_json: '' });
  const [flagForm, setFlagForm] = useState({ flag_name: '', enabled: false, notes: '' });
  const [noteForm, setNoteForm] = useState({ note_title: '', note_body: '' });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: user.id });
      return roles;
    },
    enabled: !!user,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'PLATFORM_OWNER';
  });

  const isAppAdmin = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.role_name === 'APP_ADMIN';
  });

  useEffect(() => {
    if (user && !isPlatformOwner) {
      toast.error('Access denied: PLATFORM_OWNER role required');
      navigate(createPageUrl('Admin'));
      return;
    }

    if (user && isPlatformOwner) {
      // Audit log - view platform configuration
      base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PLATFORM_SETTINGS',
        action: 'view',
        record_type: 'PlatformConfiguration',
        record_id: '',
        metadata: { page: 'platform_configuration' }
      }).catch(err => console.error('Audit log error:', err));
    }
  }, [user, isPlatformOwner, navigate]);

  const { data: configs = [] } = useQuery({
    queryKey: ['platformConfigs'],
    queryFn: () => base44.entities.PlatformConfig.list('-updated_at'),
  });

  const { data: flags = [] } = useQuery({
    queryKey: ['platformFlags'],
    queryFn: () => base44.entities.PlatformFeatureFlag.list('-updated_at'),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['platformNotes'],
    queryFn: () => base44.entities.PlatformAdminNote.list('-created_at'),
  });

  const createConfigMutation = useMutation({
    mutationFn: async (data) => {
      const config = await base44.entities.PlatformConfig.create({
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        updated_by_email: user.email
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PLATFORM_SETTINGS',
        action: 'create',
        record_type: 'PlatformConfig',
        record_id: config.id,
        metadata: { key: data.key, value: data.value_json }
      });

      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformConfigs'] });
      setConfigDialog(false);
      setConfigForm({ key: '', value_json: '' });
      toast.success('Configuration created');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const oldConfig = configs.find(c => c.id === id);
      const config = await base44.entities.PlatformConfig.update(id, {
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        updated_by_email: user.email
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PLATFORM_SETTINGS',
        action: 'update',
        record_type: 'PlatformConfig',
        record_id: id,
        metadata: { 
          key: data.key,
          old_value: oldConfig?.value_json,
          new_value: data.value_json
        }
      });

      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformConfigs'] });
      setConfigDialog(false);
      setEditingConfig(null);
      setConfigForm({ key: '', value_json: '' });
      toast.success('Configuration updated');
    },
  });

  const createFlagMutation = useMutation({
    mutationFn: async (data) => {
      const flag = await base44.entities.PlatformFeatureFlag.create({
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        updated_by_email: user.email
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PLATFORM_SETTINGS',
        action: 'create',
        record_type: 'PlatformFeatureFlag',
        record_id: flag.id,
        metadata: { flag_name: data.flag_name, enabled: data.enabled }
      });

      return flag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformFlags'] });
      setFlagDialog(false);
      setFlagForm({ flag_name: '', enabled: false, notes: '' });
      toast.success('Feature flag created');
    },
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const oldFlag = flags.find(f => f.id === id);
      const flag = await base44.entities.PlatformFeatureFlag.update(id, {
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        updated_by_email: user.email
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PLATFORM_SETTINGS',
        action: 'update',
        record_type: 'PlatformFeatureFlag',
        record_id: id,
        metadata: { 
          flag_name: data.flag_name,
          old_enabled: oldFlag?.enabled,
          new_enabled: data.enabled
        }
      });

      return flag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformFlags'] });
      setFlagDialog(false);
      setEditingFlag(null);
      setFlagForm({ flag_name: '', enabled: false, notes: '' });
      toast.success('Feature flag updated');
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data) => {
      const note = await base44.entities.PlatformAdminNote.create({
        ...data,
        created_at: new Date().toISOString(),
        created_by: user.id,
        created_by_email: user.email
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'PLATFORM_SETTINGS',
        action: 'create',
        record_type: 'PlatformAdminNote',
        record_id: note.id,
        metadata: { note_title: data.note_title }
      });

      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformNotes'] });
      setNoteDialog(false);
      setNoteForm({ note_title: '', note_body: '' });
      toast.success('Admin note created');
    },
  });

  const handleSaveConfig = () => {
    try {
      const parsedJson = JSON.parse(configForm.value_json);
      const data = { key: configForm.key, value_json: parsedJson };
      
      if (editingConfig) {
        updateConfigMutation.mutate({ id: editingConfig.id, data });
      } else {
        createConfigMutation.mutate(data);
      }
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  const handleSaveFlag = () => {
    if (editingFlag) {
      updateFlagMutation.mutate({ id: editingFlag.id, data: flagForm });
    } else {
      createFlagMutation.mutate(flagForm);
    }
  };

  if (!isPlatformOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">PLATFORM_OWNER role required</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Platform Configuration</h1>
        <p className="text-slate-500 mt-1">Owner-only settings and feature flags</p>
      </div>

      <Tabs defaultValue="configs">
        <TabsList>
          <TabsTrigger value="configs">
            <Settings className="w-4 h-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="flags">
            <Flag className="w-4 h-4 mr-2" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="w-4 h-4 mr-2" />
            Admin Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Platform Configuration</CardTitle>
              <Button onClick={() => { setEditingConfig(null); setConfigForm({ key: '', value_json: '' }); setConfigDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Config
              </Button>
            </CardHeader>
            <CardContent>
              {configs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No configurations yet</p>
              ) : (
                <div className="space-y-2">
                  {configs.map((config) => (
                    <div key={config.id} className="p-4 rounded-lg border bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{config.key}</p>
                          <pre className="text-xs bg-slate-50 p-2 rounded mt-2 overflow-auto">
                            {JSON.stringify(config.value_json, null, 2)}
                          </pre>
                          <p className="text-xs text-slate-500 mt-2">
                            Updated {format(new Date(config.updated_at), 'MMM d, yyyy h:mm a')} by {config.updated_by_email}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingConfig(config);
                            setConfigForm({ key: config.key, value_json: JSON.stringify(config.value_json, null, 2) });
                            setConfigDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Feature Flags</CardTitle>
              <Button onClick={() => { setEditingFlag(null); setFlagForm({ flag_name: '', enabled: false, notes: '' }); setFlagDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Flag
              </Button>
            </CardHeader>
            <CardContent>
              {flags.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No feature flags yet</p>
              ) : (
                <div className="space-y-2">
                  {flags.map((flag) => (
                    <div key={flag.id} className="p-4 rounded-lg border bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900">{flag.flag_name}</p>
                            <Badge className={flag.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                              {flag.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          {flag.notes && <p className="text-sm text-slate-600 mt-1">{flag.notes}</p>}
                          <p className="text-xs text-slate-500 mt-2">
                            Updated {format(new Date(flag.updated_at), 'MMM d, yyyy h:mm a')} by {flag.updated_by_email}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingFlag(flag);
                            setFlagForm({ flag_name: flag.flag_name, enabled: flag.enabled, notes: flag.notes || '' });
                            setFlagDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Platform Admin Notes</CardTitle>
              <Button onClick={() => { setNoteForm({ note_title: '', note_body: '' }); setNoteDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No admin notes yet</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="p-4 rounded-lg border bg-white">
                      <p className="font-semibold text-slate-900">{note.note_title}</p>
                      <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{note.note_body}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')} by {note.created_by_email}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Edit' : 'Add'} Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Configuration key"
              value={configForm.key}
              onChange={(e) => setConfigForm({ ...configForm, key: e.target.value })}
              disabled={!!editingConfig}
            />
            <Textarea
              placeholder='Value (JSON format, e.g., {"setting": "value"})'
              value={configForm.value_json}
              onChange={(e) => setConfigForm({ ...configForm, value_json: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
            <Button onClick={handleSaveConfig} className="w-full">
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={flagDialog} onOpenChange={setFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFlag ? 'Edit' : 'Add'} Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Flag name"
              value={flagForm.flag_name}
              onChange={(e) => setFlagForm({ ...flagForm, flag_name: e.target.value })}
              disabled={!!editingFlag}
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={flagForm.enabled}
                onCheckedChange={(checked) => setFlagForm({ ...flagForm, enabled: checked })}
              />
              <span className="text-sm text-slate-600">Enabled</span>
            </div>
            <Textarea
              placeholder="Notes or description"
              value={flagForm.notes}
              onChange={(e) => setFlagForm({ ...flagForm, notes: e.target.value })}
              rows={3}
            />
            <Button onClick={handleSaveFlag} className="w-full">
              Save Feature Flag
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Note title"
              value={noteForm.note_title}
              onChange={(e) => setNoteForm({ ...noteForm, note_title: e.target.value })}
            />
            <Textarea
              placeholder="Note content"
              value={noteForm.note_body}
              onChange={(e) => setNoteForm({ ...noteForm, note_body: e.target.value })}
              rows={6}
            />
            <Button onClick={() => createNoteMutation.mutate(noteForm)} className="w-full">
              Save Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}