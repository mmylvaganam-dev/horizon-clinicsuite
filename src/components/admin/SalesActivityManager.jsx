import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, TestTube, Calendar, DollarSign, User, Package, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalesActivityManager({ organizationId, isPlatformOwner, clearDataMutation, generateTestSaleMutation }) {
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  // Fetch sales data - ALWAYS fetch to show counts
  const { data: pharmacySales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['pharmacySales', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const sales = await base44.entities.PharmacySaleHeader.filter({ organization_id: organizationId });
      console.log('📊 Sales loaded:', sales.length, 'records');
      return sales;
    },
    enabled: !!organizationId,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await base44.entities.InvoiceHeader.filter({ organization_id: organizationId });
    },
    enabled: !!organizationId,
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId) => {
      // Delete sale lines first
      const lines = await base44.entities.PharmacySaleLine.filter({ sale_header_id: saleId });
      for (const line of lines) {
        await base44.entities.PharmacySaleLine.delete(line.id);
      }
      
      // Delete receipts
      const receipts = await base44.entities.PharmacyReceipt.filter({ sale_id: saleId });
      for (const receipt of receipts) {
        await base44.entities.PharmacyReceipt.delete(receipt.id);
      }
      
      // Delete sale header
      await base44.entities.PharmacySaleHeader.delete(saleId);
      
      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pharmacySales']);
      queryClient.invalidateQueries(['auditLogs']);
      toast.success('✅ Sale deleted successfully');
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  if (!organizationId) {
    return (
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
        <p className="text-yellow-900 font-bold">⚠️ Please select an organization first</p>
      </div>
    );
  }

  const totalSales = pharmacySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
        <p className="text-blue-900 font-bold">📊 Sales Summary</p>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-slate-600">Total Sales</p>
            <p className="text-2xl font-bold text-slate-900">{pharmacySales.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-slate-600">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-900">${totalSales.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => setShowDetails(!showDetails)}
          variant="outline"
          className="flex-1"
        >
          {showDetails ? '🔼 Hide Sales List' : '🔽 Show All Sales'}
        </Button>
      </div>

      {showDetails && (
        <div className="space-y-4">
          {loadingSales || loadingInvoices ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <p className="text-slate-600 mt-2">Loading sales...</p>
            </div>
          ) : (
            <Card className="border-2 border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  All Sales ({pharmacySales.length})
                </h3>
                {pharmacySales.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No sales records found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pharmacySales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{sale.sale_number}</p>
                          <div className="flex gap-4 text-sm text-slate-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(sale.sale_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${sale.total_amount?.toFixed(2)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {sale.created_by_user}
                            </span>
                          </div>
                          {sale.notes && (
                            <p className="text-xs text-slate-500 mt-1">{sale.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete sale ${sale.sale_number}?`)) {
                              deleteSaleMutation.mutate(sale.id);
                            }
                          }}
                          disabled={deleteSaleMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isPlatformOwner && (
        <div className="pt-4 border-t-2">
          <button
            onClick={() => generateTestSaleMutation.mutate()}
            disabled={generateTestSaleMutation.isPending}
            className="w-full p-6 rounded-xl border-4 border-green-400 bg-white hover:bg-green-50 transition-all disabled:opacity-50"
          >
            <TestTube className="w-12 h-12 text-green-600 mb-3 mx-auto" />
            <p className="font-bold text-xl text-green-900">Generate Test Sale</p>
            <p className="text-sm text-green-700 mt-2">Create a sample pharmacy sale</p>
            {generateTestSaleMutation.isPending && <p className="text-sm text-green-600 mt-2 font-bold">🔄 Generating...</p>}
          </button>
        </div>
      )}
    </div>
  );
}