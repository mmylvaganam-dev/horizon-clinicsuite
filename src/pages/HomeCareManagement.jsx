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

export default function HomeCareManagement() {
  const queryClient = useQueryClient();
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
    date: format(new Date(), 'yyyy-MM-dd'),
    staff_id: '',
    patient_id: '',
    visit_time: '',
    services_provided: '',
    notes: '',
    next_visit: ''
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['homeCareStaff'],
    queryFn: () => base44.entities.StaffProfile.filter({ 
      role: 'home_nurse'
    }),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['homeCareDocuments'],
    queryFn: () => base44.entities.PatientDocument.list('-created_date'),
  });

  const divisions = ['North', 'South', 'East', 'West', 'Central'];

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
    if (!staffForm.full_name || !staffForm.phone || !staffForm.division) {
      toast.error('Please fill required fields');
      return;
    }
    createStaffMutation.mutate(staffForm);
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Care Management</h1>
          <p className="text-slate-500 mt-1">Manage home care staff, divisions, and daily reports</p>
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
                          Uploaded by {doc.uploaded_by} on {format(new Date(doc.uploaded_date), 'MMM d, yyyy')}
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
            <h3 className="text-lg font-semibold">Daily Visit Reports</h3>
            <div className="flex gap-3">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-48"
              />
              <Button onClick={() => setShowReportDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Report
              </Button>
            </div>
          </div>

          <Card className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No reports for selected date</p>
            <p className="text-xs text-slate-400 mt-2">Add daily visit reports to track home care activities</p>
          </Card>
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

      {/* Add Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Daily Visit Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={reportForm.date}
                  onChange={(e) => setReportForm({...reportForm, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Visit Time</Label>
                <Input
                  type="time"
                  value={reportForm.visit_time}
                  onChange={(e) => setReportForm({...reportForm, visit_time: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Staff Member</Label>
              <Select value={reportForm.staff_id} onValueChange={(val) => setReportForm({...reportForm, staff_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Patient</Label>
              <Select value={reportForm.patient_id} onValueChange={(val) => setReportForm({...reportForm, patient_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Services Provided</Label>
              <Textarea
                value={reportForm.services_provided}
                onChange={(e) => setReportForm({...reportForm, services_provided: e.target.value})}
                placeholder="List services provided during visit"
                rows={3}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={reportForm.notes}
                onChange={(e) => setReportForm({...reportForm, notes: e.target.value})}
                placeholder="Additional notes or observations"
                rows={3}
              />
            </div>
            <div>
              <Label>Next Visit</Label>
              <Input
                type="date"
                value={reportForm.next_visit}
                onChange={(e) => setReportForm({...reportForm, next_visit: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button>
                Save Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}