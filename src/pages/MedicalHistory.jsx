import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Trash2, Search, RefreshCw,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  Database, FileText, Stethoscope, Download,
} from 'lucide-react';
import {
  getAllRecords, deleteRecord, clearAllRecords, getStorageStats,
} from '../utils/medicalHistory';
import { getSeverityClasses, SEVERITY_CONFIG } from '../utils/aiAnalysis';
import { exportToPDF } from '../utils/pdfExport';
import TutorialOverlay from '../components/TutorialOverlay';
import { useLang } from '../i18n/LangContext';
import { SkeletonCard, SkeletonStat } from '../components/Skeleton';

const HISTORY_TUTORIAL = [
  { title: 'Riwayat Medis', body: 'Semua hasil Cek Gejala, Enkode, dan Dekode tersimpan otomatis di sini. Data 100% lokal — hanya ada di browser Anda, tidak dikirim ke server manapun.' },
  { title: 'Privasi & Keamanan', body: 'Data disimpan di localStorage browser. Menghapus cache/cookies browser akan menghapus riwayat. Untuk backup, gunakan tombol Export PDF per rekam.' },
  { title: 'Cari & Filter', body: 'Gunakan kotak pencarian untuk menemukan pasien berdasarkan nama, ID, atau diagnosis. Filter berdasarkan tipe: Cek Gejala, Enkode, atau Dekode.' },
];

