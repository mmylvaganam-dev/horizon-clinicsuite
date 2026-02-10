import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Cloud, Download, Calendar, Info, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';

export default function PlatformBackupSettings() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [isRunningBackup, setIsRunningBackup] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ['allCompanies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: selectedCompany } = useQuery({
    queryKey: ['companyProfile', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      const comps = await base44.entities.CompanyProfile.filter({ id: selectedCompanyId });
      return comps[0];
    },
    enabled: !!selectedCompanyId
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (updates) => {
      if (!selectedCompanyId) throw new Error('No company selected');
      await base44.entities.CompanyProfile.update(selectedCompanyId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companyProfile']);
      toast.success('Backup settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const runBackupNowMutation = useMutation({
    mutationFn: async () => {
      setIsRunningBackup(true);
      const response = await base44.functions.invoke('backupAllCompaniesToGoogleDrive', {});
      return response.data;
    },
    onSuccess: (data) => {
      setIsRunningBackup(false);
      queryClient.invalidateQueries(['companyProfile', 'allCompanies']);
      toast.success(`✅ Backup completed: ${data.summary.successful} companies backed up`);
    },
    onError: (error) => {
      setIsRunningBackup(false);
      toast.error('Backup failed: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border-l-4 border-blue-600 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Google Drive Backup Settings</h2>
            <p className="text-slate-600 text-sm mt-1">Configure automated backups for each company - runs every 12 hours</p>
          </div>
        </div>
      </div>

      {/* Company Selection */}
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">Select Company</CardTitle>
          <CardDescription>Choose a company to configure backup settings</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {companies?.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedCompanyId === company.id
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={`w-5 h-5 ${
                    selectedCompanyId === company.id ? 'text-teal-600' : 'text-slate-400'
                  }`} />
                  <div>
                    <p className="font-medium text-slate-900">{company.company_legal_name}</p>
                    <p className="text-xs text-slate-500">{company.company_code}</p>
                  </div>
                  {company.google_drive_backup_enabled && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backup Configuration */}
      {selectedCompany && (
        <Card className="border-l-4 border-blue-600">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Cloud className="w-5 h-5 text-blue-600" />
              Backup Configuration - {selectedCompany.company_legal_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedCompany.google_drive_backup_enabled !== false ? 'bg-green-100' : 'bg-slate-200'
                }`}>
                  {selectedCompany.google_drive_backup_enabled !== false ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <Label className="text-sm font-semibold">Enable Automated Backups</Label>
                  <p className="text-xs text-slate-500">Include this company in 12-hour backup schedule</p>
                </div>
              </div>
              <Switch
                checked={selectedCompany.google_drive_backup_enabled !== false}
                onCheckedChange={(checked) => {
                  updateCompanyMutation.mutate({ google_drive_backup_enabled: checked });
                }}
              />
            </div>

            {/* Google Drive Folder ID */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Google Drive Folder ID</Label>
              <Input
                placeholder="Paste folder ID here (e.g., 1AbC2DeF3GhI4JkL5MnO6PqR)"
                value={selectedCompany.google_drive_folder_id || ''}
                onChange={(e) => {
                  updateCompanyMutation.mutate({ google_drive_folder_id: e.target.value });
                }}
                className="font-mono text-sm"
              />
              
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs space-y-2">
                  <div><strong>How to get Folder ID:</strong></div>
                  <div className="space-y-1 pl-4">
                    <div>1. Create a folder in Google Drive (e.g., "Anantham Backups")</div>
                    <div>2. Open the folder</div>
                    <div>3. Copy the ID from URL:</div>
                    <div className="bg-white p-2 rounded border border-blue-300 font-mono text-[10px] break-all">
                      drive.google.com/drive/folders/<strong className="bg-yellow-200">1xYz123AbC456DeF</strong>
                    </div>
                    <div>4. Paste ONLY the ID part (after /folders/)</div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            {/* Last Backup Info */}
            {selectedCompany.last_backup_date && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  Last backup: {new Date(selectedCompany.last_backup_date).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}

            {/* Schedule Info */}
            <Alert className="bg-green-50 border-green-200">
              <Calendar className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 text-xs">
                <strong>Backup Schedule:</strong> Every 12 hours for active companies<br />
                <strong>Retention:</strong> Keeps last 6 backups (approximately 3 days)<br />
                <strong>Storage:</strong> Older backups automatically deleted to save space
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Manual Backup for All Companies */}
      <Card className="border-l-4 border-green-600">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">Manual Backup</CardTitle>
          <CardDescription>Run backup now for all active companies</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button
            onClick={() => runBackupNowMutation.mutate()}
            disabled={isRunningBackup}
            className="w-full"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            {isRunningBackup ? 'Backing up all companies...' : 'Run Full Backup Now'}
          </Button>
          
          <Alert className="mt-4">
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs space-y-1">
              <div><strong>What gets backed up:</strong> All organizations, patients, appointments, pharmacy sales, stock, and invoices.</div>
              <div><strong>Retention:</strong> Last 6 backups kept per company (approx. 3 days of history).</div>
              <div><strong>Format:</strong> JSON files named CompanyName_Backup_YYYY-MM-DD.json</div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}