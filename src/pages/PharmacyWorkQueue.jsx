import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bell, 
  CheckCircle2,
  Clock,
  User,
  FileText,
  Package,
  Search,
  AlertCircle,
  ArrowRight,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { createPageUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';

export default function PharmacyWorkQueue() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => base44.entities.Prescription.list('-prescribed_date'),
  });

  // Incoming deliveries sent to THIS pharmacy org
  const deliveryQueue = prescriptions.filter(p =>
    p.delivery_requested &&
    p.target_pharmacy_org_id === selectedOrgId &&
    (p.delivery_status === 'pending' || p.delivery_status === 'received' || p.delivery_status === 'preparing')
  );

  const updateDeliveryStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Prescription.update(id, { delivery_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['prescriptions']);
      toast.success('Status updated');
    }
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return await base44.entities.PharmacyStock.filter(orgFilter);
    },
    enabled: !!selectedOrgId,
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Prescription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prescriptions']);
      toast.success('Prescription updated');
    }
  });

  // Filter prescriptions
  const newPrescriptions = prescriptions.filter(p => p.status === 'New');
  const verifiedPrescriptions = prescriptions.filter(p => p.status === 'Verified');
  const dispensedPrescriptions = prescriptions.filter(p => p.status === 'Dispensed');

  const filteredNew = newPrescriptions.filter(p => {
    const patient = patients.find(pat => pat.id === p.patient_id);
    const search = searchQuery.toLowerCase();
    return search === '' ||
      p.drug_name.toLowerCase().includes(search) ||
      (patient && `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(search)) ||
      patient?.patient_id?.toLowerCase().includes(search);
  });

  const getPatient = (patientId) => patients.find(p => p.id === patientId);

  const handleVerify = (prescription) => {
    updatePrescriptionMutation.mutate({
      id: prescription.id,
      data: { status: 'Verified' }
    });
  };

  const handlePrepareForBilling = (prescription) => {
    const patient = getPatient(prescription.patient_id);
    if (!patient) {
      toast.error('Patient not found');
      return;
    }

    // Navigate to billing with prescription data
    navigate(createPageUrl('PharmacyBilling'), {
      state: {
        prescription: prescription,
        patient: patient
      }
    });
  };

  const statusColors = {
    New: 'bg-amber-100 text-amber-700 border-amber-300',
    Verified: 'bg-blue-100 text-blue-700 border-blue-300',
    Dispensed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Cancelled: 'bg-rose-100 text-rose-700 border-rose-300'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Work Queue</h1>
          <p className="text-slate-500 mt-1">Review and verify doctor prescriptions before dispensing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-900">{newPrescriptions.length} New</span>
          </div>
        </div>
      </div>

      {/* What is Pharmacy Work Queue - Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">What is This?</h3>
              <p className="text-sm text-blue-800">The Pharmacy Work Queue is where all new prescriptions from doctors arrive. You review each prescription to verify it's correct, safe, and ready to dispense to patients.</p>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Why It's Important</h3>
              <p className="text-sm text-blue-800">This verification step ensures patient safety by catching any errors or potential issues before medications are dispensed. Every prescription must be verified before a patient can receive their medicine.</p>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Your Workflow</h3>
              <p className="text-sm text-blue-800"><strong>1. Review</strong> new prescriptions • <strong>2. Verify</strong> they're correct • <strong>3. Send to POS</strong> for billing and dispensing</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{newPrescriptions.length}</p>
                <p className="text-sm text-slate-600">Awaiting Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{verifiedPrescriptions.length}</p>
                <p className="text-sm text-slate-600">Ready to Dispense</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{dispensedPrescriptions.length}</p>
                <p className="text-sm text-slate-600">Dispensed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pharmacyStock.length}</p>
                <p className="text-sm text-slate-600">Items in Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by patient name, ID, or drug name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Incoming Delivery Queue Banner */}
      {deliveryQueue.length > 0 && (
        <Card className="border-teal-300 bg-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-teal-900">Incoming Delivery Requests ({deliveryQueue.length})</h3>
            </div>
            <div className="space-y-2">
              {deliveryQueue.map(rx => {
                const patient = getPatient(rx.patient_id);
                const statusColors2 = {
                  pending: 'bg-amber-100 text-amber-700',
                  received: 'bg-blue-100 text-blue-700',
                  preparing: 'bg-purple-100 text-purple-700',
                };
                const next = { pending: 'received', received: 'preparing', preparing: 'ready' };
                const nextLabel = { pending: 'Mark Received', received: 'Mark Preparing', preparing: 'Mark Ready' };
                return (
                  <div key={rx.id} className="bg-white rounded-lg border border-teal-200 p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{rx.drug_name} {rx.strength} × {rx.quantity}</p>
                      <p className="text-xs text-slate-500">
                        Patient: {patient ? `${patient.first_name} ${patient.last_name}` : rx.patient_id}
                        {rx.delivery_sent_at && ` · Sent: ${format(new Date(rx.delivery_sent_at), 'MMM d, h:mm a')}`}
                      </p>
                    </div>
                    <Badge className={`${statusColors2[rx.delivery_status] || 'bg-slate-100 text-slate-600'} border-0 text-xs`}>
                      {rx.delivery_status}
                    </Badge>
                    {next[rx.delivery_status] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDeliveryStatus.mutate({ id: rx.id, status: next[rx.delivery_status] })}
                      >
                        {nextLabel[rx.delivery_status]}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prescription Lists */}
      <Tabs defaultValue="new" className="space-y-6">
        <TabsList>
          <TabsTrigger value="new" className="relative">
            New Prescriptions
            {newPrescriptions.length > 0 && (
              <Badge className="ml-2 bg-amber-600">{newPrescriptions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verified">
            Ready to Dispense
            {verifiedPrescriptions.length > 0 && (
              <Badge className="ml-2 bg-blue-600">{verifiedPrescriptions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dispensed">Dispensed</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          {filteredNew.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No new prescriptions</p>
              </CardContent>
            </Card>
          ) : (
            filteredNew.map((prescription) => {
              const patient = getPatient(prescription.patient_id);
              return (
                <Card key={prescription.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={statusColors[prescription.status]}>{prescription.status}</Badge>
                          <span className="text-sm text-slate-500">
                            {format(new Date(prescription.prescribed_date), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-semibold text-slate-900">
                                {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                              </span>
                            </div>
                            {patient && (
                              <p className="text-sm text-slate-600 ml-6">ID: {patient.patient_id}</p>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span className="font-semibold text-slate-900">{prescription.drug_name}</span>
                            </div>
                            <p className="text-sm text-slate-600 ml-6">
                              {prescription.strength} - {prescription.dosage_form}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded p-3 mb-3">
                          <p className="text-sm text-slate-700">
                            <strong>Directions:</strong> {prescription.directions}
                          </p>
                          <p className="text-sm text-slate-700 mt-1">
                            <strong>Quantity:</strong> {prescription.quantity}
                          </p>
                        </div>

                        {prescription.notes && (
                          <p className="text-sm text-slate-600 italic">Note: {prescription.notes}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <div>
                          <Button
                            onClick={() => handleVerify(prescription)}
                            className="bg-blue-600 hover:bg-blue-700 w-full"
                            title="Confirm this prescription is correct and ready to dispense"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Verify
                          </Button>
                          <p className="text-xs text-slate-500 mt-1 text-center">Check & approve</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPrescription(prescription);
                            setShowDetailsDialog(true);
                          }}
                          title="View full prescription details"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          {verifiedPrescriptions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No verified prescriptions</p>
              </CardContent>
            </Card>
          ) : (
            verifiedPrescriptions.map((prescription) => {
              const patient = getPatient(prescription.patient_id);
              return (
                <Card key={prescription.id} className="hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={statusColors[prescription.status]}>{prescription.status}</Badge>
                          <span className="text-sm text-slate-500">
                            {format(new Date(prescription.prescribed_date), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-semibold text-slate-900">
                                {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span className="font-semibold text-slate-900">{prescription.drug_name}</span>
                            </div>
                            <p className="text-sm text-slate-600 ml-6">Qty: {prescription.quantity}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Button
                          onClick={() => handlePrepareForBilling(prescription)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          title="Send to Point of Sale for billing and dispensing"
                        >
                          Proceed to POS
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <p className="text-xs text-slate-500 mt-1 text-center">Bill & dispense</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="dispensed" className="space-y-4">
          {dispensedPrescriptions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No dispensed prescriptions today</p>
              </CardContent>
            </Card>
          ) : (
            dispensedPrescriptions.map((prescription) => {
              const patient = getPatient(prescription.patient_id);
              return (
                <Card key={prescription.id} className="opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={statusColors[prescription.status]}>{prescription.status}</Badge>
                          <span className="text-sm text-slate-500">
                            {format(new Date(prescription.prescribed_date), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-900">
                              {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{prescription.drug_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          
          {selectedPrescription && (
            <div className="space-y-4">
              {(() => {
                const patient = getPatient(selectedPrescription.patient_id);
                return (
                  <>
                    <div className="bg-slate-50 rounded p-4">
                      <h3 className="font-semibold mb-2">Patient Information</h3>
                      <p><strong>Name:</strong> {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}</p>
                      {patient && <p><strong>ID:</strong> {patient.patient_id}</p>}
                      {patient && <p><strong>Contact:</strong> {patient.mobile}</p>}
                    </div>

                    <div className="bg-slate-50 rounded p-4">
                      <h3 className="font-semibold mb-2">Medication</h3>
                      <p><strong>Drug:</strong> {selectedPrescription.drug_name}</p>
                      <p><strong>Strength:</strong> {selectedPrescription.strength}</p>
                      <p><strong>Form:</strong> {selectedPrescription.dosage_form}</p>
                      <p><strong>Quantity:</strong> {selectedPrescription.quantity}</p>
                    </div>

                    <div className="bg-slate-50 rounded p-4">
                      <h3 className="font-semibold mb-2">Instructions</h3>
                      <p>{selectedPrescription.directions}</p>
                    </div>

                    {selectedPrescription.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-4">
                        <h3 className="font-semibold mb-2 text-amber-900">Notes</h3>
                        <p className="text-amber-800">{selectedPrescription.notes}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}