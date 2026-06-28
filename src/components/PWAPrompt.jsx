import { useState, useEffect } from 'react';
import { Download, X, WifiOff, Smartphone } from 'lucide-react';

/**
 * PWA install banner + offline indicator.
 * Registers service worker and handles beforeinstallprompt event.
 */
export default function PWAPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('tcm_pwa_dismissed') === '1'
  );
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Register SW
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Capture install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  // Online/offline events
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('tcm_pwa_dismissed', '1');
    setDismissed(true);
    setShowBanner(false);
  };

  return (
    <>
      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Anda sedang offline. Fitur utama tetap tersedia.
        </div>
      )}

      {/* Install banner */}
      {showBanner && !dismissed && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40">
          <div className="bg-white rounded-2xl shadow-2xl border border-primary/15 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-heading font-bold text-text text-sm">
                    Pasang Aplikasi
                  </p>
                  <p className="text-xs text-text/55 mt-0.5 leading-relaxed">
                    Pasang TeleCode Medical di perangkat Anda untuk akses offline
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleDismiss}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text/40 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 flex gap-2">
              <button type="button" onClick={handleInstall}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm">
                <Download className="w-4 h-4" />
                Pasang
              </button>
              <button type="button" onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Nanti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
