/**
 * Demo Image Generator — TeleCode Medical
 * Generates synthetic medical-style sample images in the browser using Canvas API.
 * No external file dependencies — everything is computed on-the-fly.
 */

/**
 * Generate a synthetic chest X-Ray-like grayscale image (512×512).
 * Simulates: dark background, rib-like arcs, lung fields, spine center.
 * @returns {HTMLCanvasElement}
 */
export function generateSyntheticXRay(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // ── Background (dark, like X-Ray) ──
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;

  // ── Lung fields (two ellipses, slightly lighter) ──
  const lung = (x, r1, r2) => {
    const grad = ctx.createRadialGradient(x, cy, 0, x, cy, r1);
    grad.addColorStop(0, 'rgba(60,60,60,0.9)');
    grad.addColorStop(0.6, 'rgba(35,35,35,0.7)');
    grad.addColorStop(1, 'rgba(10,10,10,0)');
    ctx.beginPath();
    ctx.ellipse(x, cy * 0.95, r1, r2, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  };
  lung(cx - width * 0.2, width * 0.18, height * 0.32);
  lung(cx + width * 0.2, width * 0.18, height * 0.32);

  // ── Spine (bright vertical stripe center) ──
  const spineGrad = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0);
  spineGrad.addColorStop(0, 'rgba(200,200,200,0)');
  spineGrad.addColorStop(0.5, 'rgba(200,200,200,0.85)');
  spineGrad.addColorStop(1, 'rgba(200,200,200,0)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(cx - 16, height * 0.1, 32, height * 0.8);

  // ── Ribs (arc-like strokes) ──
  ctx.strokeStyle = 'rgba(160,160,160,0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const yPos = height * 0.18 + i * height * 0.08;
    // Left ribs
    ctx.beginPath();
    ctx.moveTo(cx - 15, yPos);
    ctx.bezierCurveTo(cx - 60, yPos - 10, cx - 130, yPos + 20, cx - 160, yPos + 40);
    ctx.stroke();
    // Right ribs
    ctx.beginPath();
    ctx.moveTo(cx + 15, yPos);
    ctx.bezierCurveTo(cx + 60, yPos - 10, cx + 130, yPos + 20, cx + 160, yPos + 40);
    ctx.stroke();
  }

  // ── Heart shadow (ellipse, center-left) ──
  const heartGrad = ctx.createRadialGradient(cx - 30, cy * 0.9, 0, cx - 30, cy * 0.9, 90);
  heartGrad.addColorStop(0, 'rgba(130,130,130,0.8)');
  heartGrad.addColorStop(1, 'rgba(10,10,10,0)');
  ctx.beginPath();
  ctx.ellipse(cx - 30, cy * 0.92, 75, 90, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = heartGrad;
  ctx.fill();

  // ── Clavicles ──
  ctx.strokeStyle = 'rgba(180,180,180,0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 10, height * 0.18);
  ctx.quadraticCurveTo(cx - 80, height * 0.13, cx - 160, height * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 10, height * 0.18);
  ctx.quadraticCurveTo(cx + 80, height * 0.13, cx + 160, height * 0.22);
  ctx.stroke();

  // ── Diaphragm arcs ──
  ctx.strokeStyle = 'rgba(150,150,150,0.6)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 160, height * 0.72);
  ctx.quadraticCurveTo(cx, height * 0.66, cx + 160, height * 0.72);
  ctx.stroke();

  // ── Film grain (noise for realism) ──
  const imgData = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    imgData.data[i]     = Math.max(0, Math.min(255, imgData.data[i]     + noise));
    imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
    imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}

/**
 * Apply histogram equalization to a canvas and return a new canvas.
 * @param {HTMLCanvasElement} src
 * @returns {HTMLCanvasElement}
 */
export function applyHistEqToCanvas(src) {
  const { width, height } = src;
  const srcCtx = src.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, width, height);

  // Build luminance histogram
  const hist = new Uint32Array(256);
  const n = width * height;
  const gray = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const lum = Math.round(
      0.2126 * srcData.data[i*4] +
      0.7152 * srcData.data[i*4+1] +
      0.0722 * srcData.data[i*4+2]
    );
    gray[i] = lum;
    hist[lum]++;
  }

  // CDF
  const cdf = new Uint32Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i-1] + hist[i];
  let cdfMin = 0;
  for (let i = 0; i < 256; i++) { if (cdf[i] > 0) { cdfMin = cdf[i]; break; } }

  // LUT
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(((cdf[i] - cdfMin) / (n - cdfMin)) * 255);
  }

  // Apply
  const out = new ImageData(width, height);
  for (let i = 0; i < n; i++) {
    const r = srcData.data[i*4], g = srcData.data[i*4+1], b = srcData.data[i*4+2];
    const lum = gray[i];
    const newLum = lut[lum];
    const scale = lum > 0 ? newLum / lum : 1;
    out.data[i*4]   = Math.min(255, Math.round(r * scale));
    out.data[i*4+1] = Math.min(255, Math.round(g * scale));
    out.data[i*4+2] = Math.min(255, Math.round(b * scale));
    out.data[i*4+3] = 255;
  }

  const dst = document.createElement('canvas');
  dst.width = width; dst.height = height;
  dst.getContext('2d').putImageData(out, 0, 0);
  return dst;
}

