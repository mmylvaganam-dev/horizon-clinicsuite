import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Phone,
  Mail,
  MapPin,
  Search,
  Activity,
  Stethoscope,
  Heart,
  FileText,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import StaffCredentialManager from '@/components/homecare/StaffCredentialManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import { useOrganization } from '@/components/OrganizationProvider';

const STAFF_TYPES = [
  { value: 'nursing_officer', label: 'Nursing Officer', description: 'Home nursing clinical procedures', color: 'bg-blue-100 text-blue-700' },
  { value: 'home_care_worker', label: 'Home Care Worker', description: 'ADL support & long-term care', color: 'bg-purple-100 text-purple-700' },
];

const emptyForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  staff_type: 'NURSE',
  hc_staff_type: 'nursing_officer',
  division: '',
  home_address: '',
  notes: '',
  status: 'active'
};

export default function HomeCareStaff() {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();
  const [showAddDialog, setShowAddDialog] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [activeTab, setActiveTab] = useState('nursing_officer');
  const [staffForm, setStaffForm] = useState(emptyForm);
  const [selectedStaffForDocs, setSelectedStaffForDocs] = useState(null);

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareStaff', selectedOrgId],
    queryFn: () => base44.entities.StaffProfile.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: allCredentials = [] } = useQuery({
    queryKey: ['allStaffCredentials', selectedOrgId],
    queryFn: () => base44.entities.StaffCredentialDocument.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const getStaffExpiryAlerts = (staffId) => {
    return allCredentials.filter(doc => {
      if (!doc.expiry_date || doc.staff_ref !== staffId) return false;
      const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
      return daysLeft <= (doc.alert_days_before || 30);
    });
  };

  const totalExpiryAlerts = allCredentials.filter(doc => {
    if (!doc.expiry_date) return false;
    const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
    return daysLeft <= (doc.alert_days_before || 30);
  }).length;

  const divisions = ['North', 'South', 'East', 'West', 'Central'];

  const createStaffMutation = useMutation({
    mutationFn: async (data) => base44.entities.StaffProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareStaff'] });
      setShowAddDialog(false);
      setStaffForm(emptyForm);
      toast.success('Staff member added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add staff: ' + (error?.response?.data?.message || error?.message || 'Unknown error'));
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId) => base44.entities.StaffProfile.delete(staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareStaff'] });
      toast.success('Staff member deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete staff: ' + (error?.message || 'Unknown error'));
    }
  });

  const handleSubmit = () => {
    if (!selectedOrgId) {
      toast.error('No organization selected. Please switch to an organization first.');
      return;
    }
    if (!staffForm.first_name?.trim() || !staffForm.phone?.trim() || !staffForm.division) {
      toast.error('Please fill required fields (first name, phone, division)');
      return;
    }
    // Split full name if user pasted a full name into first_name field
    let firstName = staffForm.first_name.trim();
    let lastName = staffForm.last_name?.trim() || '';
    if (!lastName && firstName.includes(' ')) {
      const parts = firstName.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
    createStaffMutation.mutate({
       organization_id: selectedOrgId,
       first_name: firstName,
       last_name: lastName,
       phone: staffForm.phone.trim(),
       email: staffForm.email?.trim() || '',
       hc_staff_type: staffForm.hc_staff_type,
       division: staffForm.division,
       home_address: staffForm.home_address || '',
       notes: staffForm.notes || '',
       status: 'active',
     });
  };

  const nursingCount = staff.filter(s => s.hc_staff_type === 'nursing_officer' || !s.hc_staff_type).length;
  const homeCareCount = staff.filter(s => s.hc_staff_type === 'home_care_worker').length;

  const filteredStaff = nursingStaff.filter(s => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      s.phone?.includes(searchQuery) ||
      s.division?.toLowerCase().includes(searchLower)
    );
  });

  const getTypeInfo = (hcStaffType) => {
    // Default to nursing_officer if not set (backward compatibility)
    const type = hcStaffType || 'nursing_officer';
    return STAFF_TYPES.find(t => t.value === type) || STAFF_TYPES[0];
  };

  const nursingStaff = staff.filter(s => s.hc_staff_type === 'nursing_officer' || !s.hc_staff_type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nursing Staff</h1>
          <p className="text-slate-500 mt-1">Manage nursing officers providing clinical home care services</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-xs text-slate-500">Total Nurses</p>
              <p className="text-2xl font-bold">{nursingStaff.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{nursingStaff.filter(s => s.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        {totalExpiryAlerts > 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-xs text-orange-600">Credential Alerts</p>
                <p className="text-2xl font-bold text-orange-700">{totalExpiryAlerts}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter Tabs + Search */}
       <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
         <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList>
             <TabsTrigger value="nursing_officer">Nursing Officers ({nursingCount})</TabsTrigger>
           </TabsList>
         </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, or division..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {searchQuery ? 'No staff found' : 'No staff members in this category yet'}
            </p>
          </Card>
        ) : (
          filteredStaff.map((member) => {
            const typeInfo = getTypeInfo(member.hc_staff_type);
             return (
               <Card key={member.id} className="hover:shadow-lg transition-all">
                 <CardHeader>
                   <div className="flex items-start justify-between">
                     <div>
                       <CardTitle className="text-base">{member.first_name} {member.last_name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {member.division || 'No Division'}
                        </Badge>
                        <Badge className={member.status === 'active' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600'}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{member.phone || 'N/A'}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{member.email}</span>
                    </div>
                  )}
                  {member.home_address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 line-clamp-1">{member.home_address}</span>
                    </div>
                  )}
                  {member.notes && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                      {member.notes}
                    </div>
                  )}
                {/* Credential alert indicator */}
                {(() => {
                   const alerts = getStaffExpiryAlerts(member.id);
                   return alerts.length > 0 ? (
                     <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1 mt-2">
                       <AlertTriangle className="w-3 h-3" />
                       {alerts.length} credential{alerts.length > 1 ? 's' : ''} expiring/expired
                     </div>
                   ) : null;
                 })()}
                 <div className="flex gap-2 mt-3">
                   <Button size="sm" variant="outline" className="flex-1 gap-2"
                     onClick={() => setSelectedStaffForDocs(member)}>
                     <FileText className="w-4 h-4" /> Documents
                   </Button>
                   <Button size="sm" variant="destructive" className="gap-2"
                     onClick={() => deleteStaffMutation.mutate(member.id)}
                     disabled={deleteStaffMutation.isPending}>
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
                </CardContent>
                </Card>
                );
                })
                )}
                </div>

                {/* Credential Manager */}
                {selectedStaffForDocs && (
                <StaffCredentialManager
                staffMember={selectedStaffForDocs}
                organizationId={selectedOrgId}
                onClose={() => setSelectedStaffForDocs(null)}
                />
                )}

                {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Home Care Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">

            {/* Staff Type - prominent selection */}
            <div>
              <Label className="text-sm font-semibold">Staff Type *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {STAFF_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setStaffForm({...staffForm, hc_staff_type: type.value})}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      staffForm.hc_staff_type === type.value
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-sm text-slate-800">{type.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Full Name *</Label>
              <Input
                value={staffForm.first_name + (staffForm.last_name ? ' ' + staffForm.last_name : '')}
                onChange={(e) => {
                  const parts = e.target.value.split(' ');
                  setStaffForm({...staffForm, first_name: parts[0] || '', last_name: parts.slice(1).join(' ')});
                }}
                placeholder="Full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone *</Label>
                <Input
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                  placeholder="Contact number"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <Label>Division *</Label>
              <Select value={staffForm.division} onValueChange={(val) => setStaffForm({...staffForm, division: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map(div => (
                    <SelectItem key={div} value={div}>{div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Address</Label>
              <Textarea
                value={staffForm.home_address}
                onChange={(e) => setStaffForm({...staffForm, home_address: e.target.value})}
                placeholder="Home address"
                rows={2}
              />
            </div>

            <div>
              <Label>Qualifications / Experience</Label>
              <Textarea
                value={staffForm.notes}
                onChange={(e) => setStaffForm({...staffForm, notes: e.target.value})}
                placeholder={staffForm.hc_staff_type === 'nursing_officer' 
                  ? "e.g. Registered Nurse, IV Therapy certified..." 
                  : "e.g. ADL support, wound care assist, housekeeping..."}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createStaffMutation.isPending}>
                {createStaffMutation.isPending ? 'Adding...' : 'Add Staff Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}