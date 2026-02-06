import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganization } from '@/components/OrganizationProvider';
import { MessageSquare, Save, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PlatformSmsSettings() {
  const queryClient = useQueryClient();
  const { organizations } = useOrganization();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [formData, setFormData] = useState({
    esms_username: '',
    esms_password: '',
    sms_sender_id: ''
  });
  const [saveStatus, setSaveStatus] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: selectedCompany, refetch } = useQuery({
    queryKey: ['company', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      const comps = await base44.entities.CompanyProfile.filter({ organization_id: selectedOrgId });
      if (comps.length > 0) {
        const comp = comps[0];
        setFormData({
          esms_username: comp.esms_username || '',
          esms_password: comp.esms_password || '',
          sms_sender_id: comp.sms_sender_id || ''
        });
        return comp;
      }
      return null;
    },
    enabled: !!selectedOrgId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!selectedCompany) {
        throw new Error('No company profile found');
      }
      return base44.entities.CompanyProfile.update(selectedCompany.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['company', selectedOrgId]);
      queryClient.invalidateQueries(['companies']);
      setSaveStatus({ type: 'success', message: 'SMS settings saved successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    },
    onError: (error) => {
      setSaveStatus({ type: 'error', message: error.message });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const getOrgName = (orgId) => {
    const org = organizations?.find(o => o.id === orgId);
    return org?.name || 'Unknown';
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-teal-600" />
          Platform SMS Settings
        </h1>
        <p className="text-slate-600 mt-2">
          Configure Dialog eSMS credentials for each company/organization
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Organization</CardTitle>
            <CardDescription>
              Choose an organization to configure its SMS settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.filter(c => c.organization_id).map((company) => (
                      <SelectItem key={company.id} value={company.organization_id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {getOrgName(company.organization_id)} - {company.company_legal_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedOrgId && selectedCompany && (
          <Card>
            <CardHeader>
              <CardTitle>Dialog eSMS Configuration</CardTitle>
              <CardDescription>
                Enter the Dialog eSMS credentials for {selectedCompany.company_legal_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="username">eSMS Username *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter Dialog eSMS username"
                  value={formData.esms_username}
                  onChange={(e) => setFormData({ ...formData, esms_username: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">eSMS Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter Dialog eSMS password"
                  value={formData.esms_password}
                  onChange={(e) => setFormData({ ...formData, esms_password: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="sender">Sender Name/Mask (Optional)</Label>
                <Input
                  id="sender"
                  type="text"
                  placeholder="e.g., ANANTHAM"
                  value={formData.sms_sender_id}
                  onChange={(e) => setFormData({ ...formData, sms_sender_id: e.target.value })}
                  className="mt-2"
                  maxLength={11}
                />
                <p className="text-sm text-slate-500 mt-1">
                  Custom sender name (max 11 characters)
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !formData.esms_username || !formData.esms_password}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save SMS Settings'}
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
        )}

        {selectedOrgId && !selectedCompany && (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              No company profile found for this organization. Please create a company profile first.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}