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
  MapPin,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Grid3X3,
  List
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

export default function PharmacyStockTaking() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');

  const [sessionForm, setSessionForm] = useState({
    location_id: '',
    session_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  // Mock stock taking sessions
  const sessions = [
    {
      id: '1',
      date: new Date().toISOString(),
      location: 'Pharmacy',
      status: 'Initial',
      created_by: 'Admin User',
      items_count: 0
    }
  ];

  const statusColors = {
    Initial: 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Verified: 'bg-teal-100 text-teal-700 border-teal-200'
  };

  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      // Mock creation
      return { id: Date.now().toString(), ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockTakingSessions'] });
      setShowCreateDialog(false);
      setSessionForm({ location_id: '', session_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      toast.success('Stock taking session created');
    },
  });

  const handleCreateSession = () => {
    if (!sessionForm.location_id) {
      toast.error('Please select a location');
      return;
    }
    createSessionMutation.mutate(sessionForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Stock Taking Sessions</h1>
          <p className="text-slate-500 mt-1">Physical inventory count and verification</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Start New Stock Taking Session
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search sessions..."
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

      {/* Sessions List */}
      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <div className="border-b bg-slate-50 px-6 py-3">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-slate-700">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created By</div>
                <div className="col-span-2">Items Count</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
            </div>

            <div className="divide-y">
              {sessions.map((session) => (
                <div key={session.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <p className="text-sm font-medium text-slate-900">
                          {format(new Date(session.date), 'dd MMM, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <p className="text-sm text-slate-900">{session.location}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Badge className={statusColors[session.status]}>
                        {session.status}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-slate-900">{session.created_by}</p>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline">{session.items_count} items</Badge>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge className={statusColors[session.status]}>
                    {session.status}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(session.date), 'dd MMM, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-900">{session.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-500">{session.items_count} items counted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Initial</p>
            <p className="text-3xl font-bold mt-1">1</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">In Progress</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Completed</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Verified</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Stock Taking Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Location *</label>
              <Select value={sessionForm.location_id} onValueChange={(v) => setSessionForm({...sessionForm, location_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Session Date</label>
              <Input
                type="date"
                value={sessionForm.session_date}
                onChange={(e) => setSessionForm({...sessionForm, session_date: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSession} disabled={createSessionMutation.isPending}>
                {createSessionMutation.isPending ? 'Creating...' : 'Start Session'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}