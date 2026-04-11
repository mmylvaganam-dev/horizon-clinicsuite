import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, CheckCircle2, AlertCircle, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import InstitutionAuthGate from '@/components/institutions/InstitutionAuthGate';
import CreditSaleInvoiceButton from '@/components/credit/CreditSaleInvoiceButton';

export default function InstitutionPaymentPortal() {
  const [selectedSale, setSelectedSale] = useState(null);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get institution for current user
  const { data: institution, isLoading: loadingInstitution } = useQuery({
    queryKey: ['currentInstitution'],
    queryFn: async () => {
      const result = await base44.functions.invoke('getInstitutionForUser');
      return result.data.institution;
    },
  });

  // Fetch outstanding credit sales
  const { data: creditSales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['institutionCreditSales', institution?.id],
    queryFn: async () => {
      if (!institution?.id) return [];
      const sales = await base44.entities.CreditSale.filter({
        institution_id: institution.id,
        payment_status: { $ne: 'paid' }
      });
      return sales.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
    },
    enabled: !!institution?.id,
  });

  // Mark sale as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (saleId) => {
      await base44.entities.CreditSale.update(saleId, { payment_status: 'paid' });
    },
    onSuccess: () => {
      toast({ description: 'Sale marked as paid successfully' });
      queryClient.invalidateQueries({ queryKey: ['institutionCreditSales'] });
      setShowMarkPaidDialog(false);
      setSelectedSale(null);
    },
    onError: (error) => {
      toast({ description: `Error: ${error.message}`, variant: 'destructive' });
    },
  });

  const totalOutstanding = creditSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const highRiskCount = creditSales.filter(sale => sale.risk_status === 'high_risk').length;

  const isLoading = loadingInstitution || loadingSales;

  return (
    <InstitutionAuthGate authorized={!!institution}>
      <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Portal</h1>
            <p className="text-slate-600">View your outstanding payments and manage your account balance</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="text-3xl font-bold text-slate-900">
                    Rs. {totalOutstanding.toFixed(2)}
                  </div>
                  <DollarSign className="w-6 h-6 text-teal-600 mb-1" />
                </div>
                <p className="text-xs text-slate-500 mt-2">{creditSales.length} invoice(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Credit Limit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="text-3xl font-bold text-slate-900">
                    Rs. {institution?.credit_limit || 0}
                  </div>
                  <Building2 className="w-6 h-6 text-blue-600 mb-1" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {((totalOutstanding / (institution?.credit_limit || 1)) * 100).toFixed(0)}% utilized
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Risk Status</CardTitle>
              </CardHeader>
              <CardContent>
                {highRiskCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
                      <p className="text-xs text-slate-500 mt-1">High-risk order(s)</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-600">Good</div>
                      <p className="text-xs text-slate-500 mt-1">All orders normal</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full" />
                </div>
              ) : creditSales.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-900">No Outstanding Payments</p>
                  <p className="text-slate-600 mt-1">All your invoices are paid up to date!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">PO Number</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Amount</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Risk</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Status</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Invoice</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {creditSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-slate-900">{sale.po_number || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            Rs. {sale.total_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {sale.risk_status === 'high_risk' ? (
                              <Badge className="bg-red-100 text-red-700 border-red-300 mx-auto">
                                High Risk
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 border-green-300 mx-auto">
                                Normal
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {sale.payment_status === 'outstanding' ? (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 mx-auto">
                                Outstanding
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300 mx-auto">
                                {sale.payment_status}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <CreditSaleInvoiceButton creditSale={sale} variant="outline" />
                          </td>
                          <td className="py-3 px-4 text-right">
                            {sale.payment_status === 'outstanding' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSale(sale);
                                  setShowMarkPaidDialog(true);
                                }}
                              >
                                Pay Now
                              </Button>
                            ) : (
                              <span className="text-sm text-slate-500">Paid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                How to Pay
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-900 text-sm space-y-3">
              <p>
                <strong>1. Initiate Transfer:</strong> Use your bank's online platform to transfer the invoice amount to our account.
              </p>
              <p>
                <strong>2. Reference PO Number:</strong> Include the PO number in the transfer reference/memo for quick reconciliation.
              </p>
              <p>
                <strong>3. Mark as Paid:</strong> Once the transfer is initiated, click "Pay Now" and confirm. This marks the invoice as paid in our system.
              </p>
              <p className="text-xs text-blue-800 border-t border-blue-200 pt-3 mt-3">
                For bank account details and payment instructions, please contact our accounts team.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment Initiated</DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">PO Number:</span>
                    <span className="font-mono font-semibold">{selectedSale.po_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date:</span>
                    <span className="font-semibold">{format(new Date(selectedSale.sale_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-slate-600 font-semibold">Amount Due:</span>
                    <span className="text-lg font-bold text-teal-600">Rs. {selectedSale.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                <p className="font-semibold mb-1">Before marking as paid:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Ensure you've initiated a bank transfer for the full amount</li>
                  <li>Include the PO number in the transfer reference</li>
                  <li>Allow 1-2 business days for the transfer to clear</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowMarkPaidDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={() => markAsPaidMutation.mutate(selectedSale.id)}
                  disabled={markAsPaidMutation.isPending}
                >
                  {markAsPaidMutation.isPending ? 'Processing...' : 'Confirm Paid'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </InstitutionAuthGate>
  );
}