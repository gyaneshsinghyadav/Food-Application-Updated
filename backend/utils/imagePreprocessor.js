const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Preprocess an image for optimal AI vision model analysis.
 * - Resizes to max 1024px on longest side (vision models internally downscale anyway)
 * - Converts to JPEG with 85% quality for consistent input
 * - Strips EXIF metadata to reduce size
 * - Auto-rotates based on EXIF orientation
 *
 * @param {string} inputPath - Absolute path to the original image file
 * @returns {Promise<string>} - Absolute path to the preprocessed image
 */
async function preprocessImage(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, ext);
  const outputPath = path.join(dir, `${base}_processed.jpg`);

  try {
    const metadata = await sharp(inputPath).metadata();
    const { width, height } = metadata;

    console.log(`[imagePreprocessor] Input: ${width}x${height} (${ext})`);

    // Only resize if the image is larger than 1024px on any side
    const MAX_DIM = 1024;
    const needsResize = (width && width > MAX_DIM) || (height && height > MAX_DIM);

    let pipeline = sharp(inputPath)
      .rotate()          // Auto-rotate based on EXIF orientation
      .removeAlpha();    // Remove alpha channel (transparency) for JPEG

    if (needsResize) {
      pipeline = pipeline.resize(MAX_DIM, MAX_DIM, {
        fit: 'inside',           // Maintain aspect ratio, fit within box
        withoutEnlargement: true  // Never upscale
      });
    }

    await pipeline
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(outputPath);

    // Get output stats
    const outStats = fs.statSync(outputPath);
    const inStats = fs.statSync(inputPath);
    const savings = Math.round((1 - outStats.size / inStats.size) * 100);
    console.log(`[imagePreprocessor] Output: ${outputPath} | Saved ${savings}% (${inStats.size} → ${outStats.size} bytes)`);

    return outputPath;
  } catch (err) {
    console.error('[imagePreprocessor] Failed to preprocess, using original:', err.message);
    // Return original path on failure — never block the pipeline
    return inputPath;
  }
}

/**
 * Cleanup a preprocessed image file (call after analysis is complete).
 * @param {string} processedPath - The path returned by preprocessImage
 * @param {string} originalPath - The original path to avoid deleting the source
 */
function cleanupProcessed(processedPath, originalPath) {
  if (processedPath && processedPath !== originalPath) {
    fs.unlink(processedPath, () => {});
  }
}

module.exports = { preprocessImage, cleanupProcessed };
