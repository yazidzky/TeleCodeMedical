import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileLock2, ShieldCheck, Download, Loader2,
  Brain, User, Stethoscope, Activity, FileText, ChevronRight,
  CheckCircle2, ImageIcon, X, Printer, Lock, Zap, SlidersHorizontal,
  BarChart2, Eye,
} from 'lucide-react';
import { embedDataInImage, loadImage, getImageData, imageDataToBlob } from '../utils/steganography';
import { compressToZip } from '../utils/compression';
import { analyzePatientData } from '../utils/aiAnalysis';
import AIAnalysisPanel from '../components/AIAnalysisPanel';
import { saveRecord } from '../utils/medicalHistory';
import { exportToPDF } from '../utils/pdfExport';
import QRCodeCard from '../components/QRCodeCard';
import VitalsWarningBox from '../components/VitalsWarningBox';
import TutorialOverlay from '../components/TutorialOverlay';
import CompressionStats from '../components/CompressionStats';
import BeforeAfterViewer from '../components/BeforeAfterViewer';
import { validateVitalsText, validateAge } from '../utils/vitalsValidator';
import {
  rleEncodeImage, getRleStats,
  histogramEqualization, calculatePSNR,
  aesEncrypt, uint8ToBase64,
} from '../utils/imageProcessing';

// Framer Motion variants
const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

