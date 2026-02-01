import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Upload, Lock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AdminOrganizationBranding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedOrg, setSelectedOrg] = useState('');
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);
  const [brandingForm, setBrandingForm] = useState({
    app_display_name: '',
    primary_logo_file_ref: '',
    secondary_logo_file_ref: '',
    phone_number: '',
    phone_number_2: '',
    email: '',
    custom_domain: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_from_email: '',
    smtp_from_name: '',
    address: '',
    website: '',
    primary_color: '',
    secondary_color: '',
    footer_text: ''
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', currentUser?.id],
    queryFn: async () => {
      const roles = await base44.entities.UserRole.filter({ user_id: currentUser.id });
      return roles;
    },
    enabled: !!currentUser,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const isPlatformOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'PLATFORM_OWNER';
  });

  const isOrgSuperUser = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'ORG_SUPER_USER';
  });

  const canAccess = isPlatformOwner || isOrgSuperUser;

  useEffect(() => {
    if (currentUser && !canAccess) {
      toast.error('Access denied: ORG_SUPER_USER or PLATFORM_OWNER role required');
      navigate(createPageUrl('Admin'));
    }
  }, [currentUser, canAccess, navigate]);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: canAccess,
  });

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding', selectedOrg],
    queryFn: async () => {
      const result = await base44.entities.OrganizationBranding.filter({ organization_id: selectedOrg });
      return result[0];
    },
    enabled: !!selectedOrg,
  });

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        app_display_name: branding.app_display_name || '',
        primary_logo_file_ref: branding.primary_logo_file_ref || '',
        secondary_logo_file_ref: branding.secondary_logo_file_ref || '',
        phone_number: branding.phone_number || '',
        phone_number_2: branding.phone_number_2 || '',
        email: branding.email || '',
        custom_domain: branding.custom_domain || '',
        smtp_host: branding.smtp_host || '',
        smtp_port: branding.smtp_port || 587,
        smtp_username: branding.smtp_username || '',
        smtp_from_email: branding.smtp_from_email || '',
        smtp_from_name: branding.smtp_from_name || '',
        address: branding.address || '',
        website: branding.website || '',
        primary_color: branding.primary_color || '',
        secondary_color: branding.secondary_color || '',
        footer_text: branding.footer_text || ''
      });
    } else {
      // Reset form when switching orgs or no branding exists
      setBrandingForm({
        app_display_name: '',
        primary_logo_file_ref: '',
        secondary_logo_file_ref: '',
        phone_number: '',
        phone_number_2: '',
        email: '',
        custom_domain: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_from_email: '',
        smtp_from_name: '',
        address: '',
        website: '',
        primary_color: '',
        secondary_color: '',
        footer_text: ''
      });
    }
  }, [branding, selectedOrg]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'primary') setUploadingPrimary(true);
    else setUploadingSecondary(true);

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setBrandingForm({
        ...brandingForm,
        [type === 'primary' ? 'primary_logo_file_ref' : 'secondary_logo_file_ref']: response.file_url
      });
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      if (type === 'primary') setUploadingPrimary(false);
      else setUploadingSecondary(false);
    }
  };

  const saveBrandingMutation = useMutation({
    mutationFn: async (data) => {
      const brandingData = {
        organization_id: selectedOrg,
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id,
        updated_by_email: currentUser.email
      };

      let result;
      if (branding) {
        result = await base44.entities.OrganizationBranding.update(branding.id, brandingData);
      } else {
        result = await base44.entities.OrganizationBranding.create(brandingData);
      }

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: selectedOrg,
        location_id: '',
        patient_id: '',
        module: 'BRANDING',
        action: branding ? 'update' : 'create',
        record_type: 'OrganizationBranding',
        record_id: result.id,
        metadata: {
          app_display_name: data.app_display_name,
          has_primary_logo: !!data.primary_logo_file_ref,
          has_secondary_logo: !!data.secondary_logo_file_ref,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color
        }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationBranding', selectedOrg] });
      toast.success('Branding saved successfully');
    },
  });

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">ORG_SUPER_USER or PLATFORM_OWNER role required</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Branding</h1>
        <p className="text-slate-500 mt-1">Configure white-label branding for organizations</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Palette className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Branding Application</p>
              <p className="text-sm text-blue-700 mt-1">
                Complete white-label: Custom domain, emails from your domain, branded PDFs, no Base44 references visible to users
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger>
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.organization_name || org.name || `Org-${org.id.substring(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrg && (
        <Card>
          <CardHeader>
            <CardTitle>Branding Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label>Clinic/Health Center Name *</Label>
                <Input
                  placeholder="e.g., Premier Medical Center"
                  value={brandingForm.app_display_name}
                  onChange={(e) => setBrandingForm({ ...brandingForm, app_display_name: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Primary Phone Number</Label>
                  <Input
                    placeholder="+94 11 234 5678"
                    value={brandingForm.phone_number}
                    onChange={(e) => setBrandingForm({ ...brandingForm, phone_number: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Secondary Phone Number (Optional)</Label>
                  <Input
                    placeholder="+94 77 123 4567"
                    value={brandingForm.phone_number_2}
                    onChange={(e) => setBrandingForm({ ...brandingForm, phone_number_2: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="info@premiermedical.lk"
                  value={brandingForm.email}
                  onChange={(e) => setBrandingForm({ ...brandingForm, email: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Physical Address</Label>
                <Textarea
                  placeholder="123 Main Street, Colombo 03, Sri Lanka"
                  value={brandingForm.address}
                  onChange={(e) => setBrandingForm({ ...brandingForm, address: e.target.value })}
                  rows={2}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Website (Optional)</Label>
                <Input
                  placeholder="www.premiermedical.lk"
                  value={brandingForm.website}
                  onChange={(e) => setBrandingForm({ ...brandingForm, website: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Custom Domain (Optional)</Label>
                <Input
                  placeholder="portal.yourclinic.com"
                  value={brandingForm.custom_domain}
                  onChange={(e) => setBrandingForm({ ...brandingForm, custom_domain: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">Custom domain for white-label access</p>
              </div>

              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
               <CardHeader>
                 <CardTitle className="text-base text-green-900">📧 Complete Email Setup Guide</CardTitle>
                 <p className="text-xs text-green-700">Step-by-step instructions to enable email sending from your domain</p>
               </CardHeader>
               <CardContent className="space-y-6">

                 {/* Step 1 */}
                 <div className="bg-white rounded-lg border-l-4 border-green-500 p-4">
                   <p className="font-bold text-green-900 text-sm">STEP 1: Login to Your Domain Provider</p>
                   <div className="text-xs text-slate-700 mt-2 space-y-1 ml-4">
                     <p>→ Go to your domain registrar (GoDaddy, Namecheap, Google Domains, Bluehost, etc.)</p>
                     <p>→ Login with your account credentials</p>
                     <p>→ Find your domain in "My Domains" or similar section</p>
                     <p>→ Look for "DNS Management", "DNS Settings", or "Name Servers" option</p>
                   </div>
                 </div>

                 {/* Step 2 - Domain Provider Examples */}
                 <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                   <p className="font-bold text-blue-900 text-sm mb-3">Finding DNS Settings by Provider:</p>
                   <div className="text-xs text-blue-800 space-y-2 ml-4">
                     <div><strong>GoDaddy:</strong> Domains → Your domain → DNS → Edit Zone File</div>
                     <div><strong>Namecheap:</strong> Dashboard → Manage Domain → Advanced DNS</div>
                     <div><strong>Google Domains:</strong> My domains → Your domain → DNS</div>
                     <div><strong>Bluehost:</strong> Domains → Your domain → DNS Records</div>
                     <div><strong>1&1/IONOS:</strong> Manage Domain → DNS Settings</div>
                   </div>
                 </div>

                 {/* Step 3 */}
                 <div className="bg-white rounded-lg border-l-4 border-green-500 p-4">
                   <p className="font-bold text-green-900 text-sm">STEP 2: Go to Resend to Get DNS Records</p>
                   <div className="text-xs text-slate-700 mt-2 space-y-1 ml-4">
                     <p>→ Visit <a href="https://resend.com/domains" target="_blank" className="text-blue-600 underline font-bold">resend.com/domains</a></p>
                     <p>→ Click on your domain name</p>
                     <p>→ Copy the 3 DNS records shown (SPF, DKIM, DMARC)</p>
                     <p>→ Keep this page open or take screenshots</p>
                   </div>
                 </div>

                 {/* Step 4 - Add SPF */}
                 <div className="bg-white rounded-lg border-l-4 border-purple-500 p-4">
                   <p className="font-bold text-purple-900 text-sm">STEP 3: Add SPF Record (First DNS Record)</p>
                   <div className="text-xs text-slate-700 mt-2 space-y-2 ml-4">
                     <p className="font-semibold">In your domain provider's DNS settings:</p>
                     <div className="bg-slate-100 p-2 rounded font-mono text-xs space-y-1">
                       <div><span className="text-red-700">Type:</span> TXT</div>
                       <div><span className="text-red-700">Name:</span> @ (or leave blank)</div>
                       <div><span className="text-red-700">Value:</span> v=spf1 include:resend.com ~all</div>
                     </div>
                     <p>→ Click Add/Save</p>
                     <p className="text-amber-700 font-semibold">⚠️ Wait 5-10 minutes before adding next record</p>
                   </div>
                 </div>

                 {/* Step 5 - Add DKIM */}
                 <div className="bg-white rounded-lg border-l-4 border-orange-500 p-4">
                   <p className="font-bold text-orange-900 text-sm">STEP 4: Add DKIM Record (Second DNS Record)</p>
                   <div className="text-xs text-slate-700 mt-2 space-y-2 ml-4">
                     <p className="font-semibold">In your domain provider's DNS settings:</p>
                     <div className="bg-slate-100 p-2 rounded font-mono text-xs space-y-1">
                       <div><span className="text-red-700">Type:</span> TXT</div>
                       <div><span className="text-red-700">Name:</span> resend._domainkey</div>
                       <div><span className="text-red-700">Value:</span> (copy from Resend - it's a long string)</div>
                     </div>
                     <p>→ Click Add/Save</p>
                     <p className="text-amber-700 font-semibold">⚠️ Wait 5-10 minutes before adding next record</p>
                   </div>
                 </div>

                 {/* Step 6 - Add DMARC */}
                 <div className="bg-white rounded-lg border-l-4 border-red-500 p-4">
                   <p className="font-bold text-red-900 text-sm">STEP 5: Add DMARC Record (Third DNS Record)</p>
                   <div className="text-xs text-slate-700 mt-2 space-y-2 ml-4">
                     <p className="font-semibold">In your domain provider's DNS settings:</p>
                     <div className="bg-slate-100 p-2 rounded font-mono text-xs space-y-1">
                       <div><span className="text-red-700">Type:</span> TXT</div>
                       <div><span className="text-red-700">Name:</span> _dmarc</div>
                       <div><span className="text-red-700">Value:</span> v=DMARC1; p=none;</div>
                     </div>
                     <p>→ Click Add/Save</p>
                   </div>
                 </div>

                 {/* Step 7 - Verify */}
                 <div className="bg-white rounded-lg border-l-4 border-teal-500 p-4">
                   <p className="font-bold text-teal-900 text-sm">STEP 6: Verify DNS in Resend</p>
                   <div className="text-xs text-slate-700 mt-2 space-y-1 ml-4">
                     <p>→ Wait 10-30 minutes (DNS propagation)</p>
                     <p>→ Go back to <a href="https://resend.com/domains" target="_blank" className="text-blue-600 underline">resend.com/domains</a></p>
                     <p>→ Click "Verify" on your domain</p>
                     <p>→ Status should change to ✅ <strong>Verified</strong></p>
                   </div>
                 </div>

                 {/* Step 8 - Fill in App */}
                 <div className="bg-white rounded-lg border-l-4 border-indigo-500 p-4">
                   <p className="font-bold text-indigo-900 text-sm">STEP 7: Configure Email in This App</p>
                   <div className="text-xs text-slate-700 mt-2 space-y-2 ml-4">
                     <p className="font-semibold">Once verified, fill in the fields below:</p>
                     <div className="bg-indigo-50 p-2 rounded space-y-1">
                       <div><span className="font-bold">Email Domain:</span> yourdomain.com</div>
                       <div><span className="font-bold">From Email:</span> noreply@yourdomain.com</div>
                       <div><span className="font-bold">From Name:</span> Your Clinic Name</div>
                     </div>
                     <p>→ Click "Save Company Profile"</p>
                     <p>→ Done! Emails will now send from your domain ✅</p>
                   </div>
                 </div>

                 <div className="bg-red-50 border-l-4 border-red-500 rounded p-3">
                   <p className="font-bold text-red-900 text-sm mb-1">❌ Common Mistakes to Avoid:</p>
                   <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                     <li>Don't modify CNAME records - only add TXT records</li>
                     <li>DNS takes 5-30 minutes to propagate globally</li>
                     <li>Copy DKIM value exactly as shown in Resend</li>
                     <li>Don't create email accounts - Resend handles all sending</li>
                   </ul>
                 </div>

               </CardContent>
              </Card>

              <Card className="bg-slate-50 border-slate-200">
               <CardHeader>
                 <CardTitle className="text-base">Email Configuration Fields</CardTitle>
                 <p className="text-xs text-slate-500">After DNS setup is verified, fill in these fields:</p>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>SMTP Host</Label>
                      <Input
                        placeholder="smtp.gmail.com"
                        value={brandingForm.smtp_host}
                        onChange={(e) => setBrandingForm({ ...brandingForm, smtp_host: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>SMTP Port</Label>
                      <Input
                        type="number"
                        placeholder="587"
                        value={brandingForm.smtp_port}
                        onChange={(e) => setBrandingForm({ ...brandingForm, smtp_port: parseInt(e.target.value) || 587 })}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>SMTP Username</Label>
                    <Input
                      placeholder="your-email@yourclinic.com"
                      value={brandingForm.smtp_username}
                      onChange={(e) => setBrandingForm({ ...brandingForm, smtp_username: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>From Email Address</Label>
                      <Input
                        type="email"
                        placeholder="noreply@yourclinic.com"
                        value={brandingForm.smtp_from_email}
                        onChange={(e) => setBrandingForm({ ...brandingForm, smtp_from_email: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>From Name</Label>
                      <Input
                        placeholder="Premier Medical Center"
                        value={brandingForm.smtp_from_name}
                        onChange={(e) => setBrandingForm({ ...brandingForm, smtp_from_name: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <p className="text-xs text-blue-800">
                        <strong>Note:</strong> SMTP password should be configured securely via environment variables. 
                        Contact your system administrator to set SMTP_PASSWORD_[ORG_ID] environment variable.
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Primary Logo (Main Clinic Logo) *</Label>
                  <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center">
                    {brandingForm.primary_logo_file_ref ? (
                      <div className="space-y-2">
                        <img 
                          src={brandingForm.primary_logo_file_ref} 
                          alt="Primary Logo" 
                          className="max-h-24 mx-auto"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById('primary-logo').click()}
                        >
                          Change Logo
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <Button 
                          variant="outline"
                          onClick={() => document.getElementById('primary-logo').click()}
                          disabled={uploadingPrimary}
                        >
                          {uploadingPrimary ? 'Uploading...' : 'Upload Logo'}
                        </Button>
                      </>
                    )}
                    <input
                      id="primary-logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'primary')}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <Label>Secondary Logo (Optional - e.g., Partner Logo)</Label>
                  <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center">
                    {brandingForm.secondary_logo_file_ref ? (
                      <div className="space-y-2">
                        <img 
                          src={brandingForm.secondary_logo_file_ref} 
                          alt="Secondary Logo" 
                          className="max-h-24 mx-auto"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById('secondary-logo').click()}
                        >
                          Change Logo
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <Button 
                          variant="outline"
                          onClick={() => document.getElementById('secondary-logo').click()}
                          disabled={uploadingSecondary}
                        >
                          {uploadingSecondary ? 'Uploading...' : 'Upload Logo'}
                        </Button>
                      </>
                    )}
                    <input
                      id="secondary-logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'secondary')}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Primary Color (Hex)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="#0891b2"
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                    />
                    <input
                      type="color"
                      value={brandingForm.primary_color || '#0891b2'}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      className="w-12 h-10 rounded border"
                    />
                  </div>
                </div>

                <div>
                  <Label>Secondary Color (Hex)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="#06b6d4"
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                    />
                    <input
                      type="color"
                      value={brandingForm.secondary_color || '#06b6d4'}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                      className="w-12 h-10 rounded border"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Footer Text (Optional)</Label>
                <Textarea
                  placeholder="e.g., © 2025 Premier Medical Center. All rights reserved."
                  value={brandingForm.footer_text}
                  onChange={(e) => setBrandingForm({ ...brandingForm, footer_text: e.target.value })}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={() => saveBrandingMutation.mutate(brandingForm)}
                disabled={!brandingForm.app_display_name || saveBrandingMutation.isPending}
                className="w-full"
              >
                {saveBrandingMutation.isPending ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Important Notes</p>
              <ul className="text-sm text-amber-800 mt-1 space-y-1 list-disc list-inside">
                <li>Branding changes are audited in AuditLog</li>
                <li>Only ORG_SUPER_USER can edit branding settings</li>
                <li>Logo images should be PNG or SVG format for best quality</li>
                <li>Changes apply immediately to login, navigation, and PDFs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}