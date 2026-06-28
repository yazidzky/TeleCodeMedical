/**
 * QR Code Generator — TeleCode Medical
 * Uses the `qrcode` npm package to generate a QR code from a ZIP blob
 * or from a compact patient summary string.
 */
import QRCode from 'qrcode';

/**
 * Generate a QR code data URL from a text string.
 * @param {string} text
 * @param {object} opts
 * @returns {Promise<string>} data URL (PNG)
 */
export async function generateQR(text, opts = {}) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: opts.width || 300,
    color: {
      dark: opts.dark || '#134E4A',
      light: opts.light || '#FFFFFF',
    },
  });
}

/**
 * Build a compact, QR-friendly summary from patient data.
 * QR codes have a ~2KB limit for reliable scanning.
 * We truncate non-essential fields.
 * @param {object} patientData
 * @param {object|null} analysis
 * @returns {string}
 */
export function buildQRPayload(patientData, analysis) {
  const conditions = analysis?.detected
    ? analysis.conditions.slice(0, 2).map(c => `${c.icdCode}:${c.name}`).join('; ')
    : 'No condition detected';

  const lines = [
    'TCMD-RECORD',
    `NM:${(patientData.name || patientData.patientName || '').slice(0, 40)}`,
    `ID:${patientData.id || patientData.patientId || ''}`,
    `DX:${(patientData.diagnosis || '').slice(0, 60)}`,
    `DT:${patientData.date || ''}`,
    `DR:${(patientData.doctor || patientData.doctorName || '').slice(0, 30)}`,
    `AI:${conditions}`,
    `SEV:${analysis?.overallSeverity || 'N/A'}`,
  ].filter(l => !l.endsWith(':'));

  return lines.join('\n');
}

/**
 * Download a QR code image as PNG.
 * @param {string} dataUrl
 * @param {string} filename
 */
export function downloadQR(dataUrl, filename = 'medical-qr.png') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
