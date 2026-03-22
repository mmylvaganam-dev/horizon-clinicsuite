/**
 * Clinical normal ranges for patient vitals.
 * Returns { abnormal: bool, severity: 'warning'|'critical', message: string }
 */
export const THRESHOLDS = {
  HR:     { min: 60,  max: 100,  unit: 'bpm',  label: 'Heart Rate' },
  BP_sys: { min: 90,  max: 140,  unit: 'mmHg', label: 'Systolic BP' },
  BP_dia: { min: 60,  max: 90,   unit: 'mmHg', label: 'Diastolic BP' },
  RR:     { min: 12,  max: 20,   unit: '/min', label: 'Respiratory Rate' },
  Temp:   { min: 36.1, max: 37.2, unit: '°C',  label: 'Temperature' },
  SpO2:   { min: 95,  max: 100,  unit: '%',    label: 'SpO2' },
  BMI:    { min: 18.5, max: 30,  unit: '',     label: 'BMI' },
};

export function checkVital(key, value) {
  const t = THRESHOLDS[key];
  if (!t || value == null) return { abnormal: false };
  const v = parseFloat(value);
  if (isNaN(v)) return { abnormal: false };
  if (v < t.min || v > t.max) {
    const direction = v < t.min ? 'Low' : 'High';
    const severity = 
      (key === 'SpO2' && v < 90) ||
      (key === 'BP_sys' && (v > 180 || v < 80)) ||
      (key === 'BP_dia' && (v > 120 || v < 50)) ||
      (key === 'HR' && (v > 150 || v < 40))
        ? 'critical' : 'warning';
    return {
      abnormal: true,
      severity,
      message: `${t.label} ${direction} (${v}${t.unit} — normal: ${t.min}–${t.max}${t.unit})`
    };
  }
  return { abnormal: false };
}

export function getVitalsAlerts(vitalsRecord) {
  const alerts = [];
  for (const key of Object.keys(THRESHOLDS)) {
    const result = checkVital(key, vitalsRecord[key]);
    if (result.abnormal) alerts.push({ key, ...result });
  }
  return alerts;
}