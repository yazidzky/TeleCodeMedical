import { useEffect, useState } from 'react';
import { QrCode, Download, RefreshCw } from 'lucide-react';
import { generateQR, buildQRPayload, downloadQR } from '../utils/qrCode';

export default function QRCodeCard({ patientData, analysis }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const payload = buildQRPayload(patientData, analysis);
      const url = await generateQR(payload, { width: 280 });
      setQrUrl(url);
    } catch (err) {
      setError('Gagal membuat QR code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientData) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientData]);

  const handleDownload = () => {
    if (!qrUrl) return;
    const name = patientData?.id || patientData?.patientId || 'patient';
    downloadQR(qrUrl, `qr_medical_${name}.png`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-text">QR Code Transfer</span>
        </div>
        <button type="button" onClick={generate} title="Refresh QR"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-text/40 hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 flex flex-col items-center gap-3">
        {loading && (
          <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
          </div>
        )}
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
        {qrUrl && !loading && (
          <img src={qrUrl} alt="Medical record QR code" className="w-48 h-48 rounded-xl border border-gray-100" />
        )}
        <p className="text-xs text-text/45 text-center leading-relaxed">
          Scan untuk melihat ringkasan rekam medis. Dokter dapat scan langsung dari smartphone.
        </p>
        <button type="button" onClick={handleDownload} disabled={!qrUrl}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Download className="w-3.5 h-3.5" /> Download QR
        </button>
      </div>
    </div>
  );
}
