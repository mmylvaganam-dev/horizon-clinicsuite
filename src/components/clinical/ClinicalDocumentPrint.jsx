import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

/**
 * Universal clinical document print component.
 *
 * Props:
 *   docType       - 'prescription' | 'lab_request' | 'diagnostic_request' | 'patient_letter' | 'referral_letter'
 *   patient       - Patient object
 *   doctor        - StaffProfile object (with e_signature_url, seal_url, credentials_text, etc.)
 *   organization  - Organization object
 *   branding      - OrganizationBranding object
 *   content       - object with document-specific fields (see below per docType)
 *   onClose       - () => void
 *
 * content fields by docType:
 *   prescription:        { drug_name, strength, dosage_form, directions, quantity, refills, notes, prescribed_date, expiry_date }
 *   lab_request:         { tests: [{name, code, notes}], urgency, clinical_notes, date }
 *   diagnostic_request:  { tests: [{name, modality, notes}], urgency, clinical_notes, date }
 *   patient_letter:      { subject, body, date }
 *   referral_letter:     { referred_to, referred_specialty, reason, urgency, clinical_notes, date }
 */
export default function ClinicalDocumentPrint({ docType, patient, doctor, organization, branding, content, onClose }) {
  const handlePrint = () => window.print();

  return (
    <>
      <div className="print:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3">
              <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </Button>
              <Button variant="outline" className="bg-white gap-2" onClick={onClose}>
                <X className="w-4 h-4" /> Close
              </Button>
            </div>
            <p className="text-slate-300 text-sm">Use browser Print → Save as PDF</p>
          </div>
          <div className="bg-white shadow-2xl rounded-lg overflow-hidden" style={{ fontFamily: "'Georgia', serif" }}>
            <DocumentBody docType={docType} patient={patient} doctor={doctor}
              organization={organization} branding={branding} content={content} />
          </div>
        </div>
      </div>

      <div className="hidden print:block" style={{ fontFamily: "'Georgia', serif" }}>
        <DocumentBody docType={docType} patient={patient} doctor={doctor}
          organization={organization} branding={branding} content={content} />
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          .print\\:block { display: block !important; }
          @page { size: A4 portrait; margin: 12mm 14mm; }
        }
      `}</style>
    </>
  );
}

function DocumentBody({ docType, patient, doctor, organization, branding, content }) {
  const orgName = organization?.name || branding?.clinic_name || 'Medical Centre';
  const orgAddress = organization?.address || '';
  const orgPhone = organization?.phone || '';
  const orgEmail = organization?.email || '';
  const orgLicense = organization?.license_number || '';

  const doctorName = doctor ? `${doctor.first_name} ${doctor.last_name}` : '';
  const doctorCredentials = doctor?.credentials_text || '';
  const doctorReg = doctor?.registration_number ? `Reg: ${doctor.registration_body || ''} ${doctor.registration_number}` : '';
  const doctorSpec = doctor?.specialization || '';
  const doctorPhone = doctor?.phone || '';
  const doctorEmail = doctor?.email || '';

  const docDate = content?.date ? format(new Date(content.date), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy');
  const docNumber = `${docType.toUpperCase().slice(0,3)}-${Date.now().toString().slice(-8)}`;

  const DOC_LABELS = {
    prescription: 'Prescription',
    lab_request: 'Laboratory Investigation Request',
    diagnostic_request: 'Diagnostic / Imaging Request',
    patient_letter: 'Patient Letter',
    referral_letter: 'Referral Letter',
  };
  const docLabel = DOC_LABELS[docType] || 'Clinical Document';

  return (
    <div className="p-10 print:p-0" style={{ minHeight: '270mm', maxWidth: '210mm', margin: '0 auto' }}>

      {/* ── LETTERHEAD ── */}
      <div className="border-b-2 border-teal-700 pb-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {branding?.primary_logo_file_ref ? (
              <img src={branding.primary_logo_file_ref} alt="Logo" className="h-16 w-auto object-contain" />
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
                {orgLicense && <span>Lic: {orgLicense}</span>}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="inline-block border-2 border-teal-700 rounded px-3 py-1">
              <p className="text-xs text-teal-700 font-bold tracking-widest uppercase">{docLabel}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">{docNumber}</p>
            <p className="text-xs text-slate-500 mt-1">Date: {docDate}</p>
          </div>
        </div>
      </div>

      {/* ── DOCTOR INFO ── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-0.5">Issued by</p>
          <p className="font-bold text-slate-900">{doctorName}{doctorCredentials ? `, ${doctorCredentials}` : ''}</p>
          {doctorSpec && <p className="text-xs text-slate-600">{doctorSpec}</p>}
          {doctorReg && <p className="text-xs text-slate-500">{doctorReg}</p>}
          <div className="flex gap-3 mt-1 text-xs text-slate-500">
            {doctorPhone && <span>Tel: {doctorPhone}</span>}
            {doctorEmail && <span>{doctorEmail}</span>}
          </div>
        </div>

        {/* Patient info */}
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Patient</p>
          <p className="font-bold text-slate-900 text-base">
            {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1 text-xs text-slate-600">
            {patient?.date_of_birth && <span>DOB: {format(new Date(patient.date_of_birth), 'dd MMM yyyy')}</span>}
            {patient?.gender && <span className="capitalize">Sex: {patient.gender}</span>}
            {patient?.phn && <span>PHN: {patient.phn}</span>}
            {patient?.mrn && <span>MRN: {patient.mrn}</span>}
            {patient?.phone && <span>Tel: {patient.phone}</span>}
          </div>
          {patient?.allergies && (
            <p className="mt-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-0.5 inline-block">
              ⚠ Allergies: {patient.allergies}
            </p>
          )}
        </div>
      </div>

      {/* ── DOCUMENT BODY ── */}
      <DocContent docType={docType} content={content} />

      {/* ── SIGNATURE + SEAL + QR ── */}
      <div className="flex items-end justify-between gap-6 mt-8 pt-6 border-t-2 border-slate-200">
        {/* Signature block */}
        <div className="flex-1">
          {doctor?.e_signature_url ? (
            <div className="mb-1">
              <img src={doctor.e_signature_url} alt="Signature" className="h-14 max-w-[180px] object-contain" />
            </div>
          ) : (
            <div className="h-14 border-b-2 border-slate-800 mb-1" />
          )}
          <p className="text-sm font-bold text-slate-800">{doctorName}{doctorCredentials ? `, ${doctorCredentials}` : ''}</p>
          {doctorSpec && <p className="text-xs text-slate-600">{doctorSpec}</p>}
          {doctorReg && <p className="text-xs text-slate-500">{doctorReg}</p>}
          <p className="text-xs text-slate-400 mt-0.5">{orgName}</p>
        </div>

        {/* Seal */}
        <div className="flex-shrink-0 flex flex-col items-center">
          {doctor?.seal_url ? (
            <img src={doctor.seal_url} alt="Official Seal" className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
              <p className="text-xs text-slate-300 text-center leading-tight">Official<br/>Stamp</p>
            </div>
          )}
        </div>

        {/* QR */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <QRCodeSVG
            value={`${window.location.origin}/verify?doc=${docNumber}`}
            size={72}
            bgColor="#ffffff"
            fgColor="#0f5e6b"
            level="M"
          />
          <p className="text-xs text-slate-400 text-center leading-tight">Document<br/>Ref: {docNumber.slice(-6)}</p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
        <p>This document is generated by {orgName} and is valid for the purpose stated above.</p>
        <p className="font-mono">{docNumber}</p>
      </div>
    </div>
  );
}

function DocContent({ docType, content }) {
  if (!content) return null;

  if (docType === 'prescription') {
    return (
      <div className="border-2 border-slate-200 rounded-lg p-5 bg-white">
        <div className="flex items-start gap-3">
          <span className="text-5xl font-serif text-teal-700 leading-none select-none" style={{ fontFamily: 'Georgia, serif' }}>℞</span>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xl font-bold text-slate-900">
                {content.drug_name}
                {content.strength && <span className="text-slate-600 font-normal ml-2 text-base">{content.strength}</span>}
              </p>
              {content.dosage_form && <p className="text-sm text-slate-500 italic">{content.dosage_form}</p>}
            </div>
            <div className="border-t border-dashed border-slate-200" />
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sig (Directions)</p>
              <p className="text-sm text-slate-800 font-medium">{content.directions}</p>
            </div>
            <div className="flex gap-8 pt-1">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Dispense Qty</p>
                <p className="text-lg font-bold text-slate-900">{content.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Refills</p>
                <p className="text-lg font-bold text-slate-900">{content.refills ?? 0}</p>
              </div>
            </div>
            {content.expiry_date && (
              <p className="text-xs text-slate-500">Valid until: <strong>{format(new Date(content.expiry_date), 'dd MMM yyyy')}</strong></p>
            )}
            {content.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800">
                <span className="font-bold">Note: </span>{content.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (docType === 'lab_request' || docType === 'diagnostic_request') {
    const isLab = docType === 'lab_request';
    const urgencyColors = { routine: 'bg-slate-100 text-slate-700', urgent: 'bg-amber-100 text-amber-800', stat: 'bg-red-100 text-red-800' };
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800">{isLab ? 'Investigations Requested' : 'Imaging / Diagnostic Tests Requested'}</h2>
          {content.urgency && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${urgencyColors[content.urgency] || urgencyColors.routine}`}>
              {content.urgency}
            </span>
          )}
        </div>
        <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead>
            <tr className="bg-teal-50 text-teal-800 text-xs uppercase">
              <th className="px-3 py-2 text-left font-bold">{isLab ? 'Test Name' : 'Study / Modality'}</th>
              {isLab && <th className="px-3 py-2 text-left font-bold">Code</th>}
              {!isLab && <th className="px-3 py-2 text-left font-bold">Modality</th>}
              <th className="px-3 py-2 text-left font-bold">Special Instructions</th>
            </tr>
          </thead>
          <tbody>
            {(content.tests || []).map((t, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2 text-slate-500">{t.code || t.modality || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{t.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {content.clinical_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-blue-700 uppercase mb-1">Clinical Notes / Indication</p>
            <p className="text-sm text-blue-900">{content.clinical_notes}</p>
          </div>
        )}
      </div>
    );
  }

  if (docType === 'referral_letter') {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referred To</p>
          <p className="font-bold text-slate-900 text-base">{content.referred_to || '—'}</p>
          {content.referred_specialty && <p className="text-sm text-slate-600">{content.referred_specialty}</p>}
          {content.urgency && (
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full uppercase ${content.urgency === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
              {content.urgency}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reason for Referral</p>
          <p className="text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-4 py-3 whitespace-pre-wrap">{content.reason}</p>
        </div>
        {content.clinical_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-blue-700 uppercase mb-1">Clinical Summary</p>
            <p className="text-sm text-blue-900 whitespace-pre-wrap">{content.clinical_notes}</p>
          </div>
        )}
      </div>
    );
  }

  if (docType === 'patient_letter') {
    return (
      <div className="space-y-4">
        {content.subject && (
          <div className="border-b border-slate-200 pb-2">
            <p className="text-xs text-slate-500 uppercase font-bold">Re:</p>
            <p className="text-base font-bold text-slate-900">{content.subject}</p>
          </div>
        )}
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white border border-slate-100 rounded-lg px-4 py-4">
          {content.body}
        </p>
      </div>
    );
  }

  return null;
}