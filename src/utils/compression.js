import * as fflate from 'fflate';

/**
 * Compresses a Blob into a ZIP archive containing the file.
 * @param {Blob} blob The file blob (e.g. steganographic PNG)
 * @param {string} filename The name to store inside the zip
 * @returns {Promise<{ blob: Blob, originalSize: number, compressedSize: number }>}
 */
export function compressToZip(blob, filename) {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const originalSize = uint8Array.byteLength;

      // DEFLATE level 9 — max compression. PNG is already deflate-compressed
      // internally, so gains are minimal. ZIP acts primarily as a secure container.
      const zipped = fflate.zipSync({
        [filename]: uint8Array,
      }, { level: 9 });

      const compressedSize = zipped.byteLength;

      resolve({
        blob: new Blob([zipped], { type: 'application/zip' }),
        originalSize,
        compressedSize,
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Decompresses a ZIP archive and extracts the first file found.
 * @param {Blob} zipBlob
 * @returns {Promise<{ blob: Blob, filename: string, originalSize: number, compressedSize: number }>}
 */
export function extractFromZip(zipBlob) {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await zipBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const compressedSize = zipBlob.size;

      const unzipped = fflate.unzipSync(uint8Array);

      const filenames = Object.keys(unzipped);
      if (filenames.length === 0) {
        throw new Error('ZIP archive is empty');
      }

      const targetFile = filenames[0];
      const fileData = unzipped[targetFile];
      const originalSize = fileData.byteLength;

      // Determine MIME from extension
      let type = 'application/octet-stream';
      if (targetFile.endsWith('.png')) type = 'image/png';
      if (targetFile.endsWith('.wav')) type = 'audio/wav';

      resolve({
        blob: new Blob([fileData], { type }),
        filename: targetFile,
        originalSize,
        compressedSize,
      });
    } catch (err) {
      reject(err);
    }
  });
}