/**
 * Apply LSB steganography visually — show what "pixel noise" looks like
 * by amplifying the LSB plane (×128) so changes become visible.
 * @param {HTMLCanvasElement} src
 * @returns {HTMLCanvasElement}
 */
export function visualizeLSBPlane(src) {
  const { width, height } = src;
  const srcCtx = src.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, width, height);
  const out = new ImageData(width, height);

  for (let i = 0; i < width * height; i++) {
    // Amplify LSB: if bit=1 → 255 (white), bit=0 → 0 (black)
    out.data[i*4]   = (srcData.data[i*4]   & 1) * 255;
    out.data[i*4+1] = (srcData.data[i*4+1] & 1) * 255;
    out.data[i*4+2] = (srcData.data[i*4+2] & 1) * 255;
    out.data[i*4+3] = 255;
  }

  const dst = document.createElement('canvas');
  dst.width = width; dst.height = height;
  dst.getContext('2d').putImageData(out, 0, 0);
  return dst;
}

/**
 * Simulate RLE compression visually — show run-boundaries as colored bands.
 * Alternating bands highlight where runs start/end.
 * @param {HTMLCanvasElement} src
 * @returns {HTMLCanvasElement}
 */
export function visualizeRLERuns(src) {
  const { width, height } = src;
  const srcCtx = src.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, width, height);
  const out = new ImageData(width, height);

  let toggle = false;
  let prev = null;

  for (let i = 0; i < width * height; i++) {
    const lum = Math.round(
      0.2126 * srcData.data[i*4] +
      0.7152 * srcData.data[i*4+1] +
      0.0722 * srcData.data[i*4+2]
    );

    if (prev !== null && lum !== prev) toggle = !toggle;
    prev = lum;

    // Color: original gray + tint per run
    const base = lum;
    if (toggle) {
      out.data[i*4]   = Math.min(255, base + 40);  // slightly warmer
      out.data[i*4+1] = Math.min(255, base + 10);
      out.data[i*4+2] = Math.min(255, base);
    } else {
      out.data[i*4]   = Math.min(255, base);
      out.data[i*4+1] = Math.min(255, base + 10);
      out.data[i*4+2] = Math.min(255, base + 40);  // slightly cooler
    }
    out.data[i*4+3] = 255;
  }

  const dst = document.createElement('canvas');
  dst.width = width; dst.height = height;
  dst.getContext('2d').putImageData(out, 0, 0);
  return dst;
}
