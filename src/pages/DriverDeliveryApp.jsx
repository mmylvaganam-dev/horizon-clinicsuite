import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Truck, MapPin, CheckCircle2, Camera, Package, Clock,
  ChevronDown, ChevronUp, RefreshCw, LogOut, AlertCircle, Image
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  preparing: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  dispatched: 'bg-blue-100 text-blue-800 border-blue-300',
  delivered: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_ICON = {
  preparing: '⏳',
  dispatched: '🚚',
  delivered: '✅',
  failed: '❌',
};

function DeliveryCard({ delivery, onMarkDelivered }) {
  const [expanded, setExpanded] = useState(false);
  const isDone = delivery.status === 'delivered' || delivery.status === 'failed';

  return (
    <div
      className={`rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${
        delivery.status === 'delivered'
          ? 'border-green-300 bg-green-50'
          : delivery.status === 'failed'
          ? 'border-red-300 bg-red-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-base">{delivery.buyer_name}</span>
              <Badge className={`text-xs border ${STATUS_COLOR[delivery.status]}`}>
                {STATUS_ICON[delivery.status]} {delivery.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{delivery.delivery_number}</p>
            {delivery.delivery_address && (
              <p className="text-sm text-slate-600 mt-1 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-500" />
                {delivery.delivery_address}
              </p>
            )}
            {delivery.delivered_at && (
              <p className="text-xs text-green-700 mt-1 font-medium">
                Delivered at {new Date(delivery.delivered_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                {delivery.recipient_name && ` · Received by: ${delivery.recipient_name}`}
              </p>
            )}
          </div>
          <button
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
        </div>

        {!isDone && (
          <Button
            className="w-full mt-3 h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            onClick={() => onMarkDelivered(delivery)}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" /> Mark as Delivered
          </Button>
        )}

        {delivery.status === 'delivered' && delivery.proof_of_delivery_url && (
          <a
            href={delivery.proof_of_delivery_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 mt-2 text-sm text-indigo-600 font-medium"
          >
            <Image className="w-4 h-4" /> View Proof Photo
          </a>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 space-y-1 text-sm">
          <p><span className="text-slate-500">Order #:</span> <strong>{delivery.order_number}</strong></p>
          {delivery.dispatched_at && (
            <p><span className="text-slate-500">Dispatched:</span> {new Date(delivery.dispatched_at).toLocaleString('en-GB')}</p>
          )}
          {delivery.notes && <p><span className="text-slate-500">Notes:</span> {delivery.notes}</p>}
        </div>
      )}
    </div>
  );
}

function DeliveryConfirmSheet({ delivery, onClose, onSuccess }) {
  const [recipientName, setRecipientName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [markingFailed, setMarkingFailed] = useState(false);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
      toast.success('Photo uploaded!');
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const deliverMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        recipient_name: recipientName,
      };
      if (photoUrl) updates.proof_of_delivery_url = photoUrl;
      await base44.entities.WholesaleDelivery.update(delivery.id, updates);
      await base44.entities.WholesaleOrder.update(delivery.order_id, {
        status: 'delivered',
        actual_delivery_date: new Date().toISOString().slice(0, 10),
      });
      await base44.functions.invoke('wholesaleStockUpdate', { action: 'deduct_order', order_id: delivery.order_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driverDeliveries']);
      toast.success('Delivery confirmed! ✅');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const failMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.WholesaleDelivery.update(delivery.id, { status: 'failed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driverDeliveries']);
      toast.error('Delivery marked as failed');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1" />
        <div>
          <h2 className="text-xl font-black text-slate-900">Confirm Delivery</h2>
          <p className="text-slate-500 text-sm">{delivery.buyer_name} · {delivery.delivery_number}</p>
        </div>

        {/* Photo capture */}
        <div>
          <p className="font-semibold text-slate-700 mb-2">Proof of Delivery Photo</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="Proof" className="w-full rounded-xl object-cover max-h-48 border-2 border-green-400" />
              <button
                className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-xs font-semibold shadow border"
                onClick={() => fileRef.current?.click()}
              >
                Retake
              </button>
              <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                ✓ Photo saved
              </div>
            </div>
          ) : (
            <button
              className="w-full h-28 border-2 border-dashed border-indigo-300 rounded-xl flex flex-col items-center justify-center gap-2 text-indigo-600 bg-indigo-50 active:bg-indigo-100"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
              <span className="font-semibold text-sm">{uploading ? 'Uploading...' : 'Tap to snap photo'}</span>
            </button>
          )}
        </div>

        {/* Recipient name */}
        <div>
          <p className="font-semibold text-slate-700 mb-1.5">Received by (optional)</p>
          <Input
            placeholder="Enter recipient's name"
            value={recipientName}
            onChange={e => setRecipientName(e.target.value)}
            className="h-11 text-base rounded-xl"
          />
        </div>

        {/* Actions */}
        <Button
          className="w-full h-14 text-lg font-black bg-green-600 hover:bg-green-700 rounded-2xl"
          onClick={() => deliverMutation.mutate()}
          disabled={deliverMutation.isPending}
        >
          {deliverMutation.isPending ? (
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="w-6 h-6 mr-2" />
          )}
          Confirm Delivered
        </Button>

        <Button
          variant="outline"
          className="w-full h-11 rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => failMutation.mutate()}
          disabled={failMutation.isPending}
        >
          <AlertCircle className="w-4 h-4 mr-2" /> Mark as Failed / Unable to Deliver
        </Button>

        <button className="w-full text-center text-slate-400 text-sm py-1" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function DriverDeliveryApp() {
  const [driverName, setDriverName] = useState(() => localStorage.getItem('driver_name') || '');
  const [inputName, setInputName] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const queryClient = useQueryClient();

  // Load all dispatched deliveries for this driver
  const { data: deliveries = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['driverDeliveries', driverName],
    queryFn: async () => {
      if (!driverName) return [];
      const today = new Date().toISOString().slice(0, 10);
      const all = await base44.entities.WholesaleDelivery.filter({ driver_name: driverName });
      // Show today's deliveries + any still dispatched/preparing from before
      return all.filter(d =>
        d.created_date?.slice(0, 10) === today ||
        d.status === 'dispatched' ||
        d.status === 'preparing'
      ).sort((a, b) => {
        // Undone first
        const order = { preparing: 0, dispatched: 1, delivered: 2, failed: 3 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      });
    },
    enabled: !!driverName,
    refetchInterval: 15000, // auto-refresh every 15s
  });

  const pending = deliveries.filter(d => d.status !== 'delivered' && d.status !== 'failed');
  const done = deliveries.filter(d => d.status === 'delivered' || d.status === 'failed');

  const handleLogin = () => {
    if (!inputName.trim()) return;
    const name = inputName.trim();
    localStorage.setItem('driver_name', name);
    setDriverName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_name');
    setDriverName('');
    setInputName('');
  };

  // Driver name gate
  if (!driverName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-10 h-10 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Driver Portal</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your name to view today's deliveries</p>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Your full name (e.g. Kamal Perera)"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="h-12 text-base rounded-xl text-center"
              autoFocus
            />
            <Button
              className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              onClick={handleLogin}
              disabled={!inputName.trim()}
            >
              View My Deliveries
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-4 pt-10 pb-5 text-white sticky top-0 z-30 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">Driver Portal</p>
            <h1 className="text-xl font-black leading-tight">{driverName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              disabled={isFetching}
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-2xl font-black">{pending.length}</p>
            <p className="text-indigo-200 text-xs font-medium">Pending</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-2xl font-black">{done.filter(d => d.status === 'delivered').length}</p>
            <p className="text-indigo-200 text-xs font-medium">Delivered</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-2xl font-black">{deliveries.length}</p>
            <p className="text-indigo-200 text-xs font-medium">Total</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-medium">Loading your deliveries...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center">
              <Package className="w-10 h-10 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-lg">No deliveries today</p>
              <p className="text-slate-400 text-sm mt-1">Pull down to refresh or check back later</p>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        ) : (
          <>
            {/* Pending deliveries */}
            {pending.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">To Deliver ({pending.length})</h2>
                </div>
                {pending.map(d => (
                  <DeliveryCard key={d.id} delivery={d} onMarkDelivered={setSelectedDelivery} />
                ))}
              </div>
            )}

            {/* Completed deliveries */}
            {done.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mt-4">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Completed ({done.length})</h2>
                </div>
                {done.map(d => (
                  <DeliveryCard key={d.id} delivery={d} onMarkDelivered={setSelectedDelivery} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delivery Confirm Sheet */}
      {selectedDelivery && (
        <DeliveryConfirmSheet
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onSuccess={() => setSelectedDelivery(null)}
        />
      )}
    </div>
  );
}