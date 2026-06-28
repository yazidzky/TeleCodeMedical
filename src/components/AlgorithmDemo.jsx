import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, Zap, Lock, RefreshCw, Info } from 'lucide-react';
import BeforeAfterViewer from './BeforeAfterViewer';
import {
  generateSyntheticXRay,
  applyHistEqToCanvas,
  visualizeLSBPlane,
  visualizeRLERuns,
} from '../utils/demoImages';
import { embedDataInImage, getImageData } from '../utils/steganography';

const SAMPLE_PAYLOAD = JSON.stringify({
  name: 'Budi Santoso', id: 'MRN-2025-001',
  diagnosis: 'Hypertension stage 2', vitals: 'BP 160/100, SpO2 97%',
  date: '2025-06-29', doctor: 'Dr. Ahmad Fauzi',
});

/**
 * Interactive algorithm demo section for Dashboard.
 * Generates a synthetic X-Ray and shows before/after for:
 *  1. Histogram Equalization
 *  2. LSB Steganography (LSB plane visualization)
 *  3. RLE Run-boundary visualization
 */
export default function AlgorithmDemo() {
  const [activeTab, setActiveTab]   = useState('histeq');
  const [beforeUrl, setBeforeUrl]   = useState(null);
  const [afterUrl, setAfterUrl]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [rleStats, setRleStats]     = useState(null);
  const generatedRef = useRef(false);

  const generate = () => {
    setLoading(true);
    generatedRef.current = false;
    // Small delay so loading state renders
    setTimeout(() => buildDemo(activeTab), 50);
  };

  const buildDemo = (tab) => {
    const xray = generateSyntheticXRay(512, 512);
    const beforeDataUrl = xray.toDataURL('image/png');
    setBeforeUrl(beforeDataUrl);

    if (tab === 'histeq') {
      const eq = applyHistEqToCanvas(xray);
      setAfterUrl(eq.toDataURL('image/png'));
      setRleStats(null);

    } else if (tab === 'lsb') {
      // Embed sample payload then visualize LSB plane
      const ctx    = xray.getContext('2d');
      const imgData = ctx.getImageData(0, 0, xray.width, xray.height);
      try {
        embedDataInImage(imgData, SAMPLE_PAYLOAD);
        ctx.putImageData(imgData, 0, 0);
      } catch (_) { /* ignore capacity errors on tiny canvas */ }
      const lsbCanvas = visualizeLSBPlane(xray);
      setAfterUrl(lsbCanvas.toDataURL('image/png'));
      setRleStats(null);

    } else if (tab === 'rle') {
      const rleViz = visualizeRLERuns(xray);
      setAfterUrl(rleViz.toDataURL('image/png'));

      // Compute actual RLE stats
      const ctx    = xray.getContext('2d');
      const data   = ctx.getImageData(0, 0, xray.width, xray.height).data;
      const n      = xray.width * xray.height;
      let pairs    = 0;
      let prev     = -1;
      let count    = 0;
      for (let i = 0; i < n; i++) {
        const lum = Math.round(0.2126*data[i*4] + 0.7152*data[i*4+1] + 0.0722*data[i*4+2]);
        if (lum === prev && count < 255) { count++; }
        else { if (prev !== -1) pairs++; prev = lum; count = 1; }
      }
      if (prev !== -1) pairs++;
      const origBytes = n;          // 1 byte/px grayscale
      const rleBytes  = pairs * 2;  // 2 bytes/pair
      setRleStats({
        origBytes, rleBytes, pairs,
        ratio: (origBytes / rleBytes).toFixed(2),
        saved: ((1 - rleBytes / origBytes) * 100).toFixed(1),
      });
    }
    setLoading(false);
    generatedRef.current = true;
  };

  // Build on mount and when tab changes
  useEffect(() => { buildDemo(activeTab); }, [activeTab]); // eslint-disable-line

  const tabs = [
    {
      id: 'histeq',
      icon: Eye,
      label: 'Histogram EQ',
      color: 'text-primary',
      desc: 'Increases contrast in dark X-Ray images so doctors can see details more clearly.',
      afterLabel: 'After Hist. EQ',
    },
    {
      id: 'lsb',
      icon: Lock,
      label: 'LSB Steganography',
      color: 'text-purple-600',
      desc: 'LSB plane visualization — shows which pixels were modified to embed patient data. Visually undetectable at normal view.',
      afterLabel: 'LSB Plane (×128)',
    },
    {
      id: 'rle',
      icon: Zap,
      label: 'RLE Compression',
      color: 'text-orange-600',
      desc: 'Run-Length Encoding — alternating color bands show where runs of identical pixels start/end.',
      afterLabel: 'RLE Runs',
    },
  ];

  const active = tabs.find(t => t.id === activeTab);

  return (
    <motion.section
      className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-heading font-bold text-text flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Algorithm Demo — Interactive Before / After
          </h2>
          <p className="text-xs text-text/45 mt-0.5">
            Synthetic X-Ray generated in-browser · drag the slider to compare
          </p>
        </div>
        <button type="button" onClick={generate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
        </button>
      </div>

      {/* Tab selector */}
      <div className="px-6 pt-4 flex gap-2 flex-wrap">
        {tabs.map(({ id, icon: Icon, label, color }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${activeTab === id
                ? 'bg-primary text-white shadow-sm'
                : 'border border-gray-200 text-text/60 hover:border-primary/30 hover:text-text'}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="px-6 pt-3 pb-1">
        <div className="flex items-start gap-2 p-3 bg-primary/4 border border-primary/10 rounded-xl">
          <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text/65 leading-relaxed">{active?.desc}</p>
        </div>
      </div>

      {/* Viewer */}
      <div className="px-6 pb-5 pt-3">
        {loading ? (
          <div className="flex items-center justify-center bg-gray-900 rounded-2xl h-64">
            <div className="flex items-center gap-3 text-white/50">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Generating synthetic X-Ray…</span>
            </div>
          </div>
        ) : (
          <BeforeAfterViewer
            beforeSrc={beforeUrl}
            afterSrc={afterUrl}
            beforeLabel="Original X-Ray"
            afterLabel={active?.afterLabel}
            height={300}
          />
        )}

        {/* RLE Stats */}
        {activeTab === 'rle' && rleStats && !loading && (
          <motion.div
            className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {[
              { label: 'Original Size',   value: `${(rleStats.origBytes / 1024).toFixed(0)} KB`, sub: 'grayscale 1 byte/px' },
              { label: 'RLE Size',        value: `${(rleStats.rleBytes  / 1024).toFixed(0)} KB`, sub: '2 bytes/run pair' },
              { label: 'Compression',     value: `${rleStats.ratio}×`,                           sub: 'ratio' },
              { label: 'Space Saved',     value: `${rleStats.saved}%`,                           sub: `${rleStats.pairs.toLocaleString()} runs` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <p className="text-lg font-heading font-bold text-orange-700">{value}</p>
                <p className="text-xs font-semibold text-text/50 mt-0.5">{label}</p>
                <p className="text-xs text-text/35">{sub}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* LSB explanation */}
        {activeTab === 'lsb' && !loading && (
          <motion.div
            className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {[
              { label: 'Bit modified',  value: 'Bit-0 only', sub: 'of R, G, B channels', color: 'purple' },
              { label: 'Capacity',      value: '3 bits/px',  sub: '≈ 98 KB per megapixel', color: 'purple' },
              { label: 'Visual change', value: '±1 / 255',   sub: 'imperceptible to eye',  color: 'purple' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3 text-center`}>
                <p className={`text-lg font-heading font-bold text-${color}-700`}>{value}</p>
                <p className="text-xs font-semibold text-text/50 mt-0.5">{label}</p>
                <p className="text-xs text-text/35">{sub}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Histogram EQ explanation */}
        {activeTab === 'histeq' && !loading && (
          <motion.div
            className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {[
              { label: 'Method',     value: 'CDF Equalize', sub: 'Cumulative Distribution Function', color: 'primary' },
              { label: 'Input',      value: 'Luminance',    sub: 'BT.709 weighted (R×0.21, G×0.72)', color: 'primary' },
              { label: 'Medical use',value: 'X-Ray / MRI',  sub: 'Enhances low-contrast anatomy',    color: 'primary' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-center">
                <p className="text-lg font-heading font-bold text-primary">{value}</p>
                <p className="text-xs font-semibold text-text/50 mt-0.5">{label}</p>
                <p className="text-xs text-text/35">{sub}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
