import { Brain, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Pill, ClipboardList, Zap, Info } from 'lucide-react';
import { useState } from 'react';
import { getSeverityClasses, SEVERITY_CONFIG } from '../utils/aiAnalysis';

// ─── Severity Badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.normal;
  const cls = getSeverityClasses(severity);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls.bg} ${cls.text} border ${cls.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value, color }) {
  const colorMap = {
    red: 'bg-red-500', orange: 'bg-orange-500', amber: 'bg-amber-500',
    yellow: 'bg-yellow-500', blue: 'bg-blue-500', purple: 'bg-purple-500',
    teal: 'bg-teal-500', indigo: 'bg-indigo-500', slate: 'bg-slate-500',
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorMap[color] || 'bg-primary'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-text/70 w-10 text-right">{value}%</span>
    </div>
  );
}

// ─── Disease Card ─────────────────────────────────────────────────────────────
function DiseaseCard({ condition, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cls = getSeverityClasses(condition.severity);
  const borderColorMap = {
    red: 'border-l-red-500', orange: 'border-l-orange-500', amber: 'border-l-amber-500',
    yellow: 'border-l-yellow-500', blue: 'border-l-blue-500', purple: 'border-l-purple-500',
    teal: 'border-l-teal-500', indigo: 'border-l-indigo-500', slate: 'border-l-slate-400',
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4 ${borderColorMap[condition.color] || 'border-l-primary'}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between p-4 text-left cursor-pointer hover:bg-gray-50/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-text/40 bg-gray-100 px-1.5 py-0.5 rounded">{condition.icdCode}</span>
            <SeverityBadge severity={condition.severity} />
            {condition.isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                <AlertTriangle className="w-3 h-3" /> URGENT
              </span>
            )}
          </div>
          <p className="font-heading font-bold text-text text-base leading-tight">{condition.name}</p>
          <p className="text-xs text-text/50 mt-0.5">{condition.fullName}</p>
          <div className="mt-2">
            <p className="text-xs text-text/50 mb-1">Keyakinan AI</p>
            <ConfidenceBar value={condition.confidence} color={condition.color} />
          </div>
        </div>
        <div className="ml-3 flex-shrink-0 text-text/40 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Urgent Banner */}
      {condition.isUrgent && (
        <div className="mx-4 mb-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-700">{condition.urgentMessage}</p>
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Matched indicators */}
          {(condition.matchedKeywords.length > 0 || condition.matchedSymptoms.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2">Indikator Terdeteksi</p>
              <div className="flex flex-wrap gap-1.5">
                {[...condition.matchedKeywords, ...condition.matchedSymptoms]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .slice(0, 8)
                  .map(kw => (
                    <span key={kw} className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls.bg} ${cls.text} border ${cls.border}`}>
                      {kw}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-text/60 uppercase tracking-wider">Rekomendasi Klinis</p>
            </div>
            <ol className="space-y-2">
              {condition.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-sm text-text/80 leading-relaxed">{rec}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Pill className="w-4 h-4 text-secondary" />
              <p className="text-xs font-semibold text-text/60 uppercase tracking-wider">Farmakoterapi</p>
            </div>
            <div className="space-y-1.5">
              {condition.medications.map((med, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                  <span className="text-sm text-text/80 font-medium">{med}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Parsed Vitals Display ────────────────────────────────────────────────────
function VitalsGrid({ vitals }) {
  const items = [];
  if (vitals.systolic)    items.push({ label: 'Tekanan Darah', value: `${vitals.systolic}/${vitals.diastolic} mmHg` });
  if (vitals.temperature) items.push({ label: 'Suhu', value: `${vitals.temperature} °C` });
  if (vitals.spo2)        items.push({ label: 'SpO₂', value: `${vitals.spo2}%` });
  if (vitals.glucose)     items.push({ label: 'Gula Darah', value: `${vitals.glucose} mg/dL` });
  if (vitals.hemoglobin)  items.push({ label: 'Hemoglobin', value: `${vitals.hemoglobin} g/dL` });
  if (vitals.creatinine)  items.push({ label: 'Kreatinin', value: `${vitals.creatinine} mg/dL` });
  if (vitals.egfr)        items.push({ label: 'eGFR', value: `${vitals.egfr} mL/min` });
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2">Tanda Vital Terdeteksi</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
            <p className="text-xs text-text/40 mb-0.5">{item.label}</p>
            <p className="text-sm font-bold text-text">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function AIAnalysisPanel({ analysis, isLoading = false, compact = false }) {

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-primary/10 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <p className="font-heading font-bold text-text">Analisis AI Klinis</p>
            <p className="text-xs text-text/50">Menganalisis data pasien…</p>
          </div>
        </div>
        <div className="space-y-2">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className={`h-3 bg-gray-100 rounded-full animate-pulse`} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const overallCls = getSeverityClasses(analysis.overallSeverity);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className={`rounded-2xl border p-4 ${overallCls.bg} ${overallCls.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overallCls.bg} border ${overallCls.border}`}>
              <Brain className={`w-5 h-5 ${overallCls.text}`} />
            </div>
            <div>
              <p className={`font-heading font-bold ${overallCls.text} flex items-center gap-2`}>
                Analisis AI Klinis
                <SeverityBadge severity={analysis.overallSeverity} />
              </p>
              <p className="text-xs text-text/50 mt-0.5">
                {analysis.detected
                  ? `${analysis.conditions.length} kondisi teridentifikasi`
                  : 'Tidak ada pola penyakit spesifik'}
              </p>
            </div>
          </div>
          {analysis.detected && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-text/40">Utama</p>
              <p className="text-xs font-bold text-text">{analysis.conditions[0]?.icdCode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Urgent Flags */}
      {analysis.urgentFlags?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-red-600" />
            <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Tanda Peringatan Mendesak</p>
          </div>
          {analysis.urgentFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{flag}</p>
            </div>
          ))}
        </div>
      )}

      {/* Vitals parsed */}
      {analysis.vitals && Object.keys(analysis.vitals).length > 0 && !compact && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <VitalsGrid vitals={analysis.vitals} />
        </div>
      )}

      {/* No detection fallback */}
      {!analysis.detected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="font-semibold text-text">{analysis.message}</p>
          </div>
          <ol className="space-y-2">
            {analysis.generalRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span className="text-sm text-text/80">{rec}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Disease Cards */}
      {analysis.detected && (
        <div className="space-y-3">
          {analysis.conditions.map((condition, i) => (
            <DiseaseCard key={condition.id} condition={condition} index={i} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          {analysis.disclaimer || 'Hanya pendukung keputusan klinis. Diagnosis dan pengobatan final harus dilakukan oleh dokter berlisensi.'}
        </p>
      </div>
    </div>
  );
}
