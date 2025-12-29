import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Lock, Unlock, Plus, CheckCircle, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

export default function AdminSystemVersion() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState('Asia ClinicSuite');
  const [versionTag, setVersionTag] = useState('');
  const [notes, setNotes] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['appVersions'],
    queryFn: () => base44.entities.AppVersion.list('-released_at'),
  });

  const { data: config } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: async () => {
      const configs = await base44.entities.OrganizationConfig.filter({
        config_key: 'schema_frozen'
      });
      return configs[0] || null;
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (data) => {
      // Mark all other versions as not current
      for (const v of versions) {
        if (v.is_current) {
          await base44.entities.AppVersion.update(v.id, { is_current: false });
        }
      }

      const version = await base44.entities.AppVersion.create({
        ...data,
        released_at: new Date().toISOString(),
        released_by: user.id,
        released_by_email: user.email,
        is_current: true
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: 'create_app_version',
        record_type: 'AppVersion',
        record_id: version.id,
        metadata: {
          version_name: data.version_name,
          version_tag: data.version_tag
        }
      });

      return version;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appVersions'] });
      toast.success('Version created');
      setDialogOpen(false);
      setVersionTag('');
      setNotes('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create version');
    },
  });

  const toggleSchemaFrozenMutation = useMutation({
    mutationFn: async (frozen) => {
      if (config) {
        await base44.entities.OrganizationConfig.update(config.id, {
          config_value: frozen.toString()
        });
      } else {
        await base44.entities.OrganizationConfig.create({
          organization_id: '',
          config_key: 'schema_frozen',
          config_value: frozen.toString(),
          description: 'Schema modification lock'
        });
      }

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: '',
        location_id: '',
        patient_id: '',
        module: 'ADMIN',
        action: frozen ? 'enable_schema_freeze' : 'disable_schema_freeze',
        record_type: 'OrganizationConfig',
        record_id: config?.id || 'new',
        metadata: { schema_frozen: frozen }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      toast.success('Schema freeze status updated');
    },
  });

  const generateSystemSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await base44.functions.invoke('generateSystemSummary', {});
      toast.success('System summary generated');
      queryClient.invalidateQueries({ queryKey: ['appVersions'] });
    } catch (error) {
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const currentVersion = versions.find(v => v.is_current) || versions[0];
  const schemaFrozen = config?.config_value === 'true';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Version & Lock</h1>
          <p className="text-slate-500 mt-1">Manage application versioning and schema protection</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={generateSystemSummary}
            disabled={generatingSummary}
            variant="outline"
          >
            {generatingSummary ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                System Summary
              </>
            )}
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            New Version
          </Button>
        </div>
      </div>

      {currentVersion && (
        <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-900">{currentVersion.version_name}</h2>
                  <Badge className="bg-teal-600 text-white">{currentVersion.version_tag}</Badge>
                  <Badge variant="outline" className="bg-white">Production Ready</Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Released by {currentVersion.released_by_email} • {format(new Date(currentVersion.released_at), 'MMM d, yyyy h:mm a')}
                </p>
                {currentVersion.notes && (
                  <p className="text-sm text-slate-700 mt-2 italic">{currentVersion.notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Schema Freeze Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Schema Modification Lock</p>
              <p className="text-sm text-slate-600 mt-1">
                {schemaFrozen 
                  ? 'Schema is locked. New tables cannot be created. Only data/config changes allowed.'
                  : 'Schema is unlocked. Structure modifications are permitted.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {schemaFrozen ? (
                <Lock className="w-5 h-5 text-rose-600" />
              ) : (
                <Unlock className="w-5 h-5 text-amber-600" />
              )}
              <Switch
                checked={schemaFrozen}
                onCheckedChange={(checked) => toggleSchemaFrozenMutation.mutate(checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No versions recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="flex items-start gap-4 p-4 rounded-lg border bg-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{version.version_name}</h3>
                      <Badge variant="outline">{version.version_tag}</Badge>
                      {version.is_current && (
                        <Badge className="bg-teal-600 text-white">Current</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      Released by {version.released_by_email} • {format(new Date(version.released_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {version.notes && (
                      <p className="text-sm text-slate-700 mt-2">{version.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Version Name</Label>
              <Input
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Asia ClinicSuite"
              />
            </div>
            <div>
              <Label>Version Tag *</Label>
              <Input
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="v1.0"
              />
            </div>
            <div>
              <Label>Release Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Production-ready baseline..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createVersionMutation.mutate({ version_name: versionName, version_tag: versionTag, notes })}
                disabled={!versionTag || createVersionMutation.isPending}
              >
                Create Version
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}