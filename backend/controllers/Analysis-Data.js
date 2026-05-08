const fs    = require('fs');
const os    = require('os');
const path  = require('path');
const axios = require('axios');
const { analyzeImage } = require('../utils/aiService.js');

/**
 * Analyze an image for health/nutrition info via local AI (Ollama).
 * @param {string} imagePath  Local path of the image uploaded by multer.
 * @returns {Promise<string>}  A brief summary of any health issues found.
 */
async function analyzeHealthFromImage(imagePath) {
  // 1) skip download, use local path
  try {
    // 2) analyze with vision model
    const prompt =
      'You are an expert dietitian and nutritionist. Analyze this image and detect any health or nutritional issues it reveals ' +
      '(e.g. poor portion size, high sugar content, unbalanced meal, unsafe contaminants, etc.). ' +
      'Provide a concise summary in one or two sentences.';

    const summary = await analyzeImage(imagePath, prompt);
    return summary.trim();

  } catch (err) {
    console.error("Error analyzing health from image:", err);
    return "Failed to analyze image health/nutrition info.";
  }
}

module.exports = { analyzeHealthFromImage };