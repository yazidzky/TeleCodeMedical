import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';

const STORAGE_PREFIX = 'tcm_tutorial_done_';

/**
 * Interactive tutorial overlay.
 *
 * @param {{
 *   id: string,               // unique id, used for localStorage key
 *   steps: {title, body, icon?}[],
 *   autoShow?: boolean,        // show on first visit (default true)
 * }} props
 */
export default function TutorialOverlay({ id, steps, autoShow = true }) {
  const storageKey = STORAGE_PREFIX + id;

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (autoShow && !localStorage.getItem(storageKey)) {
      setVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
    setStep(0);
  };

  const showAgain = () => { setStep(0); setVisible(true); };

  const current = steps[step];
  const isLast  = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <>
      {/* Floating "?" button to re-open */}
      {!visible && (
        <button
          type="button"
          onClick={showAgain}
          title="Tampilkan panduan lagi"
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Tampilkan panduan lagi"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      )}

      {/* Overlay */}
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Tutorial">
          {/* Backdrop — must be fixed (not absolute) to cover full viewport even inside transformed parents */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

          {/* Card */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-secondary px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {current.icon && <current.icon className="w-6 h-6 text-white" />}
                  <p className="text-white font-heading font-bold text-lg">{current.title}</p>
                </div>
                <button type="button" onClick={close}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Step dots */}
              <div className="flex items-center gap-1.5 mt-3">
                {steps.map((_, i) => (
                  <button
                    key={i} type="button" onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer focus:outline-none ${i === step ? 'bg-white w-6' : 'bg-white/40 w-1.5 hover:bg-white/60'}`}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-text/75 leading-relaxed">{current.body}</p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <span className="text-xs text-text/35 font-medium">
                {step + 1} dari {steps.length}
              </span>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button type="button" onClick={() => setStep(s => s - 1)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-text/60 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </button>
                )}
                {isFirst && (
                  <button type="button" onClick={close}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-text/50 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    Lewati
                  </button>
                )}
                <button type="button" onClick={isLast ? close : () => setStep(s => s + 1)}
                  className="inline-flex items-center gap-1 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm">
                  {isLast ? 'Mulai' : 'Selanjutnya'}
                  {!isLast && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
