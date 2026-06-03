import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Search, Upload, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';
import DoctorSignatureUpload from '@/components/clinical/DoctorSignatureUpload';

export default function StaffDirectory() {
  const queryClient = useQueryClient();
  const { orgFilter, withOrgId, selectedOrgId } = useOrgFiltered();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    staff_type: 'PHYSICIAN_GP',
    first_name: '',
    last_name: '',
    credentials_text: '',
    registration_body: '',
    registration_number: '',
    email: '',
    phone: '',
    home_address: '',
    status: 'active',
    start_date: '',
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', selectedOrgId],
    queryFn: () => base44.entities.StaffProfile.filter(orgFilter, '-created_date'),
    enabled: !!selectedOrgId,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials', selectedOrgId],
    queryFn: () => base44.entities.StaffCredentialDocument.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.StaffProfile.create(withOrgId(data));

      // Sync to PayeeDirectory
      await base44.functions.invoke('syncStaffToPayee', { staff_id: result.id });

      // Audit log
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user?.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'OPERATIONS',
        action: 'create_staff',
        record_type: 'StaffProfile',
        record_id: result.id,
        metadata: { staff_name: `${data.first_name} ${data.last_name}` }
      });

      return result;
    },
    onSuccess: () => {
      toast.success('Staff member added');
      queryClient.invalidateQueries(['staff']);
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.StaffProfile.update(id, data);

      // Sync to PayeeDirectory
      await base44.functions.invoke('syncStaffToPayee', { staff_id: result.id });

      // Audit log
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user?.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'OPERATIONS',
        action: 'update_staff',
        record_type: 'StaffProfile',
        record_id: result.id,
        metadata: { staff_name: `${data.first_name} ${data.last_name}` }
      });

      return result;
    },
    onSuccess: () => {
      toast.success('Staff member updated');
      queryClient.invalidateQueries(['staff']);
      setShowForm(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      staff_type: 'PHYSICIAN_GP',
      first_name: '',
      last_name: '',
      credentials_text: '',
      registration_body: '',
      registration_number: '',
      specialization: '',
      email: '',
      phone: '',
      home_address: '',
      status: 'active',
      start_date: '',
      notes: '',
      e_signature_url: '',
      seal_url: '',
    });
    setEditingStaff(null);
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (member) => {
    setEditingStaff(member);
    setFormData({
      staff_type: member.staff_type,
      first_name: member.first_name,
      last_name: member.last_name,
      credentials_text: member.credentials_text || '',
      registration_body: member.registration_body || '',
      registration_number: member.registration_number || '',
      specialization: member.specialization || '',
      email: member.email || '',
      phone: member.phone || '',
      home_address: member.home_address || '',
      status: member.status,
      start_date: member.start_date || '',
      notes: member.notes || '',
      e_signature_url: member.e_signature_url || '',
      seal_url: member.seal_url || '',
    });
    setShowForm(true);
  };

  const filteredStaff = staff.filter(s => {
    const search = searchTerm.toLowerCase();
    const nameMatch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search);
    const typeMatch = filterType === 'all' || s.staff_type === filterType;
    return nameMatch && typeMatch;
  });

  const expiringCredentials = credentials.filter(c => {
    if (!c.expiry_date) return false;
    const daysUntilExpiry = Math.floor((new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Directory</h1>
            <p className="text-slate-500 mt-1">HR management and credentials tracking</p>
          </div>
          <PageInfoTooltip
            title="Staff Directory"
            description="Complete staff management system for maintaining employee records, credentials, licenses, and professional information. Tracks all healthcare professionals, administrative staff, and support personnel."
            useCases={[
              "Add new staff members when hired",
              "Update staff contact information",
              "Track professional credentials and licenses",
              "Monitor credential expiry dates",
              "Maintain staff registration numbers",
              "Filter staff by type and status"
            ]}
            bestPractices={[
              "Add staff immediately upon hiring",
              "Verify and record all professional credentials",
              "Monitor credential expiry alerts regularly",
              "Keep contact information current",
              "Update status when staff leave",
              "Maintain complete registration details",
              "Link staff to payroll and scheduling"
            ]}
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {expiringCredentials.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Credentials Expiring Soon</p>
                <p className="text-sm text-amber-700 mt-1">
                  {expiringCredentials.length} credential(s) expiring in the next 90 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff Types</SelectItem>
                <SelectItem value="PHYSICIAN_GP">GP Physician</SelectItem>
                <SelectItem value="CONSULT_SPECIALIST">Specialist</SelectItem>
                <SelectItem value="RADIOLOGIST">Radiologist</SelectItem>
                <SelectItem value="SONOGRAPHER">Sonographer</SelectItem>
                <SelectItem value="LAB_TECH">Lab Tech</SelectItem>
                <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                <SelectItem value="NURSE">Nurse</SelectItem>
                <SelectItem value="RECEPTION">Reception</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="hover:shadow-lg transition-all cursor-pointer" onClick={() => handleEdit(member)}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
                <Badge className={member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                  {member.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">
                {member.first_name} {member.last_name}
                {member.credentials_text && <span className="text-sm text-slate-500 ml-2">{member.credentials_text}</span>}
              </h3>
              <p className="text-sm text-slate-500 capitalize">
                {(member.staff_type || '').replace(/_/g, ' ').toLowerCase()}
              </p>
              {member.registration_number && (
                <p className="text-xs text-slate-500 mt-2">
                  {member.registration_body}: {member.registration_number}
                </p>
              )}
              {member.email && (
                <p className="text-xs text-teal-600 mt-1">{member.email}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-2 border-blue-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-blue-100">
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Staff Type *</label>
              <Select value={formData.staff_type} onValueChange={(v) => setFormData({...formData, staff_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICIAN_GP">GP Physician</SelectItem>
                  <SelectItem value="CONSULT_SPECIALIST">Specialist</SelectItem>
                  <SelectItem value="RADIOLOGIST">Radiologist</SelectItem>
                  <SelectItem value="SONOGRAPHER">Sonographer</SelectItem>
                  <SelectItem value="LAB_TECH">Lab Tech</SelectItem>
                  <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                  <SelectItem value="PHARMACY_ASSISTANT">Pharmacy Assistant</SelectItem>
                  <SelectItem value="NURSE">Nurse</SelectItem>
                  <SelectItem value="RECEPTION">Reception</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Credentials</label>
                <Input
                  placeholder="MD, MBBS, FRCR"
                  value={formData.credentials_text}
                  onChange={(e) => setFormData({...formData, credentials_text: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Registration Body</label>
                <Input
                  placeholder="SLMC, GMC"
                  value={formData.registration_body}
                  onChange={(e) => setFormData({...formData, registration_body: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Registration Number</label>
              <Input
                value={formData.registration_number}
                onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Specialization / Department</label>
              <Input
                placeholder="e.g. Cardiology, Internal Medicine"
                value={formData.specialization}
                onChange={(e) => setFormData({...formData, specialization: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Home Address</label>
              <Input
                value={formData.home_address}
                onChange={(e) => setFormData({...formData, home_address: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            {/* E-Signature & Seal — shown for prescribing staff */}
            {['PHYSICIAN_GP','CONSULT_SPECIALIST','RADIOLOGIST','NURSE'].includes(formData.staff_type) && (
              <div className="border-t border-blue-100 pt-4 space-y-4">
                <p className="text-sm font-semibold text-slate-700">Clinical Document Signatures</p>
                <div className="grid grid-cols-2 gap-4">
                  <DoctorSignatureUpload
                    label="E-Signature"
                    value={formData.e_signature_url}
                    onChange={url => setFormData({...formData, e_signature_url: url})}
                  />
                  <DoctorSignatureUpload
                    label="Official Seal / Stamp"
                    value={formData.seal_url}
                    onChange={url => setFormData({...formData, seal_url: url})}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t border-blue-100">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="border-slate-300">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                {editingStaff ? 'Update Staff' : 'Add Staff'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}