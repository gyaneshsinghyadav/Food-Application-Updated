const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — All Ollama, fully local
// ─────────────────────────────────────────────────────────────────────────────
const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';

// Best local models for this use case:
//   Vision: llama3.2-vision (11B) — excellent for food/text recognition
//   Text:   llama3.2:3b — fast, good JSON output
const TEXT_MODEL   = process.env.AI_TEXT_MODEL   || 'llama3.2:3b';
const VISION_MODEL = process.env.AI_VISION_MODEL || 'llama3.2-vision';

console.log(`[aiService] Using TEXT_MODEL=${TEXT_MODEL}, VISION_MODEL=${VISION_MODEL}`);
console.log(`[aiService] Ollama URL: ${OLLAMA_BASE}`);

// ─────────────────────────────────────────────────────────────────────────────
// RETRY WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
async function withRetry(fn, { maxRetries = 2, baseDelay = 1500, label = 'call' } = {}) {
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

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE TEXT — text-only prompt via Ollama
// ─────────────────────────────────────────────────────────────────────────────
async function generateText(prompt, options = {}) {
  const { json = false, system = '', temperature = 0.4 } = options;

  return withRetry(async () => {
    const body = {
      model: TEXT_MODEL,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: 4096,
        top_p: 0.7,
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
      throw new Error(`Ollama text error (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    return data.response || '';
  }, { label: 'generateText' });
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYZE IMAGE — vision prompt via Ollama
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeImage(imagePath, prompt, options = {}) {
  const { json = false, system = '', temperature = 0.2 } = options;

  return withRetry(async () => {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const body = {
      model: VISION_MODEL,
      prompt,
      images: [base64Image],
      stream: false,
      options: {
        temperature,
        num_predict: 2048,
        top_p: 0.8,
        repeat_penalty: 1.15,
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

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT JSON — robust JSON extraction from model output
// ─────────────────────────────────────────────────────────────────────────────
function extractJSON(text, isArray = false) {
  if (!text) return null;

  // Strip markdown fences
  let t = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Find JSON block
  const re = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const m = t.match(re);
  if (!m) {
    const lastBrace = isArray ? t.lastIndexOf(']') : t.lastIndexOf('}');
    const firstBrace = isArray ? t.indexOf('[') : t.indexOf('{');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleanJSON(t.substring(firstBrace, lastBrace + 1)));
      } catch { /* fall through */ }
    }
    return null;
  }

  const cleaned = cleanJSON(m[0]);

  try { return JSON.parse(cleaned); } catch {}
  try { return JSON.parse(cleaned.replace(/[\u0000-\u001F\u007F]/g, ' ')); } catch {}
  try {
    return JSON.parse(cleaned.replace(/'/g, '"').replace(/,\s*([}\]])/g, '$1'));
  } catch {
    console.error('[extractJSON] Failed for:', text.substring(0, 200));
    return null;
  }
}

function cleanJSON(str) {
  return str
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/\bNaN\b/g, '0')
    .replace(/\bundefined\b/g, 'null')
    .replace(/\bInfinity\b/g, '0')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function healthCheck() {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!resp.ok) return { ok: false, models: [], error: 'Ollama not responding' };
    const data = await resp.json();
    const models = (data.models || []).map(m => m.name);
    const hasVision = models.some(m => m.includes(VISION_MODEL.split(':')[0]));
    const hasText = models.some(m => m.includes(TEXT_MODEL.split(':')[0]));
    return { ok: true, models, hasVision, hasText };
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
