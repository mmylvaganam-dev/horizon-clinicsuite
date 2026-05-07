import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Upload, 
  FileText, 
  Plus, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  Activity,
  Building2,
  Eye,
  Download
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

export default function HomeCareReports() {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();
  const [showAddStaffDialog, setShowAddStaffDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [staffForm, setStaffForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: 'home_nurse',
    division: '',
    address: ''
  });

  const [reportForm, setReportForm] = useState({
    report_date: format(new Date(), 'yyyy-MM-dd'),
    shift_type: 'morning',
    shift_time: '8:00am - 2:00pm',
    incoming_nurse: '',
    outgoing_nurse: '',
    duty_doctor_morning: '',
    duty_doctor_evening: '',
    takeover_holistic_care: 0,
    takeover_pharmacy: 0,
    handover_holistic_care: 0,
    handover_pharmacy: 0,
    pharmacy_morning_income: 0,
    opd_status: '',
    lab_status: '',
    home_care_notes: '',
    patient_communication: '',
    equipment_facility_check: '',
    pharmacy_stock_notes: '',
    special_notes: '',
    handing_over_by: ''
  });

  const [patientVisitForm, setPatientVisitForm] = useState({
    report_date: format(new Date(), 'yyyy-MM-dd'),
    patient_name: '',
    age: '',
    address: '',
    visit_time_from: '',
    visit_time_to: '',
    caretaker_name: '',
    caretaker_age: '',
    caretaker_experience: '',
    caretaker_status: '',
    notes: ''
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareStaff', selectedOrgId],
    queryFn: () => base44.entities.StaffProfile.filter({ 
      organization_id: selectedOrgId,
      role: 'home_nurse'
    }),
    enabled: !!selectedOrgId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['homeCareDocuments', selectedOrgId],
    queryFn: () => base44.entities.PatientDocument.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['homeCareReports', selectedOrgId],
    queryFn: () => base44.entities.HomeCareReport.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: patientVisits = [] } = useQuery({
    queryKey: ['homeCarePatientVisits', selectedOrgId],
    queryFn: () => base44.entities.HomeCarePatientVisit.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = companies[0]?.base_currency || 'LKR';

  const divisions = ['North', 'South', 'East', 'West', 'Central'];

  const createReportMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.HomeCareReport.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareReports'] });
      setShowReportDialog(false);
      toast.success('Daily report saved successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save report');
    }
  });

  const createPatientVisitMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.HomeCarePatientVisit.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCarePatientVisits'] });
      toast.success('Patient visit added successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add patient visit');
    }
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.StaffProfile.create({
        ...data,
        role: 'home_nurse',
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareStaff'] });
      setShowAddStaffDialog(false);
      setStaffForm({
        full_name: '',
        phone: '',
        email: '',
        role: 'home_nurse',
        division: '',
        address: ''
      });
      toast.success('Staff member added successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add staff');
    }
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return await base44.entities.PatientDocument.create({
        document_type: 'home_care_notes',
        file_url,
        uploaded_by: (await base44.auth.me()).email,
        uploaded_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeCareDocuments'] });
      setShowUploadDialog(false);
      setSelectedFile(null);
      toast.success('Document uploaded successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload document');
    }
  });

  const handleAddStaff = () => {
    if (!selectedOrgId) {
      toast.error('No organization selected. Please switch to an organization first.');
      return;
    }
    if (!staffForm.full_name || !staffForm.phone || !staffForm.division) {
      toast.error('Please fill required fields');
      return;
    }
    createStaffMutation.mutate({
      ...staffForm,
      organization_id: selectedOrgId
    });
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    uploadDocumentMutation.mutate(selectedFile);
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Daily Reports</h1>
          <p className="text-slate-500 mt-1">Daily operation reports and documentation</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Staff</p>
            <p className="text-3xl font-bold mt-1">{staff.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <Building2 className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Divisions</p>
            <p className="text-3xl font-bold mt-1">{divisions.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Documents</p>
            <p className="text-3xl font-bold mt-1">{documents.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <Activity className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Today's Visits</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">
            <Users className="w-4 h-4 mr-2" />
            Staff Management
          </TabsTrigger>
          <TabsTrigger value="divisions">
            <Building2 className="w-4 h-4 mr-2" />
            Divisions
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Upload className="w-4 h-4 mr-2" />
            Documents & Notes
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" />
            Daily Reports
          </TabsTrigger>
        </TabsList>

        {/* Staff Management Tab */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Home Care Staff</h3>
            <Button onClick={() => setShowAddStaffDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.length === 0 ? (
              <Card className="col-span-full p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No staff members added yet</p>
              </Card>
            ) : (
              staff.map((member) => (
                <Card key={member.id} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{member.full_name}</CardTitle>
                        <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                          {member.division || 'No Division'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      {member.phone || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      {member.email || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      {member.address || 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Divisions Tab */}
        <TabsContent value="divisions" className="space-y-4">
          <h3 className="text-lg font-semibold">Home Care Divisions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {divisions.map((division) => {
              const divisionStaff = staff.filter(s => s.division === division);
              return (
                <Card key={division} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {division} Division
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Staff Members:</span>
                        <Badge className="bg-blue-100 text-blue-700">
                          {divisionStaff.length}
                        </Badge>
                      </div>
                      {divisionStaff.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {divisionStaff.map(s => (
                            <p key={s.id} className="text-xs text-slate-600">• {s.full_name}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Handwritten Notes & Documents</h3>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No documents uploaded yet</p>
              </Card>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {doc.document_type === 'home_care_notes' ? 'Home Care Notes' : doc.document_type}
                        </p>
                        <p className="text-xs text-slate-500">
                          Uploaded by {doc.uploaded_by} on {doc.uploaded_date ? format(new Date(doc.uploaded_date), 'MMM d, yyyy') : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.file_url} download>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Daily Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Daily Reports</h3>
            <div className="flex gap-3">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-48"
              />
              <Button onClick={() => setShowReportDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Daily Report
              </Button>
            </div>
          </div>

          {reports.filter(r => r.report_date === dateFilter).length === 0 ? (
            <Card className="p-12 text-center">
              <Activity className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No report for {dateFilter ? format(new Date(dateFilter + 'T00:00:00'), 'MMM d, yyyy') : 'selected date'}</p>
              <p className="text-xs text-slate-400 mt-2">Create a daily report to track operations</p>
            </Card>
          ) : (
            reports.filter(r => r.report_date === dateFilter).map((report) => (
              <Card key={report.id} className="p-6">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="text-xl font-bold">{report.report_date ? format(new Date(report.report_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy') : 'Unknown Date'}</h3>
                      <p className="text-sm text-slate-500">{report.shift_type === 'morning' ? 'Morning Shift' : 'Evening Shift'} - {report.shift_time}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">Daily Report</Badge>
                  </div>

                  {/* Duty Roster */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm uppercase text-slate-600">Duty Roster</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-slate-600">Incoming Nurse:</span> <span className="font-medium">{report.incoming_nurse || 'N/A'}</span></p>
                        <p><span className="text-slate-600">Outgoing Nurse:</span> <span className="font-medium">{report.outgoing_nurse || 'N/A'}</span></p>
                        <p><span className="text-slate-600">Duty Doctor (Morning):</span> <span className="font-medium">{report.duty_doctor_morning || 'N/A'}</span></p>
                        <p><span className="text-slate-600">Duty Doctor (Evening):</span> <span className="font-medium">{report.duty_doctor_evening || 'N/A'}</span></p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm uppercase text-slate-600">Opening Balance Summary</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-slate-500">Take Over:</p>
                          <div className="text-sm space-y-1 ml-2">
                            <p>• Holistic Care: <span className="font-bold text-emerald-600">{currency} {report.takeover_holistic_care?.toFixed(2) || '0.00'}</span></p>
                            <p>• Pharmacy: <span className="font-bold text-emerald-600">{currency} {report.takeover_pharmacy?.toFixed(2) || '0.00'}</span></p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Hand Over:</p>
                          <div className="text-sm space-y-1 ml-2">
                            <p>• Holistic Care: <span className="font-bold text-blue-600">{currency} {report.handover_holistic_care?.toFixed(2) || '0.00'}</span></p>
                            <p>• Pharmacy: <span className="font-bold text-blue-600">{currency} {report.handover_pharmacy?.toFixed(2) || '0.00'}</span></p>
                          </div>
                        </div>
                        {report.pharmacy_morning_income > 0 && (
                          <p className="text-sm">Morning Income: <span className="font-bold">{currency} {report.pharmacy_morning_income?.toFixed(2)}</span></p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Sections */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm uppercase text-slate-600 mb-2">OPD</h4>
                      <p className="text-sm text-slate-700">{report.opd_status || 'Nil'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm uppercase text-slate-600 mb-2">LAB</h4>
                      <p className="text-sm text-slate-700">{report.lab_status || 'Nil'}</p>
                    </div>
                  </div>

                  {/* Home Care */}
                  {report.home_care_notes && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase text-slate-600 mb-2">Home Care</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{report.home_care_notes}</p>
                    </div>
                  )}

                  {/* Other Sections */}
                  {report.patient_communication && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase text-slate-600 mb-2">Patient Communication</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{report.patient_communication}</p>
                    </div>
                  )}

                  {report.equipment_facility_check && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase text-slate-600 mb-2">Equipment & Facility Check</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{report.equipment_facility_check}</p>
                    </div>
                  )}

                  {report.pharmacy_stock_notes && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase text-slate-600 mb-2">Pharmacy & Stock</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{report.pharmacy_stock_notes}</p>
                    </div>
                  )}

                  {report.special_notes && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase text-slate-600 mb-2">Special Note</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{report.special_notes}</p>
                    </div>
                  )}

                  {/* Footer */}
                  {report.handing_over_by && (
                    <div className="border-t pt-4 text-right">
                      <p className="text-sm text-slate-600">Handing Over: <span className="font-medium">{report.handing_over_by}</span></p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}

          {/* Patient Visits for Selected Date */}
          {patientVisits.filter(v => v.report_date === dateFilter).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Patient Visits - {dateFilter ? format(new Date(dateFilter + 'T00:00:00'), 'MMM d, yyyy') : 'Selected Date'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientVisits.filter(v => v.report_date === dateFilter).map((visit) => (
                  <Card key={visit.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">{visit.patient_name}</h4>
                          <p className="text-sm text-slate-600">Age: {visit.age}y</p>
                        </div>
                        <Badge variant="outline">{visit.visit_time_from} - {visit.visit_time_to}</Badge>
                      </div>
                      <p className="text-sm text-slate-600"><MapPin className="w-3 h-3 inline mr-1" />{visit.address}</p>
                      {visit.caretaker_name && (
                        <div className="border-t pt-2">
                          <p className="text-xs text-slate-500 uppercase">Caretaker</p>
                          <p className="text-sm font-medium">{visit.caretaker_name} ({visit.caretaker_age}y)</p>
                          {visit.caretaker_experience && (
                            <p className="text-xs text-slate-600">{visit.caretaker_experience}</p>
                          )}
                          {visit.caretaker_status && (
                            <p className="text-xs text-amber-600 mt-1">{visit.caretaker_status}</p>
                          )}
                        </div>
                      )}
                      {visit.notes && (
                        <p className="text-xs text-slate-600 border-t pt-2">{visit.notes}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaffDialog} onOpenChange={setShowAddStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Home Care Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={staffForm.full_name}
                onChange={(e) => setStaffForm({...staffForm, full_name: e.target.value})}
                placeholder="Enter staff name"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={staffForm.phone}
                onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                placeholder="Phone number"
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
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddStaffDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStaff} disabled={createStaffMutation.isPending}>
                {createStaffMutation.isPending ? 'Adding...' : 'Add Staff'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Handwritten Notes / Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Select File</Label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept="image/*,.pdf"
              />
              <p className="text-xs text-slate-500 mt-1">Accepted: Images, PDF</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploadDocumentMutation.isPending}>
                {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Daily Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Daily Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Date and Shift */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={reportForm.report_date}
                  onChange={(e) => setReportForm({...reportForm, report_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Shift Type</Label>
                <Select value={reportForm.shift_type} onValueChange={(val) => setReportForm({...reportForm, shift_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shift Time</Label>
                <Input
                  value={reportForm.shift_time}
                  onChange={(e) => setReportForm({...reportForm, shift_time: e.target.value})}
                  placeholder="e.g., 8:00am - 2:00pm"
                />
              </div>
            </div>

            {/* Duty Roster */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Duty Roster</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Incoming Nurse</Label>
                  <Input
                    value={reportForm.incoming_nurse}
                    onChange={(e) => setReportForm({...reportForm, incoming_nurse: e.target.value})}
                    placeholder="Ms./Mr. Name"
                  />
                </div>
                <div>
                  <Label>Outgoing Nurse</Label>
                  <Input
                    value={reportForm.outgoing_nurse}
                    onChange={(e) => setReportForm({...reportForm, outgoing_nurse: e.target.value})}
                    placeholder="Ms./Mr. Name"
                  />
                </div>
                <div>
                  <Label>Duty Doctor (Morning)</Label>
                  <Input
                    value={reportForm.duty_doctor_morning}
                    onChange={(e) => setReportForm({...reportForm, duty_doctor_morning: e.target.value})}
                    placeholder="Dr. Name"
                  />
                </div>
                <div>
                  <Label>Duty Doctor (Evening)</Label>
                  <Input
                    value={reportForm.duty_doctor_evening}
                    onChange={(e) => setReportForm({...reportForm, duty_doctor_evening: e.target.value})}
                    placeholder="Dr. Name"
                  />
                </div>
              </div>
            </div>

            {/* Opening Balance Summary */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Opening Balance Summary - Front Desk & Cash</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-600">Take Over:</p>
                  <div className="space-y-2 ml-4">
                    <div>
                      <Label className="text-xs">Holistic Care ({currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={reportForm.takeover_holistic_care}
                        onChange={(e) => setReportForm({...reportForm, takeover_holistic_care: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pharmacy ({currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={reportForm.takeover_pharmacy}
                        onChange={(e) => setReportForm({...reportForm, takeover_pharmacy: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-600">Hand Over:</p>
                  <div className="space-y-2 ml-4">
                    <div>
                      <Label className="text-xs">Holistic Care ({currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={reportForm.handover_holistic_care}
                        onChange={(e) => setReportForm({...reportForm, handover_holistic_care: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pharmacy ({currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={reportForm.handover_pharmacy}
                        onChange={(e) => setReportForm({...reportForm, handover_pharmacy: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pharmacy Morning Income ({currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={reportForm.pharmacy_morning_income}
                        onChange={(e) => setReportForm({...reportForm, pharmacy_morning_income: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Sections */}
            <div className="border-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <Label>OPD Status</Label>
                <Textarea
                  value={reportForm.opd_status}
                  onChange={(e) => setReportForm({...reportForm, opd_status: e.target.value})}
                  placeholder="Enter OPD status or 'Nil'"
                  rows={2}
                />
              </div>
              <div>
                <Label>LAB Status</Label>
                <Textarea
                  value={reportForm.lab_status}
                  onChange={(e) => setReportForm({...reportForm, lab_status: e.target.value})}
                  placeholder="Enter LAB status or 'Nil'"
                  rows={2}
                />
              </div>
            </div>

            {/* Text Sections */}
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label>Home Care Notes</Label>
                <Textarea
                  value={reportForm.home_care_notes}
                  onChange={(e) => setReportForm({...reportForm, home_care_notes: e.target.value})}
                  placeholder="Care taker arrangements, patient details, etc."
                  rows={4}
                />
              </div>
              <div>
                <Label>Patient Communication</Label>
                <Textarea
                  value={reportForm.patient_communication}
                  onChange={(e) => setReportForm({...reportForm, patient_communication: e.target.value})}
                  placeholder="Patient communication notes, followups needed"
                  rows={3}
                />
              </div>
              <div>
                <Label>Equipment & Facility Check</Label>
                <Textarea
                  value={reportForm.equipment_facility_check}
                  onChange={(e) => setReportForm({...reportForm, equipment_facility_check: e.target.value})}
                  placeholder="Equipment status, facility issues"
                  rows={2}
                />
              </div>
              <div>
                <Label>Pharmacy & Stock</Label>
                <Textarea
                  value={reportForm.pharmacy_stock_notes}
                  onChange={(e) => setReportForm({...reportForm, pharmacy_stock_notes: e.target.value})}
                  placeholder="Stock reminders, supplier visits, orders"
                  rows={3}
                />
              </div>
              <div>
                <Label>Special Note</Label>
                <Textarea
                  value={reportForm.special_notes}
                  onChange={(e) => setReportForm({...reportForm, special_notes: e.target.value})}
                  placeholder="Any special notes, updates, or reminders"
                  rows={4}
                />
              </div>
              <div>
                <Label>Handing Over By</Label>
                <Input
                  value={reportForm.handing_over_by}
                  onChange={(e) => setReportForm({...reportForm, handing_over_by: e.target.value})}
                  placeholder="Staff name handing over"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => createReportMutation.mutate(reportForm)} disabled={createReportMutation.isPending}>
                {createReportMutation.isPending ? 'Saving...' : 'Save Daily Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}