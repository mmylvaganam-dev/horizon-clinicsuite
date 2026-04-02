import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Phone, Mail, MapPin, FileText, Trash2, AlertTriangle, Heart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';
import StaffCredentialManager from '@/components/homecare/StaffCredentialManager';

const emptyForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  division: '',
  home_address: '',
  notes: '',
};

export default function HomeCareWorkers() {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffForm, setStaffForm] = useState(emptyForm);
  const [selectedStaffForDocs, setSelectedStaffForDocs] = useState(null);

  const divisions = ['North', 'South', 'East', 'West', 'Central'];

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareWorkers', selectedOrgId],
    queryFn: async () => {
      const allStaff = await base44.entities.StaffProfile.filter({ organization_id: selectedOrgId });
      return allStaff.filter(s => s.hc_staff_type === 'home_care_worker');
    },
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

  const createStaffMutation = useMutation({
    mutationFn: async (data) => base44.entities.StaffProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareWorkers'] });
      setShowAddDialog(false);
      setStaffForm(emptyForm);
      toast.success('Home care worker added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add worker: ' + (error?.response?.data?.message || error?.message || 'Unknown error'));
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId) => base44.entities.StaffProfile.delete(staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareWorkers'] });
      toast.success('Home care worker deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete worker: ' + (error?.message || 'Unknown error'));
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
      hc_staff_type: 'home_care_worker',
      division: staffForm.division,
      home_address: staffForm.home_address || '',
      notes: staffForm.notes || '',
      status: 'active',
    });
  };

  const filteredStaff = staff.filter(s => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      s.phone?.includes(searchQuery) ||
      s.division?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Workers</h1>
          <p className="text-slate-500 mt-1">Manage home care workers providing direct care support</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Worker
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-xs text-slate-500">Total Workers</p>
              <p className="text-2xl font-bold">{staff.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{staff.filter(s => s.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Inactive</p>
              <p className="text-2xl font-bold text-slate-600">{staff.filter(s => s.status === 'inactive').length}</p>
            </div>
          </CardContent>
        </Card>
        {totalExpiryAlerts > 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-xs text-orange-600">Document Alerts</p>
                <p className="text-2xl font-bold text-orange-700">{totalExpiryAlerts}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, phone, or division..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <Heart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {searchQuery ? 'No workers found' : 'No home care workers assigned yet'}
            </p>
          </Card>
        ) : (
          filteredStaff.map((member) => {
            const alerts = getStaffExpiryAlerts(member.id);
            return (
              <Card key={member.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{member.first_name} {member.last_name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-700">Home Care Worker</Badge>
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
                  {alerts.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1 mt-2">
                      <AlertTriangle className="w-3 h-3" />
                      {alerts.length} document{alerts.length > 1 ? 's' : ''} expiring/expired
                    </div>
                  )}
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

      {/* Add Worker Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Home Care Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
              <Label>Division / Area *</Label>
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
              <Label>Home Address</Label>
              <Textarea
                value={staffForm.home_address}
                onChange={(e) => setStaffForm({...staffForm, home_address: e.target.value})}
                placeholder="Home address"
                rows={2}
              />
            </div>

            <div>
              <Label>Skills & Experience</Label>
              <Textarea
                value={staffForm.notes}
                onChange={(e) => setStaffForm({...staffForm, notes: e.target.value})}
                placeholder="e.g. ADL support, bathing assistance, meal prep, mobility help..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createStaffMutation.isPending}>
                {createStaffMutation.isPending ? 'Adding...' : 'Add Worker'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}