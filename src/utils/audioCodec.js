/**
 * Audio Codec Utilities — TeleCode Medical
 *
 * Implements:
 *  1. µ-law (G.711) compression/decompression on PCM WAV samples
 *  2. LSB steganography on WAV audio samples
 *  3. WAV file parsing and synthesis
 *
 * Use-case: Embed doctor voice note / diagnosis recording into WAV audio.
 */

// ─── WAV Parser ───────────────────────────────────────────────────────────────

/**
 * Parse a WAV file ArrayBuffer into its components.
 * Supports PCM (format 1), 16-bit, mono or stereo.
 * @param {ArrayBuffer} buffer
 * @returns {{ sampleRate, numChannels, bitsPerSample, samples: Int16Array, headerBytes: Uint8Array }}
 */
export function parseWav(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Validate RIFF header
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('Not a valid WAV file.');

  // Find fmt chunk
  let offset = 12;
  let fmtOffset = -1;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ') fmtOffset = offset + 8;
    if (chunkId === 'data') { dataOffset = offset + 8; dataSize = chunkSize; }
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++; // padding byte
  }

  if (fmtOffset < 0 || dataOffset < 0) throw new Error('WAV fmt or data chunk not found.');

  const audioFormat   = view.getUint16(fmtOffset,      true);
  const numChannels   = view.getUint16(fmtOffset + 2,  true);
  const sampleRate    = view.getUint32(fmtOffset + 4,  true);
  const bitsPerSample = view.getUint16(fmtOffset + 14, true);

  if (audioFormat !== 1) throw new Error('Only PCM WAV (format 1) is supported.');
  if (bitsPerSample !== 16) throw new Error('Only 16-bit WAV is supported.');

  const numSamples = dataSize / 2; // 16-bit = 2 bytes per sample
  const samples = new Int16Array(buffer, dataOffset, numSamples);

  // Keep header bytes (everything up to data chunk content) for reconstruction
  const headerBytes = bytes.slice(0, dataOffset);

  return { sampleRate, numChannels, bitsPerSample, samples: Int16Array.from(samples), headerBytes, dataOffset };
}

/**
 * Build a WAV ArrayBuffer from header bytes + modified samples.
 * @param {Uint8Array} headerBytes - original header (with corrected data size)
 * @param {Int16Array} samples
 * @returns {ArrayBuffer}
 */
export function buildWav(headerBytes, samples) {
  const dataSize = samples.length * 2;
  const totalSize = headerBytes.length + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Copy header
  bytes.set(headerBytes);

  // Fix RIFF chunk size
  view.setUint32(4, totalSize - 8, true);

  // Fix data chunk size — find 'data' marker in header
  for (let i = 0; i < headerBytes.length - 4; i++) {
    if (headerBytes[i] === 0x64 && headerBytes[i+1] === 0x61 &&
        headerBytes[i+2] === 0x74 && headerBytes[i+3] === 0x61) {
      view.setUint32(i + 4, dataSize, true);
      break;
    }
  }

  // Write samples
  const sampleView = new DataView(buffer, headerBytes.length);
  for (let i = 0; i < samples.length; i++) {
    sampleView.setInt16(i * 2, samples[i], true);
  }

  return buffer;
}

// ─── µ-law (G.711) Codec ──────────────────────────────────────────────────────

const MULAW_MAX = 0x1FFF;
const MULAW_BIAS = 33;

/**
 * Encode a 16-bit PCM sample to 8-bit µ-law.
 * This is the G.711 µ-law compression — reduces audio from 16-bit to 8-bit (2:1 ratio).
 */
export function encodeMulaw(sample) {
  let sign = 0;
  if (sample < 0) { sign = 0x80; sample = -sample; }
  if (sample > 32767) sample = 32767;
  sample += MULAW_BIAS;
  if (sample > MULAW_MAX) sample = MULAW_MAX;

  // Find segment
  let exp = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exp > 0; exp--, expMask >>= 1);
  const mantissa = (sample >> (exp + 3)) & 0x0F;
  const mulaw = ~(sign | (exp << 4) | mantissa) & 0xFF;
  return mulaw;
}

/**
 * Decode an 8-bit µ-law sample back to 16-bit PCM.
 */
