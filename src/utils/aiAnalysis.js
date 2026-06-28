/**
 * AI Medical Analysis Engine — TeleCode Medical
 * Rule-based clinical decision support system
 * Analyzes patient data, symptoms, vitals → structured diagnosis + recommendations
 */

// ─── Disease Knowledge Base ───────────────────────────────────────────────────
const DISEASE_KB = [
  {
    id: 'hypertension',
    name: 'Hypertension',
    fullName: 'Essential Hypertension (Primary)',
    icdCode: 'I10',
    color: 'orange',
    keywords: ['hypertension', 'high blood pressure', 'hipertensi', 'tekanan darah tinggi', 'hbp', 'darah tinggi'],
    symptoms: ['headache', 'dizziness', 'shortness of breath', 'chest pain', 'pusing', 'sakit kepala', 'mual', 'nausea', 'penglihatan buram', 'blurred vision'],
    vitalFlags: (v) => v.systolic >= 140 || v.diastolic >= 90,
    severity: (v) => {
      if (!v.systolic && !v.diastolic) return 'moderate';
      if (v.systolic >= 180 || v.diastolic >= 120) return 'critical';
      if (v.systolic >= 160 || v.diastolic >= 100) return 'high';
      if (v.systolic >= 140 || v.diastolic >= 90) return 'moderate';
      return 'low';
    },
    recommendations: [
      'Monitor blood pressure twice daily (morning & evening) and log readings',
      'Initiate antihypertensive: ACE inhibitor (Lisinopril) or ARB as first-line therapy',
      'Sodium restriction: < 2,300 mg/day; DASH diet recommended',
      'Aerobic exercise 30 min/day, 5 days/week (walking, swimming)',
      'Eliminate smoking; limit alcohol to ≤ 1 drink/day',
      'Follow-up in 4 weeks; emergency if BP ≥ 180/120 mmHg',
    ],
    medications: ['Amlodipine 5–10 mg OD', 'Lisinopril 10 mg OD', 'Hydrochlorothiazide 12.5 mg OD'],
    urgentIf: (v) => v.systolic >= 180 || v.diastolic >= 120,
    urgentMessage: 'Hypertensive crisis — immediate BP management required',
  },
  {
    id: 'diabetes_t2',
    name: 'Diabetes Mellitus T2',
    fullName: 'Type 2 Diabetes Mellitus',
    icdCode: 'E11',
    color: 'amber',
    keywords: ['diabetes', 'diabetes mellitus', 'dm type 2', 'dm tipe 2', 'hiperglikemia', 'hyperglycemia', 'gula darah tinggi', 'high blood sugar', 'dm2', 'diabetik'],
    symptoms: ['polyuria', 'polydipsia', 'fatigue', 'blurred vision', 'slow healing', 'haus berlebihan', 'sering kencing', 'lemas', 'penurunan berat badan', 'weight loss', 'kesemutan', 'tingling'],
    vitalFlags: (v) => v.glucose >= 126,
    severity: (v) => {
      if (!v.glucose) return 'moderate';
      if (v.glucose >= 400) return 'critical';
      if (v.glucose >= 200) return 'high';
      if (v.glucose >= 126) return 'moderate';
      return 'low';
    },
    recommendations: [
      'HbA1c target < 7%; recheck every 3 months until stable',
      'Initiate Metformin 500 mg BID with meals, titrate to 2000 mg/day over 4 weeks',
      'Diabetic diet: low glycemic index, controlled carbohydrate (45–60g/meal)',
      'Daily foot inspection; refer to podiatrist if neuropathy suspected',
      'Annual screening: microalbuminuria (kidneys), retinopathy (eyes), lipid panel',
      'Self-monitoring blood glucose: fasting < 130 mg/dL, 2h post-meal < 180 mg/dL',
    ],
    medications: ['Metformin 500 mg BID', 'Glibenclamide 5 mg OD (if HbA1c > 8%)', 'Insulin Glargine 10U HS (if HbA1c > 9%)'],
    urgentIf: (v) => v.glucose >= 400,
    urgentMessage: 'Severe hyperglycemia — rule out DKA; IV insulin may be needed',
  },
  {
    id: 'pneumonia',
    name: 'Pneumonia (CAP)',
    fullName: 'Community-Acquired Pneumonia',
    icdCode: 'J18.9',
    color: 'red',
    keywords: ['pneumonia', 'pneumoni', 'radang paru', 'chest infection', 'lung infection', 'infeksi paru', 'bronkopneumonia', 'bronchopneumonia'],
    symptoms: ['cough', 'fever', 'chest pain', 'difficulty breathing', 'batuk', 'demam', 'sesak napas', 'nyeri dada', 'productive cough', 'batuk berdahak', 'chills', 'menggigil'],
    vitalFlags: (v) => v.temperature >= 38.5 || v.spo2 <= 93,
    severity: (v) => {
      if (v.spo2 <= 90 || v.temperature >= 40) return 'critical';
      if (v.spo2 <= 93 || v.temperature >= 39) return 'high';
      if (v.temperature >= 38.5) return 'moderate';
      return 'low';
    },
    recommendations: [
      'Chest X-ray PA view to confirm infiltrates and assess severity',
      'Sputum Gram stain & culture + blood cultures × 2 before antibiotics',
      'Empirical therapy: Amoxicillin-Clavulanate 875/125 mg BID × 7 days',
      'Supplemental O₂ to maintain SpO₂ > 94%; consider HFNC if needed',
      'IV fluids if dehydrated; Paracetamol 500 mg QID for fever & pain',
      'Hospitalize if PSI ≥ Class III, SpO₂ < 92%, or unable to tolerate oral intake',
    ],
    medications: ['Amoxicillin-Clavulanate 875/125 mg BID', 'Azithromycin 500 mg OD × 5d', 'Paracetamol 500 mg QID PRN'],
    urgentIf: (v) => v.spo2 <= 90 || v.temperature >= 40,
    urgentMessage: 'Critical hypoxemia or hyperpyrexia — immediate hospital admission',
  },
  {
    id: 'anemia',
    name: 'Iron Deficiency Anemia',
    fullName: 'Anemia — Iron Deficiency',
    icdCode: 'D50',
    color: 'purple',
    keywords: ['anemia', 'anemi', 'iron deficiency', 'kekurangan darah', 'hemoglobin rendah', 'low hemoglobin', 'hb rendah', 'iron deficiency anemia', 'ida'],
    symptoms: ['fatigue', 'pallor', 'dizziness', 'shortness of breath', 'cold hands', 'lemas', 'pucat', 'pusing', 'mudah lelah', 'koilonychia', 'pica', 'restless legs'],
    vitalFlags: (v) => v.hemoglobin < 12,
    severity: (v) => {
      if (!v.hemoglobin) return 'moderate';
      if (v.hemoglobin < 7) return 'critical';
      if (v.hemoglobin < 9) return 'high';
      if (v.hemoglobin < 11) return 'moderate';
      return 'low';
    },
    recommendations: [
      'CBC with differential, peripheral smear, serum ferritin, TIBC, reticulocyte count',
      'Investigate root cause: GI bleeding (stool OB test), menorrhagia, malabsorption',
      'Oral iron: Ferrous Sulfate 325 mg TID — take on empty stomach with Vitamin C',
      'Vitamin C 500 mg co-administration enhances non-heme iron absorption by 3×',
      'High-iron foods: red meat, lentils, spinach, tofu, fortified cereals',
      'Recheck CBC in 4–6 weeks; IV iron if oral therapy fails or GI intolerance',
    ],
    medications: ['Ferrous Sulfate 325 mg TID', 'Vitamin C 500 mg with meals', 'Folic Acid 5 mg OD'],
    urgentIf: (v) => v.hemoglobin < 7,
    urgentMessage: 'Severe anemia (Hb < 7 g/dL) — packed red cell transfusion may be indicated',
  },
  {
    id: 'asthma',
    name: 'Bronchial Asthma',
    fullName: 'Bronchial Asthma — Episodic',
    icdCode: 'J45',
    color: 'blue',
    keywords: ['asthma', 'asma', 'bronchial asthma', 'mengi', 'wheezing', 'bronkospasme', 'bronchospasm', 'reactive airway'],
    symptoms: ['wheezing', 'coughing', 'shortness of breath', 'chest tightness', 'mengi', 'sesak napas', 'dada sesak', 'batuk malam', 'nocturnal cough', 'dyspnea on exertion'],
    vitalFlags: (v) => v.spo2 <= 94,
    severity: (v) => {
      if (!v.spo2) return 'moderate';
      if (v.spo2 <= 90) return 'critical';
      if (v.spo2 <= 93) return 'high';
      if (v.spo2 <= 95) return 'moderate';
      return 'low';
    },
    recommendations: [
      'Classify severity per GINA: intermittent, mild persistent, moderate, severe',
      'SABA reliever: Salbutamol MDI 100 mcg, 2 puffs PRN — max 8 puffs/day',
      'Controller therapy: ICS Budesonide 200 mcg BID for all persistent cases',
      'Provide written Asthma Action Plan and teach proper inhaler technique',
      'Identify & avoid triggers: dust mites, pollen, cold air, NSAIDs, smoke',
      'Emergency: SpO₂ < 92% or speech fragmented → nebulizer + ER referral',
    ],
    medications: ['Salbutamol MDI 100 mcg PRN', 'Budesonide 200 mcg BID', 'Montelukast 10 mg OD (add-on)'],
    urgentIf: (v) => v.spo2 <= 90,
    urgentMessage: 'Severe acute asthma — nebulized SABA + IV corticosteroid, ER referral',
  },
  {
    id: 'ckd',
    name: 'Chronic Kidney Disease',
    fullName: 'Chronic Kidney Disease (CKD)',
    icdCode: 'N18',
    color: 'indigo',
    keywords: ['ckd', 'chronic kidney disease', 'gagal ginjal', 'kidney failure', 'renal failure', 'penyakit ginjal kronis', 'proteinuria', 'nefropati', 'nephropathy'],
    symptoms: ['edema', 'fatigue', 'decreased urine output', 'nausea', 'bengkak', 'mual', 'sesak napas', 'oliguria', 'kaki bengkak', 'pruritus', 'gatal'],
    vitalFlags: (v) => v.creatinine >= 1.5 || v.egfr < 60,
    severity: (v) => {
      if (v.egfr < 15) return 'critical';
      if (v.egfr < 30) return 'high';
      if (v.egfr < 60 || v.creatinine >= 2) return 'moderate';
      return 'low';
    },
    recommendations: [
      'Stage CKD using eGFR (CKD-EPI) and albuminuria (urine ACR) — KDIGO guidelines',
      'BP target < 130/80 mmHg; ACE inhibitor or ARB for nephroprotection',
      'Protein restriction 0.6–0.8 g/kg/day; low phosphorus & potassium diet',
      'Avoid nephrotoxins: NSAIDs, aminoglycosides, IV contrast, herbal nephrotoxins',
      'Monitor quarterly: eGFR, electrolytes, PTH, Hb, phosphate, bicarbonate',
      'Nephrology referral if eGFR < 30; plan renal replacement therapy if < 15',
    ],
    medications: ['Furosemide 40 mg OD (fluid overload)', 'Calcium Carbonate 500 mg TID (phosphate binder)', 'Erythropoietin (if Hb < 10 g/dL)'],
    urgentIf: (v) => v.egfr < 15,
    urgentMessage: 'End-stage renal disease (eGFR < 15) — urgent nephrology + dialysis planning',
  },
  {
    id: 'uti',
    name: 'Urinary Tract Infection',
    fullName: 'Urinary Tract Infection (UTI)',
    icdCode: 'N39.0',
    color: 'teal',
    keywords: ['uti', 'urinary tract infection', 'isk', 'infeksi saluran kemih', 'cystitis', 'pyelonephritis', 'sistitis', 'uretritis', 'bacteriuria'],
    symptoms: ['dysuria', 'frequency', 'urgency', 'hematuria', 'nyeri saat kencing', 'sering kencing', 'kencing berdarah', 'nyeri pinggang', 'flank pain', 'suprapubic pain'],
    vitalFlags: (v) => v.temperature >= 38,
    severity: (v) => {
      if (!v.temperature) return 'moderate';
      if (v.temperature >= 39.5) return 'high';
      if (v.temperature >= 38) return 'moderate';
      return 'low';
    },
    recommendations: [
      'Urinalysis (dipstick + microscopy) and midstream urine culture before antibiotics',
      'Uncomplicated cystitis: TMP-SMX DS 160/800 mg BID × 3 days (women)',
      'Complicated UTI/pyelonephritis: Ciprofloxacin 500 mg BID × 7–14 days',
      'Increase fluid intake ≥ 2 L/day to facilitate bacterial flushing',
      'Phenazopyridine 200 mg TID × 2 days for dysuria symptom relief',
      'Follow-up urine culture 5–7 days post-treatment to confirm clearance',
    ],
    medications: ['TMP-SMX DS BID × 3d (uncomplicated)', 'Ciprofloxacin 500 mg BID × 7d', 'Phenazopyridine 200 mg TID × 2d (PRN)'],
    urgentIf: (v) => v.temperature >= 39.5,
    urgentMessage: 'High fever in UTI — rule out urosepsis; blood cultures + IV antibiotics',
  },
  {
    id: 'copd',
    name: 'COPD',
    fullName: 'Chronic Obstructive Pulmonary Disease',
    icdCode: 'J44',
    color: 'slate',
    keywords: ['copd', 'ppok', 'penyakit paru obstruktif', 'chronic obstructive', 'emphysema', 'emfisema', 'bronkitis kronis', 'chronic bronchitis', 'penyakit paru'],
    symptoms: ['chronic cough', 'sputum production', 'dyspnea', 'wheezing', 'batuk kronis', 'sesak napas', 'lendir', 'mengi', 'reduced exercise tolerance', 'barrel chest'],
    vitalFlags: (v) => v.spo2 <= 92,
    severity: (v) => {
      if (!v.spo2) return 'moderate';
      if (v.spo2 <= 88) return 'critical';
      if (v.spo2 <= 90) return 'high';
      if (v.spo2 <= 92) return 'moderate';
      return 'low';
    },
    recommendations: [
      'Spirometry to confirm: post-bronchodilator FEV1/FVC < 0.7 (GOLD criteria)',
      'Smoking cessation is #1 intervention — prescribe Varenicline + counselling',
      'LAMA maintenance: Tiotropium 18 mcg OD; add LABA/ICS if GOLD B/D',
      'Pneumococcal PCV13 + annual influenza vaccination',
      'Pulmonary rehabilitation: 12-week supervised exercise program',
      'Long-term O₂ therapy if PaO₂ < 55 mmHg or SpO₂ ≤ 88% at rest',
    ],
    medications: ['Tiotropium (Spiriva) 18 mcg OD', 'Salmeterol/Fluticasone BID (GOLD B–D)', 'Prednisolone 30 mg OD × 5d (exacerbation)'],
    urgentIf: (v) => v.spo2 <= 88,
    urgentMessage: 'Severe hypoxemia (SpO₂ ≤ 88%) — O₂ therapy + hospital admission',
  },
];

