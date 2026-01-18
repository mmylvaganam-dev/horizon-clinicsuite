import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  FileText,
  Download,
  Calendar,
  User,
  Package,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import PageInfoTooltip from '@/components/shared/PageInfoTooltip';

export default function PharmacyBillCardReports() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Mock bill card data
  const billCards = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bill Card Reports</h1>
            <p className="text-slate-500 mt-1">Track medicine inventory movements and balance</p>
          </div>
          <PageInfoTooltip
            title="Bill Card Reports"
            description="A bill card (or stock card) tracks the complete history of inventory movement for each medicine - showing when stock came in (purchases, returns), when it went out (sales, transfers), and the running balance."
            useCases={[
              'Track stock movement history for individual medicines',
              'Verify current balance by reviewing all IN/OUT transactions',
              'Audit inventory discrepancies by checking transaction history',
              'Generate reports for specific date ranges',
              'Monitor medicine consumption patterns over time'
            ]}
            bestPractices={[
              'Select specific medicine and date range for focused reports',
              'Run daily reports to catch discrepancies early',
              'Use bill cards to reconcile physical stock counts',
              'Export reports for audits and record keeping',
              'Review high-value medicine cards regularly'
            ]}
          />
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Organization Info */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-indigo-900">Anantham Holistic Care (Pvt) Ltd</h2>
            <p className="text-lg font-semibold text-indigo-700 mt-2">Bill Card</p>
            <p className="text-sm text-indigo-600 mt-1">
              01 January, 2025 - 31 January, 2026
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Search Medicine or Receipt</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button>
              Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Message */}
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="p-4 text-center">
          <p className="text-rose-700 font-medium">
            Please select medicine and correct date to search the card and check balance.
          </p>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b bg-slate-50 px-6 py-3">
            <div className="grid grid-cols-9 gap-4 text-sm font-semibold text-slate-700">
              <div className="col-span-1">DATE</div>
              <div className="col-span-1">ORDER NO</div>
              <div className="col-span-1">INITIATED BY</div>
              <div className="col-span-1">ORDER TYPE</div>
              <div className="col-span-2">MEDICINES FROM</div>
              <div className="col-span-1">QUANTITY IN</div>
              <div className="col-span-1">QUANTITY OUT</div>
              <div className="col-span-1">BALANCE</div>
            </div>
          </div>

          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-xl font-medium text-slate-900 mb-2">No Rows To Show</p>
            <p className="text-slate-500">Select criteria above and run report to view bill card details</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Quantity In</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <TrendingDown className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Quantity Out</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <Package className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Current Balance</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}