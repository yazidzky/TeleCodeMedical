import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Brain, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Stethoscope, Thermometer, Heart, Wind,
  Droplets, ClipboardList, Info, ArrowRight, X,
} from 'lucide-react';
import { analyzePatientData, getSeverityClasses, SEVERITY_CONFIG } from '../utils/aiAnalysis';
import AIAnalysisPanel from '../components/AIAnalysisPanel';
import { saveRecord } from '../utils/medicalHistory';
import VitalsWarningBox from '../components/VitalsWarningBox';
import TutorialOverlay from '../components/TutorialOverlay';
import { validateVitalsFields } from '../utils/vitalsValidator';

const SYMPTOM_TUTORIAL = [
  { title: 'Cek Gejala', body: 'Fitur ini membantu Anda mengidentifikasi kemungkinan kondisi kesehatan berdasarkan gejala yang dirasakan. Cocok untuk pemeriksaan awal sebelum ke dokter.' },
  { title: 'Pilih Gejala', body: 'Ketuk tombol gejala yang Anda rasakan. Anda bisa memilih lebih dari satu gejala. Semakin banyak gejala yang dipilih, semakin akurat analisis AI.' },
  { title: 'Tanda Vital (Opsional)', body: 'Masukkan nilai tanda vital jika tersedia (tensi, suhu, SpO₂, gula darah). Sistem akan otomatis memvalidasi apakah nilainya normal atau perlu perhatian.' },
  { title: 'Hasil AI', body: 'AI akan menampilkan kemungkinan penyakit beserta tingkat keparahan, rekomendasi klinis berbasis bukti, dan saran obat. Selalu konfirmasi ke dokter untuk diagnosis final.' },
];

// ─── Common symptoms for quick selection ─────────────────────────────────────
const QUICK_SYMPTOMS = [
  { id: 'demam',    label: 'Demam', en: 'fever' },
  { id: 'batuk',    label: 'Batuk', en: 'cough' },
  { id: 'sesak',    label: 'Sesak Napas', en: 'shortness of breath' },
  { id: 'pusing',   label: 'Pusing', en: 'dizziness' },
  { id: 'nyeri_dada',label:'Nyeri Dada', en: 'chest pain' },
  { id: 'lemas',    label: 'Lemas / Fatigue', en: 'fatigue' },
  { id: 'mual',     label: 'Mual', en: 'nausea' },
  { id: 'sakit_kepala', label: 'Sakit Kepala', en: 'headache' },
  { id: 'sering_kencing', label: 'Sering Kencing', en: 'polyuria' },
  { id: 'haus',     label: 'Haus Berlebihan', en: 'polydipsia' },
  { id: 'mengi',    label: 'Mengi (Wheezing)', en: 'wheezing' },
  { id: 'bengkak',  label: 'Kaki Bengkak', en: 'edema' },
  { id: 'batuk_darah', label: 'Batuk Berdahak', en: 'productive cough' },
  { id: 'nyeri_kencing', label: 'Nyeri Saat Kencing', en: 'dysuria' },
  { id: 'pucat',    label: 'Pucat / Anemia', en: 'pallor fatigue' },
  { id: 'penglihatan_buram', label: 'Penglihatan Buram', en: 'blurred vision' },
];

// ─── Vital input fields ───────────────────────────────────────────────────────
const VITAL_FIELDS = [
  { key: 'bp',    label: 'Tekanan Darah', placeholder: 'mis. 140/90', icon: Heart,       hint: 'mmHg' },
  { key: 'temp',  label: 'Suhu Tubuh',    placeholder: 'mis. 38.5',   icon: Thermometer, hint: '°C' },
  { key: 'spo2',  label: 'SpO₂ / Saturasi', placeholder: 'mis. 95',  icon: Wind,        hint: '%' },
  { key: 'glucose', label: 'Gula Darah',  placeholder: 'mis. 180',    icon: Droplets,    hint: 'mg/dL' },
];

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all';

// Remove unused SeverityBadge — handled by AIAnalysisPanel internally

