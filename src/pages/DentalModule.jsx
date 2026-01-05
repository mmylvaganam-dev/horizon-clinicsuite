import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users,
  Calendar,
  FileText,
  Activity,
  Search,
  Plus,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function DentalModule() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: encounters = [] } = useQuery({
    queryKey: ['dentalEncounters'],
    queryFn: () => base44.entities.DentalEncounter.list('-encounter_datetime'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const { data: treatmentPlans = [] } = useQuery({
    queryKey: ['dentalTreatmentPlans'],
    queryFn: () => base44.entities.DentalTreatmentPlan.list('-created_at'),
  });

  const { data: problems = [] } = useQuery({
    queryKey: ['dentalProblems'],
    queryFn: () => base44.entities.DentalProblem.filter({ status: 'active' }),
  });

  const getPatientName = (patientRef) => {
    const patient = patients.find(p => p.id === patientRef);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getStaffName = (staffRef) => {
    const member = staff.find(s => s.id === staffRef);
    return member?.name || 'Unknown';
  };

  const todayEncounters = encounters.filter(e => {
    const encDate = new Date(e.encounter_datetime).toISOString().split('T')[0];
    return encDate === selectedDate;
  });

  const filteredEncounters = encounters.filter(e => {
    const searchLower = searchQuery.toLowerCase();
    const patientName = getPatientName(e.patient_ref).toLowerCase();
    const providerName = getStaffName(e.provider_staff_ref).toLowerCase();
    return patientName.includes(searchLower) || providerName.includes(searchLower);
  });

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    signed: 'bg-blue-100 text-blue-700',
    final: 'bg-emerald-100 text-emerald-700',
    active: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dental Clinic</h1>
          <p className="text-slate-500 mt-1">Comprehensive dental practice management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Today's Encounters</p>
            <p className="text-3xl font-bold mt-1">{todayEncounters.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Patients</p>
            <p className="text-3xl font-bold mt-1">
              {[...new Set(encounters.map(e => e.patient_ref))].length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <Activity className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Problems</p>
            <p className="text-3xl font-bold mt-1">{problems.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Active Plans</p>
            <p className="text-3xl font-bold mt-1">
              {treatmentPlans.filter(t => t.plan_status === 'approved' || t.plan_status === 'in_progress').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search patients or providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="encounters" className="space-y-6">
        <TabsList>
          <TabsTrigger value="encounters">
            <FileText className="w-4 h-4 mr-2" />
            Encounters ({encounters.length})
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Activity className="w-4 h-4 mr-2" />
            Treatment Plans ({treatmentPlans.length})
          </TabsTrigger>
          <TabsTrigger value="problems">
            <Activity className="w-4 h-4 mr-2" />
            Active Problems ({problems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encounters" className="space-y-3">
          {filteredEncounters.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No encounters found</h3>
              <p className="text-slate-500 mt-1">Dental encounters will appear here</p>
            </Card>
          ) : (
            filteredEncounters.map((encounter) => (
              <Card key={encounter.id} className="p-5 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(createPageUrl('PatientDetails') + `?patientId=${encounter.patient_ref}&tab=dental`)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">
                        {getPatientName(encounter.patient_ref)}
                      </h3>
                      <Badge className={statusColors[encounter.status]}>{encounter.status}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-600">
                        <span className="font-medium">Provider:</span> {getStaffName(encounter.provider_staff_ref)}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium">Date:</span> {format(new Date(encounter.encounter_datetime), 'MMM d, yyyy h:mm a')}
                      </p>
                      {encounter.chief_complaint && (
                        <p className="text-slate-700">
                          <span className="font-medium">Chief Complaint:</span> {encounter.chief_complaint}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-3">
          {treatmentPlans.map((plan) => (
            <Card key={plan.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{plan.plan_title}</h3>
                    <Badge className={statusColors[plan.plan_status]}>{plan.plan_status}</Badge>
                    {plan.consent_signed && (
                      <Badge className="bg-emerald-100 text-emerald-700">Consent Signed</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    Patient: {getPatientName(plan.patient_ref)}
                  </p>
                  {plan.estimated_total_cost > 0 && (
                    <p className="text-lg font-bold text-teal-600 mt-2">
                      Estimated: ${plan.estimated_total_cost.toFixed(2)}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm"
                  onClick={() => navigate(createPageUrl('PatientDetails') + `?patientId=${plan.patient_ref}&tab=dental`)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="problems" className="space-y-3">
          {problems.map((problem) => (
            <Card key={problem.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={statusColors[problem.status]}>{problem.status}</Badge>
                    {problem.tooth_number && (
                      <Badge variant="outline">Tooth #{problem.tooth_number}</Badge>
                    )}
                  </div>
                  <p className="font-semibold text-slate-900">{problem.problem_text}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Patient: {getPatientName(problem.patient_ref)}
                  </p>
                  {problem.onset_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      Onset: {format(new Date(problem.onset_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}