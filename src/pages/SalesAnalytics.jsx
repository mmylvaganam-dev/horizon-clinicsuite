import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/OrganizationProvider';
import { BarChart3, Calendar, DollarSign, User, TrendingUp, Package, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalesAnalytics() {
  const { selectedOrgId, isPlatformOwner, user } = useOrganization();
  const [selectedSale, setSelectedSale] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const queryClient = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ['pharmacySales', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return await base44.entities.PharmacySaleHeader.filter({ organization_id: selectedOrgId });
    },
    enabled: !!selectedOrgId,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.UserRole.filter({ user_id: user.id });
    },
    enabled: !!user?.id,
  });

  const isOrgAdmin = userRoles.some(r => r.role_id?.includes('ORG_ADMIN') || r.role_id?.includes('SUPER_USER'));

  const requestDeletionMutation = useMutation({
    mutationFn: async ({ saleId, reason }) => {
      const sale = sales.find(s => s.id === saleId);
      return await base44.entities.SaleDeletionRequest.create({
        organization_id: selectedOrgId,
        sale_header_id: saleId,
        sale_number: sale.sale_number,
        sale_amount: sale.total_amount,
        requested_by: user.email,
        requested_by_name: user.full_name,
        reason: reason,
        status: 'pending'
      });
    },
    onSuccess: () => {
      toast.success('✅ Deletion request submitted to organization admin');
      setSelectedSale(null);
      setDeleteReason('');
    }
  });

  // Filter sales by date
  const filteredSales = sales.filter(sale => {
    if (!dateFilter.start && !dateFilter.end) return true;
    const saleDate = new Date(sale.sale_date);
    if (dateFilter.start && saleDate < new Date(dateFilter.start)) return false;
    if (dateFilter.end && saleDate > new Date(dateFilter.end)) return false;
    return true;
  });

  // Calculate analytics
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const avgSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  
  // Group by date for trend
  const salesByDate = filteredSales.reduce((acc, sale) => {
    const date = new Date(sale.sale_date).toLocaleDateString();
    acc[date] = (acc[date] || 0) + sale.total_amount;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">💰 Sales Analytics</h1>
      </div>

      {/* Analytics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredSales.length}</p>
            <p className="text-sm text-slate-500 mt-1">Transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-slate-500 mt-1">Total earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Average Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">${avgSale.toFixed(2)}</p>
            <p className="text-sm text-slate-500 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Daily Average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              ${Object.keys(salesByDate).length > 0 ? (totalRevenue / Object.keys(salesByDate).length).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Per day</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filter by Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-slate-600 block mb-1">Start Date</label>
              <Input 
                type="date" 
                value={dateFilter.start}
                onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-600 block mb-1">End Date</label>
              <Input 
                type="date" 
                value={dateFilter.end}
                onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setDateFilter({start: '', end: ''})}
              className="self-end"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            All Sales Transactions ({filteredSales.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No sales records found</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:border-blue-400 transition-all">
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
                  </div>
                  
                  {!isOrgAdmin && !isPlatformOwner && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedSale(sale)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Request Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Sale Deletion</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="font-bold">{sale.sale_number}</p>
                            <p className="text-sm text-slate-600">Amount: ${sale.total_amount?.toFixed(2)}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Reason for deletion request</label>
                            <Textarea
                              value={deleteReason}
                              onChange={(e) => setDeleteReason(e.target.value)}
                              placeholder="Explain why this sale should be deleted..."
                              className="mt-1"
                            />
                          </div>
                          <Button
                            onClick={() => requestDeletionMutation.mutate({ saleId: sale.id, reason: deleteReason })}
                            disabled={!deleteReason || requestDeletionMutation.isPending}
                            className="w-full"
                          >
                            Submit Request
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}