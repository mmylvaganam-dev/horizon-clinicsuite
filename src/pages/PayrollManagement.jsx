import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Calendar, Plus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PayrollManagement() {
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    method: 'transfer',
    cheque_number: '',
    reference: '',
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['payrollPeriods'],
    queryFn: () => base44.entities.PayrollPeriod.list('-created_date'),
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['payrollLines'],
    queryFn: () => base44.entities.PayrollLine.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payrollPayments'],
    queryFn: () => base44.entities.PayrollPayment.list('-paid_at'),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await base44.entities.PayrollPayment.create({
        organization_id: user.organization_id || '',
        payroll_period_ref: data.period_ref,
        staff_ref: data.staff_ref,
        paid_at: new Date().toISOString(),
        amount: data.amount,
        method: data.method,
        cheque_number: data.cheque_number || '',
        reference: data.reference || '',
        paid_by: user.id,
        paid_by_email: user.email,
        notes: data.notes || ''
      });

      await base44.entities.PayrollLine.update(data.line_id, {
        status: 'paid'
      });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'PAYROLL',
        action: 'process_payment',
        record_type: 'PayrollPayment',
        record_id: payment.id,
        metadata: { 
          amount: data.amount, 
          method: data.method, 
          cheque_number: data.cheque_number 
        }
      });

      return payment;
    },
    onSuccess: () => {
      toast.success('Payment processed');
      queryClient.invalidateQueries(['payrollPayments']);
      queryClient.invalidateQueries(['payrollLines']);
      setShowPayment(false);
      setSelectedPayment(null);
      setPaymentForm({ method: 'transfer', cheque_number: '', reference: '', notes: '' });
    },
  });

  const handleProcessPayment = () => {
    if (!selectedPayment) return;
    if (paymentForm.method === 'cheque' && !paymentForm.cheque_number) {
      toast.error('Cheque number required for cheque payments');
      return;
    }

    createPaymentMutation.mutate({
      period_ref: selectedPayment.payroll_period_ref,
      staff_ref: selectedPayment.staff_ref,
      line_id: selectedPayment.id,
      amount: selectedPayment.net_pay,
      ...paymentForm
    });
  };

  const getStaffName = (staffRef) => {
    const member = staff.find(s => s.id === staffRef);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const pendingLines = lines.filter(l => l.status === 'pending');
  const paidLines = lines.filter(l => l.status === 'paid');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payroll Management</h1>
        <p className="text-slate-500 mt-1">Process staff payments and track payroll</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Periods</p>
                <p className="text-2xl font-bold">{periods.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold">{pendingLines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Paid</p>
                <p className="text-2xl font-bold">{paidLines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Payments ({pendingLines.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paidLines.length})</TabsTrigger>
          <TabsTrigger value="periods">Periods ({periods.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          <Card>
            <CardContent className="pt-6">
              {pendingLines.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No pending payments</p>
              ) : (
                <div className="space-y-2">
                  {pendingLines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{getStaffName(line.staff_ref)}</p>
                        <p className="text-sm text-slate-500">
                          {line.pay_type_snapshot} • {line.units} units @ ${line.rate}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">${line.net_pay.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">Net Pay</p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(line);
                            setShowPayment(true);
                          }}
                        >
                          Process
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid" className="space-y-3">
          <Card>
            <CardContent className="pt-6">
              {payments.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No payments processed</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 20).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{getStaffName(payment.staff_ref)}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(payment.paid_at), 'MMM d, yyyy HH:mm')} • {payment.method}
                          {payment.cheque_number && ` • Cheque #${payment.cheque_number}`}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">${payment.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="space-y-3">
          <Card>
            <CardContent className="pt-6">
              {periods.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No payroll periods</p>
              ) : (
                <div className="space-y-2">
                  {periods.map((period) => (
                    <div key={period.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">
                          {format(new Date(period.period_start), 'MMM d')} - {format(new Date(period.period_end), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-slate-500">
                          Pay Date: {format(new Date(period.pay_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className={
                        period.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        period.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {period.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold text-lg">{getStaffName(selectedPayment.staff_ref)}</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  ${selectedPayment.net_pay.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method *</label>
                <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({...paymentForm, method: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentForm.method === 'cheque' && (
                <div>
                  <label className="text-sm font-medium">Cheque Number *</label>
                  <Input
                    placeholder="Enter cheque number"
                    value={paymentForm.cheque_number}
                    onChange={(e) => setPaymentForm({...paymentForm, cheque_number: e.target.value})}
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Reference</label>
                <Input
                  placeholder="Payment reference"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Additional notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
                <Button onClick={handleProcessPayment} disabled={createPaymentMutation.isPending}>
                  Process Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}