import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cloud, Download, Calendar, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';

export default function GoogleDriveBackupConfig({ selectedOrgId }) {
  const queryClient = useQueryClient();
  const [isRunningBackup, setIsRunningBackup] = useState(false);

  const { data: organization } = useQuery({
    queryKey: ['organization', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      const orgs = await base44.entities.Organization.filter({ id: selectedOrgId });
      return orgs[0];
    },
    enabled: !!selectedOrgId
  });

  const { data: companyProfile } = useQuery({
    queryKey: ['companyProfile', organization?.company_id],
    queryFn: async () => {
      if (!organization?.company_id) return null;
      const companies = await base44.entities.CompanyProfile.filter({ id: organization.company_id });
      return companies[0];
    },
    enabled: !!organization?.company_id
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (updates) => {
      if (!organization?.company_id) throw new Error('No company selected');
      await base44.entities.CompanyProfile.update(organization.company_id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companyProfile']);
      toast.success('Backup settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    }
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => {
      setIsRunningBackup(true);
      const response = await base44.functions.invoke('backupCompanyToGoogleDrive', {
        company_id: organization?.company_id,
        organization_id: selectedOrgId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setIsRunningBackup(false);
      queryClient.invalidateQueries(['companyProfile']);
      toast.success(`✅ Backup completed: ${data.file_name}`);
    },
    onError: (error) => {
      setIsRunningBackup(false);
      toast.error('Backup failed: ' + error.message);
    }
  });

  if (!organization) {
    return (
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>Select an organization to configure backups</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-l-4 border-blue-600">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
          <Cloud className="w-5 h-5 text-blue-600" />
          Google Drive Backup Configuration
        </CardTitle>
        <CardDescription>
          Automatically backup company data to Google Drive on a schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Enable/Disable Backup */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              companyProfile?.google_drive_backup_enabled ? 'bg-green-100' : 'bg-slate-200'
            }`}>
              {companyProfile?.google_drive_backup_enabled ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-900">Enable Automated Backups</Label>
              <p className="text-xs text-slate-500">Turn on scheduled backups to Google Drive</p>
            </div>
          </div>
          <Switch
            checked={companyProfile?.google_drive_backup_enabled || false}
            onCheckedChange={(checked) => {
              updateCompanyMutation.mutate({ google_drive_backup_enabled: checked });
            }}
          />
        </div>

        {/* Backup Schedule */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Calendar className="w-4 h-4 text-slate-500" />
            Backup Frequency
          </Label>
          <Select
            value={companyProfile?.backup_schedule || 'weekly'}
            onValueChange={(value) => {
              updateCompanyMutation.mutate({ backup_schedule: value });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Google Drive Folder ID (Optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-900">
            Google Drive Folder ID (Optional)
          </Label>
          <Input
            placeholder="Leave blank to backup to root folder"
            value={companyProfile?.google_drive_folder_id || ''}
            onChange={(e) => {
              updateCompanyMutation.mutate({ google_drive_folder_id: e.target.value });
            }}
            className="font-mono text-xs"
          />
          <p className="text-xs text-slate-500">
            Get folder ID from Google Drive URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
          </p>
        </div>

        {/* Last Backup Info */}
        {companyProfile?.last_backup_date && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Last backup: {new Date(companyProfile.last_backup_date).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Backup Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={() => runBackupMutation.mutate()}
            disabled={!companyProfile?.google_drive_backup_enabled || isRunningBackup}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            {isRunningBackup ? 'Backing up...' : 'Run Backup Now'}
          </Button>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">
            <strong>What gets backed up:</strong> Patients, Appointments, Pharmacy Sales, Stock, Invoices.
            Files are saved as JSON format with organization name and date.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}