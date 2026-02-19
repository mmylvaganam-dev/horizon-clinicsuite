import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/components/OrganizationProvider';
import { Search, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AddTokenDialog({ open, onOpenChange, counter, onTokenAdded }) {
  const { selectedOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [manualName, setManualName] = useState('');
  const [manualMobile, setManualMobile] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: () => base44.entities.Patient.filter({ organization_id: selectedOrgId }),
    enabled: !!selectedOrgId,
  });

  const { data: todayAppointments = [] } = useQuery({
    queryKey: ['todayAppointments', selectedPatient?.id],
    queryFn: () => base44.entities.Appointment.filter({ patient_id: selectedPatient.id }),
    enabled: !!selectedPatient,
    select: (data) => data.filter(a => a.start_time?.startsWith(today) && ['scheduled', 'confirmed', 'checked-in'].includes(a.status)),
  });

  const filteredPatients = search.length >= 2
    ? patients.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        p.phn?.toLowerCase().includes(search.toLowerCase()) ||
        p.mobile?.includes(search)
      ).slice(0, 8)
    : [];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const patientName = selectedPatient
      ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
      : manualName || 'Walk-in';
    const patientMobile = selectedPatient?.mobile || manualMobile;

    await base44.functions.invoke('issueQueueToken', {
      counter_id: counter.id,
      patient_id: selectedPatient?.id || '',
      patient_name: patientName,
      patient_mobile: patientMobile,
      appointment_id: selectedAppointment?.id || '',
      priority,
      notes,
    });

    setIsSubmitting(false);
    onTokenAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Token — {counter.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Patient Search */}
          <div>
            <Label>Search Patient (optional)</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, PHN, or mobile..."
                className="pl-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedPatient(null); setSelectedAppointment(null); }}
              />
            </div>
            {filteredPatients.length > 0 && !selectedPatient && (
              <div className="border rounded-lg mt-1 max-h-44 overflow-y-auto divide-y">
                {filteredPatients.map(p => (
                  <button
                    key={p.id}
                    className="w-full text-left p-3 hover:bg-teal-50 transition-colors flex items-center gap-3"
                    onClick={() => { setSelectedPatient(p); setSearch(`${p.first_name} ${p.last_name}`); }}
                  >
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-500">{p.phn} • {p.mobile}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-1 p-2 bg-teal-50 rounded-lg flex items-center gap-2 text-sm text-teal-700">
                <User className="w-4 h-4" />
                <span className="flex-1">{selectedPatient.first_name} {selectedPatient.last_name} — {selectedPatient.phn}</span>
                <button onClick={() => { setSelectedPatient(null); setSearch(''); setSelectedAppointment(null); }} className="text-slate-400 hover:text-red-500">✕</button>
              </div>
            )}
          </div>

          {/* Link to today's appointment */}
          {selectedPatient && todayAppointments.length > 0 && (
            <div>
              <Label>Link to Today's Appointment (optional)</Label>
              <div className="space-y-1 mt-1">
                {todayAppointments.map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedAppointment(selectedAppointment?.id === apt.id ? null : apt)}
                    className={`w-full text-left p-2 rounded-lg border text-sm transition-colors flex items-center gap-2 ${selectedAppointment?.id === apt.id ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{apt.start_time ? format(new Date(apt.start_time), 'HH:mm') : ''} — {apt.type?.replace(/[-_]/g, ' ')} ({apt.status})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Entry if no patient selected */}
          {!selectedPatient && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input placeholder="Walk-in name" value={manualName} onChange={e => setManualName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input placeholder="07X XXXXXXX" value={manualMobile} onChange={e => setManualMobile(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                <SelectItem value="elderly">🟡 Elderly / Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Input placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Issuing...' : 'Issue Token'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}