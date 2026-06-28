/**
 * Image Processing Utilities — TeleCode Medical
 *
 * Implements:
 *  1. RLE (Run-Length Encoding) compression/decompression on grayscale pixel rows
 *  2. Histogram Equalization for X-Ray/MRI contrast enhancement
 *  3. PSNR (Peak Signal-to-Noise Ratio) quality metric
 *  4. AES-256-GCM encryption/decryption via Web Crypto API
 *  5. A-law G.711 audio codec (European standard)
 */

// ─── RLE Compression ─────────────────────────────────────────────────────────

/**
 * Encode ImageData using Run-Length Encoding on the grayscale channel.
 * Each pixel is converted to grayscale (avg R+G+B), then runs of identical
 * values are encoded as [count, value] pairs.
 *
 * @param {ImageData} imageData
 * @returns {{ encoded: Uint16Array, width: number, height: number, originalBytes: number, compressedBytes: number }}
 */
export function rleEncodeImage(imageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);

  // Convert to grayscale
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Luminance-weighted grayscale (standard BT.709)
    gray[i] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }

  // RLE encode: [count (1–255), value] pairs stored in Uint16Array
  const pairs = [];
  let i = 0;
  while (i < gray.length) {
    const val = gray[i];
    let count = 1;
    while (i + count < gray.length && gray[i + count] === val && count < 255) {
      count++;
    }
    pairs.push(count, val);
    i += count;
  }

  const encoded = new Uint16Array(pairs);
  return {
    encoded,
    width,
    height,
    originalBytes: gray.length,       // 1 byte per pixel
    compressedBytes: encoded.byteLength, // 2 bytes per pair (count+value)
  };
}

/**
 * Decode RLE-encoded data back to grayscale ImageData.
 * @param {Uint16Array} encoded
 * @param {number} width
 * @param {number} height
 * @returns {ImageData}
 */
export function rleDecodeImage(encoded, width, height) {
  const gray = new Uint8Array(width * height);
  let pos = 0;
  for (let i = 0; i < encoded.length; i += 2) {
    const count = encoded[i];
    const val   = encoded[i + 1];
    for (let j = 0; j < count && pos < gray.length; j++) {
      gray[pos++] = val;
    }
  }

  // Convert grayscale back to RGBA
  const result = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    result.data[i * 4]     = gray[i]; // R
    result.data[i * 4 + 1] = gray[i]; // G
    result.data[i * 4 + 2] = gray[i]; // B
    result.data[i * 4 + 3] = 255;     // A
  }
  return result;
}

/**
 * Get RLE compression stats as a human-readable object.
 */
export function getRleStats(originalBytes, compressedBytes) {
  const ratio = (originalBytes / compressedBytes).toFixed(2);
  const saved = ((1 - compressedBytes / originalBytes) * 100).toFixed(1);
  const effective = compressedBytes < originalBytes;
  return { originalBytes, compressedBytes, ratio, saved: effective ? saved : '0', effective };
}

// ─── Histogram Equalization ───────────────────────────────────────────────────

/**
 * Apply histogram equalization to improve contrast on medical images (X-Ray/MRI).
 * Operates on luminance channel, preserving color ratios.
 *
 * @param {ImageData} imageData - original ImageData
 * @returns {ImageData} equalized ImageData
 */
export function histogramEqualization(imageData) {
  const { data, width, height } = imageData;
  const n = width * height;
  const result = new ImageData(width, height);
  const out = result.data;

  // Build histogram of luminance values (0–255)
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const lum = Math.round(0.2126 * data[i*4] + 0.7152 * data[i*4+1] + 0.0722 * data[i*4+2]);
    hist[lum]++;
  }

  // Compute CDF (Cumulative Distribution Function)
  const cdf = new Uint32Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

  // Find minimum non-zero CDF value
  let cdfMin = 0;
  for (let i = 0; i < 256; i++) { if (cdf[i] > 0) { cdfMin = cdf[i]; break; } }

  // Build equalization lookup table
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(((cdf[i] - cdfMin) / (n - cdfMin)) * 255);
  }

  // Apply LUT: preserve color, only adjust luminance proportionally
  for (let i = 0; i < n; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const newLum = lut[lum];
    const scale = lum > 0 ? newLum / lum : 1;
    out[i*4]   = Math.min(255, Math.round(r * scale));
    out[i*4+1] = Math.min(255, Math.round(g * scale));
    out[i*4+2] = Math.min(255, Math.round(b * scale));
    out[i*4+3] = data[i*4+3];
  }
  return result;
}

// ─── PSNR Quality Metric ──────────────────────────────────────────────────────

/**
 * Calculate PSNR (Peak Signal-to-Noise Ratio) between two ImageData objects.
 * Higher = better quality. Medical imaging threshold: >40 dB is safe for diagnosis.
 *
 * @param {ImageData} original
 * @param {ImageData} compressed
 * @returns {{ psnr: number, mse: number, quality: 'excellent'|'good'|'fair'|'poor' }}
 */
export function calculatePSNR(original, compressed) {
  const n = original.width * original.height;
  let mse = 0;

  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const diff = original.data[i*4+ch] - compressed.data[i*4+ch];
      mse += diff * diff;
    }
  }
  mse /= (n * 3);

  if (mse === 0) return { psnr: Infinity, mse: 0, quality: 'excellent' };

  const psnr = 10 * Math.log10((255 * 255) / mse);

  let quality;
  if (psnr >= 40)      quality = 'excellent'; // safe for clinical diagnosis
  else if (psnr >= 35) quality = 'good';
  else if (psnr >= 30) quality = 'fair';
  else                 quality = 'poor';      // not recommended for diagnosis

  return { psnr: +psnr.toFixed(2), mse: +mse.toFixed(4), quality };
}