const TYPE_LABELS = {
  encoded:       { label: 'Encode Image', color: 'bg-primary/10 text-primary border-primary/20' },
  decoded:       { label: 'Decode Image', color: 'bg-secondary/15 text-cyan-700 border-secondary/30' },
  symptom_check: { label: 'Cek Gejala',  color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

function SeverityDot({ severity }) {
  const cls = getSeverityClasses(severity);
  return <span className={`inline-block w-2 h-2 rounded-full ${cls.dot}`} />;
}

function RecordCard({ record, onDelete, onExport }) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg = TYPE_LABELS[record.type] || TYPE_LABELS.encoded;
  const severityLabel = SEVERITY_CONFIG[record.overallSeverity]?.label;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${typeCfg.color}`}>
              {typeCfg.label}
            </span>
            {record.overallSeverity && (
              <span className="flex items-center gap-1 text-xs text-text/50">
                <SeverityDot severity={record.overallSeverity} />
                {severityLabel}
              </span>
            )}
            <span className="text-xs text-text/35 ml-auto">{new Date(record.savedAt).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
          </div>
          <p className="font-heading font-bold text-text">{record.patientName}</p>
          <p className="text-xs text-text/50 mt-0.5">ID: {record.patientId} · {record.date}</p>
          {record.diagnosis !== '—' && (
            <p className="text-xs text-text/60 mt-1 line-clamp-1">{record.diagnosis}</p>
          )}
          {record.conditionNames?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {record.conditionNames.map(c => (
                <span key={c} className="px-1.5 py-0.5 bg-primary/8 text-primary text-xs rounded-md">{c}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={() => setExpanded(!expanded)} title="Lihat detail"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text/40 hover:bg-gray-100 hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => onExport(record)} title="Export PDF"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text/40 hover:bg-gray-100 hover:text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Download className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onDelete(record.id)} title="Hapus"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text/40 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60 space-y-2">
          {Object.entries(record.snapshot || {})
            .filter(([k, v]) => v && !['aiAnalysis'].includes(k))
            .map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <span className="text-text/40 capitalize w-28 flex-shrink-0">{k.replace(/([A-Z])/g,' $1').toLowerCase()}</span>
                <span className="text-text/80 break-words">{String(v).slice(0, 200)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function MedicalHistory() {
  const { t } = useLang();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ count: 0, sizeKB: '0', maxRecords: 50 });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    // Small artificial delay so skeleton is visible even for fast localStorage reads
    setTimeout(() => {
      setRecords(getAllRecords());
      setStats(getStorageStats());
      setLoading(false);
    }, 500);
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = (id) => {
    deleteRecord(id);
    refresh();
  };

  const handleClearAll = () => {
    clearAllRecords();
    setShowClearConfirm(false);
    refresh();
  };

  const handleExport = (record) => {
    exportToPDF(record.snapshot || {}, null);
  };

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.patientId.toLowerCase().includes(search.toLowerCase()) ||
      (r.diagnosis || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || r.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <TutorialOverlay id="history" steps={HISTORY_TUTORIAL} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-heading font-bold text-text flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          {t('history.title','Riwayat Medis')}
        </h1>
        <p className="text-sm text-text/50 mt-1">{t('history.subtitle','Semua rekam medis tersimpan lokal di browser Anda')}</p>
      </motion.div>

      {/* Stats — skeleton while loading */}
      <div className="grid grid-cols-3 gap-3">
        {loading ? (
          [1,2,3].map(i => <SkeletonStat key={i} />)
        ) : (
          [
            { icon: Database,    label: t('history.totalRec','Total Rekam'),  value: `${stats.count} / ${stats.maxRecords}` },
            { icon: FileText,    label: t('history.dataSize','Ukuran Data'),   value: `${stats.sizeKB} KB` },
            { icon: Stethoscope, label: t('history.storedIn','Tersimpan di'),  value: t('history.localBrowser','Browser Lokal') },
          ].map(({ icon: Icon, label, value }, i) => (
            <motion.div
              key={label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-primary" />
                <p className="text-xs text-text/50">{label}</p>
              </div>
              <p className="font-heading font-bold text-text text-sm">{value}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Privacy notice */}
      <motion.div
        className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-green-700 leading-relaxed">
          <strong>100% Privat:</strong> {t('history.privacy','Data hanya tersimpan di localStorage browser Anda. Tidak ada koneksi ke server eksternal.')}
        </p>
      </motion.div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" />
          <input type="text" placeholder={t('history.searchPlh','Cari nama, ID, atau diagnosis…')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">{t('history.allTypes','Semua Tipe')}</option>
          <option value="symptom_check">{t('history.symptomCheck','Cek Gejala')}</option>
          <option value="encoded">{t('history.encoded','Enkode')}</option>
          <option value="decoded">{t('history.decoded','Dekode')}</option>
        </select>
        <button type="button" onClick={refresh} title={t('history.refresh','Refresh')}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-text/50 hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Records list — skeleton while loading */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <SkeletonCard key={i} lines={3} showAvatar />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-text/50">
            {records.length === 0
              ? t('history.noRecords','Belum ada riwayat tersimpan')
              : t('history.noResults','Tidak ada hasil yang cocok')}
          </p>
          <p className="text-xs text-text/35 mt-1">
            {records.length === 0
              ? t('history.noRecordsSub','Gunakan Cek Gejala atau Enkode/Dekode untuk mulai menyimpan')
              : t('common.search','Coba kata kunci berbeda')}
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          <AnimatePresence>
          {filtered.map(r => (
            <motion.div
              key={r.id}
              variants={{
                hidden:  { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
              }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              layout
            >
              <RecordCard record={r} onDelete={handleDelete} onExport={handleExport} />
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Clear all */}
      {!loading && records.length > 0 && (
        <div className="flex justify-end pt-2">
          {!showClearConfirm ? (
            <button type="button" onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <Trash2 className="w-3.5 h-3.5" /> {t('history.deleteAll','Hapus Semua Riwayat')}
            </button>
          ) : (
            <motion.div
              className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700">
                {t('history.confirmDelete','Hapus semua')} {records.length} {t('history.records','rekam? Tidak bisa dikembalikan.')}
              </p>
              <button type="button" onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 cursor-pointer transition-colors">
                {t('history.yesDelete','Ya, Hapus')}
              </button>
              <button type="button" onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-text/60 hover:bg-white cursor-pointer transition-colors">
                {t('common.cancel','Batal')}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
