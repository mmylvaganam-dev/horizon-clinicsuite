import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope, Edit2, DollarSign, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const SERVICE_LABELS = {
  GP_CONSULTATION: 'GP / General Physician',
  SPECIALIST_CONSULTATION: 'Specialist',
  SECOND_OPINION: 'Second Opinion',
  FOLLOW_UP: 'Follow-up',
  MENTAL_HEALTH: 'Mental Health',
  PAEDIATRICS: 'Paediatrics',
  DERMATOLOGY: 'Dermatology',
  NUTRITION: 'Nutrition / Dietitian',
  ABDOMINAL_ULTRASOUND: 'Abdominal Ultrasound',
};

const SERVICE_ICONS = {
  GP_CONSULTATION: '🩺',
  SPECIALIST_CONSULTATION: '👨‍⚕️',
  SECOND_OPINION: '🔍',
  FOLLOW_UP: '🔄',
  MENTAL_HEALTH: '🧠',
  PAEDIATRICS: '👶',
  DERMATOLOGY: '🧴',
  NUTRITION: '🥗',
  ABDOMINAL_ULTRASOUND: '🔬',
};

// Exchange rate reference (admin can update)
const LKR_TO_USD = 300;

export default function TelemedicineServices() {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['telePricingConfig'],
    queryFn: () => base44.entities.TelePricingConfig.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return base44.entities.TelePricingConfig.update(data.id, data);
      }
      return base44.entities.TelePricingConfig.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telePricingConfig'] });
      toast.success('Service pricing saved');
      setEditItem(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.TelePricingConfig.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telePricingConfig'] }),
  });

  const openEdit = (svc) => {
    setEditItem(svc);
    setForm({ ...svc });
  };

  const active = services.filter(s => s.is_active);
  const totalRevenuePotential = active.reduce((sum, s) => sum + (s.amount_lkr || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Telemedicine Services & Pricing</h1>
          <p className="text-slate-500 text-sm mt-1">Sri Lanka market-aligned fee schedule · LKR & USD dual pricing</p>
        </div>
      </div>

      {/* Market context banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-800 space-y-1">
          <p className="font-semibold">Sri Lanka Market Benchmarks (2025)</p>
          <p>GP visits: Rs. 500–1,500 · Specialists: Rs. 1,500–5,000 · PHSRC regulated max Rs. 2,000 (2023). Competitor oDoc GP starts Rs. 300/consult or Rs. 499/month subscription. Overseas diaspora pay USD rates.</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-teal-700">{active.length}</p>
            <p className="text-xs text-slate-500 mt-1">Active Services</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-slate-700">Rs. {Math.min(...active.map(s => s.amount_lkr || 0)).toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Lowest Fee (LKR)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-slate-700">Rs. {Math.max(...active.map(s => s.amount_lkr || 0)).toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Highest Fee (LKR)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{LKR_TO_USD}</p>
            <p className="text-xs text-slate-500 mt-1">LKR / USD rate (ref)</p>
          </CardContent>
        </Card>
      </div>

      {/* Services grid */}
      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map(svc => (
            <Card key={svc.id} className={`transition-all ${!svc.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{SERVICE_ICONS[svc.service_type] || '🏥'}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{svc.label}</p>
                      <p className="text-xs text-slate-500">{SERVICE_LABELS[svc.service_type]}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge className="bg-green-100 text-green-800 border-0 font-semibold">
                          Rs. {(svc.amount_lkr || 0).toLocaleString()}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          USD {svc.amount_usd_max ? `${svc.amount_usd}–${svc.amount_usd_max}` : (svc.amount_usd || '—')}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" /> {svc.duration_minutes} min
                        </span>
                      </div>
                      {svc.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic">{svc.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch
                      checked={svc.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: svc.id, is_active: v })}
                    />
                    <Button size="sm" variant="outline" onClick={() => openEdit(svc)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service Label</Label>
              <Input className="mt-1" value={form.label || ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (LKR)</Label>
                <Input className="mt-1" type="number" value={form.amount_lkr || ''} onChange={e => setForm(f => ({ ...f, amount_lkr: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Price (USD) — Min</Label>
                <Input className="mt-1" type="number" step="0.5" value={form.amount_usd || ''} onChange={e => setForm(f => ({ ...f, amount_usd: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Price (USD) — Max <span className="text-slate-400 font-normal">(optional, for range e.g. $25–$50)</span></Label>
              <Input className="mt-1" type="number" step="0.5" placeholder="Leave blank if fixed price" value={form.amount_usd_max || ''} onChange={e => setForm(f => ({ ...f, amount_usd_max: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input className="mt-1" type="number" value={form.duration_minutes || 15} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Admin Notes</Label>
              <Input className="mt-1" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Pricing'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}