// Magic header to mark the start of embedded data — prevents false positives
const MAGIC = 'TCMD'; // TeleCode Medical Data

/**
 * Encode a 32-bit unsigned integer into 32 bits (MSB first)
 */
function uint32ToBits(n) {
  const bits = [];
  for (let i = 31; i >= 0; i--) bits.push((n >>> i) & 1);
  return bits;
}

/**
 * Decode 32 bits (MSB first) into a 32-bit unsigned integer
 */
function bitsToUint32(bits) {
  let n = 0;
  for (let i = 0; i < 32; i++) n = (n << 1) | bits[i];
  return n >>> 0;
}

/**
 * Converts a UTF-8 string to an array of bits
 */
function stringToBits(str) {
  // Encode as UTF-8 bytes via TextEncoder for full Unicode support
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const bits = [];
  for (const byte of bytes) {
    for (let j = 7; j >= 0; j--) {
      bits.push((byte >> j) & 1);
    }
  }
  return bits;
}

/**
 * Converts an array of bits back to a UTF-8 string
 */
function bitsToString(bits) {
  const bytes = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    bytes.push(byte);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Embeds string data into image data using LSB steganography.
 *
 * Layout in pixel LSBs:
 *   [32 bits: magic "TCMD" as 4 ASCII chars]
 *   [32 bits: payload byte length as uint32]
 *   [N*8 bits: payload bytes]
 *
 * @param {ImageData} imageData
 * @param {string} data - the string to embed
 * @returns {ImageData}
 */
export function embedDataInImage(imageData, data) {
  const payloadBits = stringToBits(data);
  const payloadBytes = payloadBits.length / 8; // always whole bytes from stringToBits

  // Build magic bits (4 ASCII chars × 8 bits = 32 bits)
  const magicBits = stringToBits(MAGIC); // exactly 32 bits

  // Build length header (32 bits)
  const lengthBits = uint32ToBits(Math.floor(payloadBytes));

  const allBits = [...magicBits, ...lengthBits, ...payloadBits];
  const totalBits = allBits.length;

  const pixels = imageData.data;
  // Capacity: 3 bits per pixel (R,G,B channels)
  const capacityBits = Math.floor(pixels.length / 4) * 3;

  if (totalBits > capacityBits) {
    const neededPixels = Math.ceil(totalBits / 3);
    const neededSide = Math.ceil(Math.sqrt(neededPixels));
    throw new Error(
      `Image too small. Payload needs ~${neededPixels} pixels. ` +
      `Use an image at least ${neededSide}×${neededSide}px (recommended: 512×512px or larger).`
    );
  }

  let bitIdx = 0;
  for (let i = 0; i < pixels.length && bitIdx < totalBits; i += 4) {
    for (let ch = 0; ch < 3 && bitIdx < totalBits; ch++) {
      pixels[i + ch] = (pixels[i + ch] & 0xFE) | allBits[bitIdx];
      bitIdx++;
    }
  }
  return imageData;
}

/**
 * Extracts embedded string data from image data using LSB steganography.
 * Expects the layout written by embedDataInImage.
 *
 * @param {ImageData} imageData
 * @returns {string}
 */
export function extractDataFromImage(imageData) {
  const pixels = imageData.data;

  // Collect all LSBs from R,G,B channels
  const allBits = [];
  for (let i = 0; i < pixels.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      allBits.push(pixels[i + ch] & 1);
    }
  }

  // Minimum bits needed: 32 (magic) + 32 (length)
  if (allBits.length < 64) throw new Error('Image too small to contain any embedded data.');

  // Read magic header (first 32 bits = 4 bytes)
  const magic = bitsToString(allBits.slice(0, 32));
  if (magic !== MAGIC) {
    throw new Error(
      'Magic header not found. This image was not encoded with TeleCode Medical, ' +
      'or the encoding used the old format.'
    );
  }

  // Read payload length (next 32 bits)
  const payloadBytes = bitsToUint32(allBits.slice(32, 64));

  if (payloadBytes === 0 || payloadBytes > 10_000_000) {
    throw new Error('Invalid payload length header — file may be corrupted.');
  }

  const payloadBitCount = payloadBytes * 8;
  const payloadStart = 64; // 32 magic + 32 length
  const payloadEnd = payloadStart + payloadBitCount;

  if (allBits.length < payloadEnd) {
    throw new Error('Image data is shorter than the embedded payload length — file may be corrupted.');
  }

  return bitsToString(allBits.slice(payloadStart, payloadEnd));
}

/**
 * Loads an image from a File or Blob object
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Gets ImageData from an HTMLImageElement
 */
export function getImageData(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Converts ImageData to a Blob (PNG for lossless)
 */
export function imageDataToBlob(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve) => {
    // PNG is lossless, crucial for steganography
    canvas.toBlob(resolve, 'image/png');
  });
}
