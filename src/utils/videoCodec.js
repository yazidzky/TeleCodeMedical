/**
 * Video Codec Utilities — TeleCode Medical
 *
 * Implements:
 *  1. Frame extraction from video via HTMLVideoElement + Canvas
 *  2. Keyframe + Delta compression (frame differencing)
 *     - Keyframe: full JPEG-quality snapshot
 *     - Delta frame: only pixels that changed > threshold are stored
 *  3. LSB steganography on the first keyframe's pixel data
 *  4. Pack compressed frames into a JSON-serializable structure
 *
 * Use-case: Embed patient metadata into the keyframe of a medical
 *           consultation / procedure recording video.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const VIDEO_MAGIC   = 'TCMV'; // TeleCode Medical Video
const DELTA_THRESH  = 15;     // pixel channel difference threshold for delta
const KEYFRAME_EVERY = 30;    // force a keyframe every N frames

// ─── Frame Extraction ─────────────────────────────────────────────────────────

/**
 * Extract frames from a video File/Blob at a given FPS sample rate.
 * Returns array of ImageData objects.
 *
 * @param {File|Blob} videoFile
 * @param {number} fps - frames per second to sample (default 5)
 * @param {number} maxFrames - max frames to extract (default 60)
 * @param {function} onProgress - callback(pct: 0-100)
 * @returns {Promise<{frames: ImageData[], width: number, height: number, duration: number}>}
 */
export function extractFrames(videoFile, fps = 5, maxFrames = 60, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const url   = URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.muted  = true;
    video.preload = 'metadata';

    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const frames = [];

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot load video. Supported formats: MP4, WebM, OGG.'));
    };

    video.onloadedmetadata = async () => {
      const { duration, videoWidth, videoHeight } = video;
      if (!videoWidth || !videoHeight) {
        URL.revokeObjectURL(url);
        return reject(new Error('Video has no video track or zero dimensions.'));
      }

      // Limit resolution to 640px wide for performance
      const scale  = Math.min(1, 640 / videoWidth);
      const width  = Math.round(videoWidth  * scale);
      const height = Math.round(videoHeight * scale);
      canvas.width  = width;
      canvas.height = height;

      const interval   = 1 / fps;
      const totalFrames = Math.min(Math.floor(duration / interval), maxFrames);
      let   frameIdx   = 0;

      const seekNext = () => {
        if (frameIdx >= totalFrames) {
          URL.revokeObjectURL(url);
          return resolve({ frames, width, height, duration });
        }
        const t = frameIdx * interval;
        video.currentTime = t;
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, width, height);
        frames.push(ctx.getImageData(0, 0, width, height));
        onProgress(Math.round((frameIdx / totalFrames) * 100));
        frameIdx++;
        seekNext();
      };

      seekNext();
    };

    video.src = url;
  });
}

// ─── Keyframe + Delta Compression ────────────────────────────────────────────

/**
 * Compress array of ImageData frames using keyframe + delta encoding.
 *
 * Keyframe: stored as full JPEG blob (base64).
 * Delta frame: only changed pixels stored as sparse array {idx, r, g, b}.
 *
 * @param {ImageData[]} frames
 * @param {function} onProgress
 * @returns {Promise<{type:'keyframe'|'delta', data:string|object[]}[]>}
 */
