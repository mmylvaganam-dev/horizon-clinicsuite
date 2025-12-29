import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ClipboardList,
  Pill,
  Calendar,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminSystemHealth() {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueRecords, setIssueRecords] = useState([]);

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: orderItems = [], isLoading: loadingOrderItems } = useQuery({
    queryKey: ['orderItems'],
    queryFn: () => base44.entities.OrderItem.list(),
  });

  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Result.list(),
  });

  const { data: prescriptions = [], isLoading: loadingPrescriptions } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => base44.entities.Prescription.list(),
  });

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list(),
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const isLoading = loadingOrders || loadingOrderItems || loadingResults || 
                    loadingPrescriptions || loadingAppointments || loadingPatients;

  // Calculate integrity issues
  const patientIds = new Set(patients.map(p => p.id));

  const ordersMissingPatient = orders.filter(o => !o.patient_id || !patientIds.has(o.patient_id));
  const ordersWithoutItems = orders.filter(o => !orderItems.some(oi => oi.order_id === o.id));
  
  const orderIds = new Set(orders.map(o => o.id));
  const resultsWithoutOrder = results.filter(r => !r.order_id || !orderIds.has(r.order_id));
  const resultsMissingPatient = results.filter(r => !r.patient_id || !patientIds.has(r.patient_id));
  
  const prescriptionsMissingPatient = prescriptions.filter(p => !p.patient_id || !patientIds.has(p.patient_id));
  const appointmentsMissingPatient = appointments.filter(a => !a.patient_id || !patientIds.has(a.patient_id));

  const healthChecks = [
    {
      title: 'Orders Missing Patient Link',
      count: ordersMissingPatient.length,
      icon: ClipboardList,
      color: ordersMissingPatient.length > 0 ? 'rose' : 'emerald',
      records: ordersMissingPatient,
      type: 'order'
    },
    {
      title: 'Orders Without Order Items',
      count: ordersWithoutItems.length,
      icon: ClipboardList,
      color: ordersWithoutItems.length > 0 ? 'amber' : 'emerald',
      records: ordersWithoutItems,
      type: 'order'
    },
    {
      title: 'Results Without Order Link',
      count: resultsWithoutOrder.length,
      icon: FileText,
      color: resultsWithoutOrder.length > 0 ? 'rose' : 'emerald',
      records: resultsWithoutOrder,
      type: 'result'
    },
    {
      title: 'Results Missing Patient Link',
      count: resultsMissingPatient.length,
      icon: FileText,
      color: resultsMissingPatient.length > 0 ? 'rose' : 'emerald',
      records: resultsMissingPatient,
      type: 'result'
    },
    {
      title: 'Prescriptions Missing Patient Link',
      count: prescriptionsMissingPatient.length,
      icon: Pill,
      color: prescriptionsMissingPatient.length > 0 ? 'rose' : 'emerald',
      records: prescriptionsMissingPatient,
      type: 'prescription'
    },
    {
      title: 'Appointments Missing Patient Link',
      count: appointmentsMissingPatient.length,
      icon: Calendar,
      color: appointmentsMissingPatient.length > 0 ? 'rose' : 'emerald',
      records: appointmentsMissingPatient,
      type: 'appointment'
    }
  ];

  const totalIssues = healthChecks.reduce((sum, check) => sum + check.count, 0);

  const colorStyles = {
    rose: 'from-rose-500 to-rose-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
  };

  const handleViewDetails = (check) => {
    setSelectedIssue(check);
    setIssueRecords(check.records);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Health</h1>
        <p className="text-slate-500 mt-1">Data integrity monitoring and validation</p>
      </div>

      {/* Overall Status */}
      <Card className={`border-0 shadow-sm ${totalIssues === 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {totalIssues === 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900">All Systems Operational</h3>
                  <p className="text-sm text-emerald-700">No data integrity issues detected</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-rose-900">{totalIssues} Data Integrity Issues</h3>
                  <p className="text-sm text-rose-700">Review and resolve the issues below</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Checks */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthChecks.map((check, index) => (
            <Card 
              key={index} 
              className={`bg-white border-0 shadow-sm hover:shadow-md transition-all ${check.count > 0 ? 'cursor-pointer' : ''}`}
              onClick={() => check.count > 0 && handleViewDetails(check)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorStyles[check.color]} flex items-center justify-center`}>
                    <check.icon className="w-6 h-6 text-white" />
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`
                      ${check.count === 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                        check.color === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-rose-100 text-rose-700 border-rose-200'}
                    `}
                  >
                    {check.count}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-3">{check.title}</CardTitle>
              </CardHeader>
              {check.count > 0 && (
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between text-slate-600 hover:text-slate-900">
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedIssue?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {issueRecords.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No records to display</p>
            ) : (
              issueRecords.map((record) => (
                <Card key={record.id} className="p-4 bg-slate-50 border border-slate-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">ID: {record.id}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {record.created_date ? new Date(record.created_date).toLocaleDateString() : 'No date'}
                      </Badge>
                    </div>
                    {selectedIssue?.type === 'order' && (
                      <div className="text-sm">
                        <p><span className="font-medium">Type:</span> {record.order_type}</p>
                        <p><span className="font-medium">Status:</span> {record.status}</p>
                        <p><span className="font-medium">Ordered By:</span> {record.ordered_by || 'N/A'}</p>
                        <p><span className="font-medium">Patient ID:</span> {record.patient_id || '❌ Missing'}</p>
                      </div>
                    )}
                    {selectedIssue?.type === 'result' && (
                      <div className="text-sm">
                        <p><span className="font-medium">Type:</span> {record.result_type}</p>
                        <p><span className="font-medium">Status:</span> {record.status}</p>
                        <p><span className="font-medium">Order ID:</span> {record.order_id || '❌ Missing'}</p>
                        <p><span className="font-medium">Patient ID:</span> {record.patient_id || '❌ Missing'}</p>
                      </div>
                    )}
                    {selectedIssue?.type === 'prescription' && (
                      <div className="text-sm">
                        <p><span className="font-medium">Drug:</span> {record.drug_name}</p>
                        <p><span className="font-medium">Status:</span> {record.status}</p>
                        <p><span className="font-medium">Prescriber:</span> {record.prescriber_id || 'N/A'}</p>
                        <p><span className="font-medium">Patient ID:</span> {record.patient_id || '❌ Missing'}</p>
                      </div>
                    )}
                    {selectedIssue?.type === 'appointment' && (
                      <div className="text-sm">
                        <p><span className="font-medium">Type:</span> {record.type}</p>
                        <p><span className="font-medium">Status:</span> {record.status}</p>
                        <p><span className="font-medium">Provider:</span> {record.provider_id || 'N/A'}</p>
                        <p><span className="font-medium">Patient ID:</span> {record.patient_id || '❌ Missing'}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}