import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestTube, Barcode, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatSL } from '@/components/utils/dateUtils';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';

export default function LISOrders() {
  const queryClient = useQueryClient();
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const [accessionDialogOpen, setAccessionDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['labOrders', selectedOrgId],
    queryFn: () => base44.entities.Order.filter({ order_type: 'lab', ...orgFilter }),
    enabled: !!selectedOrgId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter(orgFilter),
    enabled: !!selectedOrgId,
  });

  const accessionMutation = useMutation({
    mutationFn: async (data) => {
      const specimen = await base44.entities.Specimen.create({
        ...data,
        collection_date: new Date().toISOString(),
        status: 'received',
        received_date: new Date().toISOString(),
        received_by: currentUser.id,
      });

      await base44.entities.Order.update(selectedOrder.id, { status: 'In Progress' });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        organization_id: data.organization_id,
        location_id: data.location_id,
        patient_id: data.patient_ref,
        module: 'LIS',
        action: 'accession',
        record_type: 'Specimen',
        record_id: specimen.id,
        metadata: { order_id: selectedOrder.id, specimen_id: data.specimen_id }
      });

      return specimen;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      queryClient.invalidateQueries({ queryKey: ['specimens'] });
      setAccessionDialogOpen(false);
      setSelectedOrder(null);
      toast.success('Specimen accessioned');
    },
  });

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    const patient = patients.find(p => p.id === o.patient_id);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';
    return patientName.includes(searchTerm.toLowerCase()) || 
           o.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Orders & Accessioning</h1>
        <p className="text-slate-500 mt-1">Lab order management and specimen accession</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Lab Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by patient name or order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No lab orders found</p>
            ) : (
              filteredOrders.map(order => {
                const patient = patients.find(p => p.id === order.patient_id);
                return (
                  <div key={order.id} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-slate-900">
                            {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                          </p>
                          <Badge variant="outline">
                            Order #{order.order_number || order.id.slice(0, 8)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          {order.test_name || 'Lab Tests'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Ordered: {format(new Date(order.order_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={order.status === 'Pending' ? 'secondary' : 'default'}>
                          {order.status}
                        </Badge>
                        {order.status === 'Pending' && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setAccessionDialogOpen(true);
                            }}
                          >
                            <Barcode className="w-4 h-4 mr-2" />
                            Accession
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={accessionDialogOpen} onOpenChange={setAccessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accession Specimen</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              accessionMutation.mutate({
                organization_id: selectedOrder.organization_id,
                location_id: selectedOrder.location_id,
                patient_ref: selectedOrder.patient_id,
                order_id: selectedOrder.id,
                specimen_id: formData.get('specimen_id'),
                accession_number: formData.get('accession_number'),
                specimen_type: formData.get('specimen_type'),
                priority: selectedOrder.priority || 'routine',
                volume: formData.get('volume'),
                container_type: formData.get('container_type'),
              });
            }} className="space-y-4">
              <div>
                <Label>Specimen ID / Barcode *</Label>
                <Input name="specimen_id" required placeholder="Scan or enter specimen barcode" />
              </div>
              <div>
                <Label>Accession Number *</Label>
                <Input name="accession_number" required placeholder="e.g., 2024-001234" />
              </div>
              <div>
                <Label>Specimen Type *</Label>
                <Select name="specimen_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specimen type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood">Blood</SelectItem>
                    <SelectItem value="urine">Urine</SelectItem>
                    <SelectItem value="stool">Stool</SelectItem>
                    <SelectItem value="csf">CSF</SelectItem>
                    <SelectItem value="tissue">Tissue</SelectItem>
                    <SelectItem value="swab">Swab</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Volume</Label>
                <Input name="volume" placeholder="e.g., 5 mL" />
              </div>
              <div>
                <Label>Container Type</Label>
                <Input name="container_type" placeholder="e.g., Red top, EDTA" />
              </div>
              <Button type="submit" className="w-full">Accession Specimen</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}