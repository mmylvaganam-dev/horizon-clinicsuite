import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle } from 'lucide-react';

const CONSENT_CONTENT = {
  EU: {
    title: 'GDPR Consent — EU Patient',
    flag: '🇪🇺',
    color: 'border-blue-400 bg-blue-50',
    items: [
      'Your personal and medical data will be processed for the purpose of providing telemedicine consultation services.',
      'Data is stored securely in Sri Lanka and protected under encryption standards.',
      'You have the right to access, correct, or delete your personal data at any time.',
      'Your data will not be shared with third parties without your explicit consent.',
      'You may withdraw this consent at any time by contacting our Data Protection team.',
    ],
    checkbox: 'I consent to the processing of my personal data as described above in accordance with GDPR regulations.',
  },
  USA: {
    title: 'HIPAA Notice — US Patient',
    flag: '🇺🇸',
    color: 'border-red-400 bg-red-50',
    items: [
      'This Notice of Privacy Practices describes how we may use and disclose your protected health information (PHI).',
      'Your health information may be used for treatment, payment, and healthcare operations.',
      'We are required by law to maintain the privacy of your health information.',
      'All access to your records is logged and audited for security compliance.',
      'You have rights regarding your health information including the right to inspect and copy your records.',
    ],
    checkbox: 'I acknowledge receipt of this HIPAA Notice of Privacy Practices.',
  },
  CANADA: {
    title: 'PIPEDA Consent — Canadian Patient',
    flag: '🇨🇦',
    color: 'border-red-300 bg-red-50',
    items: [
      'We collect your personal information to provide telemedicine consultation services.',
      'Your information is protected under Canada\'s Personal Information Protection and Electronic Documents Act (PIPEDA).',
      'You may access your personal information held by us and request corrections.',
      'Your information will only be retained for as long as necessary for the stated purposes.',
      'You may withdraw consent at any time, subject to legal and contractual restrictions.',
    ],
    checkbox: 'I consent to the collection, use, and disclosure of my personal information as described above under PIPEDA.',
  },
  OTHER: {
    title: 'Telemedicine Consent',
    flag: '🌍',
    color: 'border-slate-300 bg-slate-50',
    items: [
      'This telemedicine consultation is provided by licensed Sri Lankan medical professionals.',
      'Your personal and medical information will be stored securely and used solely for your healthcare.',
      'Telemedicine services have limitations compared to in-person consultations.',
      'In case of medical emergency, please contact your local emergency services immediately.',
      'Your consultation records will be available to you upon request.',
    ],
    checkbox: 'I consent to receiving telemedicine services and understand the above terms.',
  },
};

CONSENT_CONTENT.SRI_LANKA = CONSENT_CONTENT.OTHER;

export default function ConsentModal({ open, onClose, onConsent, region = 'OTHER', patientName }) {
  const [checked, setChecked] = useState(false);
  const content = CONSENT_CONTENT[region] || CONSENT_CONTENT.OTHER;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-600" />
            {content.flag} {content.title}
          </DialogTitle>
        </DialogHeader>
        <div className={`rounded-xl border-2 p-4 mt-2 ${content.color}`}>
          {patientName && <p className="font-medium text-slate-800 mb-3">Patient: {patientName}</p>}
          <ul className="space-y-2">
            {content.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <label className="flex items-start gap-3 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4"
          />
          <span className="text-sm text-slate-700">{content.checkbox}</span>
        </label>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Decline</Button>
          <Button
            onClick={() => { onConsent(); onClose(); }}
            disabled={!checked}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            I Agree — Proceed to Consultation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}