// ─── Severity Config ──────────────────────────────────────────────────────────
export const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'red',    priority: 4 },
  high:     { label: 'High Risk', color: 'orange', priority: 3 },
  moderate: { label: 'Moderate',  color: 'yellow', priority: 2 },
  low:      { label: 'Low Risk',  color: 'green',  priority: 1 },
  normal:   { label: 'Normal',    color: 'green',  priority: 0 },
};

// ─── Vital Parser ─────────────────────────────────────────────────────────────
function parseVitals(text = '') {
  const t = text.toLowerCase();
  const vitals = {};

  const bp = t.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bp) { vitals.systolic = +bp[1]; vitals.diastolic = +bp[2]; }

  const temp = t.match(/(?:temp(?:erature)?|suhu)[:\s]*(\d{2,3}(?:[.,]\d)?)|(\d{2,3}(?:[.,]\d)?)\s*°?c/);
  if (temp) vitals.temperature = parseFloat((temp[1] || temp[2]).replace(',', '.'));

  const spo2 = t.match(/spo2[:\s]*(\d{2,3})|(\d{2,3})\s*%?\s*(?:spo2|saturasi)/);
  if (spo2) vitals.spo2 = +(spo2[1] || spo2[2]);

  const gluc = t.match(/(?:glucose|gula(?:\s*darah)?|gdp|gds)[:\s]*(\d{2,3})/);
  if (gluc) vitals.glucose = +gluc[1];

  const hb = t.match(/(?:hb|hemoglobin)[:\s]*(\d+(?:[.,]\d)?)/);
  if (hb) vitals.hemoglobin = parseFloat(hb[1].replace(',', '.'));

  const creat = t.match(/(?:creatinine|kreatinin)[:\s]*(\d+(?:[.,]\d)?)/);
  if (creat) vitals.creatinine = parseFloat(creat[1].replace(',', '.'));

  const egfr = t.match(/egfr[:\s]*(\d+)/);
  if (egfr) vitals.egfr = +egfr[1];

  return vitals;
}

