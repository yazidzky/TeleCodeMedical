/**
 * Vital Signs Validator — TeleCode Medical
 * Real-time validation + clinical warnings for patient vital sign inputs.
 * Returns structured warning objects that map to i18n translation keys.
 */

/**
 * @typedef {Object} VitalWarning
 * @property {'critical'|'high'|'moderate'|'info'} level
 * @property {string} field   - 'bp' | 'temp' | 'spo2' | 'glucose' | 'age'
 * @property {string} msgKey  - i18n key in validation namespace
 * @property {string} msgFallback - fallback English message
 */

// ─── Blood Pressure ───────────────────────────────────────────────────────────
export function validateBP(raw) {
  if (!raw || raw.trim() === '') return [];
  const match = raw.match(/^(\d{2,3})\s*[/\\]\s*(\d{2,3})$/);
  if (!match) {
    return [{ level: 'info', field: 'bp', msgKey: 'validation.bpInvalid', msgFallback: 'Invalid BP format. Use: 120/80' }];
  }
  const sys = +match[1], dia = +match[2];
  const warnings = [];
  if (sys >= 180 || dia >= 120) {
    warnings.push({ level: 'critical', field: 'bp', msgKey: 'validation.bpHighCritical', msgFallback: 'Very high BP (≥180/120) — Hypertensive crisis, go to ER!' });
  } else if (sys >= 140 || dia >= 90) {
    warnings.push({ level: 'high', field: 'bp', msgKey: 'validation.bpHigh', msgFallback: 'High blood pressure (≥140/90) — Possible hypertension' });
  } else if (sys < 90 || dia < 60) {
    warnings.push({ level: 'moderate', field: 'bp', msgKey: 'validation.bpLow', msgFallback: 'Low blood pressure (<90/60) — Possible hypotension' });
  }
  return warnings;
}

// ─── Temperature ──────────────────────────────────────────────────────────────
export function validateTemp(raw) {
  if (!raw || raw.trim() === '') return [];
  const val = parseFloat(raw.replace(',', '.'));
  if (isNaN(val) || val < 25 || val > 50) {
    return [{ level: 'info', field: 'temp', msgKey: 'validation.tempInvalid', msgFallback: 'Unrealistic temperature. Normal range: 35–42°C' }];
  }
  if (val >= 40) return [{ level: 'critical', field: 'temp', msgKey: 'validation.tempHigh', msgFallback: 'Very high temp (≥40°C) — Hyperpyrexia!' }];
  if (val >= 38) return [{ level: 'moderate', field: 'temp', msgKey: 'validation.tempFever', msgFallback: 'Fever (≥38°C)' }];
  if (val < 35)  return [{ level: 'high',     field: 'temp', msgKey: 'validation.tempLow', msgFallback: 'Hypothermia (<35°C)' }];
  return [];
}

// ─── SpO₂ ─────────────────────────────────────────────────────────────────────
export function validateSpO2(raw) {
  if (!raw || raw.trim() === '') return [];
  const val = parseFloat(raw);
  if (isNaN(val) || val < 50 || val > 100) {
    return [{ level: 'info', field: 'spo2', msgKey: 'validation.spo2Invalid', msgFallback: 'Invalid SpO₂. Range: 70–100%' }];
  }
  if (val < 90)  return [{ level: 'critical', field: 'spo2', msgKey: 'validation.spo2Critical', msgFallback: 'Critical hypoxemia (<90%) — Oxygen needed!' }];
  if (val < 94)  return [{ level: 'high',     field: 'spo2', msgKey: 'validation.spo2Low',      msgFallback: 'Low SpO₂ (<94%) — Consider O₂ supplementation' }];
  return [];
}

// ─── Blood Glucose ────────────────────────────────────────────────────────────
export function validateGlucose(raw) {
  if (!raw || raw.trim() === '') return [];
  const val = parseFloat(raw);
  if (isNaN(val) || val < 10 || val > 2000) return [];
  if (val >= 400)  return [{ level: 'critical', field: 'glucose', msgKey: 'validation.glucoseHigh',     msgFallback: 'Very high glucose (≥400) — Possible DKA!' }];
  if (val >= 126)  return [{ level: 'high',     field: 'glucose', msgKey: 'validation.glucoseElevated', msgFallback: 'Elevated glucose (≥126) — Possible diabetes' }];
  if (val < 70)    return [{ level: 'critical', field: 'glucose', msgKey: 'validation.glucoseLow',      msgFallback: 'Low glucose (<70) — Hypoglycemia!' }];
  return [];
}

// ─── Age ──────────────────────────────────────────────────────────────────────
export function validateAge(raw) {
  if (!raw || raw.trim() === '') return [];
  const val = parseInt(raw);
  if (isNaN(val) || val < 0 || val > 120) {
    return [{ level: 'info', field: 'age', msgKey: 'validation.ageInvalid', msgFallback: 'Invalid age (0–120 years)' }];
  }
  return [];
}

// ─── Parse vitals text string → structured values for validation ──────────────
function extractVitalsFromText(vitalsText) {
  const t = vitalsText.toLowerCase();
  const result = {};
  const bp = t.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bp) result.bp = `${bp[1]}/${bp[2]}`;
  const temp = t.match(/(?:temp|suhu)[:\s]*(\d{2,3}(?:[.,]\d)?)|(\d{2,3}(?:[.,]\d)?)\s*°?c/);
  if (temp) result.temp = (temp[1] || temp[2]).replace(',', '.');
  const spo2 = t.match(/spo2[:\s]*(\d{2,3})|(\d{2,3})\s*%?\s*(?:spo2|saturasi)/);
  if (spo2) result.spo2 = spo2[1] || spo2[2];
  const gluc = t.match(/(?:glucose|gula)[:\s]*(\d{2,3})/);
  if (gluc) result.glucose = gluc[1];
  return result;
}

/**
 * Validate all vitals from a free-text vitals string.
 * @param {string} vitalsText
 * @returns {VitalWarning[]}
 */
export function validateVitalsText(vitalsText) {
  if (!vitalsText) return [];
  const parsed = extractVitalsFromText(vitalsText);
  return [
    ...validateBP(parsed.bp || ''),
    ...validateTemp(parsed.temp || ''),
    ...validateSpO2(parsed.spo2 || ''),
    ...validateGlucose(parsed.glucose || ''),
  ];
}

/**
 * Validate individual vital fields object (from SymptomChecker).
 * @param {{ bp, temp, spo2, glucose }} vitals
 * @returns {VitalWarning[]}
 */
export function validateVitalsFields(vitals) {
  return [
    ...validateBP(vitals.bp || ''),
    ...validateTemp(vitals.temp || ''),
    ...validateSpO2(vitals.spo2 || ''),
    ...validateGlucose(vitals.glucose || ''),
  ];
}

export const WARNING_LEVEL_CLASSES = {
  critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    icon: 'text-red-500',    dot: 'bg-red-500'    },
  high:     { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500', dot: 'bg-orange-500' },
  moderate: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500', dot: 'bg-yellow-500' },
  info:     { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon: 'text-blue-500',   dot: 'bg-blue-500'   },
};
