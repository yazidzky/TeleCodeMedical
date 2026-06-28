import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, FileLock2, Stethoscope,
  Lock, Zap, Brain, Activity, ChevronRight,
  Layers, FileSearch, ClipboardList, Mic, Video, Music, Search,
} from 'lucide-react';
import TutorialOverlay from '../components/TutorialOverlay';
import AlgorithmDemo from '../components/AlgorithmDemo';

// Shared animation variants
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] } },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};


const DASHBOARD_TUTORIAL = [
  { title: 'Selamat Datang di TeleCode Medical', body: 'Aplikasi ini membantu transmisi data medis secara aman menggunakan steganografi LSB, codec multimedia, dan analisis AI klinis. Cocok untuk telemedicine dan telemedicine.' },
  { title: 'Cek Gejala — Untuk Masyarakat', body: 'Klik "Cek Gejala" untuk memeriksa gejala Anda. AI akan mengidentifikasi kemungkinan penyakit dan memberikan rekomendasi. Gratis, privat, dan offline.' },
  { title: 'Enkode — Untuk Dokter', body: 'Dokter mengisi data pasien, menjalankan analisis AI, lalu menyembunyikan data ke gambar medis (Rontgen/MRI). Hasilnya adalah ZIP yang aman untuk dikirim ke spesialis.' },
  { title: 'Dekode — Untuk Spesialis', body: 'Spesialis upload ZIP dari dokter. Sistem otomatis mengekstrak data pasien + menjalankan analisis AI. Tersedia export PDF dan QR code.' },
  { title: 'Audio & Video Codec', body: 'Rekaman suara dokter (WAV) bisa dikompresi dengan µ-law G.711 dan disisipi metadata. Video konsultasi bisa dikompresi dengan Keyframe+Delta dan disisipi data pasien.' },
];

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, iconBg, title, description }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary/10 hover:shadow-md hover:border-primary/20 transition-all group cursor-default">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-heading font-bold text-text mb-1.5">{title}</h3>
      <p className="text-sm text-text/60 leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Step Item ────────────────────────────────────────────────────────────────
