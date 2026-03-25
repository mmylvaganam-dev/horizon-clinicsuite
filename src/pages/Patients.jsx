import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';
import PHNCard from '@/components/patients/PHNCard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  Mail, 
  ChevronRight,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PatientForm from '../components/patients/PatientForm';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  deceased: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function Patients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { orgFilter, withOrgId, selectedOrgId } = useOrgFiltered();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showPHNCard, setShowPHNCard] = useState(false);
  const [selectedPatientForCard, setSelectedPatientForCard] = useState(null);

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding'],
    queryFn: async () => {
      const brandings = await base44.entities.OrganizationBranding.list();
      return brandings[0];
    },
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter(orgFilter, '-created_date'),
    enabled: !!selectedOrgId,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Generate PHN for new patient
      let phn;
      try {
        const phnResponse = await base44.functions.invoke('generatePHN', { organization_id: selectedOrgId });
        phn = phnResponse.data?.phn;
      } catch (err) {
        console.error('PHN generation failed, proceeding without PHN:', err);
      }

      return base44.entities.Patient.create(withOrgId({
        ...data,
        ...(phn ? { phn } : {}),
      }));
    },
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setFormOpen(false);
      setSelectedPatientForCard(newPatient);
      setShowPHNCard(true);
    },
    onError: (err) => {
      toast({
        title: 'Failed to add patient',
        description: err?.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Patient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setFormOpen(false);
      setEditingPatient(null);
    },
  });

  const handleSubmit = (data) => {
    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm) ||
      patient.phn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mobile?.includes(searchTerm) ||
      patient.nic?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter || (!patient.status && statusFilter === 'active');
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-slate-500 mt-1">{patients.length} total patients</p>
        </div>
        <Button 
          onClick={() => { setEditingPatient(null); setFormOpen(true); }}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                <Grid3X3 className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                <List className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Patient List/Grid */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-48 rounded-2xl' : 'h-20 rounded-xl'} />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <User className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No patients found</h3>
          <p className="text-slate-500 mt-1">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Add your first patient to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button
              onClick={() => { setEditingPatient(null); setFormOpen(true); }}
              className="mt-4 bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Link 
              key={patient.id}
              to={createPageUrl(`PatientDetails?id=${patient.id}`)}
              className="block"
            >
              <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <div className="flex items-start gap-4">
                  {patient.photo_url ? (
                    <img 
                      src={patient.photo_url} 
                      alt={`${patient.first_name} ${patient.last_name}`}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/20">
                      {patient.first_name?.[0]}{patient.last_name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <Badge variant="outline" className={`${statusColors[patient.status || 'active']} border mt-1`}>
                      {patient.status || 'active'}
                    </Badge>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  {patient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPatients.map((patient) => (
            <Link 
              key={patient.id}
              to={createPageUrl(`PatientDetails?id=${patient.id}`)}
              className="block"
            >
              <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer">
                <div className="flex items-center gap-4">
                  {patient.photo_url ? (
                    <img 
                      src={patient.photo_url} 
                      alt={`${patient.first_name} ${patient.last_name}`}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
                      {patient.first_name?.[0]}{patient.last_name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-0.5">
                      {patient.phone && <span>{patient.phone}</span>}
                      {patient.email && <span className="truncate">{patient.email}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={`${statusColors[patient.status || 'active']} border`}>
                    {patient.status || 'active'}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Patient Form Modal */}
      <PatientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editingPatient}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* PHN Card Modal */}
      <PHNCard 
        open={showPHNCard}
        onOpenChange={setShowPHNCard}
        patient={selectedPatientForCard}
        branding={branding}
      />
    </div>
  );
}