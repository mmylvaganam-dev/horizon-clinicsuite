import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, CheckCircle, XCircle, Link2, UserPlus, Search } from 'lucide-react';

// Step states
const STEP_CHECKING  = 'checking';   // loading
const STEP_ACTIVE    = 'active';     // already has tele access
const STEP_LINKED    = 'linked';     // linked but not active yet -> enable
const STEP_AUTO_MATCH= 'auto_match'; // email match found -> confirm link
const STEP_MANUAL    = 'manual';     // no match -> choose: search or create
const STEP_SEARCH    = 'search';     // search existing TelePatients
const STEP_CREATE    = 'create';     // create new TelePatient

export default function EnableTeleAccessDialog({ patient, open, onOpenChange }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(STEP_CHECKING);
  const [email, setEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data ─────────────────────────────────────────────────────────────────
  // TelePatient already linked to this EMR patient
  const { data: linkedTelePatients = [], isLoading: loadingLinked } = useQuery({
    queryKey: ['telePatientByEMR', patient?.id],
    queryFn: () => base44.entities.TelePatient.filter({ patient_id: patient?.id }),
    enabled: !!patient?.id && open,
  });

  // TelePatient matching by email (potential auto-link)
  const patientEmail = patient?.email || '';
  const { data: emailMatchPatients = [], isLoading: loadingEmail } = useQuery({
    queryKey: ['telePatientByEmail', patientEmail],
    queryFn: () => base44.entities.TelePatient.filter({ email: patientEmail }),
    enabled: !!patientEmail && open,
  });

  // All TelePatients (for manual search)
  const { data: allTelePatients = [] } = useQuery({
    queryKey: ['allTelePatients'],
    queryFn: () => base44.entities.TelePatient.list('-created_date', 200),
    enabled: step === STEP_SEARCH,
  });

  // ── Determine step once data loads ───────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (loadingLinked || loadingEmail) { setStep(STEP_CHECKING); return; }

    const linked = linkedTelePatients[0];
    if (linked) {
      setStep(linked.tele_access_enabled ? STEP_ACTIVE : STEP_LINKED);
      return;
    }

    // No linked record – check email match
    const match = emailMatchPatients.find(tp => !tp.patient_id); // unlinked match
    if (match) {
      setStep(STEP_AUTO_MATCH);
    } else {
      setEmail(patientEmail);
      setStep(STEP_MANUAL);
    }
  }, [open, loadingLinked, loadingEmail, linkedTelePatients, emailMatchPatients]);

  // Reset on close
  useEffect(() => { if (!open) { setStep(STEP_CHECKING); setSearchQuery(''); } }, [open]);

  const linked = linkedTelePatients[0];
  const emailMatch = emailMatchPatients.find(tp => !tp.patient_id);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['telePatientByEMR', patient?.id] });
    qc.invalidateQueries({ queryKey: ['telePatientByEmail', patientEmail] });
  };

  // Link existing TelePatient to EMR patient and enable
  const linkAndEnable = useMutation({
    mutationFn: (tpId) => base44.entities.TelePatient.update(tpId, {
      patient_id: patient.id,
      organization_id: patient.organization_id,
      tele_access_enabled: true,
    }),
    onSuccess: invalidate,
  });

  // Enable already-linked TelePatient
  const enableMutation = useMutation({
    mutationFn: () => base44.entities.TelePatient.update(linked.id, {
      tele_access_enabled: true,
      name: `${patient.first_name} ${patient.last_name}`,
      phone: patient.phone || patient.mobile || '',
    }),
    onSuccess: invalidate,
  });

  // Create brand-new TelePatient linked to EMR patient
  const createMutation = useMutation({
    mutationFn: () => base44.entities.TelePatient.create({
      patient_id: patient.id,
      organization_id: patient.organization_id,
      name: `${patient.first_name} ${patient.last_name}`,
      email: email,
      phone: patient.phone || patient.mobile || '',
      date_of_birth: patient.date_of_birth || '',
      tele_access_enabled: true,
    }),
    onSuccess: invalidate,
  });

  // Disable
  const disableMutation = useMutation({
    mutationFn: () => base44.entities.TelePatient.update(linked.id, { tele_access_enabled: false }),
    onSuccess: invalidate,
  });

  if (!patient) return null;

  // ── Search results ────────────────────────────────────────────────────────
  const searchResults = searchQuery.length >= 2
    ? allTelePatients.filter(tp =>
        !tp.patient_id &&
        (tp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         tp.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-teal-600" />
            Telemedicine Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient chip */}
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="font-medium text-slate-900">{patient.first_name} {patient.last_name}</p>
            <p className="text-sm text-slate-500">{patient.email || 'No email on file'}</p>
          </div>

          {/* ── CHECKING ── */}
          {step === STEP_CHECKING && (
            <p className="text-slate-400 text-sm">Checking records…</p>
          )}

          {/* ── ACTIVE ── */}
          {step === STEP_ACTIVE && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Access Enabled
                </Badge>
              </div>
              <div className="bg-teal-50 rounded-lg px-4 py-3 text-sm text-teal-700 space-y-1">
                <p><strong>Login Email:</strong> {linked?.email}</p>
                <p className="text-xs text-teal-600">Patient logs in at the Telemedicine Patient Portal using this email + OTP.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={disableMutation.isPending}
                  onClick={() => disableMutation.mutate()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {disableMutation.isPending ? 'Revoking…' : 'Revoke Access'}
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </>
          )}

          {/* ── LINKED (not yet enabled) ── */}
          {step === STEP_LINKED && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <Badge className="bg-slate-100 text-slate-600 border-0">
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Access Disabled
                </Badge>
              </div>
              <p className="text-sm text-slate-500">This patient has a linked Tele record ({linked?.email}) but access is currently off.</p>
              <div className="flex gap-3 pt-1">
                <Button
                  className="flex-1"
                  disabled={enableMutation.isPending}
                  onClick={() => enableMutation.mutate()}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {enableMutation.isPending ? 'Enabling…' : 'Enable Telemedicine Access'}
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              </div>
            </>
          )}

          {/* ── AUTO MATCH ── */}
          {step === STEP_AUTO_MATCH && emailMatch && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                  <Link2 className="w-4 h-4" /> Existing Tele Record Found
                </div>
                <p className="text-sm text-slate-700">
                  A TelePatient record with the same email <strong>{emailMatch.email}</strong> was found
                  ({emailMatch.name}). Link it to this EMR patient and enable access?
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={linkAndEnable.isPending}
                  onClick={() => linkAndEnable.mutate(emailMatch.id)}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {linkAndEnable.isPending ? 'Linking…' : 'Link & Enable Access'}
                </Button>
                <Button variant="outline" onClick={() => { setStep(STEP_MANUAL); }}>
                  Other Options
                </Button>
              </div>
            </>
          )}

          {/* ── MANUAL CHOICE ── */}
          {step === STEP_MANUAL && (
            <>
              <p className="text-sm text-slate-500">No matching Tele record found. Choose an option:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors text-sm text-slate-700"
                  onClick={() => setStep(STEP_SEARCH)}
                >
                  <Search className="w-6 h-6 text-teal-600" />
                  Search & Link Existing
                </button>
                <button
                  className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors text-sm text-slate-700"
                  onClick={() => setStep(STEP_CREATE)}
                >
                  <UserPlus className="w-6 h-6 text-teal-600" />
                  Create New Tele Record
                </button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Cancel</Button>
            </>
          )}

          {/* ── SEARCH ── */}
          {step === STEP_SEARCH && (
            <>
              <div>
                <Label>Search by name or email</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Priya or priya@email.com"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No unlinked records found.</p>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map(tp => (
                    <div key={tp.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{tp.name}</p>
                        <p className="text-xs text-slate-500">{tp.email}</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={linkAndEnable.isPending}
                        onClick={() => linkAndEnable.mutate(tp.id)}
                      >
                        Link
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setStep(STEP_MANUAL)}>Back</Button>
              </div>
            </>
          )}

          {/* ── CREATE ── */}
          {step === STEP_CREATE && (
            <>
              <div>
                <Label>Email for Tele Login *</Label>
                <Input
                  className="mt-1"
                  type="email"
                  placeholder="patient@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Patient will use this email to log in via OTP.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  className="flex-1"
                  disabled={!email || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? 'Creating…' : 'Create & Enable Access'}
                </Button>
                <Button variant="outline" onClick={() => setStep(STEP_MANUAL)}>Back</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}