// ─── AES-256-GCM Encryption ───────────────────────────────────────────────────

/**
 * Derive a 256-bit AES key from a password using PBKDF2.
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string payload with AES-256-GCM.
 * Output format: [16 bytes salt][12 bytes IV][ciphertext]
 *
 * @param {string} plaintext
 * @param {string} password
 * @returns {Promise<Uint8Array>}
 */
export async function aesEncrypt(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);
  const enc  = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  // Combine: salt(16) + iv(12) + ciphertext
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);
  return combined;
}

/**
 * Decrypt AES-256-GCM ciphertext back to string.
 * @param {Uint8Array} combined - [salt(16) + iv(12) + ciphertext]
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function aesDecrypt(combined, password) {
  const salt       = combined.slice(0, 16);
  const iv         = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key        = await deriveKey(password, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error('Decryption failed — wrong password or corrupted data.');
  }
}

/**
 * Convert Uint8Array to Base64 string for embedding as text payload.
 */
export function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Convert Base64 string back to Uint8Array.
 */
export function base64ToUint8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── A-law G.711 Audio Codec ──────────────────────────────────────────────────

const ALAW_MAX = 32767;

/**
 * Encode a 16-bit PCM sample to 8-bit A-law (ITU-T G.711 European standard).
 * Used in European/international telecommunications systems.
 *
 * @param {number} sample - 16-bit PCM value (-32768 to 32767)
 * @returns {number} 8-bit A-law value
 */
export function encodeAlaw(sample) {
  const A = 87.6;
  let sign = 0;
  if (sample < 0) { sign = 0x80; sample = -sample; }
  if (sample > ALAW_MAX) sample = ALAW_MAX;

  let compressed;
  const normalized = sample / ALAW_MAX;

  if (normalized < 1 / A) {
    compressed = Math.round((A * normalized) / (1 + Math.log(A)) * 127);
  } else {
    compressed = Math.round((1 + Math.log(A * normalized)) / (1 + Math.log(A)) * 127);
  }

  compressed = Math.max(0, Math.min(127, compressed));
  // XOR with 0xD5 as per G.711 standard
  return (compressed | sign) ^ 0xD5;
}

/**
 * Decode 8-bit A-law sample back to 16-bit PCM.
 * @param {number} alaw - 8-bit A-law value
 * @returns {number} 16-bit PCM value
 */
export function decodeAlaw(alaw) {
  alaw ^= 0xD5;
  const sign = alaw & 0x80;
  const exp  = (alaw & 0x70) >> 4;
  const mant = alaw & 0x0F;

  let sample;
  if (exp === 0) {
    sample = (mant * 2 + 1) * (ALAW_MAX / 256);
  } else {
    sample = (mant + 16.5) * Math.pow(2, exp) * (ALAW_MAX / 256);
  }

  sample = Math.round(sample);
  if (sign !== 0) sample = -sample;
  return Math.max(-32768, Math.min(32767, sample));
}

/**
 * Compress Int16Array PCM samples using A-law → Uint8Array (half size).
 */
export function compressAudioAlaw(samples) {
  const compressed = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    compressed[i] = encodeAlaw(samples[i]);
  }
  return compressed;
}

/**
 * Decompress Uint8Array A-law → Int16Array PCM samples.
 */
export function decompressAudioAlaw(compressed) {
  const samples = new Int16Array(compressed.length);
  for (let i = 0; i < compressed.length; i++) {
    samples[i] = decodeAlaw(compressed[i]);
  }
  return samples;
}

/**
 * Calculate SNR (Signal-to-Noise Ratio) between original and decoded audio.
 * Higher is better. >30 dB = acceptable for voice; >40 dB = excellent.
 *
 * @param {Int16Array} original
 * @param {Int16Array} decoded
 * @returns {{ snr: number, quality: string }}
 */
export function calculateAudioSNR(original, decoded) {
  const len = Math.min(original.length, decoded.length);
  let signalPower = 0;
  let noisePower  = 0;

  for (let i = 0; i < len; i++) {
    signalPower += original[i] * original[i];
    const noise = original[i] - decoded[i];
    noisePower  += noise * noise;
  }

  if (noisePower === 0) return { snr: Infinity, quality: 'lossless' };
  const snr = 10 * Math.log10(signalPower / noisePower);

  let quality;
  if (snr >= 40)      quality = 'excellent';
  else if (snr >= 30) quality = 'good';
  else if (snr >= 20) quality = 'fair';
  else                quality = 'poor';

  return { snr: +snr.toFixed(1), quality };
}

/**
 * Build a waveform data URL (mini sparkline) from PCM samples for visualization.
 * @param {Int16Array} samples
 * @param {number} width  canvas px
 * @param {number} height canvas px
 * @param {string} color  hex color
 * @returns {string} data URL
 */
export function buildWaveformDataUrl(samples, width = 300, height = 60, color = '#0891B2') {
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#F0FDFA';
  ctx.fillRect(0, 0, width, height);

  const step    = Math.floor(samples.length / width);
  const mid     = height / 2;
  const scale   = mid / 32768;

  ctx.strokeStyle = color;
  ctx.lineWidth   = 1;
  ctx.beginPath();

  for (let x = 0; x < width; x++) {
    const idx = x * step;
    const y   = mid - samples[idx] * scale;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  return canvas.toDataURL();
}
