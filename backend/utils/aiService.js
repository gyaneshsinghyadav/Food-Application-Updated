const fs = require('fs');
const path = require('path');

// Ollama API base URL (local)
const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';

// Models — change these if you pull different models
const TEXT_MODEL   = process.env.AI_TEXT_MODEL   || 'llama3.2:3b';
const VISION_MODEL = process.env.AI_VISION_MODEL || 'minicpm-v';

// ─────────────────────────────────────────────────────────────────────────────
// RETRY WRAPPER — retries failed Ollama calls with exponential backoff
// ─────────────────────────────────────────────────────────────────────────────
async function withRetry(fn, { maxRetries = 2, baseDelay = 1000, label = 'call' } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`[withRetry] ${label} failed after ${maxRetries + 1} attempts:`, err.message);
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`[withRetry] ${label} attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Generate text from a prompt using Ollama.
 * @param {string} prompt - The prompt to send
 * @param {object} options - { json: bool, system: string, temperature: number }
 * @returns {Promise<string>} The generated text
 */
async function generateText(prompt, options = {}) {
  const { json = false, system = '', temperature = 0.4 } = options;

  return withRetry(async () => {
    const body = {
      model: TEXT_MODEL,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: 4096,     // Increased from 2048 — prevents JSON truncation
        top_p: 0.7,            // Lowered from 0.9 — more deterministic
        repeat_penalty: 1.1,
      },
    };

    if (system) body.system = system;
    if (json) body.format = 'json';

    const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Ollama error (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    return data.response || '';
  }, { label: 'generateText' });
}

/**
 * Analyze an image with a text prompt using Ollama's vision model.
 * @param {string} imagePath - Absolute path to the image file
 * @param {string} prompt - The prompt to send alongside the image
 * @param {object} options - { json: bool, system: string, temperature: number }
 * @returns {Promise<string>} The generated text
 */
async function analyzeImage(imagePath, prompt, options = {}) {
  const { json = false, system = '', temperature = 0.2 } = options;

  return withRetry(async () => {
    // Read image as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const body = {
      model: VISION_MODEL,
      prompt,
      images: [base64Image],
      stream: false,
      options: {
        temperature,
        num_predict: 2048,     // Increased from 1024 — room for detailed JSON
        top_p: 0.7,            // Lowered from 0.85 — more consistent output
        repeat_penalty: 1.2,
      },
    };

    if (system) body.system = system;
    if (json) body.format = 'json';

    const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Ollama vision error (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    return data.response || '';
  }, { label: 'analyzeImage' });
}

/**
 * Extract a JSON object or array from model output text.
 * Multi-strategy: strict parse → regex extract → key-value fallback.
 * @param {string} text - Raw model output
 * @param {boolean} isArray - Whether to look for an array
 * @returns {object|array|null} Parsed JSON or null
 */
function extractJSON(text, isArray = false) {
  if (!text) return null;

  // Strategy 1: Strip markdown fences and try direct parse
  let t = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Strategy 2: Extract JSON block via regex
  const re = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const m = t.match(re);
  if (!m) {
    // Strategy 3: If no JSON found, try to find even partial JSON
    // Sometimes models prefix with text like "Here is the JSON:"
    const lastBrace = isArray ? t.lastIndexOf(']') : t.lastIndexOf('}');
    const firstBrace = isArray ? t.indexOf('[') : t.indexOf('{');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const slice = t.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(cleanJSON(slice));
      } catch {
        // Fall through
      }
    }
    return null;
  }

  const cleaned = cleanJSON(m[0]);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Strategy 4: More aggressive cleanup — remove control chars
    try {
      const sanitised = cleaned.replace(/[\u0000-\u001F\u007F]/g, ' ');
      return JSON.parse(sanitised);
    } catch {
      // Strategy 5: Try to fix common issues — unescaped quotes in values
      try {
        // Replace single quotes with double quotes (common model error)
        const fixed = cleaned
          .replace(/'/g, '"')
          .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixed);
      } catch {
        console.error('[extractJSON] All strategies failed for text:', text.substring(0, 200));
        return null;
      }
    }
  }
}

/**
 * Clean common JSON issues from model output.
 */
function cleanJSON(str) {
  return str
    .replace(/,(\s*[}\]])/g, '$1')    // trailing commas
    .replace(/\bNaN\b/g, '0')          // NaN → 0
    .replace(/\bundefined\b/g, 'null')  // undefined → null
    .replace(/\bInfinity\b/g, '0')      // Infinity → 0
    .trim();
}

/**
 * Check if Ollama is running and the required models are available.
 * @returns {Promise<{ok: boolean, models: string[], error?: string}>}
 */
async function healthCheck() {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!resp.ok) return { ok: false, models: [], error: 'Ollama not responding' };
    const data = await resp.json();
    const models = (data.models || []).map(m => m.name);
    return { ok: true, models };
  } catch (err) {
    return { ok: false, models: [], error: err.message };
  }
}

module.exports = {
  generateText,
  analyzeImage,
  extractJSON,
  healthCheck,
  TEXT_MODEL,
  VISION_MODEL,
};