// ─── Score Function ───────────────────────────────────────────────────────────
function scoreDisease(disease, allText, vitals) {
  let score = 0;
  disease.keywords.forEach(kw => { if (allText.includes(kw)) score += 10; });
  disease.symptoms.forEach(sym => { if (allText.includes(sym)) score += 3; });
  try { if (Object.keys(vitals).length > 0 && disease.vitalFlags(vitals)) score += 15; } catch (_) {}
  return score;
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function analyzePatientData(patientData) {
  if (!patientData) return null;

  const allText = [
    patientData.diagnosis || '',
    patientData.symptoms || '',
    patientData.medicalHistory || '',
    patientData.vitals || '',
    patientData.chiefComplaint || '',
    patientData.notes || '',
    patientData.name || '',
  ].join(' ').toLowerCase();

  const vitalsText = (patientData.vitals || '') + ' ' + (patientData.diagnosis || '') + ' ' + (patientData.symptoms || '');
  const vitals = parseVitals(vitalsText);

  const scored = DISEASE_KB
    .map(d => ({ disease: d, score: scoreDisease(d, allText, vitals) }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      detected: false,
      message: 'No specific disease pattern identified. Manual clinical review recommended.',
      conditions: [],
      overallSeverity: 'normal',
      generalRecommendations: [
        'Complete physical examination and detailed history taking',
        'Basic investigations: CBC, comprehensive metabolic panel, urinalysis',
        'Review current medications for potential interactions',
        'Reassess in 2–4 weeks or sooner if symptoms worsen',
      ],
      vitals,
      urgentFlags: [],
      analysisDate: new Date().toISOString(),
    };
  }

  const conditions = scored
    .filter(d => d.score >= 5)
    .slice(0, 3)
    .map(({ disease, score }) => {
      let severity = 'moderate';
      try { severity = disease.severity(vitals); } catch (_) {
        if (score >= 20) severity = 'high';
        else if (score >= 10) severity = 'moderate';
        else severity = 'low';
      }
      const confidence = Math.min(Math.round((score / 35) * 100), 97);
      return {
        id: disease.id,
        name: disease.name,
        fullName: disease.fullName,
        icdCode: disease.icdCode,
        color: disease.color,
        severity,
        severityConfig: SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.moderate,
        confidence,
        recommendations: disease.recommendations,
        medications: disease.medications,
        matchedKeywords: disease.keywords.filter(k => allText.includes(k)),
        matchedSymptoms: disease.symptoms.filter(s => allText.includes(s)),
        isUrgent: (() => { try { return disease.urgentIf(vitals); } catch (_) { return false; } })(),
        urgentMessage: disease.urgentMessage,
      };
    });

  // Overall severity = highest
  const overallSeverity = conditions.reduce((acc, c) => {
    const p = SEVERITY_CONFIG[c.severity]?.priority ?? 0;
    const ap = SEVERITY_CONFIG[acc]?.priority ?? 0;
    return p > ap ? c.severity : acc;
  }, 'low');

  // Urgent flags from vitals
  const urgentFlags = [];
  if (vitals.systolic >= 180 || vitals.diastolic >= 120)
    urgentFlags.push('Hypertensive crisis (BP ≥ 180/120) — immediate BP control required');
  if (vitals.spo2 && vitals.spo2 < 90)
    urgentFlags.push('Critical hypoxemia (SpO₂ < 90%) — emergency O₂ therapy required');
  if (vitals.glucose && vitals.glucose >= 400)
    urgentFlags.push('Severe hyperglycemia (glucose ≥ 400) — rule out DKA');
  if (vitals.hemoglobin && vitals.hemoglobin < 7)
    urgentFlags.push('Severe anemia (Hb < 7 g/dL) — transfusion assessment needed');
  if (vitals.temperature && vitals.temperature >= 40)
    urgentFlags.push('Hyperpyrexia (T ≥ 40°C) — systemic infection/sepsis, blood cultures needed');

  return {
    detected: true,
    conditions,
    overallSeverity,
    urgentFlags,
    vitals,
    analysisDate: new Date().toISOString(),
    disclaimer: 'Clinical decision support only. Final diagnosis and treatment must be made by a licensed physician.',
  };
}

export function getSeverityClasses(severity) {
  const map = {
    critical: { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    ring: 'ring-red-200'    },
    high:     { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', ring: 'ring-orange-200' },
    moderate: { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', ring: 'ring-yellow-200' },
    low:      { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  ring: 'ring-green-200'  },
    normal:   { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  ring: 'ring-green-200'  },
  };
  return map[severity] || map.normal;
}