function WorkflowStep({ number, title, description, isLast }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </div>
        {!isLast && <div className="w-px flex-1 bg-primary/20 mt-2 mb-0" />}
      </div>
      <div className={`pb-6 ${isLast ? '' : ''}`}>
        <p className="font-heading font-semibold text-text text-sm">{title}</p>
        <p className="text-xs text-text/55 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Disease Badge ────────────────────────────────────────────────────────────
function DiseaseBadge({ name, icd, color }) {
  const colorMap = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    amber:  'bg-amber-50  text-amber-700  border-amber-200',
    red:    'bg-red-50    text-red-700    border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    blue:   'bg-blue-50   text-blue-700   border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    teal:   'bg-teal-50   text-teal-700   border-teal-200',
    slate:  'bg-slate-50  text-slate-700  border-slate-200',
  };
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${colorMap[color] || colorMap.slate}`}>
      <span className="font-semibold">{name}</span>
      <span className="font-mono opacity-60">{icd}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {

  const diseases = [
    { name: 'Hypertension',         icd: 'I10',   color: 'orange' },
    { name: 'Diabetes Mellitus T2', icd: 'E11',   color: 'amber'  },
    { name: 'Pneumonia (CAP)',       icd: 'J18.9', color: 'red'    },
    { name: 'Iron Deficiency Anemia', icd: 'D50', color: 'purple' },
    { name: 'Bronchial Asthma',     icd: 'J45',   color: 'blue'   },
    { name: 'Chronic Kidney Disease', icd: 'N18', color: 'indigo' },
    { name: 'Urinary Tract Infection', icd: 'N39.0', color: 'teal'},
    { name: 'COPD',                 icd: 'J44',   color: 'slate'  },
  ];

  return (
    <div className="space-y-10">
      <TutorialOverlay id="dashboard" steps={DASHBOARD_TUTORIAL} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        className="relative bg-white rounded-3xl shadow-sm border border-primary/10 overflow-hidden px-6 sm:px-10 py-12"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-secondary/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cta/8 to-transparent rounded-tr-full pointer-events-none" />

        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-full text-xs font-semibold text-primary mb-5">
            <ShieldCheck className="w-3.5 h-3.5" />
            WCAG AAA · Steganografi LSB · Bertenaga AI
          </div>

          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-text leading-tight mb-4">
            Transmisi Data Medis<br /><span className="text-primary">Aman + AI</span>
          </h1>

          <p className="text-base text-text/65 leading-relaxed mb-8 max-w-lg">
            Lindungi metadata pasien dengan menyembunyikannya ke dalam citra medis menggunakan steganografi LSB, dikompresi DEFLATE. Dilengkapi analisis AI klinis.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/cek-gejala"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              <Search className="w-4 h-4" />
              Cek Gejala Sekarang
              <ChevronRight className="w-4 h-4 opacity-70" />
            </Link>
            <Link to="/encode"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-primary/20 text-sm font-bold text-primary bg-white hover:bg-primary/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              <FileLock2 className="w-4 h-4" />
              Enkode Data (Dokter)
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Core Features ────────────────────────────────────────────────── */}
      <motion.section
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
      >
        <h2 className="text-xl font-heading font-bold text-text mb-5">Core Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.div variants={staggerItem}><FeatureCard icon={Lock}        iconBg="bg-secondary/15 text-primary"  title="Image Steganography" description="LSB embedding on X-Ray/MRI/CT scans. Patient data hidden invisibly in pixel channels." /></motion.div>
          <motion.div variants={staggerItem}><FeatureCard icon={Mic}         iconBg="bg-orange-100 text-orange-600" title="Audio Codec (µ-law)" description="G.711 µ-law compresses WAV 16-bit → 8-bit (50% reduction). LSB stego in audio samples." /></motion.div>
          <motion.div variants={staggerItem}><FeatureCard icon={Video}       iconBg="bg-blue-100 text-blue-600"     title="Video Codec (Keyframe+Delta)" description="Keyframe JPEG + delta frame differencing. Metadata embedded in keyframe LSB." /></motion.div>
          <motion.div variants={staggerItem}><FeatureCard icon={Zap}         iconBg="bg-cta/15 text-cta"            title="DEFLATE Compression" description="All media wrapped in DEFLATE ZIP (level 9). Lossless packaging for telemedicine." /></motion.div>
          <motion.div variants={staggerItem}><FeatureCard icon={Brain}       iconBg="bg-primary/15 text-primary"    title="AI Clinical Analysis" description="Rule-based engine covers 8 conditions, parses vitals, generates evidence-based recommendations." /></motion.div>
          <motion.div variants={staggerItem}><FeatureCard icon={Stethoscope} iconBg="bg-purple-100 text-purple-600" title="WCAG AAA Accessible" description="High contrast, keyboard navigation, focus rings, and 44×44px touch targets throughout." /></motion.div>
        </div>
      </motion.section>

      {/* ── Media Codec Overview ─────────────────────────────────────────── */}
      <motion.section
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
      >
        {[
          {
            to: '/encode',
            icon: FileLock2,
            color: 'text-primary bg-primary/10 border-primary/15',
            title: 'Image Codec',
            subtitle: 'X-Ray · MRI · CT Scan',
            items: ['LSB steganography on PNG pixels', 'DEFLATE ZIP compression', 'Magic header + length prefix', 'AI analysis embedded'],
          },
          {
            to: '/audio',
            icon: Music,
            color: 'text-orange-600 bg-orange-50 border-orange-200',
            title: 'Audio Codec',
            subtitle: 'Voice Note · Diagnosis Recording',
            items: ['µ-law G.711 16-bit → 8-bit', '50% sample size reduction', 'LSB stego in WAV samples', 'WAV parse & rebuild'],
          },
          {
            to: '/video',
            icon: Video,
            color: 'text-blue-600 bg-blue-50 border-blue-200',
            title: 'Video Codec',
            subtitle: 'Consultation · Procedure Recording',
            items: ['Frame extraction via Canvas API', 'Keyframe (JPEG) + Delta frames', 'Only changed pixels in delta', 'LSB stego on keyframe'],
          },
        ].map(({ to, icon: Icon, color, title, subtitle, items }) => (
          <motion.div key={to} variants={staggerItem}>
          <Link to={to}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer block">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-heading font-bold text-text mb-0.5 flex items-center gap-2">
              {title}
              <ChevronRight className="w-4 h-4 text-text/30 group-hover:text-primary transition-colors ml-auto" />
            </p>
            <p className="text-xs text-text/45 mb-3">{subtitle}</p>
            <ul className="space-y-1.5">
              {items.map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-text/60">
                  <div className="w-1 h-1 rounded-full bg-primary/50 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Link>
          </motion.div>
        ))}
      </motion.section>

      {/* ── Algorithm Demo (Before / After interactive) ─────────────────── */}
      <AlgorithmDemo />

      {/* ── Workflow + AI Diseases ────────────────────────────────────────── */}
      <motion.section
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >

        {/* Workflow */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6">
          <h2 className="text-base font-heading font-bold text-text mb-5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> How It Works
          </h2>
          <div>
            <WorkflowStep number="1" title="Enter Patient Data"
              description="Fill patient identity, chief complaint, diagnosis, symptoms, vital signs, and medical history." />
            <WorkflowStep number="2" title="Run AI Analysis"
              description="The AI engine analyzes your input, detects disease patterns, parses vitals, and generates clinical recommendations." />
            <WorkflowStep number="3" title="Attach Medical Image"
              description="Upload X-Ray, MRI, CT scan, or any medical imagery as the steganographic carrier." />
            <WorkflowStep number="4" title="Encode & Download"
              description="Patient data + AI analysis is embedded via LSB into the image, then compressed into a secure ZIP." />
            <WorkflowStep number="5" title="Decode at Destination" isLast
              description="Specialist uploads the ZIP to extract the full patient record and view the embedded AI recommendations." />
          </div>
        </div>

        {/* AI Coverage */}
        <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6">
          <h2 className="text-base font-heading font-bold text-text mb-1 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> AI Disease Coverage
          </h2>
          <p className="text-xs text-text/45 mb-4">8 conditions with ICD-10 codes, severity staging, and clinical recommendations</p>
          <div className="space-y-2">
            {diseases.map(d => <DiseaseBadge key={d.icd} {...d} />)}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { val: '8', label: 'Conditions' },
                { val: '4', label: 'Severity Levels' },
                { val: '50+', label: 'Clinical Tips' },
              ].map(({ val, label }) => (
                <div key={label} className="bg-primary/5 rounded-xl py-3 px-2">
                  <p className="text-xl font-heading font-bold text-primary">{val}</p>
                  <p className="text-xs text-text/50 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── AI Analysis Details ───────────────────────────────────────────── */}
      <motion.section
        className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-base font-heading font-bold text-text mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> AI Analysis Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: FileSearch,
              title: 'Pattern Detection',
              items: ['Keyword & symptom matching', 'Multi-condition detection', 'ICD-10 classification', 'Confidence scoring (0–97%)'],
            },
            {
              icon: Activity,
              title: 'Vital Sign Parsing',
              items: ['Blood pressure (systolic/diastolic)', 'Temperature, SpO₂', 'Blood glucose, Hemoglobin', 'Creatinine, eGFR'],
            },
            {
              icon: ClipboardList,
              title: 'Clinical Output',
              items: ['Evidence-based recommendations', 'Pharmacotherapy suggestions', 'Urgent flag alerts', '4 severity levels (Critical → Low)'],
            },
          ].map(({ icon: Icon, title, items }, i) => (
            <motion.div
              key={title}
              className="bg-gray-50 rounded-xl border border-gray-100 p-4"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-bold text-text">{title}</p>
              </div>
              <ul className="space-y-1.5">
                {items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-text/65">
                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.section>

    </div>
  );
}