export function decodeMulaw(mulaw) {
  mulaw = ~mulaw & 0xFF;
  const sign = mulaw & 0x80;
  const exp = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0F;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exp;
  if (sign !== 0) sample = -sample;
  return Math.max(-32768, Math.min(32767, sample));
}

/**
 * Compress Int16Array PCM samples using µ-law → Uint8Array (half size).
 */
export function compressAudioMulaw(samples) {
  const compressed = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    compressed[i] = encodeMulaw(samples[i]);
  }
  return compressed;
}

/**
 * Decompress Uint8Array µ-law → Int16Array PCM samples.
 */
export function decompressAudioMulaw(compressed) {
  const samples = new Int16Array(compressed.length);
  for (let i = 0; i < compressed.length; i++) {
    samples[i] = decodeMulaw(compressed[i]);
  }
  return samples;
}

/**
 * Calculate compression ratio info.
 */
export function getCompressionInfo(originalSamples, compressedBytes) {
  const originalBytes = originalSamples.length * 2;
  const ratio = originalBytes / compressedBytes;
  const saved = ((1 - compressedBytes / originalBytes) * 100).toFixed(1);
  return { originalBytes, compressedBytes, ratio: ratio.toFixed(2), saved };
}

// ─── Audio LSB Steganography ──────────────────────────────────────────────────

const AUDIO_MAGIC = 'TCMA'; // TeleCode Medical Audio

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

function stringToBits(str) {
  const bytes = new TextEncoder().encode(str);
  const bits = [];
  for (const byte of bytes) for (let j = 7; j >= 0; j--) bits.push((byte >> j) & 1);
  return bits;
}

function bitsToBytes(bits) {
  const bytes = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    bytes.push(b);
  }
  return new Uint8Array(bytes);
}

/**
 * Embed a text message into PCM samples via LSB steganography.
 *
 * Layout (in sample LSBs):
 *   [32 bits: magic "TCMA"]
 *   [32 bits: payload byte length]
 *   [N*8 bits: payload UTF-8 bytes]
 *
 * Only 1 LSB per sample is modified — inaudible change.
 *
 * @param {Int16Array} samples
 * @param {string} message
 * @returns {Int16Array} modified samples
 */
export function embedDataInAudio(samples, message) {
  const payloadBits = stringToBits(message);
  const payloadBytes = payloadBits.length / 8;
  const magicBits   = stringToBits(AUDIO_MAGIC); // 32 bits
  const lengthBits  = uint32ToBits(Math.floor(payloadBytes)); // 32 bits
  const allBits     = [...magicBits, ...lengthBits, ...payloadBits];

  if (allBits.length > samples.length) {
    throw new Error(
      `Audio too short. Need ${allBits.length} samples, have ${samples.length}. ` +
      'Use a longer audio recording (at least 5 seconds at 44.1kHz).'
    );
  }

  const out = Int16Array.from(samples);
  for (let i = 0; i < allBits.length; i++) {
    // Clear LSB and set our bit
    out[i] = (out[i] & 0xFFFE) | allBits[i];
  }
  return out;
}

/**
 * Extract embedded text from PCM samples via LSB steganography.
 * @param {Int16Array} samples
 * @returns {string}
 */
export function extractDataFromAudio(samples) {
  const allBits = [];
  for (let i = 0; i < samples.length; i++) allBits.push(samples[i] & 1);

  if (allBits.length < 64) throw new Error('Audio too short to contain embedded data.');

  const magic = new TextDecoder().decode(bitsToBytes(allBits.slice(0, 32)));
  if (magic !== AUDIO_MAGIC) {
    throw new Error('Magic header not found — audio was not encoded with TeleCode Medical.');
  }

  const payloadBytes = bitsToUint32(allBits.slice(32, 64));
  if (payloadBytes === 0 || payloadBytes > 1_000_000) {
    throw new Error('Invalid payload length in audio header.');
  }

  const payloadBitCount = payloadBytes * 8;
  const start = 64;
  const end = start + payloadBitCount;

  if (allBits.length < end) throw new Error('Audio data shorter than expected payload.');

  return new TextDecoder().decode(bitsToBytes(allBits.slice(start, end)));
}
