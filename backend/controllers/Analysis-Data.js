const { analyzeImage, extractJSON } = require('../utils/aiService.js');

/**
 * Analyze a health/medical report image using OCR.
 * Extracts structured lab values: blood sugar, cholesterol, BP, hemoglobin, etc.
 * @param {string} imagePath - Local path to the uploaded report image
 * @returns {Promise<object>} Structured health report data
 */
async function analyzeHealthReport(imagePath) {
  const prompt = `You are a medical lab report OCR system. Read this health/medical report image carefully.

Extract ALL lab values you can see. For each value, determine if it is Normal, High, or Low based on standard medical reference ranges.

Return ONLY valid JSON:
{
  "rawSummary": "Brief 2-3 sentence summary of overall health status",
  "bloodSugar": {
    "fasting": 0,
    "pp": 0,
    "hba1c": 0,
    "status": "normal/high/low/pre-diabetic/diabetic"
  },
  "cholesterol": {
    "total": 0,
    "hdl": 0,
    "ldl": 0,
    "triglycerides": 0,
    "status": "normal/high/borderline"
  },
  "bloodPressure": {
    "systolic": 0,
    "diastolic": 0,
    "status": "normal/high/low"
  },
  "hemoglobin": {
    "value": 0,
    "status": "normal/high/low/anemic"
  },
  "thyroid": {
    "tsh": 0,
    "t3": 0,
    "t4": 0,
    "status": "normal/hyper/hypo"
  },
  "kidneyFunction": {
    "creatinine": 0,
    "uricAcid": 0,
    "bun": 0,
    "status": "normal/elevated"
  },
  "liverFunction": {
    "sgot": 0,
    "sgpt": 0,
    "status": "normal/elevated"
  },
  "vitamins": {
    "d": 0,
    "b12": 0,
    "iron": 0
  },
  "riskFactors": ["Pre-diabetic", "High cholesterol"],
  "dietaryRestrictions": ["Low sugar", "Low sodium", "High iron foods"]
}

Rules:
- Set values to 0 if not found in the report
- riskFactors: list health risks based on abnormal values (e.g. "Pre-diabetic" if fasting sugar 100-125)
- dietaryRestrictions: dietary advice based on the results (e.g. "Avoid high sugar foods" for diabetics)
- If the image is NOT a medical report, return: {"rawSummary": "Not a medical report", "riskFactors": [], "dietaryRestrictions": []}`;

  try {
    const resp = await analyzeImage(imagePath, prompt, { temperature: 0.1, json: true });
    console.log('[analyzeHealthReport] Raw response:', resp.substring(0, 300));

    const parsed = extractJSON(resp, false);
    if (parsed && parsed.rawSummary) {
      // Add extraction timestamp
      parsed.extractedAt = new Date();
      return parsed;
    }

    // Fallback if structured extraction fails
    return {
      rawSummary: resp.trim().substring(0, 500),
      extractedAt: new Date(),
      riskFactors: [],
      dietaryRestrictions: [],
    };
  } catch (err) {
    console.error('[analyzeHealthReport] Error:', err.message);
    return {
      rawSummary: 'Failed to analyze health report: ' + err.message,
      extractedAt: new Date(),
      riskFactors: [],
      dietaryRestrictions: [],
    };
  }
}

// Keep backward compatibility
async function analyzeHealthFromImage(imagePath) {
  const report = await analyzeHealthReport(imagePath);
  return report;
}

module.exports = { analyzeHealthReport, analyzeHealthFromImage };