export default function SymptomChecker() {
  const [step, setStep] = useState(1); // 1=symptoms, 2=vitals, 3=results
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [vitals, setVitals] = useState({ bp: '', temp: '', spo2: '', glucose: '' });
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleSymptom = (sym) => {
    setSelectedSymptoms(prev =>
      prev.find(s => s.id === sym.id)
        ? prev.filter(s => s.id !== sym.id)
        : [...prev, sym]
    );
  };

  const addCustom = () => {
    const trimmed = customSymptom.trim();
    if (!trimmed) return;
    const id = `custom_${Date.now()}`;
    setSelectedSymptoms(prev => [...prev, { id, label: trimmed, en: trimmed }]);
    setCustomSymptom('');
  };

  const removeSymptom = (id) => setSelectedSymptoms(prev => prev.filter(s => s.id !== id));

  const handleAnalyze = () => {
    if (selectedSymptoms.length === 0) return;
    setIsAnalyzing(true);
    setStep(3);

    const symptomText = selectedSymptoms.map(s => s.en || s.label).join(', ');
    const vitalsText = [
      vitals.bp    && `BP ${vitals.bp} mmHg`,
      vitals.temp  && `Temp ${vitals.temp}°C`,
      vitals.spo2  && `SpO2 ${vitals.spo2}%`,
      vitals.glucose && `Glucose ${vitals.glucose} mg/dL`,
    ].filter(Boolean).join(', ');

    const patientInput = {
      name: name || 'Anonim',
      age,
      gender,
      symptoms: symptomText,
      vitals: vitalsText,
      chiefComplaint: symptomText,
      diagnosis: '',
      date: new Date().toISOString().split('T')[0],
    };

    setTimeout(() => {
      const result = analyzePatientData(patientInput);
      setAnalysis(result);
      setIsAnalyzing(false);
    }, 900);
  };

  const handleSave = () => {
    if (!analysis) return;
    const patientInput = {
      name: name || 'Anonim', age, gender,
      symptoms: selectedSymptoms.map(s => s.label).join(', '),
      date: new Date().toISOString().split('T')[0],
    };
    saveRecord(patientInput, 'symptom_check', analysis);
    setSaved(true);
  };

  const reset = () => {
    setStep(1); setSelectedSymptoms([]); setCustomSymptom('');
    setName(''); setAge(''); setGender(''); setVitals({ bp:'',temp:'',spo2:'',glucose:'' });
    setAnalysis(null); setIsAnalyzing(false); setSaved(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <TutorialOverlay id="symptom" steps={SYMPTOM_TUTORIAL} />

      {/* Header card with animated steps */}
      <motion.div
        className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="px-6 py-5 bg-gradient-to-r from-primary/8 to-secondary/5 border-b border-primary/10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text flex items-center gap-2">
                <Search className="w-6 h-6 text-primary" />
                Cek Gejala
              </h1>
              <p className="text-sm text-text/55 mt-1">Pilih gejala yang Anda rasakan, AI akan membantu identifikasi kemungkinan kondisi kesehatan</p>
            </div>
            {step === 3 && (
              <button onClick={reset} type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-text/60 hover:bg-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <RefreshCw className="w-3.5 h-3.5" /> Cek Ulang
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4">
            {[{ n:1, label:'Gejala' }, { n:2, label:'Tanda Vital' }, { n:3, label:'Hasil AI' }].map(({ n, label }, i, arr) => (
              <div key={n} className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: step === n ? 1.05 : 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${step >= n ? 'bg-primary text-white' : 'bg-gray-100 text-text/40'}`}
                >
                  <span>{n}</span><span className="hidden sm:inline">{label}</span>
                </motion.div>
                {i < arr.length - 1 && <ArrowRight className={`w-3 h-3 flex-shrink-0 ${step > n ? 'text-primary' : 'text-gray-300'}`} />}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
        {/* ── STEP 1: Symptoms ── */}
        {step === 1 && (
          <motion.div key="s1" className="p-6 space-y-5"
            initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >            {/* Identity (optional) */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text/60 mb-1">Nama (opsional)</label>
                <input type="text" className={inputCls} placeholder="Nama Anda"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text/60 mb-1">Usia</label>
                <input type="number" className={inputCls} placeholder="25" min="1" max="120"
                  value={age} onChange={e => setAge(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text/60 mb-1">Jenis Kelamin</label>
                <select className={inputCls} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">— pilih —</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            {/* Quick symptom tags */}
            <div>
              <p className="text-sm font-semibold text-text mb-2">Pilih gejala yang Anda rasakan:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SYMPTOMS.map(sym => {
                  const active = selectedSymptoms.find(s => s.id === sym.id);
                  return (
                    <button key={sym.id} type="button" onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                        ${active
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-text/70 border-gray-200 hover:border-primary/50 hover:text-primary'}`}>
                      {sym.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom symptom */}
            <div>
              <p className="text-xs font-semibold text-text/60 mb-1.5">Tambah gejala lain:</p>
              <div className="flex gap-2">
                <input type="text" className={inputCls} placeholder="Ketik gejala lain, mis. nyeri pinggang…"
                  value={customSymptom} onChange={e => setCustomSymptom(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
                <button type="button" onClick={addCustom}
                  className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap">
                  + Tambah
                </button>
              </div>
            </div>

            {/* Selected summary */}
            {selectedSymptoms.length > 0 && (
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
                <p className="text-xs font-semibold text-primary mb-2">Gejala dipilih ({selectedSymptoms.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSymptoms.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-full text-xs font-medium text-text border border-primary/20">
                      {s.label}
                      <button type="button" onClick={() => removeSymptom(s.id)}
                        className="text-text/40 hover:text-red-500 cursor-pointer ml-0.5 focus:outline-none">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setStep(2)} disabled={selectedSymptoms.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Lanjut ke Tanda Vital <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Vitals ── */}
        {step === 2 && (
          <motion.div key="s2" className="p-6 space-y-5"
            initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">Tanda vital bersifat opsional, namun membantu AI memberikan analisis yang lebih akurat.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {VITAL_FIELDS.map(({ key, label, placeholder, icon: Icon, hint }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-text/60 mb-1 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-primary" /> {label}
                    <span className="text-text/35 font-normal">({hint})</span>
                  </label>
                  <input type="text" className={inputCls} placeholder={placeholder}
                    value={vitals[key]} onChange={e => setVitals(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
            </div>

            {/* Real-time vitals validation */}
            {(() => {
              const w = validateVitalsFields(vitals);
              return w.length > 0 ? <VitalsWarningBox warnings={w} /> : null;
            })()}

            {/* Selected symptoms recap */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-text/50 mb-1.5">Gejala yang dipilih:</p>
              <p className="text-sm text-text/80">{selectedSymptoms.map(s => s.label).join(', ')}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Kembali
              </button>
              <button type="button" onClick={handleAnalyze}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Brain className="w-4 h-4" /> Analisis AI Sekarang
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Results ── */}
        {step === 3 && (
          <motion.div key="s3" className="p-6 space-y-5"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Symptoms recap */}
            <div className="flex flex-wrap gap-1.5">
              {selectedSymptoms.map(s => (
                <span key={s.id} className="px-2.5 py-0.5 bg-primary/8 text-primary text-xs font-medium rounded-full border border-primary/15">
                  {s.label}
                </span>
              ))}
            </div>

            {/* AI Result */}
            <AIAnalysisPanel analysis={analysis} isLoading={isAnalyzing} />

            {/* Save to history */}
            {analysis && !isAnalyzing && (
              <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                <p className="text-sm text-text/60">Simpan hasil ke Riwayat Medis lokal?</p>
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cta">
                    <CheckCircle2 className="w-4 h-4" /> Tersimpan
                  </span>
                ) : (
                  <button type="button" onClick={handleSave}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cta text-white text-xs font-semibold hover:bg-cta/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cta">
                    <ClipboardList className="w-3.5 h-3.5" /> Simpan Riwayat
                  </button>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Penting:</strong> Hasil ini hanya untuk referensi awal. Segera konsultasikan ke dokter untuk diagnosis dan pengobatan yang tepat. Jangan menunda pertolongan medis jika gejala berat.
              </p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>

      {/* Info card */}
      {step === 1 && (
        <motion.div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" /> Penyakit yang dapat dideteksi
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { name: 'Hipertensi', icd: 'I10', color: 'text-orange-700 bg-orange-50 border-orange-200' },
              { name: 'Diabetes T2', icd: 'E11', color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { name: 'Pneumonia', icd: 'J18.9', color: 'text-red-700 bg-red-50 border-red-200' },
              { name: 'Anemia', icd: 'D50', color: 'text-purple-700 bg-purple-50 border-purple-200' },
              { name: 'Asma', icd: 'J45', color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { name: 'Gagal Ginjal', icd: 'N18', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
              { name: 'ISK', icd: 'N39.0', color: 'text-teal-700 bg-teal-50 border-teal-200' },
              { name: 'PPOK', icd: 'J44', color: 'text-slate-700 bg-slate-50 border-slate-200' },
            ].map(({ name, icd, color }) => (
              <div key={icd} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${color}`}>
                <span className="font-semibold">{name}</span>
                <span className="font-mono opacity-60 text-[10px]">{icd}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
