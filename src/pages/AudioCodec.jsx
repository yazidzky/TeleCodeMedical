import { useState, useRef, useCallback } from 'react';
import {
  Mic, Music, Upload, Download, ShieldCheck, Loader2,
  CheckCircle2, AlertCircle, X, FileAudio, Zap, RefreshCw, BarChart2,
} from 'lucide-react';
import {
  parseWav, buildWav, compressAudioMulaw, decompressAudioMulaw,
  embedDataInAudio, extractDataFromAudio, getCompressionInfo,
} from '../utils/audioCodec';
import {
  compressAudioAlaw, decompressAudioAlaw, calculateAudioSNR, buildWaveformDataUrl,
} from '../utils/imageProcessing';
import { compressToZip, extractFromZip } from '../utils/compression';
import { useLang } from '../i18n/LangContext';
import TutorialOverlay from '../components/TutorialOverlay';

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
      <p className="text-lg font-heading font-bold text-text">{value}</p>
      <p className="text-xs font-semibold text-text/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text/35 mt-0.5">{sub}</p>}
    </div>
  );
}
const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all';

export default function AudioCodec() {
  const { t } = useLang();
  const [tab, setTab] = useState('encode');

  const [encFile, setEncFile]           = useState(null);
  const [isDragEnc, setIsDragEnc]       = useState(false);
  const [codec, setCodec]               = useState('mulaw'); // 'mulaw' | 'alaw'
  const [metadata, setMetadata]         = useState({
    patientName: '', patientId: '', doctorName: '',
    recordType: t('audio.recordTypes.voiceNote','Voice Note Diagnosis'),
    date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [encProcessing, setEncProcessing] = useState(false);
  const [encResult, setEncResult]         = useState(null);
  const [encError, setEncError]           = useState(null);

  const [decFile, setDecFile]           = useState(null);
  const [isDragDec, setIsDragDec]       = useState(false);
  const [decProcessing, setDecProcessing] = useState(false);
  const [decResult, setDecResult]         = useState(null);
  const [decError, setDecError]           = useState(null);

  const encRef = useRef(null);
  const decRef = useRef(null);

  const handleEncFile = useCallback((f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.wav')) { setEncError('Only WAV files are supported.'); return; }
    setEncFile(f); setEncError(null); setEncResult(null);
  }, []);

  const handleEncode = async (e) => {
    e.preventDefault();
    if (!encFile || !metadata.patientName || !metadata.patientId) return;
    setEncProcessing(true); setEncError(null); setEncResult(null);
    try {
      const buffer = await encFile.arrayBuffer();
      const { sampleRate, numChannels, bitsPerSample, samples, headerBytes } = parseWav(buffer);

      // Compress with selected codec
      const compressed   = codec === 'alaw' ? compressAudioAlaw(samples) : compressAudioMulaw(samples);
      const stats        = getCompressionInfo(samples, compressed.length);
      const decompressed = codec === 'alaw' ? decompressAudioAlaw(compressed) : decompressAudioMulaw(compressed);

      // Calculate SNR between original and decompressed
      const snrResult = calculateAudioSNR(samples, decompressed);

      // Build waveform images for before/after
      const waveformBefore = buildWaveformDataUrl(samples,      300, 60, '#94A3B8');
      const waveformAfter  = buildWaveformDataUrl(decompressed, 300, 60, '#0891B2');

      const metaJson = JSON.stringify({
        ...metadata, codec: codec === 'alaw' ? 'A-law G.711' : 'µ-law G.711',
        originalSampleRate: sampleRate, originalChannels: numChannels,
        compressionRatio: stats.ratio, snr: snrResult.snr, snrQuality: snrResult.quality,
        encodedAt: new Date().toISOString(),
      });
      const stegoSamples = embedDataInAudio(decompressed, metaJson);
      const outBuffer    = buildWav(headerBytes, stegoSamples);
      const wavBlob      = new Blob([outBuffer], { type: 'audio/wav' });
      const zipBlob      = await compressToZip(wavBlob, 'medical_audio_encoded.wav');
      setEncResult({ zipBlob, stats, sampleRate, numChannels, bitsPerSample, totalSamples: samples.length, snrResult, waveformBefore, waveformAfter });
    } catch (err) { console.error(err); setEncError(err.message); }
    finally { setEncProcessing(false); }
  };

  const downloadEnc = () => {
    if (!encResult) return;
    const url = URL.createObjectURL(encResult.zipBlob);
    const a = document.createElement('a'); a.href = url;
    a.download = `audio_${metadata.patientId || 'record'}_${metadata.date}.zip`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleDecFile = useCallback((f) => {
    if (!f) return;
    setDecFile(f); setDecError(null); setDecResult(null);
  }, []);

  const handleDecode = async (e) => {
    e.preventDefault();
    if (!decFile) return;
    setDecProcessing(true); setDecError(null); setDecResult(null);
    try {
      const { blob: wavBlob } = await extractFromZip(decFile);
      const buffer = await wavBlob.arrayBuffer();
      const { samples, sampleRate, numChannels } = parseWav(buffer);
      let metaJson;
      try { metaJson = extractDataFromAudio(samples); }
      catch (ex) { throw new Error(ex.message); }
      let meta;
      try { meta = JSON.parse(metaJson); }
      catch (_) { throw new Error('Extracted audio metadata is not valid JSON.'); }
      const audioUrl   = URL.createObjectURL(wavBlob);
      const compressed = compressAudioMulaw(samples);
      const stats      = getCompressionInfo(samples, compressed.length);
      setDecResult({ meta, audioUrl, stats, sampleRate, numChannels });
    } catch (err) { console.error(err); setDecError(err.message); }
    finally { setDecProcessing(false); }
  };

  const resetDec = () => { setDecFile(null); setDecResult(null); setDecError(null); };

  const AUDIO_TUTORIAL = [
    { title: t('audio.title'), body: t('audio.subtitle') },
    { title: t('audio.algo1'), body: t('audio.algo1Desc') + '. ' + t('audio.algo3Desc') },
    { title: t('audio.algo2'), body: t('audio.algo2Desc') },
  ];

  const recordTypes = [
    t('audio.recordTypes.voiceNote'),
    t('audio.recordTypes.anamnesis'),
    t('audio.recordTypes.postOp'),
    t('audio.recordTypes.radiology'),
    t('audio.recordTypes.referral'),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <TutorialOverlay id="audio" steps={AUDIO_TUTORIAL} />

      <div>
        <h1 className="text-2xl font-heading font-bold text-text flex items-center gap-2">
          <Mic className="w-6 h-6 text-primary" />
          {t('audio.title')}
        </h1>
        <p className="text-sm text-text/50 mt-1">{t('audio.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap,         label: t('audio.algo1'),  desc: t('audio.algo1Desc') },
          { icon: ShieldCheck, label: t('audio.algo2'),  desc: t('audio.algo2Desc') },
          { icon: Music,       label: t('audio.algo3'),  desc: t('audio.algo3Desc') },
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
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />{t('audio.tabEncode')}</span>
        </Tab>
        <Tab active={tab === 'decode'} onClick={() => setTab('decode')}>
          <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />{t('audio.tabDecode')}</span>
        </Tab>
      </div>

      {/* ── ENCODE TAB ── */}
      {tab === 'encode' && (
        <form onSubmit={handleEncode} className="space-y-5">
          <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
              <FileAudio className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-text">{t('audio.encodeTitle')}</h2>
              <span className="ml-auto text-xs text-text/40">{t('audio.wavOnly')}</span>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload zone */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60">WAV</p>
                {!encFile ? (
                  <div
                    onDragOver={e=>{e.preventDefault();setIsDragEnc(true);}} onDragLeave={()=>setIsDragEnc(false)}
                    onDrop={e=>{e.preventDefault();setIsDragEnc(false);handleEncFile(e.dataTransfer.files[0]);}}
                    onClick={()=>encRef.current?.click()}
                    className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                      ${isDragEnc?'border-primary bg-primary/5':'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}>
                    <FileAudio className={`h-12 w-12 mb-3 ${isDragEnc?'text-primary':'text-gray-300'}`} />
                    <p className="text-sm font-semibold text-text/60 mb-1">{t('audio.dropWav')}</p>
                    <p className="text-xs text-gray-400">{t('audio.wavSub')}</p>
                    <input ref={encRef} type="file" className="sr-only" accept=".wav,audio/wav" onChange={e=>handleEncFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <FileAudio className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text text-sm truncate">{encFile.name}</p>
                      <p className="text-xs text-text/40">{(encFile.size/1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={()=>{setEncFile(null);setEncResult(null);}}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {encError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{encError}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60">{t('audio.metaTitle')}</p>

                {/* Codec Selector */}
                <div>
                  <label className="block text-xs font-semibold text-text/60 mb-1.5">Compression Codec</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'mulaw', label: 'µ-law G.711', sub: 'USA/Asia standard' },
                      { id: 'alaw',  label: 'A-law G.711', sub: 'European standard' },
                    ].map(({ id, label, sub }) => (
                      <button key={id} type="button" onClick={() => setCodec(id)}
                        className={`px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                          ${codec === id ? 'bg-primary/8 border-primary/30 text-primary' : 'bg-gray-50 border-gray-200 text-text/60 hover:border-primary/20'}`}>
                        <p className="text-xs font-bold">{label}</p>
                        <p className="text-xs opacity-60">{sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text/60 mb-1">{t('audio.patientName')} <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder={t('audio.patientName')}
                      value={metadata.patientName} onChange={e=>setMetadata(p=>({...p,patientName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text/60 mb-1">{t('audio.patientId')} <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder="MRN-0001"
                      value={metadata.patientId} onChange={e=>setMetadata(p=>({...p,patientId:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text/60 mb-1">{t('audio.doctorName')}</label>
                  <input type="text" className={inputCls} placeholder={t('audio.doctorName')}
                    value={metadata.doctorName} onChange={e=>setMetadata(p=>({...p,doctorName:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text/60 mb-1">{t('audio.recordType')}</label>
                  <select className={inputCls} value={metadata.recordType} onChange={e=>setMetadata(p=>({...p,recordType:e.target.value}))}>
                    {recordTypes.map(rt => <option key={rt}>{rt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text/60 mb-1">{t('audio.date')}</label>
                  <input type="date" className={inputCls} value={metadata.date} onChange={e=>setMetadata(p=>({...p,date:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text/60 mb-1">{t('audio.notes')}</label>
                  <textarea rows={2} className={inputCls} placeholder={t('audio.notesPlh')}
                    value={metadata.notes} onChange={e=>setMetadata(p=>({...p,notes:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button type="submit" disabled={!encFile||!metadata.patientName||!metadata.patientId||encProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {encProcessing?<><Loader2 className="w-4 h-4 animate-spin"/>{t('audio.processing')}</>
                              :<><ShieldCheck className="w-4 h-4"/>{t('audio.encodeBtn')}</>}
              </button>
            </div>
          </div>

          {encResult && (
            <div className="bg-white rounded-3xl border border-cta/20 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-cta/10 flex items-center gap-3 bg-cta/5">
                <CheckCircle2 className="w-5 h-5 text-cta" />
                <div>
                  <p className="font-heading font-bold text-text">{t('audio.successTitle')}</p>
                  <p className="text-xs text-text/50">{t('audio.successSub')}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox label={t('audio.originalSize')} value={`${(encResult.stats.originalBytes/1024).toFixed(0)} KB`} sub={t('audio.pcm16')} />
                  <StatBox label={t('audio.mulawSize')}    value={`${(encResult.stats.compressedBytes/1024).toFixed(0)} KB`} sub={t('audio.compressed')} />
                  <StatBox label={t('audio.ratio')}        value={`${encResult.stats.ratio}:1`} sub={t('audio.compression')} />
                  <StatBox label={t('audio.saved')}        value={`${encResult.stats.saved}%`}  sub={t('audio.reduction')} />
                </div>

                {/* Waveform Before / After */}
                {encResult.waveformBefore && encResult.waveformAfter && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" /> Waveform — Original vs After {codec === 'alaw' ? 'A-law' : 'µ-law'} Codec
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                        <p className="text-xs text-text/40 mb-1.5">Original PCM (16-bit)</p>
                        <img src={encResult.waveformBefore} alt="Original waveform" className="w-full rounded-lg" />
                      </div>
                      <div className="bg-primary/5 rounded-xl p-2 border border-primary/15">
                        <p className="text-xs text-primary/70 mb-1.5">After {codec === 'alaw' ? 'A-law' : 'µ-law'} Decode (8-bit)</p>
                        <img src={encResult.waveformAfter} alt="Codec waveform" className="w-full rounded-lg" />
                      </div>
                    </div>
                  </div>
                )}

                {/* SNR Quality */}
                {encResult.snrResult && (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    encResult.snrResult.quality === 'excellent' ? 'bg-green-50 border-green-200' :
                    encResult.snrResult.quality === 'good'      ? 'bg-blue-50 border-blue-200' :
                    encResult.snrResult.quality === 'fair'      ? 'bg-yellow-50 border-yellow-200' :
                                                                   'bg-red-50 border-red-200'}`}>
                    <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text">
                        SNR: {encResult.snrResult.snr === Infinity ? '∞ dB (lossless)' : `${encResult.snrResult.snr} dB`}
                        <span className="ml-2 capitalize font-normal text-text/50">— {encResult.snrResult.quality}</span>
                      </p>
                      <p className="text-xs text-text/40 mt-0.5">Signal-to-noise ratio between original and {codec === 'alaw' ? 'A-law' : 'µ-law'} decoded audio. {'>'}30 dB = acceptable for medical voice.</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-text/40">{t('audio.sampleRate')}</p><p className="font-bold text-text">{encResult.sampleRate.toLocaleString()} Hz</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-text/40">{t('audio.channels')}</p><p className="font-bold text-text">{encResult.numChannels===1?'Mono':'Stereo'}</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-text/40">{t('audio.samples')}</p><p className="font-bold text-text">{encResult.totalSamples.toLocaleString()}</p></div>
                </div>
                <button onClick={downloadEnc}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cta text-white text-sm font-bold shadow-sm hover:bg-cta/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cta">
                  <Download className="w-4 h-4" />
                  {t('common.download')} audio_{metadata.patientId}_{metadata.date}.zip
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ── DECODE TAB ── */}
      {tab === 'decode' && (
        <form onSubmit={handleDecode} className="space-y-5">
          <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-primary/3">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-text">{t('audio.decodeTitle')}</h2>
            </div>
            <div className="p-6 space-y-5">
              {!decFile ? (
                <div
                  onDragOver={e=>{e.preventDefault();setIsDragDec(true);}} onDragLeave={()=>setIsDragDec(false)}
                  onDrop={e=>{e.preventDefault();setIsDragDec(false);handleDecFile(e.dataTransfer.files[0]);}}
                  onClick={()=>decRef.current?.click()}
                  className={`flex flex-col items-center justify-center py-14 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                    ${isDragDec?'border-primary bg-primary/5':'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}>
                  <Upload className={`h-12 w-12 mb-3 ${isDragDec?'text-primary':'text-gray-300'}`} />
                  <p className="text-sm font-semibold text-text/60 mb-1">{t('audio.dropZip')}</p>
                  <p className="text-xs text-gray-400">{t('audio.zipSub')}</p>
                  <input ref={decRef} type="file" className="sr-only" accept=".zip,application/zip" onChange={e=>handleDecFile(e.target.files[0])} />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <FileAudio className="w-8 h-8 text-primary flex-shrink-0" />
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
                  <div>
                    <p className="text-sm font-semibold text-red-700">{t('audio.failedTitle')}</p>
                    <p className="text-sm text-red-600 mt-0.5">{decError}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button type="submit" disabled={!decFile||decProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {decProcessing?<><Loader2 className="w-4 h-4 animate-spin"/>{t('audio.extracting')}</>
                              :<><ShieldCheck className="w-4 h-4"/>{t('audio.decodeBtn')}</>}
              </button>
            </div>
          </div>

          {decResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-4 bg-cta/8 border border-cta/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cta" />
                  <div>
                    <p className="font-heading font-bold text-text text-sm">{t('audio.decSuccessTitle')}</p>
                    <p className="text-xs text-text/50">{t('audio.decSuccessSub')}</p>
                  </div>
                </div>
                <button onClick={resetDec} type="button"
                  className="inline-flex items-center gap-1 text-xs text-text/50 hover:text-primary transition-colors cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white">
                  <RefreshCw className="w-3 h-3" /> {t('audio.newFile')}
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60">{t('audio.metaLabel')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    [t('audio.patientName'), decResult.meta.patientName],
                    [t('audio.patientId'),   decResult.meta.patientId],
                    [t('audio.doctorName'),  decResult.meta.doctorName],
                    [t('audio.recordType'),  decResult.meta.recordType],
                    [t('audio.date'),        decResult.meta.date],
                    ['Codec',                decResult.meta.codec],
                    [t('audio.sampleRate'),  decResult.meta.originalSampleRate ? `${decResult.meta.originalSampleRate} Hz` : null],
                    [t('audio.ratio'),       decResult.meta.compressionRatio ? `${decResult.meta.compressionRatio}:1` : null],
                  ].filter(([,v])=>v).map(([label,val])=>(
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-text/40 mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-text">{val}</p>
                    </div>
                  ))}
                </div>
                {decResult.meta.notes && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-text/40 mb-1">{t('audio.notes')}</p>
                    <p className="text-sm text-text/80">{decResult.meta.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2">{t('audio.decodedAudio')}</p>
                  <audio controls src={decResult.audioUrl} className="w-full rounded-xl" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox label={t('audio.originalSize')} value={`${(decResult.stats.originalBytes/1024).toFixed(0)} KB`} sub={t('audio.pcm16')} />
                  <StatBox label={t('audio.mulawSize')}    value={`${(decResult.stats.compressedBytes/1024).toFixed(0)} KB`} sub={t('audio.compressed')} />
                  <StatBox label={t('audio.ratio')}        value={`${decResult.stats.ratio}:1`} sub={t('audio.compression')} />
                  <StatBox label={t('audio.saved')}        value={`${decResult.stats.saved}%`}  sub={t('audio.reduction')} />
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
