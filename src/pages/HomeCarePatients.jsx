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
  Calendar,
  User,
  Search,
  AlertTriangle
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
import { format } from 'date-fns';
import { useOrganization } from '@/components/OrganizationProvider';

export default function HomeCarePatients() {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExisting, setSearchExisting] = useState('');
  const [showExistingPatients, setShowExistingPatients] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    chronic_conditions: '',
    notes: '',
    status: 'active'
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['homeCarePatients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter({ organization_id: selectedOrgId }, '-created_date'),
    enabled: !!selectedOrgId,
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data) => {
      // Generate PHN first
      const phnResponse = await base44.functions.invoke('generatePHN', {});
      const phn = phnResponse.data.phn;
      
      return await base44.entities.Patient.create({
        ...data,
        phn: phn
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCarePatients'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowAddDialog(false);
      setDuplicateWarning(null);
      setPatientForm({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        phone: '',
        email: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        chronic_conditions: '',
        notes: '',
        status: 'active'
      });
      toast.success('Patient registered successfully with PHN!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to register patient');
    }
  });

  const checkForDuplicates = () => {
    const duplicates = patients.filter(p => {
      const nameMatch = p.first_name.toLowerCase() === patientForm.first_name.toLowerCase() && 
                        p.last_name.toLowerCase() === patientForm.last_name.toLowerCase();
      const phoneMatch = p.phone && patientForm.phone && p.phone === patientForm.phone;
      const emailMatch = p.email && patientForm.email && p.email.toLowerCase() === patientForm.email.toLowerCase();
      
      return nameMatch || phoneMatch || emailMatch;
    });
    
    if (duplicates.length > 0) {
      setDuplicateWarning(duplicates);
      return true;
    }
    return false;
  };

  const handleSubmit = () => {
    if (!patientForm.first_name || !patientForm.last_name || !patientForm.phone) {
      toast.error('Please fill required fields');
      return;
    }
    
    // Check for duplicates
    if (!duplicateWarning && checkForDuplicates()) {
      return; // Show warning, don't proceed
    }
    
    createPatientMutation.mutate(patientForm);
  };

  const handleSelectExistingPatient = (patient) => {
    setShowExistingPatients(false);
    setSearchExisting('');
    toast.success(`Selected existing patient: ${patient.first_name} ${patient.last_name}`);
  };

  const existingPatientsFiltered = patients.filter(p => {
    const search = searchExisting.toLowerCase();
    return search !== '' && (
      p.first_name?.toLowerCase().includes(search) ||
      p.last_name?.toLowerCase().includes(search) ||
      p.phone?.includes(searchExisting) ||
      p.phn?.toLowerCase().includes(search)
    );
  });

  const filteredPatients = patients.filter(p => {
    const searchLower = searchQuery.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(searchLower) ||
      p.last_name?.toLowerCase().includes(searchLower) ||
      p.phone?.includes(searchQuery) ||
      p.address?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Patients</h1>
          <p className="text-slate-500 mt-1">Manage patients receiving home care services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExistingPatients(true)}>
            <Search className="w-4 h-4 mr-2" />
            Select Existing
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Register New
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total Patients</p>
            <p className="text-2xl font-bold">{patients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Active</p>
            <p className="text-2xl font-bold text-emerald-600">
              {patients.filter(p => p.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Inactive</p>
            <p className="text-2xl font-bold text-slate-400">
              {patients.filter(p => p.status === 'inactive').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">This Month</p>
            <p className="text-2xl font-bold text-blue-600">
              {patients.filter(p => {
                const created = new Date(p.created_date);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Patients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {searchQuery ? 'No patients found' : 'No patients registered yet'}
            </p>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{patient.first_name} {patient.last_name}</CardTitle>
                      <Badge className={patient.status === 'active' ? 'bg-emerald-100 text-emerald-700 mt-1' : 'bg-slate-100 text-slate-700 mt-1'}>
                        {patient.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {patient.date_of_birth && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      {format(new Date(patient.date_of_birth), 'MMM d, yyyy')} 
                      ({new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}y)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{patient.phone || 'N/A'}</span>
                </div>
                {patient.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 line-clamp-1">{patient.address}</span>
                  </div>
                )}
                {patient.chronic_conditions && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                    {patient.chronic_conditions}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Select Existing Patient Dialog */}
      <Dialog open={showExistingPatients} onOpenChange={setShowExistingPatients}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Existing Patient from Patient Hub</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, phone, or PHN..."
                value={searchExisting}
                onChange={(e) => setSearchExisting(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {existingPatientsFiltered.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {searchExisting ? 'No patients found' : 'Start typing to search'}
                </div>
              ) : (
                existingPatientsFiltered.map((patient) => (
                  <Card 
                    key={patient.id} 
                    className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleSelectExistingPatient(patient)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                          {patient.phn && <Badge variant="outline">{patient.phn}</Badge>}
                          {patient.phone && <span>{patient.phone}</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Patient Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) setDuplicateWarning(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register Home Care Patient</DialogTitle>
          </DialogHeader>
          
          {duplicateWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">Possible Duplicate Patient(s) Found</p>
                  <p className="text-sm text-amber-700 mt-1">Similar patient(s) already exist:</p>
                  <div className="mt-2 space-y-2">
                    {duplicateWarning.map((dup) => (
                      <div key={dup.id} className="bg-white rounded p-2 text-sm">
                        <p className="font-medium">{dup.first_name} {dup.last_name}</p>
                        <p className="text-slate-600">{dup.phone} {dup.phn && `• PHN: ${dup.phn}`}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setDuplicateWarning(null);
                        setShowAddDialog(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setDuplicateWarning(null);
                        createPatientMutation.mutate(patientForm);
                      }}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Register Anyway
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={patientForm.first_name}
                  onChange={(e) => setPatientForm({...patientForm, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={patientForm.last_name}
                  onChange={(e) => setPatientForm({...patientForm, last_name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={patientForm.date_of_birth}
                  onChange={(e) => setPatientForm({...patientForm, date_of_birth: e.target.value})}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={patientForm.gender} onValueChange={(val) => setPatientForm({...patientForm, gender: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone *</Label>
                <Input
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                  placeholder="Contact number"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={patientForm.email}
                  onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Textarea
                value={patientForm.address}
                onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                placeholder="Home address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Emergency Contact Name</Label>
                <Input
                  value={patientForm.emergency_contact_name}
                  onChange={(e) => setPatientForm({...patientForm, emergency_contact_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Emergency Contact Phone</Label>
                <Input
                  value={patientForm.emergency_contact_phone}
                  onChange={(e) => setPatientForm({...patientForm, emergency_contact_phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Chronic Conditions / Medical History</Label>
              <Textarea
                value={patientForm.chronic_conditions}
                onChange={(e) => setPatientForm({...patientForm, chronic_conditions: e.target.value})}
                placeholder="List chronic conditions, allergies, etc."
                rows={3}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={patientForm.notes}
                onChange={(e) => setPatientForm({...patientForm, notes: e.target.value})}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createPatientMutation.isPending}>
                {createPatientMutation.isPending ? 'Registering...' : 'Register Patient'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}