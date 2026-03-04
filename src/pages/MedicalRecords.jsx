import React, { useState } from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrganization } from '@/components/OrganizationProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  FileText, 
  User,
  Calendar,
  Filter,
  Loader2,
  Stethoscope,
  Pill,
  FlaskConical,
  Image,
  ClipboardList
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const recordTypeIcons = {
  clinical_note: Stethoscope,
  diagnosis: ClipboardList,
  prescription: Pill,
  lab_result: FlaskConical,
  imaging: Image,
  procedure: Stethoscope,
  referral: FileText,
};

const recordTypeColors = {
  clinical_note: 'bg-teal-100 text-teal-700',
  diagnosis: 'bg-violet-100 text-violet-700',
  prescription: 'bg-amber-100 text-amber-700',
  lab_result: 'bg-blue-100 text-blue-700',
  imaging: 'bg-pink-100 text-pink-700',
  procedure: 'bg-emerald-100 text-emerald-700',
  referral: 'bg-slate-100 text-slate-700',
};

export default function MedicalRecords() {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    record_date: format(new Date(), 'yyyy-MM-dd'),
    record_type: 'clinical_note',
    provider: '',
    chief_complaint: '',
    diagnosis: '',
    diagnosis_code: '',
    treatment_plan: '',
    prescription: '',
    notes: '',
    vitals: {},
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['records', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.MedicalRecord.filter({ organization_id: selectedOrgId }, '-record_date');
    },
    enabled: !!selectedOrgId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.Patient.filter({ organization_id: selectedOrgId });
    },
    enabled: !!selectedOrgId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setFormOpen(false);
      resetForm();
    },
  });

  // Inject organization_id when creating records
  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, organization_id: selectedOrgId });
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      record_date: format(new Date(), 'yyyy-MM-dd'),
      record_type: 'clinical_note',
      provider: '',
      chief_complaint: '',
      diagnosis: '',
      diagnosis_code: '',
      treatment_plan: '',
      prescription: '',
      notes: '',
      vitals: {},
    });
  };

  // handleSubmit defined above with org_id injection

  const filteredRecords = records.filter(record => {
    const patient = patients.find(p => p.id === record.patient_id);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '';
    
    const matchesSearch = 
      patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.provider?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || record.record_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Medical Records</h1>
          <p className="text-slate-500 mt-1">{records.length} total records</p>
        </div>
        <Button 
          onClick={() => setFormOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Record
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="clinical_note">Clinical Notes</SelectItem>
              <SelectItem value="diagnosis">Diagnosis</SelectItem>
              <SelectItem value="prescription">Prescription</SelectItem>
              <SelectItem value="lab_result">Lab Results</SelectItem>
              <SelectItem value="imaging">Imaging</SelectItem>
              <SelectItem value="procedure">Procedure</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No records found</h3>
          <p className="text-slate-500 mt-1">
            {searchTerm || typeFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Add your first medical record to get started'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const IconComponent = recordTypeIcons[record.record_type] || FileText;
            
            return (
              <Card key={record.id} className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${recordTypeColors[record.record_type] || 'bg-slate-100 text-slate-700'}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={recordTypeColors[record.record_type]}>
                        {record.record_type?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {format(new Date(record.record_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{getPatientName(record.patient_id)}</span>
                      {record.provider && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">Dr. {record.provider}</span>
                        </>
                      )}
                    </div>
                    {(record.chief_complaint || record.diagnosis) && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                        {record.chief_complaint || record.diagnosis}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Record Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">New Medical Record</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient *</Label>
                <Select 
                  value={formData.patient_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, patient_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Record Type *</Label>
                <Select 
                  value={formData.record_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, record_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical_note">Clinical Note</SelectItem>
                    <SelectItem value="diagnosis">Diagnosis</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="lab_result">Lab Result</SelectItem>
                    <SelectItem value="imaging">Imaging</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.record_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, record_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="Dr. Smith"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chief Complaint</Label>
              <Input
                value={formData.chief_complaint}
                onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
                placeholder="Main reason for visit..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diagnosis</Label>
                <Input
                  value={formData.diagnosis}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Diagnosis details..."
                />
              </div>
              <div className="space-y-2">
                <Label>ICD Code</Label>
                <Input
                  value={formData.diagnosis_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis_code: e.target.value }))}
                  placeholder="e.g., J06.9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Treatment Plan</Label>
              <Textarea
                value={formData.treatment_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
                placeholder="Treatment plan details..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Prescription</Label>
              <Textarea
                value={formData.prescription}
                onChange={(e) => setFormData(prev => ({ ...prev, prescription: e.target.value }))}
                placeholder="Medications and dosage..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional clinical notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !formData.patient_id} 
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Record
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}