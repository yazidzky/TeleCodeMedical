/**
 * Local Medical History — TeleCode Medical
 * Stores encoded/decoded records in localStorage (no server needed, fully private)
 */

const STORAGE_KEY = 'tcm_medical_history';
const MAX_RECORDS = 50;

export function getAllRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveRecord(patientData, type = 'encoded', analysis = null) {
  const records = getAllRecords();
  const newRecord = {
    id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    savedAt: new Date().toISOString(),
    type, // 'encoded' | 'decoded' | 'symptom_check'
    patientName: patientData.name || patientData.patientName || 'Unknown',
    patientId: patientData.id || patientData.patientId || '—',
    date: patientData.date || new Date().toISOString().split('T')[0],
    diagnosis: patientData.diagnosis || patientData.chiefComplaint || '—',
    overallSeverity: analysis?.overallSeverity || null,
    conditionNames: analysis?.conditions?.map(c => c.name) || [],
    snapshot: patientData, // full data
  };
  const updated = [newRecord, ...records].slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newRecord;
}

export function deleteRecord(id) {
  const records = getAllRecords().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearAllRecords() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getRecord(id) {
  return getAllRecords().find(r => r.id === id) || null;
}

export function getStorageStats() {
  const records = getAllRecords();
  const raw = localStorage.getItem(STORAGE_KEY) || '';
  return {
    count: records.length,
    sizeKB: (new TextEncoder().encode(raw).length / 1024).toFixed(1),
    maxRecords: MAX_RECORDS,
  };
}
