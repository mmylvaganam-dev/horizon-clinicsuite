import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

export default function PrescriptionPrintView({ prescription, patient, organization, branding, provider, onClose }) {
  const printRef = useRef(null);

  const verificationUrl = `${window.location.origin}/verify-rx?id=${prescription.id}`;

  const prescribedDate = prescription.prescribed_date
    ? format(new Date(prescription.prescribed_date), 'dd MMMM yyyy')
    : format(new Date(), 'dd MMMM yyyy');

  const expiryDate = prescription.expiry_date
    ? format(new Date(prescription.expiry_date), 'dd MMMM yyyy')
    : null;

  const handlePrint = () => window.print();

  const orgName = organization?.name || branding?.clinic_name || 'Medical Centre';
  const orgAddress = organization?.address || '';
  const orgPhone = organization?.phone || '';
  const orgEmail = organization?.email || '';
  const orgLicense = organization?.license_number || '';

  const providerName = provider?.full_name || prescription.prescriber_id || 'Prescribing Physician';
  const providerEmail = provider?.email || prescription.provider_email || '';

  return (
    <>
      {/* Screen controls — hidden on print */}
      <div className="print:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="w-full max-w-2xl">
          {/* Action bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3">
              <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </Button>
              <Button variant="outline" className="bg-white gap-2" onClick={onClose}>
                <X className="w-4 h-4" />
                Close
              </Button>
            </div>
            <p className="text-slate-300 text-sm">Use your browser's Print → Save as PDF for a digital copy</p>
          </div>

          {/* Paper preview */}
          <div
            ref={printRef}
            className="bg-white shadow-2xl rounded-lg overflow-hidden"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            <RxDocument
              prescription={prescription}
              patient={patient}
              orgName={orgName}
              orgAddress={orgAddress}
              orgPhone={orgPhone}
              orgEmail={orgEmail}
              orgLicense={orgLicense}
              branding={branding}
              providerName={providerName}
              providerEmail={providerEmail}
              prescribedDate={prescribedDate}
              expiryDate={expiryDate}
              verificationUrl={verificationUrl}
            />
          </div>
        </div>
      </div>

      {/* Printable document — only visible when printing */}
      <div className="hidden print:block" style={{ fontFamily: "'Georgia', serif" }}>
        <RxDocument
          prescription={prescription}
          patient={patient}
          orgName={orgName}
          orgAddress={orgAddress}
          orgPhone={orgPhone}
          orgEmail={orgEmail}
          orgLicense={orgLicense}
          branding={branding}
          providerName={providerName}
          providerEmail={providerEmail}
          prescribedDate={prescribedDate}
          expiryDate={expiryDate}
          verificationUrl={verificationUrl}
        />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print\\:block { display: block !important; }
          @page {
            size: A5 portrait;
            margin: 10mm 12mm;
          }
        }
      `}</style>
    </>
  );
}

function RxDocument({
  prescription, patient, orgName, orgAddress, orgPhone, orgEmail, orgLicense,
  branding, providerName, providerEmail, prescribedDate, expiryDate, verificationUrl
}) {
  const rxNumber = `RX-${prescription.id?.slice(-8).toUpperCase() || '00000000'}`;

  return (
    <div className="p-8 print:p-0" style={{ minHeight: '148mm', maxWidth: '210mm', margin: '0 auto' }}>

      {/* ── LETTERHEAD ── */}
      <div className="border-b-2 border-teal-700 pb-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {branding?.primary_logo_file_ref ? (
              <img src={branding.primary_logo_file_ref} alt="Logo" className="h-14 w-auto object-contain" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl font-bold">{orgName.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-teal-800 leading-tight">{orgName}</h1>
              {orgAddress && <p className="text-xs text-slate-500 mt-0.5">{orgAddress}</p>}
              <div className="flex gap-4 mt-1 text-xs text-slate-500">
                {orgPhone && <span>Tel: {orgPhone}</span>}
                {orgEmail && <span>{orgEmail}</span>}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="inline-block border-2 border-teal-700 rounded px-3 py-1">
              <p className="text-xs text-teal-700 font-bold tracking-widest uppercase">Prescription</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">{rxNumber}</p>
            {orgLicense && <p className="text-xs text-slate-400">Lic: {orgLicense}</p>}
          </div>
        </div>
      </div>

      {/* ── PATIENT & DATE ── */}
      <div className="flex justify-between items-start mb-5 gap-4">
        <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Patient</p>
          <p className="font-bold text-slate-900 text-base">
            {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1 text-xs text-slate-600">
            {patient?.date_of_birth && (
              <span>DOB: {format(new Date(patient.date_of_birth), 'dd MMM yyyy')}</span>
            )}
            {patient?.gender && <span className="capitalize">Sex: {patient.gender}</span>}
            {patient?.phn && <span>PHN: {patient.phn}</span>}
            {patient?.mrn && <span>MRN: {patient.mrn}</span>}
          </div>
          {patient?.allergies && (
            <p className="mt-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-0.5 inline-block">
              ⚠ Allergies: {patient.allergies}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5 flex-shrink-0">
          <p><span className="font-semibold">Date:</span> {prescribedDate}</p>
          {expiryDate && <p><span className="font-semibold">Valid until:</span> {expiryDate}</p>}
        </div>
      </div>

      {/* ── Rx SYMBOL + DRUG DETAILS ── */}
      <div className="border-2 border-slate-200 rounded-lg p-4 mb-5 bg-white">
        <div className="flex items-start gap-3">
          <span className="text-5xl font-serif text-teal-700 leading-none select-none" style={{ fontFamily: 'Georgia, serif' }}>℞</span>
          <div className="flex-1 space-y-3">
            {/* Drug name & strength */}
            <div>
              <p className="text-lg font-bold text-slate-900 leading-tight">
                {prescription.drug_name}
                {prescription.strength && (
                  <span className="text-slate-600 font-normal ml-2">{prescription.strength}</span>
                )}
              </p>
              {prescription.dosage_form && (
                <p className="text-sm text-slate-500 italic">{prescription.dosage_form}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-200" />

            {/* Sig */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sig (Directions)</p>
              <p className="text-sm text-slate-800 font-medium">{prescription.directions}</p>
            </div>

            {/* Quantity + Refills row */}
            <div className="flex gap-8 pt-1">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Dispense Qty</p>
                <p className="text-base font-bold text-slate-900">{prescription.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Refills</p>
                <p className="text-base font-bold text-slate-900">{prescription.refills ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Substitution</p>
                <p className="text-base font-bold text-slate-900">Permitted</p>
              </div>
            </div>

            {/* Notes */}
            {prescription.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800">
                <span className="font-bold">Pharmacist Note: </span>{prescription.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SIGNATURE + QR ── */}
      <div className="flex items-end justify-between gap-6">
        {/* Signature block */}
        <div className="flex-1">
          <div className="border-b-2 border-slate-800 mb-1 h-12">
            {/* Signature line — intentionally blank for handwritten signature */}
          </div>
          <p className="text-sm font-bold text-slate-800">{providerName}</p>
          {providerEmail && <p className="text-xs text-slate-500">{providerEmail}</p>}
          <p className="text-xs text-slate-400 mt-0.5">Licensed Healthcare Provider</p>
        </div>

        {/* Stamp circle */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
            <p className="text-xs text-slate-300 text-center leading-tight">Official<br/>Stamp</p>
          </div>
        </div>

        {/* QR code */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <QRCodeSVG
            value={verificationUrl}
            size={72}
            bgColor="#ffffff"
            fgColor="#0f5e6b"
            level="M"
          />
          <p className="text-xs text-slate-400 text-center leading-tight">Scan to<br/>Verify</p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
        <p>This prescription is valid for the dispensing of the medication listed above only.</p>
        <p className="font-mono">{rxNumber}</p>
      </div>
    </div>
  );
}