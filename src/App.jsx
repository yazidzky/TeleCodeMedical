import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Encode from './pages/Encode';
import Decode from './pages/Decode';
import AudioCodec from './pages/AudioCodec';
import VideoCodec from './pages/VideoCodec';
import SymptomChecker from './pages/SymptomChecker';
import MedicalHistory from './pages/MedicalHistory';
import PWAPrompt from './components/PWAPrompt';
import { LangProvider, useLang } from './i18n/LangContext';
import {
  Activity, ShieldCheck, FileLock2, UploadCloud, Brain,
  Menu, X, Mic, Video, Search, ClipboardList,
} from 'lucide-react';
import { useState } from 'react';

// Page transition wrapper
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/cek-gejala"  element={<SymptomChecker />} />
          <Route path="/encode"      element={<Encode />} />
          <Route path="/decode"      element={<Decode />} />
          <Route path="/audio"       element={<AudioCodec />} />
          <Route path="/video"       element={<VideoCodec />} />
          <Route path="/riwayat"     element={<MedicalHistory />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppInner() {
  const { t } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkCls = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
     ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-text/65 hover:text-text hover:bg-gray-100'}`;

  const mobileNavLinkCls = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors
     ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-text hover:bg-gray-50'}`;

  const close = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navigation ── */}
      <motion.nav
        className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50"
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">

            {/* Logo + Desktop Nav */}
            <div className="flex items-center gap-3">
              <NavLink to="/"
                className="flex items-center gap-2 text-primary font-heading font-bold text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1"
              >
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <span className="hidden sm:block">TeleCode Medical</span>
              </NavLink>

              <div className="hidden lg:flex items-center gap-0.5">
                <NavLink to="/"            end className={navLinkCls}>{t('nav.dashboard')}</NavLink>
                <NavLink to="/cek-gejala"     className={navLinkCls}><Search className="w-3.5 h-3.5" />{t('nav.symptomCheck')}</NavLink>
                <NavLink to="/encode"         className={navLinkCls}><FileLock2 className="w-3.5 h-3.5" />{t('nav.encode')}</NavLink>
                <NavLink to="/decode"         className={navLinkCls}><UploadCloud className="w-3.5 h-3.5" />{t('nav.decode')}</NavLink>
                <NavLink to="/audio"          className={navLinkCls}><Mic className="w-3.5 h-3.5" />{t('nav.audio')}</NavLink>
                <NavLink to="/video"          className={navLinkCls}><Video className="w-3.5 h-3.5" />{t('nav.video')}</NavLink>
                <NavLink to="/riwayat"        className={navLinkCls}><ClipboardList className="w-3.5 h-3.5" />{t('nav.history')}</NavLink>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/8 border border-primary/15 rounded-full">
                <Brain className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">AI</span>
              </div>
              <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-cta bg-cta/10 border border-cta/15 px-2.5 py-1.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5" />{t('nav.secure')}
              </span>
              <button type="button"
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text/60 hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" aria-expanded={mobileOpen}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <NavLink to="/"          end className={mobileNavLinkCls} onClick={close}>{t('nav.dashboard')}</NavLink>
            <NavLink to="/cek-gejala"   className={mobileNavLinkCls} onClick={close}><Search className="w-4 h-4" />{t('nav.symptomCheck')}</NavLink>
            <NavLink to="/encode"       className={mobileNavLinkCls} onClick={close}><FileLock2 className="w-4 h-4" />{t('nav.imageEncode')}</NavLink>
            <NavLink to="/decode"       className={mobileNavLinkCls} onClick={close}><UploadCloud className="w-4 h-4" />{t('nav.imageDecode')}</NavLink>
            <NavLink to="/audio"        className={mobileNavLinkCls} onClick={close}><Mic className="w-4 h-4" />{t('nav.audioCodec')}</NavLink>
            <NavLink to="/video"        className={mobileNavLinkCls} onClick={close}><Video className="w-4 h-4" />{t('nav.videoCodec')}</NavLink>
            <NavLink to="/riwayat"      className={mobileNavLinkCls} onClick={close}><ClipboardList className="w-4 h-4" />{t('nav.medHistory')}</NavLink>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatedRoutes />
      </main>

      {/* ── Footer ── */}
      <motion.footer
        className="border-t border-gray-100 bg-white mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text/40 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            TeleCode Medical · Image · Audio · Video Codec + AI Clinical Analysis
          </p>
          <p className="text-xs text-text/30">
            AI output is for clinical support only — not a substitute for physician judgment.
          </p>
        </div>
      </motion.footer>

      {/* PWA Install prompt + offline banner */}
      <PWAPrompt />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </BrowserRouter>
  );
}
