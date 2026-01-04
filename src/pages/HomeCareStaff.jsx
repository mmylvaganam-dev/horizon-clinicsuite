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
  Building2,
  Search,
  Activity
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

export default function HomeCareStaff() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [staffForm, setStaffForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: 'home_nurse',
    division: '',
    address: '',
    qualifications: '',
    status: 'active'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareStaff'],
    queryFn: () => base44.entities.StaffProfile.filter({ role: 'home_nurse' }),
  });

  const divisions = ['North', 'South', 'East', 'West', 'Central'];

  const createStaffMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.StaffProfile.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareStaff'] });
      setShowAddDialog(false);
      setStaffForm({
        full_name: '',
        phone: '',
        email: '',
        role: 'home_nurse',
        division: '',
        address: '',
        qualifications: '',
        status: 'active'
      });
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

  const filteredStaff = staff.filter(s => {
    const searchLower = searchQuery.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(searchLower) ||
      s.phone?.includes(searchQuery) ||
      s.division?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Nursing Staff</h1>
          <p className="text-slate-500 mt-1">Manage home care nurses and divisions</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total Staff</p>
            <p className="text-2xl font-bold">{staff.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Active</p>
            <p className="text-2xl font-bold text-emerald-600">
              {staff.filter(s => s.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        {divisions.map(div => (
          <Card key={div}>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">{div}</p>
              <p className="text-2xl font-bold text-blue-600">
                {staff.filter(s => s.division === div && s.status === 'active').length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {searchQuery ? 'No staff found' : 'No staff members added yet'}
            </p>
          </Card>
        ) : (
          filteredStaff.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{member.full_name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-emerald-100 text-emerald-700">
                        {member.division || 'No Division'}
                      </Badge>
                      <Badge className={member.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                  <Activity className="w-5 h-5 text-slate-400" />
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
          ))
        )}
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Home Care Nursing Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
              <Label>Qualifications</Label>
              <Textarea
                value={staffForm.qualifications}
                onChange={(e) => setStaffForm({...staffForm, qualifications: e.target.value})}
                placeholder="Nursing qualifications, certificates, experience"
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