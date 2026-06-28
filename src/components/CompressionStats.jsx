/**
 * CompressionStats — Visual before/after compression statistics.
 * Shows bar chart, ratio gauge, and byte breakdown for academic context.
 */
import { motion } from 'framer-motion';
import { TrendingDown, FileArchive, Zap, BarChart3, Info } from 'lucide-react';

// ─── Animated bar ──────────────────────────────────────────────────────────────
function AnimatedBar({ label, bytes, maxBytes, color, delay = 0 }) {
  const kb = (bytes / 1024).toFixed(1);
  const pct = maxBytes > 0 ? (bytes / maxBytes) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-text/70">{label}</span>
        <span className="font-mono font-bold text-text">{kb} KB</span>
      </div>
      <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="text-[10px] text-text/40 font-mono">{bytes.toLocaleString()} bytes</p>
    </div>
  );
}

// ─── Ratio gauge (arc-style) ──────────────────────────────────────────────────
function RatioGauge({ ratio }) {
  // ratio = originalSize / compressedSize — higher = better compression
  const capped = Math.min(ratio, 5); // cap at 5× for display
  const pct = ((capped - 1) / 4) * 100; // 1× = 0%, 5× = 100%
  const circumference = 2 * Math.PI * 38;
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <motion.circle
            cx="50" cy="50" r="38"
            fill="none"
            stroke="#0891B2"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - strokeDash }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-heading font-bold text-primary">{ratio.toFixed(2)}×</span>
          <span className="text-[9px] text-text/40 font-medium">ratio</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, accent }) {
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${accent}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * @param {Object} props
 * @param {number} props.originalSize   – bytes before compression
 * @param {number} props.compressedSize – bytes after compression (ZIP)
 * @param {string} [props.method]       – e.g. "DEFLATE ZIP Level 9"
 * @param {string} [props.context]      – e.g. "PNG image + patient JSON payload"
 */
export default function CompressionStats({ originalSize, compressedSize, method = 'DEFLATE ZIP Level 9', context }) {
  if (!originalSize || !compressedSize) return null;

  const saved = originalSize - compressedSize;
  const ratio = originalSize / compressedSize;
  const savedPct = ((saved / originalSize) * 100).toFixed(1);
  const maxBytes = Math.max(originalSize, compressedSize);

  const isEffective = ratio > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-3xl border border-primary/15 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-heading font-bold text-text">Statistik Kompresi</h3>
        <span className="ml-auto text-xs text-text/40 flex items-center gap-1">
          <Info className="w-3 h-3" /> {method}
        </span>
      </div>

      <div className="p-6">
        {context && (
          <p className="text-xs text-text/50 mb-5 italic">{context}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Bar chart — left 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3">
              Sebelum vs Sesudah Kompresi
            </p>
            <AnimatedBar
              label="Sebelum (Original)"
              bytes={originalSize}
              maxBytes={maxBytes}
              color="bg-gradient-to-r from-orange-400 to-orange-500"
              delay={0.1}
            />
            <AnimatedBar
              label="Sesudah (Terkompresi)"
              bytes={compressedSize}
              maxBytes={maxBytes}
              color="bg-gradient-to-r from-primary to-secondary"
              delay={0.3}
            />

            {/* Space saved bar */}
            {isEffective && (
              <div className="mt-2 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-cta/80">Ruang Dihemat</span>
                  <span className="font-mono font-bold text-cta">{(saved / 1024).toFixed(1)} KB ({savedPct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cta/70 to-cta"
                    initial={{ width: 0 }}
                    animate={{ width: `${savedPct}%` }}
                    transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            )}

            {/* Stat pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
              <StatPill
                icon={FileArchive}
                label="Original"
                value={`${(originalSize / 1024).toFixed(1)} KB`}
                accent="border-orange-200 text-orange-700 bg-orange-50/60"
              />
              <StatPill
                icon={Zap}
                label="Compressed"
                value={`${(compressedSize / 1024).toFixed(1)} KB`}
                accent="border-primary/20 text-primary bg-primary/5"
              />
              <StatPill
                icon={TrendingDown}
                label="Penghematan"
                value={isEffective ? `${savedPct}%` : '—'}
                accent="border-cta/20 text-cta bg-cta/5"
              />
            </div>
          </div>

          {/* Gauge — right 1 col */}
          <div className="flex flex-col items-center justify-center gap-4 py-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Rasio Kompresi</p>
            <RatioGauge ratio={ratio} />

            {/* Academic note */}
            <div className="text-center space-y-1 px-2">
              <p className="text-[10px] text-text/40 leading-relaxed">
                Kompresi DEFLATE ZIP (RFC 1951/1952) menggunakan algoritma LZ77 + Huffman coding.
                PNG sudah menggunakan DEFLATE secara internal, sehingga rasio ZIP pada PNG cenderung mendekati 1×.
              </p>
              {ratio < 1.05 && (
                <p className="text-[10px] text-amber-600 font-medium mt-1">
                  ℹ PNG sudah terkompresi — overhead ZIP wajar.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
