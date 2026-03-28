import React from 'react';
import { AlertTriangle, CheckCircle, Loader2, ShieldAlert } from 'lucide-react';

const severityConfig = {
  none: { color: 'bg-emerald-50 border-emerald-300', icon: CheckCircle, iconColor: 'text-emerald-600', label: 'No Issues Found', labelColor: 'text-emerald-700' },
  mild: { color: 'bg-yellow-50 border-yellow-300', icon: AlertTriangle, iconColor: 'text-yellow-600', label: 'Mild', labelColor: 'text-yellow-700' },
  moderate: { color: 'bg-amber-50 border-amber-400', icon: AlertTriangle, iconColor: 'text-amber-600', label: 'Moderate', labelColor: 'text-amber-700' },
  severe: { color: 'bg-rose-50 border-rose-400', icon: ShieldAlert, iconColor: 'text-rose-600', label: 'Severe', labelColor: 'text-rose-700' },
  contraindicated: { color: 'bg-rose-100 border-rose-600', icon: ShieldAlert, iconColor: 'text-rose-700', label: 'CONTRAINDICATED', labelColor: 'text-rose-800' },
};

export default function DrugInteractionChecker({ result, loading }) {
  if (loading) {
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        Checking drug interactions, allergies & patient health profile...
      </div>
    );
  }

  if (!result) return null;

  const severity = result.severity?.toLowerCase() || 'none';
  const config = severityConfig[severity] || severityConfig.none;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border-2 space-y-2 ${config.color}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
        <p className="font-semibold text-slate-800 text-sm">
          Drug Safety Check — Severity:{' '}
          <span className={`uppercase font-bold ${config.labelColor}`}>{config.label}</span>
        </p>
      </div>

      {result.allergy_concerns?.length > 0 && (
        <div className="ml-1">
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wide mb-1">⚠ Allergy Concerns</p>
          {result.allergy_concerns.map((c, i) => (
            <p key={i} className="text-sm text-rose-800 ml-2">• {c}</p>
          ))}
        </div>
      )}

      {result.interactions?.length > 0 && (
        <div className="ml-1">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Drug Interactions</p>
          {result.interactions.map((c, i) => (
            <p key={i} className="text-sm text-amber-800 ml-2">• {c}</p>
          ))}
        </div>
      )}

      {result.recommendations && (
        <p className="text-sm text-slate-600 italic border-t border-slate-200 pt-2 ml-1">
          💡 {result.recommendations}
        </p>
      )}

      {result.current_medications?.length > 0 && (
        <p className="text-xs text-slate-400 mt-1">
          Checked against {result.current_medications.length} active medication(s)
        </p>
      )}
    </div>
  );
}