const ENCODE_TUTORIAL = [
  { title: 'Enkode Data Medis', body: 'Halaman ini memungkinkan dokter menyembunyikan data pasien ke dalam gambar medis (X-Ray/MRI) menggunakan steganografi LSB. Data dikompresi dengan DEFLATE ZIP untuk keamanan transmisi.' },
  { title: 'Langkah 1 — Data Pasien', body: 'Isi identitas pasien dan data klinis lengkap. Semakin lengkap data, semakin akurat analisis AI. Nama, ID, dan Diagnosis wajib diisi.' },
  { title: 'Langkah 2 — Analisis AI', body: 'Setelah mengisi data, klik "Jalankan Analisis AI". Sistem akan mendeteksi kondisi penyakit, mem-parsing tanda vital, dan memberikan rekomendasi klinis berbasis bukti.' },
  { title: 'Langkah 3 — Gambar Medis', body: 'Upload foto Rontgen, MRI, atau CT Scan. Pastikan gambar minimal 300×300px. Data pasien akan disembunyikan secara tidak terlihat ke dalam piksel gambar.' },
  { title: 'Langkah 4 — Unduh ZIP', body: 'ZIP berisi gambar stego + data terenkripsi siap diunduh dan dikirim ke spesialis. Gunakan halaman Dekode untuk mengekstrak kembali datanya.' },
];

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBadge({ step, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'opacity-100' : done ? 'opacity-70' : 'opacity-30'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
        ${done ? 'bg-cta text-white' : active ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span className={`text-sm font-medium hidden sm:block ${active ? 'text-text' : 'text-text/50'}`}>{label}</span>
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-text/70 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-text/40 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Encode() {
  const [currentStep, setCurrentStep] = useState(1); // 1=Patient, 2=AI, 3=Image, 4=Done
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [patientData, setPatientData] = useState({
    name: '',
    id: '',
    age: '',
    gender: '',
    diagnosis: '',
    symptoms: '',
    vitals: '',
    medicalHistory: '',
    chiefComplaint: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    hospital: '',
  });
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultZip, setResultZip] = useState(null);
  const [compressionInfo, setCompressionInfo] = useState(null); // { originalSize, compressedSize }
  const fileInputRef = useRef(null);

  // ─── New feature states ───────────────────────────────────────────────────
  // Image processing options
  const [useHistEq, setUseHistEq]     = useState(false);
  const [useRle, setUseRle]           = useState(false);
  const [useAes, setUseAes]           = useState(false);
  const [aesPassword, setAesPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Before/After preview
  const [beforeSrc, setBeforeSrc]     = useState(null);
  const [afterSrc, setAfterSrc]       = useState(null);
  const [stegoSrc, setStegoSrc]       = useState(null);  // LSB stego preview

  // Quality & compression metrics
  const [psnrResult, setPsnrResult]   = useState(null);  // { psnr, quality }
  const [rleStats, setRleStats]       = useState(null);  // { ratio, saved, ... }
  const [processStage, setProcessStage] = useState('');

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const set = (key, val) => setPatientData(prev => ({ ...prev, [key]: val }));

  // Compute vitals warnings in real-time
  const vitalsWarnings = validateVitalsText(patientData.vitals);
  const ageWarnings    = validateAge(patientData.age);

  const handleFileChange = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) { alert('Please upload an image file (PNG, JPG, JPEG).'); return; }
    setFile(selectedFile);
    setResultZip(null);
    setPsnrResult(null);
    setRleStats(null);
    setAfterSrc(null);
    setStegoSrc(null);
    const url = URL.createObjectURL(selectedFile);
    setFilePreview(url);
    setBeforeSrc(url);
  }, []);

  const onInputChange = (e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); };

  const onDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  };

  const step1Complete = patientData.name && patientData.id && patientData.diagnosis;

  // ─── Step 1 → 2: Run AI analysis ─────────────────────────────────────────
  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzePatientData(patientData);
      setAnalysis(result);
      setIsAnalyzing(false);
      setCurrentStep(2);
    }, 800); // slight delay for UX feel
  };

  // ─── Step 3: Encode & Compress ────────────────────────────────────────────
  const handleEncode = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (useAes && !aesPassword) { alert('Please enter an encryption password.'); return; }
    setIsProcessing(true);
    setProcessStage('Loading image…');
    try {
      const img = await loadImage(file);
      let imageData = getImageData(img);

      // ── Step A: Histogram Equalization (optional) ──
      let enhancedImageData = imageData;
      if (useHistEq) {
        setProcessStage('Applying histogram equalization…');
        enhancedImageData = histogramEqualization(imageData);
        // Build "after enhancement" preview
        const eqBlob = await imageDataToBlob(enhancedImageData);
        setAfterSrc(URL.createObjectURL(eqBlob));
      }

      // ── Step B: RLE Compression stats (optional, informational) ──
      if (useRle) {
        setProcessStage('Computing RLE compression stats…');
        const rleResult = rleEncodeImage(enhancedImageData);
        setRleStats(getRleStats(rleResult.originalBytes, rleResult.compressedBytes));
      }

      // ── Step C: Build payload ──
      const { aiAnalysis: _stripped, ...patientOnly } = { ...patientData, aiAnalysis: undefined };
      let payload = JSON.stringify(patientOnly);

      // ── Step D: AES-256-GCM encryption (optional) ──
      if (useAes) {
        setProcessStage('Encrypting payload with AES-256-GCM…');
        const encrypted = await aesEncrypt(payload, aesPassword);
        // Store as base64 string with AES prefix so decoder knows it's encrypted
        payload = 'AES256:' + uint8ToBase64(encrypted);
      }

      // Check capacity
      const capacityBytes = Math.floor((enhancedImageData.data.length / 4) * 3 / 8) - 8;
      const payloadBytes = new TextEncoder().encode(payload).length;
      if (payloadBytes > capacityBytes) {
        const neededSide = Math.ceil(Math.sqrt(Math.ceil((payloadBytes * 8 + 64) / 3)));
        throw new Error(
          `Image too small (${img.width}×${img.height}px). ` +
          `Payload is ${payloadBytes} bytes. ` +
          `Please use an image at least ${neededSide}×${neededSide}px.`
        );
      }

      // ── Step E: LSB steganography ──
      setProcessStage('Embedding data via LSB steganography…');
      const stegoImageData = embedDataInImage(enhancedImageData, payload);
      const stegoBlob = await imageDataToBlob(stegoImageData);

      // Build stego preview & PSNR
      const stegoUrl = URL.createObjectURL(stegoBlob);
      setStegoSrc(stegoUrl);
      // PSNR between enhanced (before LSB) and stego (after LSB)
      const psnr = calculatePSNR(enhancedImageData, stegoImageData);
      setPsnrResult(psnr);

      // If histogram eq was not applied, set afterSrc to stego for comparison
      if (!useHistEq) setAfterSrc(stegoUrl);

      // ── Step F: ZIP compression ──
      setProcessStage('Compressing into ZIP…');
      const { blob: zipBlob, originalSize, compressedSize } = await compressToZip(stegoBlob, 'securely_encoded.png');
      setResultZip(zipBlob);
      setCompressionInfo({ originalSize, compressedSize });
      saveRecord(patientData, 'encoded', analysis);
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
      alert('Encoding error: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProcessStage('');
    }
  };

  const downloadZip = () => {
    if (!resultZip) return;
    const url = URL.createObjectURL(resultZip);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical_${patientData.id || 'record'}_${patientData.date}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setCurrentStep(1); setAnalysis(null); setResultZip(null); setCompressionInfo(null);
    setPsnrResult(null); setRleStats(null); setAfterSrc(null); setStegoSrc(null); setBeforeSrc(null);
    setProcessStage('');
    removeFile();
    setPatientData({ name:'',id:'',age:'',gender:'',diagnosis:'',symptoms:'',vitals:'',medicalHistory:'',chiefComplaint:'',notes:'',date:new Date().toISOString().split('T')[0],doctor:'',hospital:'' });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <TutorialOverlay id="encode" steps={ENCODE_TUTORIAL} />

      {/* Page Header */}
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl font-heading font-bold text-text flex items-center gap-2">
            <FileLock2 className="w-6 h-6 text-primary" />
            Encode Medical Data
          </h1>
          <p className="text-sm text-text/50 mt-1">Embed patient record + AI analysis into a secure steganographic image</p>
        </div>
      </motion.div>

      {/* Step Progress */}
      <motion.div
        className="bg-white rounded-2xl border border-primary/10 shadow-sm px-5 py-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <StepBadge step={1} label="Patient Data"    active={currentStep === 1} done={currentStep > 1} />
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <StepBadge step={2} label="AI Analysis"     active={currentStep === 2} done={currentStep > 2} />
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <StepBadge step={3} label="Attach Image"    active={currentStep === 3} done={currentStep > 3} />
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <StepBadge step={4} label="Download"        active={currentStep === 4} done={false} />
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

      {/* ── STEP 1: Patient Data ── */}
      {currentStep === 1 && (
        <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-text">Patient Information</h2>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Identity */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Identity
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Patient Name" required>
                  <input type="text" className={inputCls} placeholder="Full name"
                    value={patientData.name} onChange={e => set('name', e.target.value)} />
                </Field>
                <Field label="Medical ID" required>
                  <input type="text" className={inputCls} placeholder="MRN-0001"
                    value={patientData.id} onChange={e => set('id', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Age">
                  <input type="number" className={inputCls} placeholder="45" min="0" max="120"
                    value={patientData.age} onChange={e => set('age', e.target.value)} />
                </Field>
                <Field label="Gender">
                  <select className={inputCls} value={patientData.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">— select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Record Date" required>
                <input type="date" className={inputCls}
                  value={patientData.date} onChange={e => set('date', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Attending Doctor">
                  <input type="text" className={inputCls} placeholder="Dr. Name"
                    value={patientData.doctor} onChange={e => set('doctor', e.target.value)} />
                </Field>
                <Field label="Hospital / Clinic">
                  <input type="text" className={inputCls} placeholder="Facility name"
                    value={patientData.hospital} onChange={e => set('hospital', e.target.value)} />
                </Field>
              </div>
            </div>

            {/* Right: Clinical */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Clinical Data
              </p>
              <Field label="Chief Complaint">
                <input type="text" className={inputCls} placeholder="e.g. Chest pain for 2 days"
                  value={patientData.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} />
              </Field>
              <Field label="Diagnosis / Assessment" required hint="Include disease name for better AI analysis">
                <textarea rows={2} className={inputCls} placeholder="e.g. Hypertension stage 2, Type 2 Diabetes…"
                  value={patientData.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
              </Field>
              <Field label="Symptoms" hint="Comma-separated: fever, headache, dyspnea…">
                <textarea rows={2} className={inputCls} placeholder="fever, dizziness, shortness of breath, chest pain…"
                  value={patientData.symptoms} onChange={e => set('symptoms', e.target.value)} />
              </Field>
              <Field label="Vital Signs" hint="e.g. BP 140/90, Temp 38.5°C, SpO2 95%, Glucose 180">
                <textarea rows={2} className={inputCls} placeholder="BP 140/90 mmHg, Temp 38.5°C, SpO2 96%, HR 88"
                  value={patientData.vitals} onChange={e => set('vitals', e.target.value)} />
              </Field>
              {(vitalsWarnings.length > 0 || ageWarnings.length > 0) && (
                <VitalsWarningBox warnings={[...ageWarnings, ...vitalsWarnings]} />
              )}
              <Field label="Medical History">
                <textarea rows={2} className={inputCls} placeholder="Hypertension, DM since 2018, no allergies…"
                  value={patientData.medicalHistory} onChange={e => set('medicalHistory', e.target.value)} />
              </Field>
              <Field label="Additional Notes">
                <textarea rows={2} className={inputCls} placeholder="Doctor notes, test results, follow-up plans…"
                  value={patientData.notes} onChange={e => set('notes', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={!step1Complete || isAnalyzing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isAnalyzing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                : <><Brain className="w-4 h-4" /> Run AI Analysis</>}
            </button>
          </div>
        </div>
        </motion.div>
      )}

      {/* ── STEP 2: AI Analysis ── */}
      {currentStep === 2 && (
        <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-text">AI Clinical Analysis</h2>
              <span className="ml-auto text-xs text-text/40">Results will be embedded in the final record</span>
            </div>
            <div className="p-6">
              <AIAnalysisPanel analysis={analysis} />
            </div>
          </div>

          <div className="flex gap-3 justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Edit Patient Data
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ImageIcon className="w-4 h-4" /> Attach Medical Image
            </button>
          </div>
        </div>
        </motion.div>
      )}

      {/* ── STEP 3: Image + Encode ── */}
      {currentStep === 3 && (
        <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <form onSubmit={handleEncode} className="space-y-5">
          <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-text">Attach Medical Imagery</h2>
              <span className="ml-auto text-xs text-text/40">X-Ray, MRI, CT scan, or any medical scan</span>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload zone */}
              <div>
                {!file ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center px-6 py-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                      ${isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}
                  >
                    <UploadCloud className={`h-12 w-12 mb-3 transition-colors ${isDragOver ? 'text-primary' : 'text-gray-300'}`} />
                    <p className="text-sm font-semibold text-text/60 mb-1">
                      {isDragOver ? 'Drop to upload' : 'Drop image or click to browse'}
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, JPEG — max 10 MB</p>
                    <input ref={fileInputRef} type="file" className="sr-only" accept="image/*" onChange={onInputChange} />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gray-50">
                    <img src={filePreview} alt="Medical scan preview" className="w-full h-56 object-contain bg-gray-100" />
                    <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{file.name}</p>
                        <p className="text-xs text-text/40">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={removeFile}
                        className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary + Processing Options */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Encoding Summary
                  </p>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Patient', patientData.name || '—'],
                      ['Medical ID', patientData.id || '—'],
                      ['Age / Gender', [patientData.age, patientData.gender].filter(Boolean).join(' / ') || '—'],
                      ['Diagnosis', patientData.diagnosis ? patientData.diagnosis.slice(0, 50) + (patientData.diagnosis.length > 50 ? '…' : '') : '—'],
                      ['Record Date', patientData.date],
                      ['AI Conditions', analysis?.detected ? analysis.conditions.map(c => c.name).join(', ') : 'None detected'],
                    ].map(([label, val]) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-text/40 w-28 flex-shrink-0">{label}</span>
                        <span className="text-text font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payload size indicator */}
                {(() => {
                  const { aiAnalysis: _s, ...patientOnly } = { ...patientData };
                  const payloadBytes = new TextEncoder().encode(JSON.stringify(patientOnly)).length;
                  const minSide = Math.ceil(Math.sqrt(Math.ceil((payloadBytes * 8 + 64) / 3)));
                  return (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 space-y-1">
                      <p className="font-semibold">Payload size: ~{payloadBytes} bytes</p>
                      <p className="text-blue-600">Image must be at least <span className="font-bold">{minSide}×{minSide}px</span> to fit this data.</p>
                    </div>
                  );
                })()}

                {/* ── Processing Options ── */}
                <div className="border border-primary/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-primary/4 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <p className="text-xs font-bold text-text">Processing Options</p>
                  </div>
                  <div className="px-4 py-3 space-y-3">

                    {/* Histogram Equalization */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={useHistEq} onChange={e => setUseHistEq(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer" />
                      <div>
                        <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-primary" /> Histogram Equalization
                        </p>
                        <p className="text-xs text-text/45 mt-0.5">Enhance X-Ray/MRI contrast before embed. Before/after preview will be shown.</p>
                      </div>
                    </label>

                    {/* RLE Stats */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={useRle} onChange={e => setUseRle(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer" />
                      <div>
                        <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-primary" /> RLE Compression Analysis
                        </p>
                        <p className="text-xs text-text/45 mt-0.5">Compute Run-Length Encoding stats. Effective for X-Ray with large uniform areas.</p>
                      </div>
                    </label>

                    {/* AES Encryption */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={useAes} onChange={e => setUseAes(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-primary" /> AES-256-GCM Encryption
                        </p>
                        <p className="text-xs text-text/45 mt-0.5">Encrypt payload before LSB embed. Decoder needs the password.</p>
                        {useAes && (
                          <div className="mt-2 relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-xs text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Enter encryption password…"
                              value={aesPassword}
                              onChange={e => setAesPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowPassword(p => !p)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text/40 hover:text-primary cursor-pointer">
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-gray-100">
                  {[
                    { icon: ShieldCheck, text: 'LSB steganography embedding' },
                    { icon: FileText,    text: 'DEFLATE ZIP compression' },
                    { icon: Brain,       text: 'AI re-generated on decode' },
                    { icon: Zap,         text: 'PSNR quality metric after encode' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-text/60">
                      <Icon className="w-3.5 h-3.5 text-primary" /> {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Back to Analysis
              </button>
              <button type="submit"
                disabled={!file || isProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {processStage || 'Processing…'}</>
                  : <><ShieldCheck className="w-4 h-4" /> Encode &amp; Compress</>}
              </button>
            </div>
          </div>
        </form>
        </motion.div>
      )}

      {/* ── STEP 4: Success + Download ── */}
      {currentStep === 4 && resultZip && (
        <motion.div key="step4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-cta/20 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-cta/10 flex items-center gap-3 bg-cta/5">
              <div className="w-10 h-10 rounded-xl bg-cta/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-cta" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-text">Encoding Complete</h2>
                <p className="text-xs text-text/50">Patient data + AI analysis embedded and compressed</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Steganography', desc: 'LSB pixel embedding', icon: FileLock2, color: 'text-primary bg-primary/10' },
                  { label: 'Compression',   desc: 'DEFLATE ZIP (level 9)', icon: Activity,   color: 'text-secondary bg-secondary/10' },
                  { label: 'AI Analysis',   desc: 'Embedded in payload',  icon: Brain,      color: 'text-cta bg-cta/10' },
                ].map(({ label, desc, icon: Icon, color }, i) => (
                  <motion.div
                    key={label}
                    className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.35 }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text">{label}</p>
                      <p className="text-xs text-text/50">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* ── Before / After Viewer ── */}
              {beforeSrc && (stegoSrc || afterSrc) && (
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {useHistEq ? 'Before Encoding vs After Histogram Equalization' : 'Original vs Stego Image (LSB embedded)'}
                  </p>
                  <BeforeAfterViewer
                    beforeSrc={beforeSrc}
                    afterSrc={useHistEq ? afterSrc : stegoSrc}
                    beforeLabel="Original"
                    afterLabel={useHistEq ? 'Hist. EQ' : 'Stego (LSB)'}
                    height={280}
                  />
                  {/* Stego vs original comparison if hist eq was also applied */}
                  {useHistEq && stegoSrc && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary/60 flex items-center gap-1.5 pt-2">
                        <ShieldCheck className="w-3.5 h-3.5" /> After Enhancement vs After LSB Steganography
                      </p>
                      <BeforeAfterViewer
                        beforeSrc={afterSrc}
                        afterSrc={stegoSrc}
                        beforeLabel="Enhanced"
                        afterLabel="Stego (LSB)"
                        height={220}
                      />
                    </>
                  )}
                </motion.div>
              )}

              {/* ── Metrics Row ── */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* PSNR */}
                {psnrResult && (
                  <div className={`p-4 rounded-2xl border ${
                    psnrResult.quality === 'excellent' ? 'bg-green-50 border-green-200' :
                    psnrResult.quality === 'good'      ? 'bg-blue-50 border-blue-200' :
                    psnrResult.quality === 'fair'      ? 'bg-yellow-50 border-yellow-200' :
                                                         'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart2 className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold text-text">PSNR Quality</p>
                    </div>
                    <p className={`text-2xl font-heading font-bold ${
                      psnrResult.quality === 'excellent' ? 'text-green-700' :
                      psnrResult.quality === 'good'      ? 'text-blue-700' :
                      psnrResult.quality === 'fair'      ? 'text-yellow-700' : 'text-red-700'}`}>
                      {psnrResult.psnr === Infinity ? '∞' : `${psnrResult.psnr} dB`}
                    </p>
                    <p className="text-xs text-text/50 mt-0.5 capitalize">{psnrResult.quality} — {
                      psnrResult.quality === 'excellent' ? 'safe for diagnosis' :
                      psnrResult.quality === 'good'      ? 'acceptable quality' :
                      psnrResult.quality === 'fair'      ? 'review recommended' : 'not for diagnosis'
                    }</p>
                    <p className="text-xs text-text/35 mt-1">MSE: {psnrResult.mse}</p>
                  </div>
                )}

                {/* RLE Stats */}
                {rleStats && (
                  <div className={`p-4 rounded-2xl border ${rleStats.effective ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold text-text">RLE Compression</p>
                    </div>
                    <p className={`text-2xl font-heading font-bold ${rleStats.effective ? 'text-green-700' : 'text-gray-600'}`}>
                      {rleStats.ratio}×
                    </p>
                    <p className="text-xs text-text/50 mt-0.5">{rleStats.saved}% size reduction</p>
                    <p className="text-xs text-text/35 mt-1">
                      {(rleStats.originalBytes / 1024).toFixed(0)} KB → {(rleStats.compressedBytes / 1024).toFixed(0)} KB
                    </p>
                    {!rleStats.effective && (
                      <p className="text-xs text-amber-600 mt-1">Non-uniform image — RLE not effective</p>
                    )}
                  </div>
                )}

                {/* AES indicator */}
                {useAes && (
                  <div className="p-4 rounded-2xl border bg-purple-50 border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-bold text-text">AES-256-GCM</p>
                    </div>
                    <p className="text-2xl font-heading font-bold text-purple-700">Encrypted</p>
                    <p className="text-xs text-text/50 mt-0.5">Payload secured with password</p>
                    <p className="text-xs text-purple-600 mt-1">PBKDF2 · 100k iterations · SHA-256</p>
                  </div>
                )}
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={downloadZip}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cta text-white text-sm font-bold shadow-sm hover:bg-cta/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cta">
                  <Download className="w-4 h-4" />
                  Download medical_{patientData.id || 'record'}_{patientData.date}.zip
                </button>
                <button onClick={() => exportToPDF(patientData, analysis)}
                  className="sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Printer className="w-4 h-4" /> Export PDF
                </button>
                <button onClick={reset}
                  className="sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Encode Another Record
                </button>
              </div>
            </div>
          </div>

          {/* ── Compression Statistics ── */}
          {compressionInfo && (
            <CompressionStats
              originalSize={compressionInfo.originalSize}
              compressedSize={compressionInfo.compressedSize}
              method="DEFLATE ZIP Level 9 (fflate)"
              context="Stego PNG (gambar medis + data pasien LSB-embedded) → ZIP container. PNG sudah menggunakan DEFLATE internal, sehingga rasio ZIP ≈ 1×."
            />
          )}

          {/* Show analysis + QR in step 4 */}
          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-semibold text-text text-sm">Embedded AI Analysis</h3>
                </div>
                <div className="p-6">
                  <AIAnalysisPanel analysis={analysis} />
                </div>
              </div>
              <div>
                <QRCodeCard patientData={patientData} analysis={analysis} />
              </div>
            </div>
          )}
        </div>
        </motion.div>
      )}

      </AnimatePresence>
    </div>
  );
}
