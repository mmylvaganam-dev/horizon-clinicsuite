import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  UserPlus,
  Stethoscope,
  ShoppingBag,
  Home,
  CreditCard,
  Phone,
  Mail,
  IdCard,
  Calendar,
  FileEdit
} from 'lucide-react';
import { format } from 'date-fns';
import PatientForm from '../components/patients/PatientForm';
import RequestPatientEdit from '../components/patients/RequestPatientEdit';

export default function PatientHub() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showEditRequest, setShowEditRequest] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date'),
  });

  const filteredPatients = patients.filter(p => {
    const search = searchQuery.toLowerCase();
    return search === '' ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search) ||
      p.phn?.toLowerCase().includes(search) ||
      p.nic?.toLowerCase().includes(search) ||
      p.mobile?.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search);
  });

  const getPatientAge = (dob) => {
    if (!dob) return null;
    return Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const handleEditPatient = async (data) => {
    await base44.entities.Patient.update(selectedPatient.id, data);
    setSelectedPatient(null);
  };

  const handleNameEditRequest = (data) => {
    setSelectedPatient({ ...selectedPatient, ...data });
    setShowEditRequest(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Hub</h1>
          <p className="text-slate-600 mt-1">Central patient management - Search, view profiles, and access all services</p>
        </div>
        <Button onClick={() => setShowAddPatient(true)} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Patients</p>
                <p className="text-2xl font-bold text-slate-900">{patients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Patients</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {patients.filter(p => p.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Walk-in Patients</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {patients.filter(p => p.patient_type === 'walk_in').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">New This Month</p>
                <p className="text-2xl font-bold text-blue-600">
                  {patients.filter(p => {
                    const created = new Date(p.created_date);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name, PHN, NIC, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center py-12">
            <p className="text-slate-500">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No patients found</p>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const age = getPatientAge(patient.date_of_birth);
            return (
              <Card key={patient.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {patient.photo_url ? (
                        <img 
                          src={patient.photo_url} 
                          alt={`${patient.first_name} ${patient.last_name}`}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold">
                          {patient.first_name?.[0]}{patient.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {patient.first_name} {patient.last_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {patient.phn && (
                            <Badge variant="outline" className="text-xs">
                              <IdCard className="w-3 h-3 mr-1" />
                              {patient.phn}
                            </Badge>
                          )}
                          {age && <span className="text-xs text-slate-500">{age} years</span>}
                          {patient.gender && <span className="text-xs text-slate-500 capitalize">{patient.gender}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      patient.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                      patient.status === 'inactive' ? 'bg-slate-50 text-slate-700' :
                      'bg-rose-50 text-rose-700'
                    }>
                      {patient.status || 'active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Contact Info */}
                  <div className="space-y-1.5 text-sm">
                    {patient.mobile && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{patient.mobile}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}
                    {patient.nic && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <CreditCard className="w-4 h-4" />
                        <span>NIC: {patient.nic}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-5 gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${createPageUrl('PatientDetails')}?id=${patient.id}`)}
                      className="text-xs"
                      title="View Details"
                    >
                      <Users className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${createPageUrl('EMR')}?patient=${patient.id}`)}
                      className="text-xs"
                      title="EMR"
                    >
                      <Stethoscope className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(createPageUrl('PharmacyBilling'))}
                      className="text-xs"
                      title="Pharmacy"
                    >
                      <ShoppingBag className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(createPageUrl('HomeCarePatients'))}
                      className="text-xs"
                      title="Home Care"
                    >
                      <Home className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatient(patient);
                        setShowEditRequest(true);
                      }}
                      className="text-xs"
                      title="Request Edit"
                    >
                      <FileEdit className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Patient Form */}
      <PatientForm
        open={showAddPatient}
        onOpenChange={setShowAddPatient}
        onSubmit={async (data) => {
          await base44.entities.Patient.create(data);
          setShowAddPatient(false);
        }}
      />

      {/* Edit Request Dialog */}
      <RequestPatientEdit
        open={showEditRequest}
        onOpenChange={setShowEditRequest}
        patient={selectedPatient}
        user={user}
      />
    </div>
  );
}