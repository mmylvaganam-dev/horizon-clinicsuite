import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Video, Mic, MessageSquare, ChevronRight, ChevronLeft, Upload, X, User, Calendar, Clock } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';

const VISIT_TYPES = [
  { value: 'VIDEO', label: 'Video Call', icon: Video, desc: 'Face-to-face virtual consultation' },
  { value: 'AUDIO', label: 'Audio Call', icon: Mic, desc: 'Voice-only consultation' },
  { value: 'CHAT', label: 'Chat', icon: MessageSquare, desc: 'Text-based consultation' },
];

// Generate sample time slots for a given date
function generateSlots(date) {
  const slots = [];
  const hours = [9, 9.5, 10, 10.5, 11, 11.5, 14, 14.5, 15, 15.5, 16, 16.5];
  hours.forEach(h => {
    const hour = Math.floor(h);
    const min = h % 1 === 0.5 ? 30 : 0;
    const d = new Date(date);
    d.setHours(hour, min, 0, 0);
    slots.push(d);
  });
  return slots;
}

const STEP_LABELS = ['Provider', 'Date & Time', 'Visit Type', 'Files & Notes', 'Confirm'];

export default function BookingWizard({ patient, onBookingComplete }) {
  const [step, setStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [visitType, setVisitType] = useState('VIDEO');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [booked, setBooked] = useState(false);

  const queryClient = useQueryClient();

  const { data: providers = [] } = useQuery({
    queryKey: ['teleProviders'],
    queryFn: () => base44.entities.TeleProvider.filter({ is_active: true, verification_status: 'VERIFIED' }),
  });

  const slots = generateSlots(selectedDate);

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setUploading(true);
    const urls = [];
    for (const file of uploadedFiles) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setFiles(prev => [...prev, ...urls]);
    setUploading(false);
  };

  const bookMutation = useMutation({
    mutationFn: async () => {
      const appt = await base44.entities.TeleAppointment.create({
        patient_id: patient.id,
        patient_name: patient.name,
        patient_email: patient.email,
        provider_id: selectedProvider.id,
        provider_name: selectedProvider.name,
        visit_type: visitType,
        status: 'BOOKED',
        scheduled_time: selectedSlot.toISOString(),
        billing_mode: 'FREE',
        pre_consult_files: files,
        patient_notes: notes,
        reminder_sent: false,
      });

      // Email confirmation placeholder
      try {
        await base44.integrations.Core.SendEmail({
          to: patient.email,
          subject: `Appointment Confirmed — ${selectedProvider.name}`,
          body: `Hi ${patient.name},\n\nYour telemedicine appointment has been booked.\n\nProvider: ${selectedProvider.name}\nDate: ${format(selectedSlot, 'PPP p')}\nType: ${visitType}\n\nPlease log in to the patient portal to view details.\n\nThank you.`,
        });
      } catch (e) {
        console.warn('Email placeholder failed (expected):', e);
      }

      return appt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teleAppointments'] });
      setBooked(true);
      if (onBookingComplete) onBookingComplete();
    },
  });

  if (booked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-teal-500" />
        <h2 className="text-2xl font-bold text-slate-900">Appointment Booked!</h2>
        <p className="text-slate-500 max-w-sm">
          Your appointment with <strong>{selectedProvider?.name}</strong> on{' '}
          <strong>{selectedSlot && format(selectedSlot, 'PPP p')}</strong> has been confirmed.
          A confirmation has been sent to <strong>{patient.email}</strong>.
        </p>
        <Button onClick={() => { setBooked(false); setStep(0); setSelectedProvider(null); setSelectedSlot(null); setFiles([]); setNotes(''); }}>
          Book Another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-1.5 text-sm font-medium ${i === step ? 'text-teal-700' : i < step ? 'text-teal-500' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === step ? 'bg-teal-600 text-white' : i < step ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-teal-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Select Provider */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Select a Provider</h2>
          {providers.length === 0 && (
            <p className="text-slate-400 text-sm">No verified providers available at this time.</p>
          )}
          {providers.map(p => (
            <Card
              key={p.id}
              onClick={() => setSelectedProvider(p)}
              className={`cursor-pointer transition-all ${selectedProvider?.id === p.id ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-300' : 'hover:border-slate-300'}`}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-500">{p.specialty}</p>
                </div>
                <Badge className="bg-teal-100 text-teal-700 border-0">Verified</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 1: Date & Time */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Select Date & Time</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dates.map((d, i) => (
              <button
                key={i}
                onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                }`}
              >
                <span className="text-xs uppercase">{format(d, 'EEE')}</span>
                <span className="text-lg font-bold">{format(d, 'd')}</span>
                <span className="text-xs">{format(d, 'MMM')}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => setSelectedSlot(slot)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  selectedSlot?.getTime() === slot.getTime()
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                }`}
              >
                {format(slot, 'h:mm a')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Visit Type */}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Choose Visit Type</h2>
          {VISIT_TYPES.map(vt => (
            <Card
              key={vt.value}
              onClick={() => setVisitType(vt.value)}
              className={`cursor-pointer transition-all ${visitType === vt.value ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-300' : 'hover:border-slate-300'}`}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <vt.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{vt.label}</p>
                  <p className="text-sm text-slate-500">{vt.desc}</p>
                </div>
                {visitType === vt.value && <CheckCircle className="w-5 h-5 text-teal-600 ml-auto" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 3: Files & Notes */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Pre-Consult Files & Notes</h2>
          <div>
            <Label>Reason for Visit / Notes</Label>
            <Textarea
              className="mt-1"
              placeholder="Describe your symptoms or reason for consultation..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>Upload Files (reports, images, etc.)</Label>
            <div className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-2">Drag & drop or click to upload</p>
              <Input type="file" multiple className="hidden" id="file-upload" onChange={handleFileUpload} />
              <Label htmlFor="file-upload">
                <Button variant="outline" size="sm" asChild>
                  <span>{uploading ? 'Uploading...' : 'Choose Files'}</span>
                </Button>
              </Label>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded px-3 py-1.5">
                    <span className="flex-1 truncate">File {i + 1}</span>
                    <button onClick={() => setFiles(f => f.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Confirm Booking</h2>
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-teal-600" />
                <div>
                  <p className="text-xs text-slate-500">Provider</p>
                  <p className="font-semibold text-slate-900">{selectedProvider?.name} — {selectedProvider?.specialty}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-teal-600" />
                <div>
                  <p className="text-xs text-slate-500">Date & Time</p>
                  <p className="font-semibold text-slate-900">{selectedSlot && format(selectedSlot, 'PPP p')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-teal-600" />
                <div>
                  <p className="text-xs text-slate-500">Visit Type</p>
                  <p className="font-semibold text-slate-900">{visitType}</p>
                </div>
              </div>
              {notes && (
                <div>
                  <p className="text-xs text-slate-500">Your Notes</p>
                  <p className="text-sm text-slate-700">{notes}</p>
                </div>
              )}
              {files.length > 0 && (
                <p className="text-xs text-slate-500">{files.length} file(s) attached</p>
              )}
              <div className="pt-2 border-t">
                <Badge className="bg-green-100 text-green-700 border-0">No payment required</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 0 && !selectedProvider) ||
              (step === 1 && !selectedSlot)
            }
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => bookMutation.mutate()}
            disabled={bookMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
          </Button>
        )}
      </div>
    </div>
  );
}