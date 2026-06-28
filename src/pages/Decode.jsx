import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, ShieldCheck, Loader2, AlertCircle, Brain,
  User, Stethoscope, Calendar, Hash, Building2, Activity,
  FileText, CheckCircle2, ImageIcon, X, ChevronDown, ChevronUp,
  Download, RefreshCw, Printer,
} from 'lucide-react';
import { extractDataFromImage, loadImage, getImageData } from '../utils/steganography';
import { extractFromZip } from '../utils/compression';
import { analyzePatientData } from '../utils/aiAnalysis';
import AIAnalysisPanel from '../components/AIAnalysisPanel';
import QRCodeCard from '../components/QRCodeCard';
import TutorialOverlay from '../components/TutorialOverlay';
import { exportToPDF } from '../utils/pdfExport';
import { saveRecord } from '../utils/medicalHistory';
import CompressionStats from '../components/CompressionStats';

const DECODE_TUTORIAL = [
  { title: 'Dekode Data Medis', body: 'Upload file ZIP yang diterima dari dokter/enkoder. Sistem akan mengekstrak data pasien dari gambar steganografik secara otomatis.' },
  { title: 'Proses Dekode', body: 'Sistem: 1) Dekompresi ZIP, 2) Muat gambar PNG, 3) Ekstrak bit LSB dari piksel, 4) Parse JSON, 5) Jalankan analisis AI ulang dari data yang diekstrak.' },
  { title: 'Hasil & Analisis AI', body: 'Setelah dekode berhasil, data pasien lengkap ditampilkan beserta hasil analisis AI klinis, QR code untuk transfer cepat, dan tombol Export PDF.' },
];

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text/40 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-text mt-0.5 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-heading font-semibold text-text text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-text/30" /> : <ChevronDown className="w-4 h-4 text-text/30" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Decode() {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const fileInputRef = useRef(null);

  // ─── File Handling ────────────────────────────────────────────────────────
  const handleFileChange = useCallback((selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPatientData(null);
    setAnalysis(null);
    setImgUrl(null);
    setError(null);
    setCompressionInfo(null);
  }, []);

  const onInputChange = (e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); };

  const onDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
  };

  const removeFile = () => { setFile(null); setError(null); };

  // ─── Decode Process ───────────────────────────────────────────────────────
  const handleDecode = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setPatientData(null);
    setAnalysis(null);
    setImgUrl(null);
    setCompressionInfo(null);

    try {
      // 1. Extract PNG from ZIP
      const { blob: stegoBlob, originalSize, compressedSize } = await extractFromZip(file);
      setCompressionInfo({ originalSize, compressedSize });

      // 2. Load stego image
      const img = await loadImage(stegoBlob);
      const imageData = getImageData(img);

      // 3. Extract hidden JSON
      let jsonStr;
      try {
        jsonStr = extractDataFromImage(imageData);
      } catch (extractErr) {
        throw new Error(
          extractErr.message.includes('Magic header')
            ? 'This file was encoded with an older version. Please re-encode it using the current system.'
            : extractErr.message
        );
      }

      // 4. Parse JSON
      let data;
      try {
        data = JSON.parse(jsonStr);
      } catch (_) {
        throw new Error(
          'Extracted data is not valid JSON — file may be corrupted or the image was modified after encoding.'
        );
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Decoded data has unexpected format.');
      }

      setPatientData(data);

      // 5. Set image preview
      const url = URL.createObjectURL(stegoBlob);
      setImgUrl(url);

      // 6. Re-run AI analysis from decoded patient data
      setIsAnalyzing(true);
      setTimeout(() => {
        const freshAnalysis = analyzePatientData(data);
        setAnalysis(freshAnalysis);
        setIsAnalyzing(false);
        // Auto-save to local history
        saveRecord(data, 'decoded', freshAnalysis);
      }, 600);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to decode. Ensure this is a valid ZIP from TeleCode Medical.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reRunAnalysis = () => {
    if (!patientData) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setAnalysis(analyzePatientData(patientData));
      setIsAnalyzing(false);
    }, 600);
  };

  const reset = () => {
    setFile(null); setPatientData(null); setAnalysis(null);
    setImgUrl(null); setError(null); setIsAnalyzing(false); setCompressionInfo(null);
  };

  const downloadImage = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `decoded_${patientData?.id || 'image'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <TutorialOverlay id="decode" steps={DECODE_TUTORIAL} />

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-heading font-bold text-text flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-primary" />
          Decode Medical Data
        </h1>
        <p className="text-sm text-text/50 mt-1">Extract patient record &amp; AI analysis from a secure steganographic ZIP</p>
      </motion.div>

      {/* Upload Form */}
      <AnimatePresence mode="wait">
      {!patientData && (
        <motion.div
          key="upload"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
        <form onSubmit={handleDecode}>
          <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-text">Upload Secure ZIP Archive</h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Drop Zone */}
              {!file ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center px-6 py-16 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                    ${isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50/60'}`}
                >
                  <UploadCloud className={`h-14 w-14 mb-3 transition-colors ${isDragOver ? 'text-primary' : 'text-gray-300'}`} />
                  <p className="text-base font-semibold text-text/60 mb-1">
                    {isDragOver ? 'Release to upload' : 'Drop .zip file here or click to browse'}
                  </p>
                  <p className="text-xs text-gray-400">Must be a ZIP containing encoded medical image</p>
                  <input ref={fileInputRef} type="file" className="sr-only" accept=".zip,application/zip" onChange={onInputChange} />
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text truncate">{file.name}</p>
                    <p className="text-xs text-text/40 mt-0.5">{(file.size / 1024).toFixed(1)} KB · ZIP Archive</p>
                  </div>
                  <button type="button" onClick={removeFile}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Decoding Failed</p>
                    <p className="text-sm text-red-600 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Process indicators */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Decompress ZIP',   desc: 'DEFLATE extraction', icon: FileText },
                  { label: 'LSB Extraction',   desc: 'Pixel steganography', icon: ImageIcon },
                  { label: 'AI Re-Analysis',   desc: 'Clinical insights', icon: Brain },
                ].map(({ label, desc, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text">{label}</p>
                      <p className="text-xs text-text/40">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={!file || isProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting…</>
                  : <><ShieldCheck className="w-4 h-4" /> Decompress &amp; Decode</>}
              </button>
            </div>
          </div>
        </form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── RESULTS ── */}
      {patientData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >

          {/* Success Banner */}
          <div className="flex items-center justify-between gap-3 p-4 bg-cta/8 border border-cta/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cta/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-cta" />
              </div>
              <div>
                <p className="font-heading font-bold text-text text-sm">Record Successfully Decoded</p>
                <p className="text-xs text-text/50">Patient data extracted · AI analysis complete · Auto-saved to history</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => exportToPDF(patientData, analysis)} type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Printer className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-text/60 hover:bg-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <RefreshCw className="w-3 h-3" /> New File
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Left: Patient Info + Image (3/5) */}
            <div className="lg:col-span-3 space-y-4">

              {/* Identity */}
              <SectionCard title="Patient Identity" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Patient Name"   value={patientData.name}    icon={User} />
                  <InfoRow label="Medical ID"     value={patientData.id}      icon={Hash} />
                  <InfoRow label="Age"            value={patientData.age ? `${patientData.age} years` : null} icon={User} />
                  <InfoRow label="Gender"         value={patientData.gender}  icon={User} />
                  <InfoRow label="Record Date"    value={patientData.date}    icon={Calendar} />
                  <InfoRow label="Attending Doctor" value={patientData.doctor} icon={Stethoscope} />
                  <InfoRow label="Hospital / Clinic" value={patientData.hospital} icon={Building2} />
                </div>
              </SectionCard>

              {/* Clinical */}
              <SectionCard title="Clinical Data" icon={Stethoscope}>
                <div className="space-y-4">
                  <InfoRow label="Chief Complaint"  value={patientData.chiefComplaint} icon={Activity} />
                  <InfoRow label="Diagnosis"        value={patientData.diagnosis}      icon={Stethoscope} />
                  {patientData.symptoms && (
                    <div>
                      <p className="text-xs font-semibold text-text/40 uppercase tracking-wider mb-2">Symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {patientData.symptoms.split(/[,;]/).map(s => s.trim()).filter(Boolean).map(sym => (
                          <span key={sym} className="px-2.5 py-0.5 bg-primary/8 text-primary text-xs font-medium rounded-full border border-primary/15">
                            {sym}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {patientData.vitals && (
                    <div>
                      <p className="text-xs font-semibold text-text/40 uppercase tracking-wider mb-1">Vital Signs</p>
                      <p className="text-sm text-text/80 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100 font-mono leading-relaxed">
                        {patientData.vitals}
                      </p>
                    </div>
                  )}
                  <InfoRow label="Medical History"  value={patientData.medicalHistory} icon={FileText} />
                  <InfoRow label="Doctor Notes"     value={patientData.notes}          icon={FileText} />
                </div>
              </SectionCard>

              {/* Medical Image */}
              {imgUrl && (
                <SectionCard title="Medical Imagery" icon={ImageIcon}>
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    <img src={imgUrl} alt="Decoded medical scan" className="w-full h-auto max-h-72 object-contain" />
                  </div>
                  <button onClick={downloadImage}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Download className="w-3.5 h-3.5" /> Save Image
                  </button>
                </SectionCard>
              )}
            </div>

            {/* Right: AI Analysis (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden sticky top-24">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="font-heading font-semibold text-text text-sm">AI Analysis</span>
                  </div>
                  {analysis && !isAnalyzing && (
                    <button onClick={reRunAnalysis}
                      className="inline-flex items-center gap-1 text-xs text-text/40 hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1">
                      <RefreshCw className="w-3 h-3" /> Re-run
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <AIAnalysisPanel analysis={analysis} isLoading={isAnalyzing} compact />
                </div>
              </div>

              {/* QR Code */}
              {patientData && !isAnalyzing && (
                <QRCodeCard patientData={patientData} analysis={analysis} />
              )}
            </div>
          </div>

          {/* ── Compression Statistics ── */}
          {compressionInfo && (
            <CompressionStats
              originalSize={compressionInfo.originalSize}
              compressedSize={compressionInfo.compressedSize}
              method="DEFLATE ZIP Level 9 (fflate)"
              context="ZIP container → file asli yang diekstrak. Perbandingan ukuran ZIP vs PNG/WAV yang tersimpan di dalamnya."
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
