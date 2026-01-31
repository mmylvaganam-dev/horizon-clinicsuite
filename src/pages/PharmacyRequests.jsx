import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Search,
  Calendar,
  User,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Printer,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import PageInfoTooltip from '../components/shared/PageInfoTooltip';

export default function PharmacyRequests() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const [requestForm, setRequestForm] = useState({
    request_type: 'purchase',
    requested_by: '',
    items: [],
    notes: '',
    priority: 'normal',
    status: 'pending'
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['staffProfiles'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['pharmacyRequests'],
    queryFn: () => base44.entities.PharmacyRequest.list('-created_date'),
  });

  // Check permissions
  const isPlatformOwner = user?.role === 'admin' && userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'PLATFORM_OWNER';
  });

  const isCompanyOwner = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'COMPANY_OWNER' || role?.code === 'ORG_ADMIN';
  });

  const isPharmacist = userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.code === 'PHARMACIST' || role?.name?.toLowerCase().includes('pharmacist');
  });

  const canCreateRequest = isPlatformOwner || isCompanyOwner || isPharmacist;
  
  const canApproveRequest = isPlatformOwner || isCompanyOwner || userRoles.some(ur => {
    const role = allRoles.find(r => r.id === ur.role_id);
    return role?.name?.toLowerCase().includes('manager');
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const priorityColors = {
    normal: 'bg-slate-100 text-slate-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-rose-100 text-rose-700'
  };

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const requestNumber = `REQ-${Date.now()}`;
      return base44.entities.PharmacyRequest.create({
        ...data,
        request_number: requestNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyRequests'] });
      setShowCreateDialog(false);
      setRequestForm({
        request_type: 'purchase',
        requested_by: '',
        requested_by_user_id: '',
        items: [],
        notes: '',
        priority: 'normal',
        status: 'pending'
      });
      toast.success('Request created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create request: ' + error.message);
    }
  });

  const handleCreateRequest = () => {
    if (!requestForm.request_type) {
      toast.error('Please select request type');
      return;
    }
    if (!requestForm.requested_by || !requestForm.requested_by_user_id) {
      toast.error('Please select who is requesting');
      return;
    }
    createRequestMutation.mutate(requestForm);
  };

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      return base44.entities.PharmacyRequest.update(requestId, {
        status: 'approved',
        approved_by: user?.full_name,
        approved_by_user_id: user?.id,
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyRequests'] });
      toast.success('Request approved');
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      return base44.entities.PharmacyRequest.update(requestId, {
        status: 'rejected',
        rejection_reason: reason,
        approved_by: user?.full_name,
        approved_by_user_id: user?.id,
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyRequests'] });
      toast.success('Request rejected');
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    }
  });

  const handlePrintRequest = (request) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pharmacy Request - ${request.request_number}</title>
        <style>
          @page { size: A4 landscape; margin: 20mm; }
          @media print {
            body { margin: 0; }
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            max-width: 100%;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #333; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
          }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 5px 0; color: #666; }
          .info-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 15px; 
            margin-bottom: 20px; 
          }
          .info-item { 
            padding: 10px; 
            background: #f5f5f5; 
            border-radius: 5px; 
          }
          .info-label { 
            font-size: 11px; 
            color: #666; 
            text-transform: uppercase; 
            margin-bottom: 3px; 
          }
          .info-value { 
            font-size: 14px; 
            font-weight: bold; 
            color: #333; 
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
          }
          .items-table th { 
            background: #333; 
            color: white; 
            padding: 12px; 
            text-align: left; 
            font-size: 13px; 
          }
          .items-table td { 
            padding: 10px 12px; 
            border-bottom: 1px solid #ddd; 
            font-size: 13px; 
          }
          .notes { 
            margin-top: 20px; 
            padding: 15px; 
            background: #f9f9f9; 
            border-left: 4px solid #333; 
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .priority-high { color: #dc2626; }
          .priority-urgent { color: #991b1b; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PHARMACY REQUEST</h1>
          <p>Request Number: ${request.request_number}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Request Date</div>
            <div class="info-value">${format(new Date(request.created_date), 'dd MMM yyyy')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Requested By</div>
            <div class="info-value">${request.requested_by}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Request Type</div>
            <div class="info-value" style="text-transform: capitalize;">${request.request_type}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Priority</div>
            <div class="info-value ${request.priority === 'high' ? 'priority-high' : request.priority === 'urgent' ? 'priority-urgent' : ''}" style="text-transform: capitalize;">
              ${request.priority}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span>
            </div>
          </div>
          ${request.approved_by ? `
          <div class="info-item">
            <div class="info-label">Approved By</div>
            <div class="info-value">${request.approved_by}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Approval Date</div>
            <div class="info-value">${format(new Date(request.approved_date), 'dd MMM yyyy')}</div>
          </div>
          ` : '<div class="info-item"></div><div class="info-item"></div>'}
        </div>

        ${request.items && request.items.length > 0 ? `
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 10%;">No.</th>
              <th style="width: 50%;">Product Name</th>
              <th style="width: 20%;">Product ID</th>
              <th style="width: 20%;">Quantity Requested</th>
            </tr>
          </thead>
          <tbody>
            ${request.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.product_name || 'N/A'}</td>
                <td>${item.product_id || 'N/A'}</td>
                <td><strong>${item.quantity_requested}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p style="text-align: center; color: #666; margin-top: 20px;">No items in this request</p>'}

        ${request.notes ? `
        <div class="notes">
          <div class="info-label">NOTES</div>
          <p style="margin: 10px 0 0 0;">${request.notes}</p>
        </div>
        ` : ''}

        ${request.rejection_reason ? `
        <div class="notes" style="border-left-color: #dc2626; background: #fee2e2;">
          <div class="info-label" style="color: #991b1b;">REJECTION REASON</div>
          <p style="margin: 10px 0 0 0; color: #991b1b;">${request.rejection_reason}</p>
        </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 11px;">
          <p>Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pharmacy Requests</h1>
            <p className="text-slate-500 mt-1">Manage purchase orders and stock requests</p>
          </div>
          <PageInfoTooltip
            title="Pharmacy Requests"
            description="Create and track purchase orders, stock transfer requests, and emergency supply requests."
            useCases={[
              "Request stock from suppliers when running low",
              "Transfer stock between pharmacy locations",
              "Emergency orders for critical medications",
              "Scheduled bulk purchases for cost savings"
            ]}
            bestPractices={[
              "Check existing stock before creating new requests",
              "Set priority based on urgency and patient needs",
              "Include clear notes for special requirements",
              "Track approval status to follow up if delayed"
            ]}
          />
        </div>
        {canCreateRequest && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        )}
        {!canCreateRequest && (
          <Badge variant="outline" className="text-rose-600">
            Pharmacist access required
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b bg-slate-50 px-6 py-3">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-slate-700">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Request No.</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Requested By</div>
              <div className="col-span-1">Items</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
          </div>

          <div className="divide-y">
            {requests.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No requests found</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-slate-900">
                        {format(new Date(request.created_date), 'dd MMM, yyyy')}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="font-mono bg-yellow-50 border-yellow-200">
                        {request.request_number}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-slate-900 capitalize">{request.request_type}</p>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <p className="text-sm text-slate-900">{request.requested_by}</p>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Badge variant="outline">{request.items?.length || 0} items</Badge>
                    </div>
                    <div className="col-span-1">
                      <Badge className={priorityColors[request.priority]}>
                        {request.priority}
                      </Badge>
                    </div>
                    <div className="col-span-1">
                      <Badge className={statusColors[request.status]}>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRequest(request)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrintRequest(request)}>
                        <Printer className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Pending</p>
            <p className="text-3xl font-bold mt-1">{requests.filter(r => r.status === 'pending').length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Approved</p>
            <p className="text-3xl font-bold mt-1">{requests.filter(r => r.status === 'approved').length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <XCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Rejected</p>
            <p className="text-3xl font-bold mt-1">{requests.filter(r => r.status === 'rejected').length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Package className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Completed</p>
            <p className="text-3xl font-bold mt-1">{requests.filter(r => r.status === 'completed').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* View Request Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Request Details - {selectedRequest?.request_number}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Request Date</label>
                  <p className="text-sm font-semibold mt-1">{format(new Date(selectedRequest.created_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Requested By</label>
                  <p className="text-sm font-semibold mt-1">{selectedRequest.requested_by}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Type</label>
                  <p className="text-sm font-semibold mt-1 capitalize">{selectedRequest.request_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Priority</label>
                  <Badge className={priorityColors[selectedRequest.priority]}>{selectedRequest.priority}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <Badge className={statusColors[selectedRequest.status]}>{selectedRequest.status}</Badge>
                </div>
                {selectedRequest.approved_by && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Approved By</label>
                    <p className="text-sm font-semibold mt-1">{selectedRequest.approved_by}</p>
                  </div>
                )}
              </div>

              {selectedRequest.items && selectedRequest.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-2 block">Items Requested</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedRequest.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold">{item.quantity_requested}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedRequest.notes && (
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-2 block">Notes</label>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.rejection_reason && (
                <div>
                  <label className="text-sm font-medium text-rose-600 mb-2 block">Rejection Reason</label>
                  <p className="text-sm bg-rose-50 text-rose-900 p-3 rounded-lg border border-rose-200">{selectedRequest.rejection_reason}</p>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => handlePrintRequest(selectedRequest)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                {selectedRequest.status === 'pending' && canApproveRequest && (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          rejectRequestMutation.mutate({ requestId: selectedRequest.id, reason });
                        }
                      }}
                      disabled={rejectRequestMutation.isPending}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approveRequestMutation.mutate(selectedRequest.id)}
                      disabled={approveRequestMutation.isPending}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Request Type *</label>
                <Select value={requestForm.request_type} onValueChange={(v) => setRequestForm({...requestForm, request_type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase Order</SelectItem>
                    <SelectItem value="transfer">Stock Transfer</SelectItem>
                    <SelectItem value="emergency">Emergency Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority *</label>
                <Select value={requestForm.priority} onValueChange={(v) => setRequestForm({...requestForm, priority: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Requested By *</label>
              <Select 
                value={requestForm.requested_by_user_id} 
                onValueChange={(userId) => {
                  const staff = staffProfiles.find(s => s.user_id === userId);
                  const staffName = staff ? `${staff.first_name} ${staff.last_name}` : user?.full_name;
                  setRequestForm({
                    ...requestForm, 
                    requested_by_user_id: userId,
                    requested_by: staffName
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.id || ''}>
                    {user?.full_name} (Me)
                  </SelectItem>
                  {staffProfiles.filter(s => s.user_id !== user?.id).map((staff) => (
                    <SelectItem key={staff.id} value={staff.user_id || staff.id}>
                      {staff.first_name} {staff.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={requestForm.notes}
                onChange={(e) => setRequestForm({...requestForm, notes: e.target.value})}
                placeholder="Add any special instructions or requirements..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRequest} disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}