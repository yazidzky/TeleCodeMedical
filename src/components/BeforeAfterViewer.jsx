import { useState, useRef, useCallback } from 'react';
import { SplitSquareHorizontal, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/**
 * BeforeAfterViewer — interactive split-slider to compare two images/canvases.
 *
 * Props:
 *  - beforeSrc {string}  data URL or object URL for "before" image
 *  - afterSrc  {string}  data URL or object URL for "after" image
 *  - beforeLabel {string} default "Before"
 *  - afterLabel  {string} default "After"
 *  - height {number}     container height in px (default 260)
 *  - badge  {ReactNode}  optional badge rendered top-right
 */
export default function BeforeAfterViewer({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel  = 'After',
  height      = 260,
  badge,
}) {
  const [sliderPct, setSliderPct] = useState(50); // 0–100
  const [zoom, setZoom]           = useState(1);
  const containerRef = useRef(null);
  const dragging     = useRef(false);

  const getRelativeX = useCallback((clientX) => {
    if (!containerRef.current) return 50;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - left) / width) * 100;
    return Math.max(0, Math.min(100, pct));
  }, []);

  const onMouseDown = (e) => { dragging.current = true; e.preventDefault(); };
  const onMouseMove = (e) => { if (dragging.current) setSliderPct(getRelativeX(e.clientX)); };
  const onMouseUp   = ()  => { dragging.current = false; };
  const onTouchMove = (e) => { setSliderPct(getRelativeX(e.touches[0].clientX)); };

  if (!beforeSrc || !afterSrc) return null;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-text/50">
          <SplitSquareHorizontal className="w-3.5 h-3.5" />
          <span>Drag slider to compare</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-text/50 hover:text-text transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-text/40 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-text/50 hover:text-text transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => { setZoom(1); setSliderPct(50); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-text/50 hover:text-text transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {badge && <div className="ml-1">{badge}</div>}
        </div>
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden bg-gray-900 cursor-col-resize select-none"
        style={{ height }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchStart={(e) => setSliderPct(getRelativeX(e.touches[0].clientX))}
      >
        {/* BEFORE (full width) */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={beforeSrc}
            alt={beforeLabel}
            className="max-w-none"
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              imageRendering: zoom > 1.5 ? 'pixelated' : 'auto',
            }}
            draggable={false}
          />
        </div>

        {/* AFTER (clipped to right of slider) */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${sliderPct}%)` }}
        >
          <img
            src={afterSrc}
            alt={afterLabel}
            className="max-w-none"
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              imageRendering: zoom > 1.5 ? 'pixelated' : 'auto',
            }}
            draggable={false}
          />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
          style={{ left: `${sliderPct}%` }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center">
            <SplitSquareHorizontal className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-xs font-bold text-white pointer-events-none">
          {beforeLabel}
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 bg-primary/80 backdrop-blur-sm rounded-lg text-xs font-bold text-white pointer-events-none">
          {afterLabel}
        </div>
      </div>
    </div>
  );
}
