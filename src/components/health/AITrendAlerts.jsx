import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { border: 'border-red-300 bg-red-50', icon: AlertTriangle, iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  warning:  { border: 'border-amber-200 bg-amber-50', icon: AlertTriangle, iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  info:     { border: 'border-blue-200 bg-blue-50', icon: Info, iconColor: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
};

const TREND_ICONS = {
  worsening: <TrendingUp className="w-3.5 h-3.5 text-rose-600" />,
  improving: <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />,
  stable: <Minus className="w-3.5 h-3.5 text-slate-400" />,
};

function AlertCard({ alert }) {
  const [expanded, setExpanded] = React.useState(true);
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-4 ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-slate-900 text-sm">{alert.metric}</span>
            <Badge className={`${cfg.badge} text-xs`}>{alert.severity}</Badge>
            {alert.trend_direction && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                {TREND_ICONS[alert.trend_direction]}
                {alert.trend_direction}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700">{alert.message}</p>
          {alert.recommendation && expanded && (
            <div className="mt-2 pl-3 border-l-2 border-slate-300">
              <p className="text-xs text-slate-600 font-medium">Recommendation</p>
              <p className="text-xs text-slate-600 mt-0.5">{alert.recommendation}</p>
            </div>
          )}
        </div>
        {alert.recommendation && (
          <button onClick={() => setExpanded(e => !e)} className="flex-shrink-0 text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AITrendAlerts({ analysis, isLoading, onRefresh, analyzedAt }) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-sm text-slate-600 font-medium">AI is analyzing longitudinal trends...</p>
            <p className="text-xs text-slate-400">Comparing against clinical target ranges</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-0 shadow-sm border-dashed border-2 border-slate-200">
        <CardContent className="py-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">AI trend analysis not yet run</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={onRefresh}>
            <Sparkles className="w-4 h-4 mr-2 text-violet-600" /> Analyze Trends
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criticals = (analysis.alerts || []).filter(a => a.severity === 'critical');
  const warnings = (analysis.alerts || []).filter(a => a.severity === 'warning');
  const infos = (analysis.alerts || []).filter(a => a.severity === 'info');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">AI Trend Analysis</h3>
          {analyzedAt && (
            <span className="text-xs text-slate-400">
              · {new Date(analyzedAt).toLocaleString()}
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onRefresh} className="h-7 px-2">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-analyze
        </Button>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <p className="text-sm text-slate-700">{analysis.summary}</p>
        </div>
      )}

      {/* Alerts by severity */}
      {(analysis.alerts || []).length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">No concerning trends identified. Patient metrics appear stable.</p>
        </div>
      )}

      {[...criticals, ...warnings, ...infos].map((alert, i) => (
        <AlertCard key={i} alert={alert} />
      ))}

      {/* Positive findings */}
      {analysis.positive_findings?.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Positive Findings</p>
          </div>
          <ul className="space-y-1">
            {analysis.positive_findings.map((f, i) => (
              <li key={i} className="text-xs text-emerald-700">· {f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}