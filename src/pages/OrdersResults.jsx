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
  CheckCircle2, 
  AlertTriangle,
  FileCheck,
  Share2,
  Eye
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionNote, setActionNote] = useState('');

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

  const { data: signOffs = [] } = useQuery({
    queryKey: ['signOffs'],
    queryFn: () => base44.entities.SignOff.list(),
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['releases'],
    queryFn: () => base44.entities.ReleaseToPatient.list(),
  });

  const { data: resultFlags = [] } = useQuery({
    queryKey: ['resultFlags'],
    queryFn: () => base44.entities.ResultFlag.list(),
  });

  const updateResultStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Result.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });

  const signResultMutation = useMutation({
    mutationFn: async ({ resultId, comments }) => {
      const user = await base44.auth.me();
      await base44.entities.SignOff.create({
        result_id: resultId,
        signed_by: user.id,
        signed_by_email: user.email,
        signed_at: new Date().toISOString(),
        comments
      });
      await base44.entities.Result.update(resultId, { status: 'signed' });
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: selectedResult?.organization_id || '',
        location_id: selectedResult?.location_id || '',
        patient_id: selectedResult?.patient_id,
        module: 'RESULTS',
        action: 'sign',
        record_type: 'Result',
        record_id: resultId,
        metadata: { comments }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', 'signOffs', 'auditLogs'] });
      setActionDialog(null);
      setActionNote('');
    },
  });

  const releaseResultMutation = useMutation({
    mutationFn: async ({ resultId, note }) => {
      const user = await base44.auth.me();
      const existing = releases.find(r => r.result_id === resultId);
      if (existing) {
        await base44.entities.ReleaseToPatient.update(existing.id, {
          released: true,
          released_by: user.id,
          released_by_email: user.email,
          released_at: new Date().toISOString(),
          release_note: note,
          portal_visible_from: new Date().toISOString()
        });
      } else {
        await base44.entities.ReleaseToPatient.create({
          result_id: resultId,
          released: true,
          released_by: user.id,
          released_by_email: user.email,
          released_at: new Date().toISOString(),
          release_note: note,
          portal_visible_from: new Date().toISOString()
        });
      }
      await base44.entities.Result.update(resultId, { status: 'released' });
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: selectedResult?.organization_id || '',
        location_id: selectedResult?.location_id || '',
        patient_id: selectedResult?.patient_id,
        module: 'RESULTS',
        action: 'release',
        record_type: 'Result',
        record_id: resultId,
        metadata: { note }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', 'releases', 'auditLogs'] });
      setActionDialog(null);
      setActionNote('');
    },
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';
  };

  const isResultSigned = (resultId) => {
    return signOffs.some(s => s.result_id === resultId);
  };

  const isResultReleased = (resultId) => {
    const release = releases.find(r => r.result_id === resultId);
    return release?.released || false;
  };

  const getResultFlags = (resultId) => {
    return resultFlags.filter(f => f.result_id === resultId);
  };

  const handleSignResult = () => {
    if (selectedResult) {
      signResultMutation.mutate({ resultId: selectedResult.id, comments: actionNote });
    }
  };

  const handleReleaseResult = () => {
    if (selectedResult) {
      releaseResultMutation.mutate({ resultId: selectedResult.id, note: actionNote });
    }
  };

  const filteredOrders = orders.filter(order => {
    const patientName = getPatientName(order.patient_id).toLowerCase();
    const matchesSearch = 
      patientName.includes(searchTerm.toLowerCase()) ||
      order.ordered_by?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredResults = results.filter(result => {
    const patientName = getPatientName(result.patient_id).toLowerCase();
    const matchesSearch = patientName.includes(searchTerm.toLowerCase());
    const matchesType = orderTypeFilter === 'all' || result.result_type === orderTypeFilter;
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
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
              <Card key={order.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all">
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
              const isSigned = isResultSigned(result.id);
              const isReleased = isResultReleased(result.id);
              
              return (
                <Card key={result.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${orderTypeColors[result.result_type]} flex items-center justify-center flex-shrink-0`}>
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={`${resultStatusColors[result.status]} border`}>
                              {result.status}
                            </Badge>
                            <Badge variant="outline">{result.result_type}</Badge>
                            {flags.map((flag) => (
                              <Badge key={flag.id} variant="outline" className="bg-rose-100 text-rose-700 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {flag.flag_type}
                              </Badge>
                            ))}
                            {isSigned && (
                              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                <FileCheck className="w-3 h-3" />
                                Signed
                              </Badge>
                            )}
                            {isReleased && (
                              <Badge variant="outline" className="bg-teal-100 text-teal-700 flex items-center gap-1">
                                <Share2 className="w-3 h-3" />
                                Released
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-slate-900">{getPatientName(result.patient_id)}</p>
                          <p className="text-sm text-slate-500">
                            {result.result_date && format(new Date(result.result_date), 'MMM d, yyyy h:mm a')}
                          </p>
                          {result.narrative_text && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{result.narrative_text}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedResult(result);
                              setActionDialog('view');
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {result.status === 'reviewed' && !isSigned && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedResult(result);
                                setActionDialog('sign');
                              }}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <FileCheck className="w-4 h-4 mr-1" />
                              Sign
                            </Button>
                          )}
                          {result.status === 'signed' && !isReleased && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedResult(result);
                                setActionDialog('release');
                              }}
                              className="text-teal-600 hover:text-teal-700"
                            >
                              <Share2 className="w-4 h-4 mr-1" />
                              Release
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={actionDialog === 'sign'} onOpenChange={() => { setActionDialog(null); setActionNote(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Sign result for patient: <span className="font-medium">{selectedResult && getPatientName(selectedResult.patient_id)}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comments (Optional)</label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Add any comments..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setActionDialog(null); setActionNote(''); }}>Cancel</Button>
              <Button onClick={handleSignResult} className="bg-emerald-600 hover:bg-emerald-700">
                <FileCheck className="w-4 h-4 mr-2" />
                Sign Result
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'release'} onOpenChange={() => { setActionDialog(null); setActionNote(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release to Patient Portal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Release result to patient portal for: <span className="font-medium">{selectedResult && getPatientName(selectedResult.patient_id)}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Release Note (Optional)</label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Add any notes for the patient..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setActionDialog(null); setActionNote(''); }}>Cancel</Button>
              <Button onClick={handleReleaseResult} className="bg-teal-600 hover:bg-teal-700">
                <Share2 className="w-4 h-4 mr-2" />
                Release Result
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'view'} onOpenChange={() => { setActionDialog(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Result Details</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Patient</p>
                <p className="font-medium">{getPatientName(selectedResult.patient_id)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Result Type</p>
                <p className="font-medium">{selectedResult.result_type}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge variant="outline" className={`${resultStatusColors[selectedResult.status]} border`}>
                  {selectedResult.status}
                </Badge>
              </div>
              {selectedResult.narrative_text && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Report</p>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedResult.narrative_text}</p>
                  </div>
                </div>
              )}
              {selectedResult.structured_json && Object.keys(selectedResult.structured_json).length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Structured Data</p>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <pre className="text-xs text-slate-700 overflow-auto">
                      {JSON.stringify(selectedResult.structured_json, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}