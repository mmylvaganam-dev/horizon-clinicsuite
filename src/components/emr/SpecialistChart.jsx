import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { UserCheck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function SpecialistChart({ patientId }) {
  const { data: referrals = [] } = useQuery({
    queryKey: ['patientReferrals', patientId],
    queryFn: () => base44.entities.ReferralOut.filter({ patient_id: patientId }, '-referral_date'),
  });

  if (referrals.length === 0) {
    return <p className="text-sm text-slate-500 italic">No specialist consultations</p>;
  }

  return (
    <div className="space-y-3">
      {referrals.map((referral) => (
        <div key={referral.id} className="p-4 rounded-lg border bg-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-semibold text-slate-900">{referral.specialty}</p>
                <Badge className={
                  referral.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  referral.status === 'seen' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }>
                  {referral.status}
                </Badge>
              </div>
              
              {referral.specialist_name && (
                <p className="text-sm text-slate-600 mb-1">Dr. {referral.specialist_name}</p>
              )}
              
              <div className="bg-slate-50 rounded p-3 mb-2">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Reason:</span> {referral.referral_reason}
                </p>
              </div>

              {referral.consult_note_text && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">Specialist Report:</p>
                  </div>
                  <p className="text-sm text-blue-800">{referral.consult_note_text}</p>
                  {referral.acknowledged_at && (
                    <p className="text-xs text-blue-600 mt-2">
                      ✓ Reviewed by family doctor {format(new Date(referral.acknowledged_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500 mt-2">
                Referred: {format(new Date(referral.referral_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}