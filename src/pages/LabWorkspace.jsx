import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TestTube, Package, Send, Activity, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function LabWorkspace() {
  const { data: orders = [] } = useQuery({
    queryKey: ['labOrders'],
    queryFn: () => base44.entities.LabCollectionOrder.list('-created_date', 10),
  });

  const { data: specimens = [] } = useQuery({
    queryKey: ['specimens'],
    queryFn: () => base44.entities.Specimen.list('-created_date', 10),
  });

  const pendingCollection = orders.filter(o => o.status === 'registered').length;
  const readyToDispatch = specimens.filter(s => s.status === 'collected').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lab Workspace</h1>
        <p className="text-slate-500 mt-1">Collecting center - specimen collection & dispatch</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Collection</p>
                <p className="text-2xl font-bold">{pendingCollection}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <TestTube className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Collected Today</p>
                <p className="text-2xl font-bold">{specimens.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ready to Dispatch</p>
                <p className="text-2xl font-bold">{readyToDispatch}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Send className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Awaiting Results</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Lab Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No lab orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">Order #{order.id.substring(0, 8)}</p>
                      <p className="text-sm text-slate-500">Patient: {order.patient_ref}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'collected' ? 'bg-teal-100 text-teal-700' :
                        order.status === 'dispatched' ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to={createPageUrl('LISOrders')}>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Create Lab Order
              </Button>
            </Link>
            <Link to={createPageUrl('LISSpecimens')}>
              <Button className="w-full justify-start" variant="outline">
                <TestTube className="w-4 h-4 mr-2" />
                Collect Specimen
              </Button>
            </Link>
            <Button className="w-full justify-start" variant="outline">
              <Package className="w-4 h-4 mr-2" />
              Dispatch Specimens
            </Button>
            <Link to={createPageUrl('LISResults')}>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                Upload Results
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}