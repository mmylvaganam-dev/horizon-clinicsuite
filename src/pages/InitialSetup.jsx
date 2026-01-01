import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Building2, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function InitialSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [createdOrgId, setCreatedOrgId] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Step 1: Assign Platform Owner Role
  const assignRolesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('assignOwnerRoles', {});
      return response.data;
    },
    onSuccess: () => {
      toast.success('Platform Owner role assigned!');
      setTimeout(() => {
        setStep(2);
        window.location.reload();
      }, 1500);
    },
  });

  // Step 2: Create Organization
  const createOrgMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Organization.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: result.id,
        location_id: '',
        patient_id: '',
        module: 'SETUP',
        action: 'create',
        record_type: 'Organization',
        record_id: result.id,
        metadata: { organization_name: data.name }
      });
      return result;
    },
    onSuccess: (data) => {
      setCreatedOrgId(data.id);
      toast.success('Organization created!');
      setStep(3);
    },
  });

  // Step 3: Create Default Location
  const createLocationMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Location.create(data);
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: data.organization_id,
        location_id: result.id,
        patient_id: '',
        module: 'SETUP',
        action: 'create',
        record_type: 'Location',
        record_id: result.id,
        metadata: { location_name: data.name }
      });
      return result;
    },
    onSuccess: () => {
      toast.success('Location created! Setup complete!');
      setTimeout(() => {
        navigate(createPageUrl('AdminOrganizationBranding'));
      }, 2000);
    },
  });

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-600" />
            Initial System Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-teal-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-200'}`}>
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Platform Owner</span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-teal-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200'}`}>
                {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Organization</span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-teal-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200'}`}>
                {step > 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="font-medium">Location</span>
            </div>
          </div>

          {/* Step 1: Assign Platform Owner */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-semibold mb-2">Step 1: Get Platform Owner Access</p>
                <p className="text-blue-800 text-sm">
                  This will assign you PLATFORM_OWNER role, giving you full access to create organizations, manage users, and configure the system.
                </p>
              </div>
              <Button 
                onClick={() => assignRolesMutation.mutate()}
                disabled={assignRolesMutation.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
                size="lg"
              >
                {assignRolesMutation.isPending ? 'Assigning Role...' : 'Assign Platform Owner Role'}
              </Button>
            </div>
          )}

          {/* Step 2: Create Organization */}
          {step === 2 && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createOrgMutation.mutate({
                name: formData.get('org_name'),
                code: formData.get('org_name').toLowerCase().replace(/\s+/g, '_'),
                type: 'clinic',
                status: 'active',
              });
            }} className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <p className="text-teal-900 font-semibold mb-2">Step 2: Create Your Organization</p>
                <p className="text-teal-800 text-sm">
                  This will be your main clinic/hospital organization where all data belongs.
                </p>
              </div>
              <div>
                <Label>Organization Name *</Label>
                <Input 
                  name="org_name" 
                  placeholder="e.g., Premier Medical Center"
                  required 
                />
              </div>
              <Button 
                type="submit"
                disabled={createOrgMutation.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
                size="lg"
              >
                {createOrgMutation.isPending ? 'Creating Organization...' : 'Create Organization'}
              </Button>
            </form>
          )}

          {/* Step 3: Create Location */}
          {step === 3 && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createLocationMutation.mutate({
                organization_id: createdOrgId,
                name: formData.get('location_name'),
                address: formData.get('address'),
                status: 'active',
              });
            }} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-emerald-900 font-semibold mb-2">Step 3: Create Your First Location</p>
                <p className="text-emerald-800 text-sm">
                  Create your main clinic location. You can add more locations later.
                </p>
              </div>
              <div>
                <Label>Location Name *</Label>
                <Input 
                  name="location_name" 
                  placeholder="e.g., Main Clinic"
                  required 
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input 
                  name="address" 
                  placeholder="e.g., 123 Main Street, Colombo"
                />
              </div>
              <Button 
                type="submit"
                disabled={createLocationMutation.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700"
                size="lg"
              >
                {createLocationMutation.isPending ? 'Creating Location...' : 'Create Location & Complete Setup'}
              </Button>
            </form>
          )}

          {step === 4 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-900 mb-2">Setup Complete!</h3>
              <p className="text-green-800 mb-4">
                Redirecting to Organization Branding to set up your clinic details and logo...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}