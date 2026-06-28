/**
 * PDF Export — TeleCode Medical
 * Uses window.print() with a dedicated print stylesheet (no dependencies).
 * Generates a clean A4 medical report layout.
 */

import { SEVERITY_CONFIG } from './aiAnalysis';

function severityLabel(s) {
  return SEVERITY_CONFIG[s]?.label || s || 'N/A';
}

function escHtml(str) {
  if (!str && str !== 0) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildConditionHtml(condition) {
  const recs = condition.recommendations.map(r => `<li>${escHtml(r)}</li>`).join('');
  const meds = condition.medications.map(m => `<span class="med-badge">${escHtml(m)}</span>`).join('');
  const urgentBanner = condition.isUrgent
    ? `<div class="urgent-banner">⚠ URGENT: ${escHtml(condition.urgentMessage)}</div>`
    : '';
  return `
    <div class="condition-card ${condition.severity}">
      ${urgentBanner}
      <div class="condition-header">
        <div>
          <span class="icd-badge">${escHtml(condition.icdCode)}</span>
          <strong>${escHtml(condition.name)}</strong>
          <span class="condition-full">${escHtml(condition.fullName)}</span>
        </div>
        <div class="severity-badge sev-${condition.severity}">${severityLabel(condition.severity)}</div>
      </div>
      <div class="confidence-bar-wrap">
        <span class="confidence-label">AI Confidence</span>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width:${condition.confidence}%"></div>
        </div>
        <span class="confidence-pct">${condition.confidence}%</span>
      </div>
      <div class="section-label">Clinical Recommendations</div>
      <ol class="rec-list">${recs}</ol>
      <div class="section-label">Pharmacotherapy</div>
      <div class="med-list">${meds}</div>
    </div>`;
}

function buildVitalsHtml(vitals) {
  if (!vitals || !Object.keys(vitals).length) return '';
  const items = [
    vitals.systolic    && `<div class="vital-item"><span>Blood Pressure</span><strong>${vitals.systolic}/${vitals.diastolic} mmHg</strong></div>`,
    vitals.temperature && `<div class="vital-item"><span>Temperature</span><strong>${vitals.temperature} °C</strong></div>`,
    vitals.spo2        && `<div class="vital-item"><span>SpO₂</span><strong>${vitals.spo2}%</strong></div>`,
    vitals.glucose     && `<div class="vital-item"><span>Blood Glucose</span><strong>${vitals.glucose} mg/dL</strong></div>`,
    vitals.hemoglobin  && `<div class="vital-item"><span>Hemoglobin</span><strong>${vitals.hemoglobin} g/dL</strong></div>`,
    vitals.creatinine  && `<div class="vital-item"><span>Creatinine</span><strong>${vitals.creatinine} mg/dL</strong></div>`,
    vitals.egfr        && `<div class="vital-item"><span>eGFR</span><strong>${vitals.egfr} mL/min</strong></div>`,
  ].filter(Boolean).join('');
  return items ? `<div class="vitals-grid">${items}</div>` : '';
}

export function exportToPDF(patientData, analysis) {
  const urgentBanners = (analysis?.urgentFlags || [])
    .map(f => `<div class="urgent-flag">⚠ ${escHtml(f)}</div>`).join('');

  const conditionsHtml = analysis?.detected
    ? analysis.conditions.map((c) => buildConditionHtml(c)).join('')
    : `<p class="no-condition">No specific disease pattern identified. Manual clinical review recommended.</p>`;

  const genRecs = !analysis?.detected && analysis?.generalRecommendations
    ? `<ol class="rec-list">${analysis.generalRecommendations.map(r => `<li>${escHtml(r)}</li>`).join('')}</ol>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Medical Report — ${escHtml(patientData.name || patientData.patientName)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#134E4A; background:#fff; padding:0; }
  .page { max-width:800px; margin:0 auto; padding:32px 40px; }

  /* Header */
  .report-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2.5px solid #0891B2; padding-bottom:16px; margin-bottom:20px; }
  .report-brand { display:flex; align-items:center; gap:10px; }
  .brand-dot { width:32px; height:32px; background:#0891B2; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:14px; }
  .brand-name { font-size:16pt; font-weight:800; color:#0891B2; }
  .brand-sub  { font-size:8pt; color:#64748b; margin-top:1px; }
  .report-meta { text-align:right; font-size:9pt; color:#64748b; }
  .report-meta strong { color:#134E4A; }

  /* Section title */
  .section-title { font-size:10pt; font-weight:700; color:#0891B2; text-transform:uppercase; letter-spacing:.06em; margin:20px 0 10px; border-left:3px solid #0891B2; padding-left:8px; }

  /* Patient info grid */
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .info-item { background:#f0fdfa; border:1px solid #ccfbf1; border-radius:8px; padding:8px 12px; }
  .info-item span { display:block; font-size:8pt; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
  .info-item strong { display:block; font-size:10pt; color:#134E4A; margin-top:2px; }
  .info-item.full { grid-column:1/-1; }

  /* Vitals */
  .vitals-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; }
  .vital-item { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px; }
  .vital-item span { display:block; font-size:8pt; color:#64748b; }
  .vital-item strong { display:block; font-size:10pt; color:#0f172a; margin-top:2px; }

  /* Severity */
  .overall-severity { display:inline-flex; align-items:center; gap:8px; padding:8px 16px; border-radius:999px; font-weight:700; font-size:10pt; margin-bottom:12px; }
  .overall-severity.critical { background:#fef2f2; color:#b91c1c; border:1.5px solid #fecaca; }
  .overall-severity.high     { background:#fff7ed; color:#c2410c; border:1.5px solid #fed7aa; }
  .overall-severity.moderate { background:#fefce8; color:#a16207; border:1.5px solid #fde68a; }
  .overall-severity.low, .overall-severity.normal { background:#f0fdf4; color:#15803d; border:1.5px solid #bbf7d0; }

  /* Urgent */
  .urgent-flag   { background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px 12px; font-size:9.5pt; color:#b91c1c; font-weight:600; margin-bottom:8px; }
  .urgent-banner { background:#fef2f2; border-radius:6px; padding:6px 10px; font-size:9pt; color:#b91c1c; font-weight:600; margin-bottom:8px; }

  /* Condition cards */
  .condition-card { border:1.5px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:14px; border-left-width:4px; }
  .condition-card.critical { border-left-color:#ef4444; }
  .condition-card.high     { border-left-color:#f97316; }
  .condition-card.moderate { border-left-color:#eab308; }
  .condition-card.low, .condition-card.normal { border-left-color:#22c55e; }
  .condition-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
  .icd-badge  { background:#f1f5f9; color:#64748b; font-family:monospace; font-size:8pt; padding:2px 6px; border-radius:4px; margin-right:6px; }
  .condition-full { font-size:8.5pt; color:#64748b; margin-left:6px; }
  .severity-badge { font-size:8pt; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; }
  .sev-critical { background:#fef2f2; color:#b91c1c; }
  .sev-high     { background:#fff7ed; color:#c2410c; }
  .sev-moderate { background:#fefce8; color:#a16207; }
  .sev-low, .sev-normal { background:#f0fdf4; color:#15803d; }
  .confidence-bar-wrap { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .confidence-label { font-size:8pt; color:#64748b; white-space:nowrap; }
  .confidence-bar   { flex:1; height:6px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
  .confidence-fill  { height:100%; background:#0891B2; border-radius:99px; }
  .confidence-pct   { font-size:8pt; font-weight:700; color:#0891B2; }
  .section-label { font-size:8pt; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin:10px 0 6px; }
  .rec-list { padding-left:18px; }
  .rec-list li { font-size:9.5pt; color:#1e293b; margin-bottom:4px; line-height:1.5; }
  .med-list { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .med-badge { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:6px; padding:3px 10px; font-size:8.5pt; }

  /* Notes */
  .notes-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; font-size:9.5pt; color:#334155; line-height:1.6; }

  /* Footer */
  .report-footer { margin-top:28px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }
  .disclaimer { font-size:8pt; color:#94a3b8; max-width:500px; line-height:1.4; }
  .print-date { font-size:8pt; color:#94a3b8; }
  .no-condition { color:#64748b; font-size:10pt; padding:12px; }

  @media print {
    body { padding:0; }
    .page { padding:20px 28px; }
    .condition-card { break-inside:avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="report-header">
    <div class="report-brand">
      <div class="brand-dot">T</div>
      <div>
        <div class="brand-name">TeleCode Medical</div>
        <div class="brand-sub">Secure Medical Data Transmission + AI Clinical Analysis</div>
      </div>
    </div>
    <div class="report-meta">
      <div><strong>Medical Report</strong></div>
      <div>Generated: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}</div>
      <div>Time: ${new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</div>
    </div>
  </div>

  <!-- Patient Info -->
  <div class="section-title">Patient Information</div>
  <div class="info-grid">
    <div class="info-item"><span>Patient Name</span><strong>${escHtml(patientData.name || patientData.patientName)}</strong></div>
    <div class="info-item"><span>Medical ID</span><strong>${escHtml(patientData.id || patientData.patientId)}</strong></div>
    <div class="info-item"><span>Age</span><strong>${escHtml(patientData.age) !== '—' ? escHtml(patientData.age) + ' years' : '—'}</strong></div>
    <div class="info-item"><span>Gender</span><strong>${escHtml(patientData.gender)}</strong></div>
    <div class="info-item"><span>Record Date</span><strong>${escHtml(patientData.date)}</strong></div>
    <div class="info-item"><span>Doctor</span><strong>${escHtml(patientData.doctor || patientData.doctorName)}</strong></div>
    ${patientData.hospital ? `<div class="info-item full"><span>Hospital / Clinic</span><strong>${escHtml(patientData.hospital)}</strong></div>` : ''}
    ${patientData.chiefComplaint ? `<div class="info-item full"><span>Chief Complaint</span><strong>${escHtml(patientData.chiefComplaint)}</strong></div>` : ''}
    <div class="info-item full"><span>Diagnosis</span><strong>${escHtml(patientData.diagnosis)}</strong></div>
    ${patientData.symptoms ? `<div class="info-item full"><span>Symptoms</span><strong>${escHtml(patientData.symptoms)}</strong></div>` : ''}
    ${patientData.vitals ? `<div class="info-item full"><span>Vital Signs</span><strong>${escHtml(patientData.vitals)}</strong></div>` : ''}
    ${patientData.medicalHistory ? `<div class="info-item full"><span>Medical History</span><strong>${escHtml(patientData.medicalHistory)}</strong></div>` : ''}
  </div>

  ${analysis?.vitals && Object.keys(analysis.vitals).length ? `
  <div class="section-title">Parsed Vital Signs</div>
  ${buildVitalsHtml(analysis.vitals)}
  ` : ''}

  ${patientData.notes ? `
  <div class="section-title">Doctor Notes</div>
  <div class="notes-box">${escHtml(patientData.notes)}</div>
  ` : ''}

  <!-- AI Analysis -->
  <div class="section-title">AI Clinical Analysis</div>
  ${analysis ? `
    <div class="overall-severity ${analysis.overallSeverity || 'normal'}">
      Overall Severity: ${severityLabel(analysis.overallSeverity)}
      ${analysis.detected ? ` — ${analysis.conditions.length} condition(s) identified` : ' — No specific pattern'}
    </div>
    ${urgentBanners}
    ${conditionsHtml}
    ${genRecs}
  ` : '<p class="no-condition">No AI analysis available.</p>'}

  <!-- Footer -->
  <div class="report-footer">
    <p class="disclaimer">
      This report is generated by TeleCode Medical AI Clinical Decision Support System.
      All recommendations are for reference only and must be validated by a licensed physician.
    </p>
    <p class="print-date">TeleCode Medical &copy; ${new Date().getFullYear()}</p>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}