export async function compressFrames(frames, onProgress = () => {}) {
  const compressed = [];
  let prevData = null;

  for (let i = 0; i < frames.length; i++) {
    const frame    = frames[i];
    const isKeyframe = i === 0 || i % KEYFRAME_EVERY === 0;

    if (isKeyframe || prevData === null) {
      // Keyframe: encode as JPEG base64 for compact storage
      const canvas = document.createElement('canvas');
      canvas.width  = frame.width;
      canvas.height = frame.height;
      canvas.getContext('2d').putImageData(frame, 0, 0);
      const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      compressed.push({ type: 'keyframe', data: b64, width: frame.width, height: frame.height });
    } else {
      // Delta frame: store only changed pixels
      const curr  = frame.data;
      const prev  = prevData;
      const deltas = [];
      for (let p = 0; p < curr.length; p += 4) {
        const dr = Math.abs(curr[p]   - prev[p]);
        const dg = Math.abs(curr[p+1] - prev[p+1]);
        const db = Math.abs(curr[p+2] - prev[p+2]);
        if (dr > DELTA_THRESH || dg > DELTA_THRESH || db > DELTA_THRESH) {
          deltas.push({ i: p >> 2, r: curr[p], g: curr[p+1], b: curr[p+2] });
        }
      }
      compressed.push({ type: 'delta', data: deltas });
    }

    prevData = frame.data.slice(); // copy pixel data for next delta
    onProgress(Math.round(((i + 1) / frames.length) * 80));
  }

  return compressed;
}

/**
 * Decompress compressed frames back to ImageData array.
 * @param {{type, data, width?, height?}[]} compressed
 * @param {number} width
 * @param {number} height
 * @returns {Promise<ImageData[]>}
 */
export async function decompressFrames(compressed, width, height) {
  const frames   = [];
  let prevPixels = null;

  for (const frame of compressed) {
    if (frame.type === 'keyframe') {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = 'data:image/jpeg;base64,' + frame.data;
      });
      const canvas = document.createElement('canvas');
      canvas.width  = frame.width || width;
      canvas.height = frame.height || height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      frames.push(id);
      prevPixels = id.data.slice();
    } else if (frame.type === 'delta' && prevPixels) {
      const pixels = prevPixels.slice();
      for (const { i, r, g, b } of frame.data) {
        pixels[i * 4]     = r;
        pixels[i * 4 + 1] = g;
        pixels[i * 4 + 2] = b;
        // alpha stays same
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const id  = ctx.createImageData(width, height);
      id.data.set(pixels);
      frames.push(id);
      prevPixels = pixels;
    }
  }

  return frames;
}

/**
 * Calculate compression statistics.
 */
export function getVideoCompressionStats(frames, compressed) {
  const keyframes = compressed.filter(f => f.type === 'keyframe').length;
  const deltas    = compressed.filter(f => f.type === 'delta').length;
  const rawBytes  = frames.length > 0
    ? frames[0].data.length * frames.length
    : 0;
  const compressedStr = JSON.stringify(compressed);
  const compBytes  = new TextEncoder().encode(compressedStr).length;
  const ratio      = rawBytes > 0 ? (rawBytes / compBytes).toFixed(1) : 'N/A';
  return { totalFrames: frames.length, keyframes, deltas, rawBytes, compBytes, ratio };
}

// ─── Video Steganography (embed in keyframe) ──────────────────────────────────

function uint32ToBits(n) {
  const bits = [];
  for (let i = 31; i >= 0; i--) bits.push((n >>> i) & 1);
  return bits;
}

function bitsToUint32(bits) {
  let n = 0;
  for (let i = 0; i < 32; i++) n = (n << 1) | bits[i];
  return n >>> 0;
}

function strToBits(str) {
  const bytes = new TextEncoder().encode(str);
  const bits = [];
  for (const byte of bytes) for (let j = 7; j >= 0; j--) bits.push((byte >> j) & 1);
  return bits;
}

function bitsToUint8Arr(bits) {
  const bytes = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    bytes.push(b);
  }
  return new Uint8Array(bytes);
}

/**
 * Embed a JSON metadata string into the first keyframe's pixel data using LSB.
 *
 * Layout: [32b magic][32b length][payload bits]
 *
 * @param {{type, data, width?, height?}[]} compressedFrames
 * @param {string} metadata - JSON string
 * @returns {Promise<{type,data,width?,height?}[]>} modified compressed frames
 */
