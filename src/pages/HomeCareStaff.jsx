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
  Heart
} from 'lucide-react';
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

const STAFF_TYPES = [
  { value: 'nursing_officer', label: 'Nursing Officer', description: 'Home nursing clinical procedures', color: 'bg-blue-100 text-blue-700' },
  { value: 'home_care_worker', label: 'Home Care Worker', description: 'ADL support & long-term care', color: 'bg-purple-100 text-purple-700' },
];

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  role: 'home_nurse',
  staff_type: 'nursing_officer',
  division: '',
  address: '',
  qualifications: '',
  status: 'active'
};

export default function HomeCareStaff() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [staffForm, setStaffForm] = useState(emptyForm);

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareStaff'],
    queryFn: () => base44.entities.StaffProfile.filter({ role: 'home_nurse' }),
  });

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
      toast.error(error.message || 'Failed to add staff');
    }
  });

  const handleSubmit = () => {
    if (!staffForm.full_name || !staffForm.phone || !staffForm.division) {
      toast.error('Please fill required fields');
      return;
    }
    createStaffMutation.mutate(staffForm);
  };

  const nursingCount = staff.filter(s => s.staff_type === 'nursing_officer' || !s.staff_type).length;
  const homeCareCount = staff.filter(s => s.staff_type === 'home_care_worker').length;

  const filteredStaff = staff.filter(s => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      s.full_name?.toLowerCase().includes(searchLower) ||
      s.phone?.includes(searchQuery) ||
      s.division?.toLowerCase().includes(searchLower);
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'nursing_officer' && (s.staff_type === 'nursing_officer' || !s.staff_type)) ||
      (activeTab === 'home_care_worker' && s.staff_type === 'home_care_worker');
    return matchesSearch && matchesTab;
  });

  const getTypeInfo = (staffType) => {
    return STAFF_TYPES.find(t => t.value === staffType) || STAFF_TYPES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Staff</h1>
          <p className="text-slate-500 mt-1">Manage nursing officers and home care workers</p>
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
            <Users className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Total Staff</p>
              <p className="text-2xl font-bold">{staff.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{staff.filter(s => s.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-xs text-blue-600">Nursing Officers</p>
              <p className="text-2xl font-bold text-blue-700">{nursingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-xs text-purple-600">Home Care Workers</p>
              <p className="text-2xl font-bold text-purple-700">{homeCareCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Staff ({staff.length})</TabsTrigger>
            <TabsTrigger value="nursing_officer">Nursing Officers ({nursingCount})</TabsTrigger>
            <TabsTrigger value="home_care_worker">Home Care Workers ({homeCareCount})</TabsTrigger>
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
            const typeInfo = getTypeInfo(member.staff_type);
            return (
              <Card key={member.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{member.full_name}</CardTitle>
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
                  {member.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 line-clamp-1">{member.address}</span>
                    </div>
                  )}
                  {member.qualifications && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                      {member.qualifications}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
                    onClick={() => setStaffForm({...staffForm, staff_type: type.value})}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      staffForm.staff_type === type.value
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
                value={staffForm.full_name}
                onChange={(e) => setStaffForm({...staffForm, full_name: e.target.value})}
                placeholder="Staff member name"
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
                value={staffForm.address}
                onChange={(e) => setStaffForm({...staffForm, address: e.target.value})}
                placeholder="Home address"
                rows={2}
              />
            </div>

            <div>
              <Label>Qualifications / Experience</Label>
              <Textarea
                value={staffForm.qualifications}
                onChange={(e) => setStaffForm({...staffForm, qualifications: e.target.value})}
                placeholder={staffForm.staff_type === 'nursing_officer' 
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