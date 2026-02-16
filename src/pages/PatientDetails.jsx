import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Heart,
  Shield,
  AlertTriangle,
  FileText,
  Clock,
  Trash2,
  Lock,
  CreditCard,
  Home,
  Stethoscope,
  ShoppingBag,
  IdCard
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import PatientForm from '../components/patients/PatientForm';
import PatientTasksTab from '../components/patient/PatientTasksTab';
import PatientSOAPTab from '../components/patient/PatientSOAPTab';
import PatientReferralsTab from '../components/patient/PatientReferralsTab';
import PatientLabsTab from '../components/patient/PatientLabsTab';
import PHNCard from '@/components/patients/PHNCard';
import { usePatientAccess, logPatientProfileView } from '../components/rbac/PatientAccessControl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  deceased: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function PatientDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('id');

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showPHNCard, setShowPHNCard] = useState(false);

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding'],
    queryFn: async () => {
      const brandings = await base44.entities.OrganizationBranding.list();
      return brandings[0];
    },
  });

  const access = usePatientAccess();

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: patientId });
      return patients[0];
    },
    enabled: !!patientId,
  });

  useEffect(() => {
    if (patient && access.user) {
      const accessLevel = access.canViewFullChart ? 'full_chart' : 
                          access.canViewBasicProfile ? 'basic_profile' : 'none';
      logPatientProfileView(access.user, patientId, accessLevel);
    }
  }, [patient, access.user, patientId]);

  const { data: appointments = [] } = useQuery({
    queryKey: ['patientAppointments', patientId],
    queryFn: () => base44.entities.Appointment.filter({ patient_id: patientId }, '-date'),
    enabled: !!patientId,
  });

  const { data: records = [] } = useQuery({
    queryKey: ['patientRecords', patientId],
    queryFn: () => base44.entities.MedicalRecord.filter({ patient_id: patientId }, '-record_date'),
    enabled: !!patientId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.update(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Patient.delete(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate(createPageUrl('Patients'));
    },
  });

  if (loadingPatient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Patient not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl('Patients'))}>
          Back to Patients
        </Button>
      </div>
    );
  }

  if (access.noPatientAccess) {
    return (
      <div className="text-center py-12">
        <Lock className="w-12 h-12 mx-auto text-rose-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Access Restricted</h3>
        <p className="text-slate-600 mt-2">Your role does not permit patient-level access</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl('Reports'))}>
          Go to Reports
        </Button>
      </div>
    );
  }

  if (!access.canViewBasicProfile) {
    return (
      <div className="text-center py-12">
        <Lock className="w-12 h-12 mx-auto text-rose-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Insufficient Permissions</h3>
        <p className="text-slate-600 mt-2">You do not have permission to view patient profiles</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl('Dashboard'))}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const age = patient.date_of_birth 
    ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl('Patients'))}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={() => setShowPHNCard(true)}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            PHN Card
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`${createPageUrl('EMR')}?patient=${patientId}`)}
          >
            <Stethoscope className="w-4 h-4 mr-2" />
            EMR
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`${createPageUrl('PharmacyBilling')}?patient=${patientId}`)}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Pharmacy
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`${createPageUrl('HomeCarePatients')}?patient=${patientId}`)}
          >
            <Home className="w-4 h-4 mr-2" />
            Home Care
          </Button>
          <Button onClick={() => setFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setDeleteOpen(true)}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Patient Header Card */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-24" />
        <CardContent className="relative pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {patient.photo_url ? (
              <img 
                src={patient.photo_url} 
                alt={`${patient.first_name} ${patient.last_name}`}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </div>
            )}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">
                  {patient.first_name} {patient.last_name}
                </h1>
                <Badge variant="outline" className={`${statusColors[patient.status || 'active']} border`}>
                  {patient.status || 'active'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-slate-500 mt-1 flex-wrap">
                {patient.phn && (
                  <Badge className="bg-indigo-600 text-white">
                    <IdCard className="w-3 h-3 mr-1" />
                    PHN: {patient.phn}
                  </Badge>
                )}
                {age && <span>{age} years old</span>}
                {patient.gender && <span className="capitalize">{patient.gender}</span>}
                {patient.blood_type && patient.blood_type !== 'unknown' && (
                  <span>Blood: {patient.blood_type}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-7 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {access.canViewAppointments && <TabsTrigger value="appointments">Appointments</TabsTrigger>}
          {access.canViewClinicalNotes && <TabsTrigger value="records">Records</TabsTrigger>}
          {access.canViewClinicalNotes && <TabsTrigger value="soap">SOAP Notes</TabsTrigger>}
          {access.canViewLabResults && <TabsTrigger value="labs">Labs</TabsTrigger>}
          {access.canViewReferrals && <TabsTrigger value="referrals">Referrals</TabsTrigger>}
          {access.canViewTasks && <TabsTrigger value="tasks">Tasks</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {!access.canViewFullChart && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Limited Access</p>
                    <p className="text-sm text-blue-700 mt-1">
                      You are viewing basic patient profile only. Clinical details are restricted to physicians.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-teal-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.phn && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <IdCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Patient Health Number</p>
                      <p className="font-semibold text-indigo-600">{patient.phn}</p>
                    </div>
                  </div>
                )}
                {patient.nic && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">NIC Number</p>
                      <p className="font-medium">{patient.nic}</p>
                    </div>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium">{patient.email}</p>
                    </div>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium">{patient.phone}</p>
                    </div>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Address</p>
                      <p className="font-medium">{patient.address}</p>
                    </div>
                  </div>
                )}
                {patient.date_of_birth && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Date of Birth</p>
                      <p className="font-medium">{format(new Date(patient.date_of_birth), 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Info - Basic */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5 text-rose-500" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.allergies && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <p className="font-medium">Allergies</p>
                    </div>
                    <p className="text-sm text-amber-800">{patient.allergies}</p>
                  </div>
                )}
                {access.canViewFullChart && patient.chronic_conditions && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Chronic Conditions</p>
                    <p className="font-medium">{patient.chronic_conditions}</p>
                  </div>
                )}
                {patient.blood_type && patient.blood_type !== 'unknown' && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Blood Type</p>
                    <p className="font-medium">{patient.blood_type}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact - Full Access Only */}
            {access.canViewFullChart && (patient.emergency_contact_name || patient.emergency_contact_phone) && (
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="w-5 h-5 text-red-500" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.emergency_contact_name && (
                    <p className="font-medium">{patient.emergency_contact_name}</p>
                  )}
                  {patient.emergency_contact_phone && (
                    <p className="text-slate-500">{patient.emergency_contact_phone}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Insurance - Full Access Only */}
            {access.canViewFullChart && (patient.insurance_provider || patient.insurance_number) && (
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Insurance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.insurance_provider && (
                    <p className="font-medium">{patient.insurance_provider}</p>
                  )}
                  {patient.insurance_number && (
                    <p className="text-slate-500">Policy: {patient.insurance_number}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {access.canViewAppointments && <TabsContent value="appointments" className="space-y-4">
          {appointments.length === 0 ? (
            <Card className="p-12 text-center bg-white border-0 shadow-sm">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No appointments</h3>
              <p className="text-slate-500 mt-1">No appointments scheduled for this patient</p>
            </Card>
          ) : (
            appointments.map((apt) => (
              <Card key={apt.id} className="p-4 bg-white border-0 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {apt.type?.replace(/[_-]/g, ' ')} - {apt.reason || 'No reason specified'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>{format(new Date(apt.date), 'MMM d, yyyy')} at {apt.time}</span>
                      {apt.provider && <span>• Dr. {apt.provider}</span>}
                    </div>
                  </div>
                  <Badge variant="outline">{apt.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </TabsContent>}

        {access.canViewClinicalNotes && <TabsContent value="records" className="space-y-4">
          {records.length === 0 ? (
            <Card className="p-12 text-center bg-white border-0 shadow-sm">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No medical records</h3>
              <p className="text-slate-500 mt-1">No medical records for this patient</p>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="p-4 bg-white border-0 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 capitalize">
                      {record.record_type?.replace(/[_-]/g, ' ')}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {format(new Date(record.record_date), 'MMM d, yyyy')}
                      {record.provider && ` • Dr. ${record.provider}`}
                    </p>
                    {record.diagnosis && (
                      <p className="mt-2 text-slate-700">{record.diagnosis}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>}

        {access.canViewClinicalNotes && <TabsContent value="soap">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <PatientSOAPTab patientId={patientId} />
            </CardContent>
          </Card>
        </TabsContent>}

        {access.canViewLabResults && <TabsContent value="labs">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <PatientLabsTab patientId={patientId} />
            </CardContent>
          </Card>
        </TabsContent>}

        {access.canViewReferrals && <TabsContent value="referrals">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <PatientReferralsTab patientId={patientId} />
            </CardContent>
          </Card>
        </TabsContent>}

        {access.canViewTasks && <TabsContent value="tasks">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-6">
              <PatientTasksTab patientId={patientId} />
            </CardContent>
          </Card>
        </TabsContent>}
        </Tabs>

      {/* Edit Form */}
      <PatientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={patient}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />

      {/* PHN Card Dialog */}
      <PHNCard 
        open={showPHNCard}
        onOpenChange={setShowPHNCard}
        patient={patient}
        branding={branding}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {patient.first_name} {patient.last_name}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}