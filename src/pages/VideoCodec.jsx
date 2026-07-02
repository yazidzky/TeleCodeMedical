import { useState, useRef, useCallback } from 'react';
import {
  Video, Upload, Download, ShieldCheck, Loader2,
  CheckCircle2, AlertCircle, X, Film,
  Zap, RefreshCw, Play, Pause, BarChart2,
} from 'lucide-react';
import {
  extractFrames, compressFrames, decompressFrames,
  embedDataInVideoKeyframe, extractDataFromVideoKeyframe,
  getVideoCompressionStats, playFrames,
} from '../utils/videoCodec';
import { calculatePSNR } from '../utils/imageProcessing';
import { compressToZip, extractFromZip } from '../utils/compression';
import { useLang } from '../i18n/LangContext';
import TutorialOverlay from '../components/TutorialOverlay';
import BeforeAfterViewer from '../components/BeforeAfterViewer';

function Tab({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${active ? 'bg-primary text-white shadow-sm' : 'text-text/60 hover:bg-gray-100'}`}>
      {children}
    </button>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
      <p className="text-base font-heading font-bold text-text">{value}</p>
      <p className="text-xs font-semibold text-text/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text/35 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, label }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-text/50 mb-1">
        <span>{label}</span><span>{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all';

export default function VideoCodec() {
  const { t } = useLang();
  const [tab, setTab] = useState('encode');

  // Encode state
  const [encFile, setEncFile] = useState(null);
  const [isDragEnc, setIsDragEnc] = useState(false);
  const [metadata, setMetadata] = useState({
    patientName: '', patientId: '', doctorName: '',
    videoType: 'Consultation Recording',
    date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [encProgress, setEncProgress] = useState(0);
  const [encStage, setEncStage] = useState('');
  const [encProcessing, setEncProcessing] = useState(false);
  const [encResult, setEncResult] = useState(null);
  const [encError, setEncError] = useState(null);
  const [encPsnr, setEncPsnr] = useState(null);       // PSNR keyframe
  const [keyframePair, setKeyframePair] = useState(null); // { before, after } data URLs

  // Decode state
  const [decFile, setDecFile] = useState(null);
  const [isDragDec, setIsDragDec] = useState(false);
  const [decProcessing, setDecProcessing] = useState(false);
  const [decResult, setDecResult] = useState(null);
  const [decError, setDecError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const stopPlayRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const encRef = useRef(null);
  const decRef = useRef(null);

  const handleEncFile = useCallback((f) => {
    if (!f) return;
    setEncFile(f); setEncError(null); setEncResult(null); setEncProgress(0); setEncStage('');
  }, []);

  const handleEncode = async (e) => {
    e.preventDefault();
    if (!encFile || !metadata.patientName || !metadata.patientId) return;
    setEncProcessing(true); setEncError(null); setEncResult(null); setEncProgress(0);

    try {
      setEncStage(t('video.extractFrames','Extracting frames…'));
      const { frames, width, height, duration } = await extractFrames(
        encFile, 5, 60, p => setEncProgress(Math.round(p * 0.4))
      );
      if (frames.length === 0) throw new Error('No frames extracted from video.');

      setEncStage(t('video.compressing','Compressing frames (keyframe + delta)…'));
      const compressed = await compressFrames(frames, p => setEncProgress(40 + Math.round(p * 0.35)));

      const stats = getVideoCompressionStats(frames, compressed);

      setEncStage(t('video.embedding','Embedding metadata via LSB steganography…'));
      const metaJson = JSON.stringify({
        ...metadata,
        codec: 'Keyframe+Delta',
        width, height, duration: duration.toFixed(1),
        totalFrames: stats.totalFrames,
        keyframes: stats.keyframes,
        compressionRatio: stats.ratio,
        encodedAt: new Date().toISOString(),
      });
      const stegoFrames = await embedDataInVideoKeyframe(compressed, metaJson);
      setEncProgress(85);

      setEncStage('Zipping payload…');
      const json = JSON.stringify({ frames: stegoFrames, width, height, meta: 'TCMV1' });
      const jsonBlob = new Blob([json], { type: 'application/json' });
      const { blob: zipBlob } = await compressToZip(jsonBlob, 'medical_video_encoded.json');
      setEncProgress(100);
      setEncStage('Done');

      // PSNR: compare first original frame vs first decompressed frame
      try {
        const decompCheck = await decompressFrames(compressed.slice(0, 1), width, height);
        if (decompCheck.length > 0 && frames.length > 0) {
          const psnr = calculatePSNR(frames[0], decompCheck[0]);
          setEncPsnr(psnr);
          // Build keyframe before/after data URLs
          const cvBefore = document.createElement('canvas');
          cvBefore.width = frames[0].width; cvBefore.height = frames[0].height;
          cvBefore.getContext('2d').putImageData(frames[0], 0, 0);
          const cvAfter = document.createElement('canvas');
          cvAfter.width = decompCheck[0].width; cvAfter.height = decompCheck[0].height;
          cvAfter.getContext('2d').putImageData(decompCheck[0], 0, 0);
          setKeyframePair({ before: cvBefore.toDataURL(), after: cvAfter.toDataURL() });
        }
      } catch (_) { /* non-critical */ }

      setEncResult({ zipBlob, stats, width, height, duration });

    } catch (err) {
      console.error(err);
      setEncError(err.message);
    } finally {
      setEncProcessing(false);
    }
  };

  const downloadEnc = () => {
    if (!encResult) return;
    const url = URL.createObjectURL(encResult.zipBlob);
    const a = document.createElement('a'); a.href = url;
    a.download = `video_${metadata.patientId || 'record'}_${metadata.date}.zip`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleDecFile = useCallback((f) => {
    if (!f) return;
    setDecFile(f); setDecError(null); setDecResult(null); setPlaying(false);
    if (stopPlayRef.current) { stopPlayRef.current(); stopPlayRef.current = null; }
  }, []);

  const handleDecode = async (e) => {
    e.preventDefault();
    if (!decFile) return;
    setDecProcessing(true); setDecError(null); setDecResult(null);

    try {
      const { blob: jsonBlob } = await extractFromZip(decFile);
      const text = await jsonBlob.text();
      let payload;
      try { payload = JSON.parse(text); } catch (_) { throw new Error('Invalid ZIP contents.'); }

      const { frames: compFrames, width, height } = payload;
      if (!compFrames || !Array.isArray(compFrames)) throw new Error('No frame data found in archive.');

      let metaJson;
      try { metaJson = await extractDataFromVideoKeyframe(compFrames); }
      catch (ex) { throw new Error(ex.message); }

      let meta;
      try { meta = JSON.parse(metaJson); } catch (_) { throw new Error('Metadata JSON is invalid.'); }

      const decompressedFrames = await decompressFrames(compFrames, width, height);
      const stats = getVideoCompressionStats(decompressedFrames, compFrames);

      setDecResult({ meta, frames: decompressedFrames, stats, width, height });

    } catch (err) {
      console.error(err);
      setDecError(err.message);
    } finally {
      setDecProcessing(false);
    }
  };

  const togglePlay = () => {
    if (!decResult?.frames?.length || !previewCanvasRef.current) return;
    if (playing) {
      if (stopPlayRef.current) stopPlayRef.current();
      stopPlayRef.current = null; setPlaying(false);
    } else {
      stopPlayRef.current = playFrames(decResult.frames, previewCanvasRef.current, 5);
      setPlaying(true);
    }
  };

  const resetDec = () => {
    if (stopPlayRef.current) stopPlayRef.current();
    stopPlayRef.current = null; setPlaying(false);
    setDecFile(null); setDecResult(null); setDecError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-text flex items-center gap-2">
          <Video className="w-6 h-6 text-primary" />
          Video Codec — Medical Consultation Recording
        </h1>
        <p className="text-sm text-text/50 mt-1">
          Keyframe + Delta compression · LSB steganography on keyframe · ZIP packaging
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Film,        label: 'Frame Extraction',   desc: 'Samples video at 5 FPS via Canvas API, scales to 640px' },
          { icon: Zap,         label: 'Keyframe + Delta',   desc: 'Full JPEG keyframe every 30 frames; delta stores only changed pixels' },
          { icon: ShieldCheck, label: 'LSB Steganography',  desc: 'Patient metadata embedded in keyframe pixel LSBs' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-white rounded-2xl border border-primary/10 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-text">{label}</p>
            </div>
            <p className="text-xs text-text/50 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <Tab active={tab === 'encode'} onClick={() => setTab('encode')}>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Encode Video</span>
        </Tab>
        <Tab active={tab === 'decode'} onClick={() => setTab('decode')}>
          <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Decode Video</span>
        </Tab>
      </div>

      {tab === 'encode' && (
        <form onSubmit={handleEncode} className="space-y-5">
          <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
              <Film className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-text">Encode Medical Video</h2>
              <span className="ml-auto text-xs text-text/40">MP4, WebM, OGG</span>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Video File</p>
                {!encFile ? (
                  <div onDragOver={e=>{e.preventDefault();setIsDragEnc(true);}} onDragLeave={()=>setIsDragEnc(false)}
                    onDrop={e=>{e.preventDefault();setIsDragEnc(false);handleEncFile(e.dataTransfer.files[0]);}}
                    onClick={()=>encRef.current?.click()}
                    className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                      ${isDragEnc?'border-primary bg-primary/5':'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}>
                    <Film className={`h-12 w-12 mb-3 ${isDragEnc?'text-primary':'text-gray-300'}`} />
                    <p className="text-sm font-semibold text-text/60 mb-1">Drop video or click to browse</p>
                    <p className="text-xs text-gray-400">MP4, WebM, OGG — max 50 MB recommended</p>
                    <input ref={encRef} type="file" className="sr-only" accept="video/*" onChange={e=>handleEncFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <Film className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text text-sm truncate">{encFile.name}</p>
                      <p className="text-xs text-text/40">{(encFile.size/1024/1024).toFixed(1)} MB</p>
                    </div>
                    <button type="button" onClick={()=>{setEncFile(null);setEncResult(null);setEncProgress(0);}}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {encProcessing && (
                  <div className="space-y-2">
                    <ProgressBar value={encProgress} label={encStage} />
                  </div>
                )}
                {encError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{encError}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Recording Metadata</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text/60 mb-1">Patient Name <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder="Full name"
                      value={metadata.patientName} onChange={e=>setMetadata(p=>({...p,patientName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text/60 mb-1">Medical ID <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder="MRN-0001"
                      value={metadata.patientId} onChange={e=>setMetadata(p=>({...p,patientId:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text/60 mb-1">Doctor Name</label>
                  <input type="text" className={inputCls} placeholder="Dr. Name"
                    value={metadata.doctorName} onChange={e=>setMetadata(p=>({...p,doctorName:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text/60 mb-1">Video Type</label>
                  <select className={inputCls} value={metadata.videoType} onChange={e=>setMetadata(p=>({...p,videoType:e.target.value}))}>
                    <option>Consultation Recording</option>
                    <option>Surgical Procedure</option>
                    <option>Endoscopy Recording</option>
                    <option>Physiotherapy Session</option>
                    <option>Teleconsultation</option>
                    <option>Patient Education</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text/60 mb-1">Date</label>
                    <input type="date" className={inputCls} value={metadata.date}
                      onChange={e=>setMetadata(p=>({...p,date:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text/60 mb-1">Notes</label>
                    <input type="text" className={inputCls} placeholder="Short note…"
                      value={metadata.notes} onChange={e=>setMetadata(p=>({...p,notes:e.target.value}))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button type="submit" disabled={!encFile||!metadata.patientName||!metadata.patientId||encProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {encProcessing?<><Loader2 className="w-4 h-4 animate-spin"/>Processing…</>:<><ShieldCheck className="w-4 h-4"/>Compress + Encode</>}
              </button>
            </div>
          </div>

          {encResult && (
            <div className="bg-white rounded-3xl border border-cta/20 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-cta/10 flex items-center gap-3 bg-cta/5">
                <CheckCircle2 className="w-5 h-5 text-cta" />
                <div>
                  <p className="font-heading font-bold text-text">Video Encoded Successfully</p>
                  <p className="text-xs text-text/50">Keyframe+delta compression + LSB steganography applied</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox label="Frames" value={encResult.stats.totalFrames} sub="extracted" />
                  <StatBox label="Keyframes" value={encResult.stats.keyframes} sub="full frames" />
                  <StatBox label="Delta Frames" value={encResult.stats.deltas} sub="diff only" />
                  <StatBox label="Compression" value={`${encResult.stats.ratio}×`} sub="ratio" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-text/40">Resolution</p><p className="font-bold text-text">{encResult.width}×{encResult.height}</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-text/40">Duration</p><p className="font-bold text-text">{encResult.duration}s</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-text/40">Sample Rate</p><p className="font-bold text-text">5 FPS</p></div>
                </div>

                {/* Keyframe Before / After viewer */}
                {keyframePair && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" /> Keyframe Quality — Original vs After JPEG Compression
                    </p>
                    <BeforeAfterViewer
                      beforeSrc={keyframePair.before}
                      afterSrc={keyframePair.after}
                      beforeLabel="Original Frame"
                      afterLabel="Decompressed"
                      height={220}
                    />
                  </div>
                )}

                {/* PSNR */}
                {encPsnr && (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    encPsnr.quality === 'excellent' ? 'bg-green-50 border-green-200' :
                    encPsnr.quality === 'good'      ? 'bg-blue-50 border-blue-200' :
                    encPsnr.quality === 'fair'      ? 'bg-yellow-50 border-yellow-200' :
                                                       'bg-red-50 border-red-200'}`}>
                    <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text">
                        Keyframe PSNR: {encPsnr.psnr === Infinity ? '∞ dB' : `${encPsnr.psnr} dB`}
                        <span className={`ml-2 capitalize font-normal px-2 py-0.5 rounded-full text-xs ${
                          encPsnr.quality === 'excellent' ? 'bg-green-100 text-green-700' :
                          encPsnr.quality === 'good'      ? 'bg-blue-100 text-blue-700' :
                          encPsnr.quality === 'fair'      ? 'bg-yellow-100 text-yellow-700' :
                                                             'bg-red-100 text-red-700'}`}>
                          {encPsnr.quality}
                        </span>
                      </p>
                      <p className="text-xs text-text/40 mt-0.5">
                        {encPsnr.quality === 'excellent' || encPsnr.quality === 'good'
                          ? '✓ Quality sufficient for clinical video review'
                          : '⚠ Consider reducing compression for diagnostic video'}
                      </p>
                    </div>
                  </div>
                )}
                <button onClick={downloadEnc}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cta text-white text-sm font-bold shadow-sm hover:bg-cta/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cta">
                  <Download className="w-4 h-4" />
                  Download video_{metadata.patientId}_{metadata.date}.zip
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {tab === 'decode' && (
        <form onSubmit={handleDecode} className="space-y-5">
          <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-text">Decode Medical Video</h2>
            </div>
            <div className="p-6 space-y-5">
              {!decFile ? (
                <div onDragOver={e=>{e.preventDefault();setIsDragDec(true);}} onDragLeave={()=>setIsDragDec(false)}
                  onDrop={e=>{e.preventDefault();setIsDragDec(false);handleDecFile(e.dataTransfer.files[0]);}}
                  onClick={()=>decRef.current?.click()}
                  className={`flex flex-col items-center justify-center py-14 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                    ${isDragDec?'border-primary bg-primary/5':'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}>
                  <Upload className={`h-12 w-12 mb-3 ${isDragDec?'text-primary':'text-gray-300'}`} />
                  <p className="text-sm font-semibold text-text/60 mb-1">Drop encoded .zip or click to browse</p>
                  <p className="text-xs text-gray-400">ZIP archive containing encoded video frames</p>
                  <input ref={decRef} type="file" className="sr-only" accept=".zip,application/zip" onChange={e=>handleDecFile(e.target.files[0])} />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <Film className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text text-sm truncate">{decFile.name}</p>
                    <p className="text-xs text-text/40">{(decFile.size/1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={()=>{setDecFile(null);setDecResult(null);}}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {decError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div><p className="text-sm font-semibold text-red-700">Decoding Failed</p><p className="text-sm text-red-600 mt-0.5">{decError}</p></div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button type="submit" disabled={!decFile||decProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {decProcessing?<><Loader2 className="w-4 h-4 animate-spin"/>Extracting…</>:<><ShieldCheck className="w-4 h-4"/>Decompress + Decode</>}
              </button>
            </div>
          </div>

          {decResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-4 bg-cta/8 border border-cta/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cta" />
                  <div>
                    <p className="font-heading font-bold text-text text-sm">Video Successfully Decoded</p>
                    <p className="text-xs text-text/50">Metadata extracted from keyframe LSB steganography</p>
                  </div>
                </div>
                <button onClick={resetDec} type="button"
                  className="inline-flex items-center gap-1 text-xs text-text/50 hover:text-primary transition-colors cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white">
                  <RefreshCw className="w-3 h-3" /> New
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Recording Metadata</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Patient', decResult.meta.patientName],
                      ['Medical ID', decResult.meta.patientId],
                      ['Doctor', decResult.meta.doctorName],
                      ['Video Type', decResult.meta.videoType],
                      ['Date', decResult.meta.date],
                      ['Codec', decResult.meta.codec],
                      ['Resolution', `${decResult.meta.width}×${decResult.meta.height}`],
                      ['Duration', decResult.meta.duration ? `${decResult.meta.duration}s` : null],
                      ['Frames', decResult.meta.totalFrames],
                      ['Compression', decResult.meta.compressionRatio ? `${decResult.meta.compressionRatio}×` : null],
                    ].filter(([,v]) => v).map(([label, val]) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-2.5">
                        <p className="text-xs text-text/40">{label}</p>
                        <p className="text-xs font-semibold text-text mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                  {decResult.meta.notes && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text/40 mb-1">Notes</p>
                      <p className="text-sm text-text/80">{decResult.meta.notes}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Frame Preview</p>
                  <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                    <canvas ref={previewCanvasRef} className="max-w-full max-h-full" />
                    {!playing && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={togglePlay}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {playing ? <><Pause className="w-4 h-4" /> Pause Preview</> : <><Play className="w-4 h-4" /> Play Frame Preview</>}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox label="Total Frames" value={decResult.stats.totalFrames} />
                    <StatBox label="Compression" value={`${decResult.stats.ratio}×`} sub="ratio" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
