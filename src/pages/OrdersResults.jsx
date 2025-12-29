import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Search, 
  Filter, 
  ClipboardList, 
  AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import LinkedRecords from '../components/shared/LinkedRecords';
import { AlertTriangle } from 'lucide-react';

const orderStatusColors = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

const resultStatusColors = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  entered: 'bg-blue-100 text-blue-700 border-blue-200',
  reviewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  signed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  released: 'bg-teal-100 text-teal-700 border-teal-200',
};

const orderTypeColors = {
  LAB: 'from-purple-500 to-purple-600',
  CARDIO: 'from-red-500 to-red-600',
  PFT: 'from-blue-500 to-blue-600',
  RADIOLOGY: 'from-indigo-500 to-indigo-600',
  MEDICATION: 'from-green-500 to-green-600',
  PROCEDURE: 'from-amber-500 to-amber-600',
  OTHER: 'from-slate-500 to-slate-600',
};

export default function OrdersResults() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [expandedResult, setExpandedResult] = useState(null);

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-ordered_at'),
  });

  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Result.list('-result_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: resultFlags = [] } = useQuery({
    queryKey: ['resultFlags'],
    queryFn: () => base44.entities.ResultFlag.list(),
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['releases'],
    queryFn: () => base44.entities.ReleaseToPatient.list(),
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const getResultFlags = (resultId) => {
    return resultFlags.filter(f => f.result_id === resultId);
  };

  const isResultReleased = (resultId) => {
    const release = releases.find(r => r.result_id === resultId);
    return release?.released || false;
  };

  const filterByDate = (dateString) => {
    if (dateFilter === 'all') return true;
    const date = new Date(dateString);
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (dateFilter === 'today') return daysDiff === 0;
    if (dateFilter === 'week') return daysDiff <= 7;
    if (dateFilter === 'month') return daysDiff <= 30;
    return true;
  };

  const filteredOrders = orders.filter(order => {
    const patientName = getPatientName(order.patient_id).toLowerCase();
    const matchesSearch = 
      patientName.includes(searchTerm.toLowerCase()) ||
      order.ordered_by?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesDate = filterByDate(order.ordered_at || order.created_date);
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const filteredResults = results.filter(result => {
    const patientName = getPatientName(result.patient_id).toLowerCase();
    const matchesSearch = patientName.includes(searchTerm.toLowerCase());
    const matchesType = orderTypeFilter === 'all' || result.result_type === orderTypeFilter;
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    const matchesDate = filterByDate(result.result_date || result.created_date);
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Orders & Results</h1>
        <p className="text-slate-500 mt-1">Unified clinical order and results management</p>
      </div>

      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by patient name or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="LAB">Lab</SelectItem>
                <SelectItem value="CARDIO">Cardio</SelectItem>
                <SelectItem value="PFT">PFT</SelectItem>
                <SelectItem value="RADIOLOGY">Radiology</SelectItem>
                <SelectItem value="MEDICATION">Medication</SelectItem>
                <SelectItem value="PROCEDURE">Procedure</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="entered">Entered</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="released">Released</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <ClipboardList className="w-4 h-4 mr-2" />
            Orders ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="results">
            <FileText className="w-4 h-4 mr-2" />
            Results ({filteredResults.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          {loadingOrders ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : filteredOrders.length === 0 ? (
            <Card className="p-12 text-center bg-white border-0 shadow-sm">
              <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No orders found</h3>
              <p className="text-slate-500 mt-1">Try adjusting your filters</p>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id}>
                <Card 
                  className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${orderTypeColors[order.order_type]} flex items-center justify-center flex-shrink-0`}>
                      <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={`${orderStatusColors[order.status]} border`}>
                              {order.status}
                            </Badge>
                            <Badge variant="outline">{order.order_type}</Badge>
                            {order.priority !== 'routine' && (
                              <Badge variant="outline" className="bg-rose-100 text-rose-700">
                                {order.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-slate-900">{getPatientName(order.patient_id)}</p>
                          <p className="text-sm text-slate-500">
                            Ordered by: {order.ordered_by} • {format(new Date(order.ordered_at || order.created_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                {expandedOrder === order.id && (
                  <div className="ml-16 mt-2">
                    <LinkedRecords recordType="Order" recordId={order.id} />
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-3">
          {loadingResults ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : filteredResults.length === 0 ? (
            <Card className="p-12 text-center bg-white border-0 shadow-sm">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No results found</h3>
              <p className="text-slate-500 mt-1">Try adjusting your filters</p>
            </Card>
          ) : (
            filteredResults.map((result) => {
              const flags = getResultFlags(result.id);
              const released = isResultReleased(result.id);
              
              return (
                <div key={result.id}>
                  <Card 
                    className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                  >
                    {!released && result.status === 'Signed' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-900">Unreleased - Not visible to patient</span>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${orderTypeColors[result.result_type]} flex items-center justify-center flex-shrink-0`}>
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={`${resultStatusColors[result.status]} border`}>
                            {result.status}
                          </Badge>
                          <Badge variant="outline">{result.result_type}</Badge>
                          {!released && result.status === 'Signed' && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                              Unreleased
                            </Badge>
                          )}
                          {flags.map((flag) => (
                            <Badge key={flag.id} variant="outline" className="bg-rose-100 text-rose-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {flag.flag_type}
                            </Badge>
                          ))}
                        </div>
                        <p className="font-medium text-slate-900">{getPatientName(result.patient_id)}</p>
                        <p className="text-sm text-slate-500">
                          {result.result_date && format(new Date(result.result_date), 'MMM d, yyyy h:mm a')}
                        </p>
                        {result.narrative_text && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{result.narrative_text}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                  {expandedResult === result.id && (
                    <div className="ml-16 mt-2">
                      <LinkedRecords recordType="Result" recordId={result.id} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>


    </div>
  );
}