export async function embedDataInVideoKeyframe(compressedFrames, metadata) {
  const keyIdx = compressedFrames.findIndex(f => f.type === 'keyframe');
  if (keyIdx < 0) throw new Error('No keyframe found in compressed video.');

  // Decode keyframe to ImageData
  const kf  = compressedFrames[keyIdx];
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = 'data:image/jpeg;base64,' + kf.data;
  });
  const canvas = document.createElement('canvas');
  canvas.width  = kf.width || img.width;
  canvas.height = kf.height || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // LSB embed
  const payloadBits = strToBits(metadata);
  const payloadBytes = payloadBits.length / 8;
  const magicBits   = strToBits(VIDEO_MAGIC); // 32 bits
  const lengthBits  = uint32ToBits(Math.floor(payloadBytes));
  const allBits     = [...magicBits, ...lengthBits, ...payloadBits];
  const pixels      = imageData.data;
  const capacity    = Math.floor(pixels.length / 4) * 3;

  if (allBits.length > capacity) {
    throw new Error(`Video keyframe too small for metadata. Use higher resolution video.`);
  }

  let bitIdx = 0;
  for (let i = 0; i < pixels.length && bitIdx < allBits.length; i += 4) {
    for (let ch = 0; ch < 3 && bitIdx < allBits.length; ch++) {
      pixels[i + ch] = (pixels[i + ch] & 0xFE) | allBits[bitIdx++];
    }
  }

  // Re-encode keyframe as lossless PNG base64 (to preserve LSB)
  ctx.putImageData(imageData, 0, 0);
  const pngB64 = canvas.toDataURL('image/png').split(',')[1];

  const modified = compressedFrames.map((f, i) =>
    i === keyIdx ? { ...f, data: pngB64, _lossless: true } : f
  );
  return modified;
}

/**
 * Extract metadata from the first keyframe's LSB steganography.
 * @param {{type,data,width?,height?,_lossless?}[]} compressedFrames
 * @returns {Promise<string>}
 */
export async function extractDataFromVideoKeyframe(compressedFrames) {
  const kf = compressedFrames.find(f => f.type === 'keyframe');
  if (!kf) throw new Error('No keyframe found.');

  const mimeType = kf._lossless ? 'image/png' : 'image/jpeg';
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = `data:${mimeType};base64,` + kf.data;
  });
  const canvas = document.createElement('canvas');
  canvas.width  = kf.width || img.width;
  canvas.height = kf.height || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const allBits = [];
  for (let i = 0; i < pixels.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) allBits.push(pixels[i + ch] & 1);
  }

  if (allBits.length < 64) throw new Error('Keyframe too small.');

  const magic = new TextDecoder().decode(bitsToUint8Arr(allBits.slice(0, 32)));
  if (magic !== VIDEO_MAGIC) {
    throw new Error('Magic header not found — video was not encoded with TeleCode Medical.');
  }

  const payloadBytes = bitsToUint32(allBits.slice(32, 64));
  if (payloadBytes === 0 || payloadBytes > 5_000_000) {
    throw new Error('Invalid payload length in video keyframe.');
  }

  const start = 64;
  const end   = start + payloadBytes * 8;
  if (allBits.length < end) throw new Error('Keyframe data shorter than expected.');

  return new TextDecoder().decode(bitsToUint8Arr(allBits.slice(start, end)));
}

/**
 * Render compressed frames onto a canvas at a given FPS (for preview playback).
 * Returns a stop function.
 *
 * @param {ImageData[]} frames
 * @param {HTMLCanvasElement} canvas
 * @param {number} fps
 * @returns {() => void} stop function
 */
export function playFrames(frames, canvas, fps = 5) {
  const ctx = canvas.getContext('2d');
  let idx = 0;
  let running = true;
  const interval = 1000 / fps;

  const tick = () => {
    if (!running || frames.length === 0) return;
    canvas.width  = frames[idx].width;
    canvas.height = frames[idx].height;
    ctx.putImageData(frames[idx], 0, 0);
    idx = (idx + 1) % frames.length;
    setTimeout(tick, interval);
  };
  tick();
  return () => { running = false; };
}
