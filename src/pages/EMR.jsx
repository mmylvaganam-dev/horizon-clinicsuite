import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, User, Activity, TestTube, UserCheck, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PatientSOAPTab from '../components/patient/PatientSOAPTab';
import PatientLabsTab from '../components/patient/PatientLabsTab';
import MedicationList from '../components/emr/MedicationList';
import PastSurgicalHistory from '../components/emr/PastSurgicalHistory';
import SpecialistChart from '../components/emr/SpecialistChart';

export default function EMR() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: records = [] } = useQuery({
    queryKey: ['patientMedicalRecords', selectedPatient?.id],
    queryFn: () => base44.entities.MedicalRecord.filter({ patient_id: selectedPatient.id }, '-record_date'),
    enabled: !!selectedPatient,
  });

  const { data: soapNotes = [] } = useQuery({
    queryKey: ['patientSOAP', selectedPatient?.id],
    queryFn: () => base44.entities.SOAPNote.filter({ patient_id: selectedPatient.id }, '-note_date'),
    enabled: !!selectedPatient,
  });

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || p.mrn?.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Electronic Medical Records</h1>
        <p className="text-slate-500 mt-1">Comprehensive patient chart management</p>
      </div>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by patient name or MRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && (
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No patients found</p>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedPatient?.id === patient.id
                        ? 'bg-teal-50 border-teal-300'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold">
                          {patient.first_name?.[0]}{patient.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {patient.mrn && <span>MRN: {patient.mrn}</span>}
                            {patient.date_of_birth && (
                              <span>• DOB: {format(new Date(patient.date_of_birth), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link to={`${createPageUrl('PatientDetails')}?id=${patient.id}`}>
                        <Button variant="ghost" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPatient ? (
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                    {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h2>
                    <div className="flex items-center gap-3 text-teal-100 text-sm mt-1">
                      {selectedPatient.mrn && <span>MRN: {selectedPatient.mrn}</span>}
                      {selectedPatient.date_of_birth && (
                        <span>• {Math.floor((new Date() - new Date(selectedPatient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))} years old</span>
                      )}
                      {selectedPatient.gender && <span>• {selectedPatient.gender}</span>}
                    </div>
                  </div>
                </div>
                <Link to={`${createPageUrl('PatientDetails')}?id=${selectedPatient.id}`}>
                  <Button variant="secondary" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Full Profile
                  </Button>
                </Link>
              </div>

              {selectedPatient.allergies && (
                <div className="mt-4 p-3 bg-amber-500/20 rounded-lg backdrop-blur-sm border border-amber-300/30">
                  <p className="text-sm font-semibold text-amber-100">⚠️ Allergies: {selectedPatient.allergies}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="cpp" className="space-y-6">
            <TabsList className="grid grid-cols-2 lg:grid-cols-7 w-full">
              <TabsTrigger value="cpp">CPP</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="soap">SOAP Notes</TabsTrigger>
              <TabsTrigger value="labs">Labs</TabsTrigger>
              <TabsTrigger value="referrals">Specialists</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>

            <TabsContent value="cpp">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Current Patient Profile (CPP)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Chief Complaints / Active Issues</p>
                      <div className="space-y-2">
                        {selectedPatient.chronic_conditions ? (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-900">{selectedPatient.chronic_conditions}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No active issues documented</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Current Plans</p>
                      {soapNotes.length > 0 ? (
                        <div className="space-y-2">
                          {soapNotes.slice(0, 3).map(note => (
                            <div key={note.id} className="p-3 bg-slate-50 rounded-lg border">
                              <p className="text-xs text-slate-500 mb-1">{format(new Date(note.note_date), 'MMM d, yyyy')}</p>
                              <p className="text-sm text-slate-700"><span className="font-semibold">Plan:</span> {note.plan?.substring(0, 150)}...</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">No current plans documented</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Allergies & Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPatient.allergies ? (
                      <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
                        <div className="flex items-center gap-2 text-amber-800 mb-2">
                          <span className="text-2xl">⚠️</span>
                          <p className="font-bold text-lg">ALLERGIES</p>
                        </div>
                        <p className="text-amber-900">{selectedPatient.allergies}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-emerald-800">✓ No known allergies</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="medications">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Current Medications</CardTitle>
                </CardHeader>
                <CardContent>
                  <MedicationList patientId={selectedPatient.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-6">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Past Medical History (PMHx)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPatient.chronic_conditions ? (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-slate-900">{selectedPatient.chronic_conditions}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No past medical history documented</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Past Surgical History (PSHx)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PastSurgicalHistory patientId={selectedPatient.id} />
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Family History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 italic">Family history section - to be documented</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="soap">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="pt-6">
                  <PatientSOAPTab patientId={selectedPatient.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="labs">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="pt-6">
                  <PatientLabsTab patientId={selectedPatient.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrals">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Specialist Consultations</CardTitle>
                </CardHeader>
                <CardContent>
                  <SpecialistChart patientId={selectedPatient.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records">
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Medical Records History</CardTitle>
                </CardHeader>
                <CardContent>
                  {records.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No medical records yet</p>
                  ) : (
                    <div className="space-y-2">
                      {records.map((record) => (
                        <div key={record.id} className="p-4 rounded-lg border bg-white">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-violet-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-slate-900 capitalize">
                                  {record.record_type?.replace(/[_-]/g, ' ')}
                                </p>
                                <Badge variant="outline">{format(new Date(record.record_date), 'MMM d, yyyy')}</Badge>
                              </div>
                              {record.provider && (
                                <p className="text-sm text-slate-500">Provider: {record.provider}</p>
                              )}
                              {record.chief_complaint && (
                                <p className="text-sm text-slate-600 mt-2">
                                  <span className="font-medium">Chief Complaint:</span> {record.chief_complaint}
                                </p>
                              )}
                              {record.diagnosis && (
                                <p className="text-sm text-slate-600 mt-1">
                                  <span className="font-medium">Diagnosis:</span> {record.diagnosis}
                                </p>
                              )}
                              {record.treatment_plan && (
                                <p className="text-sm text-slate-600 mt-1">
                                  <span className="font-medium">Treatment:</span> {record.treatment_plan}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900">Search for a Patient</h3>
          <p className="text-slate-500 mt-2">Enter patient name or MRN to access their medical records</p>
        </Card>
      )}
    </div>
  );
}