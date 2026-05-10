const path = require('path');
const fs = require('fs');
const { analyzeImage, generateText, extractJSON } = require('../utils/aiService.js');
const { preprocessImage, cleanupProcessed } = require('../utils/imagePreprocessor.js');
const Information = require('../models/UserInformation.js');
const { fetchTopYouTubeRecipe, fetchTopAmazonProduct } = require('./alternatives.js');

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — CLASSIFY + IDENTIFY (single vision call)
// Optimised prompt for local vision models (llama3.2-vision / llava)
// ─────────────────────────────────────────────────────────────────────────────
async function classifyAndIdentify(imagePath) {
  const prompt = `Identify this image. Answer with JSON only.

Rules:
- "category": one of food, beverage, packaged_food, medicine, skincare, rejected
  packaged_food = sealed packet/box with brand label (chips, biscuits, noodles)
  medicine = pills, tablet strips, bottles, syrups
  skincare = creams, lotions, face wash
  beverage = any drink
  food = cooked/prepared dish or snack
  rejected = not any of the above
- "label": the EXACT specific name of the item
  WRONG: "Indian sweet", "fried snack", "curry", "medicine"
  RIGHT: "Jalebi", "Samosa", "Butter Chicken", "Paracetamol 500mg"
  For Indian food be very specific: Jalebi, Gulab Jamun, Chole Bhature, Pav Bhaji, Paneer Tikka, Masala Dosa, Biryani, Dal Makhani, Samosa, Aloo Paratha, Idli, Vada Pav, Dhokla, Kachori, Rasgulla, Ladoo
  For packaged items READ the brand name printed on the pack
- "hasText": true if you can see printed text/labels on the item
- "confidence": high, medium, or low
- "prepMethod": fried, baked, grilled, steamed, raw, boiled, roasted, sauteed, or unknown
- "portionSize": small, medium, large, or unknown

JSON:
{"category":"food","label":"Jalebi","hasText":false,"confidence":"high","prepMethod":"fried","portionSize":"medium"}`;

  try {
    const resp = await analyzeImage(imagePath, prompt, { temperature: 0.1, json: true });
    console.log('[classifyAndIdentify] Raw:', resp.substring(0, 300));

    const parsed = extractJSON(resp, false);
    if (parsed && parsed.label) {
      const validCats = ['food', 'beverage', 'packaged_food', 'medicine', 'skincare', 'rejected'];
      if (!validCats.includes(parsed.category)) parsed.category = 'food';

      let lbl = String(parsed.label).replace(/['"""''[\]]/g, '').trim();
      // Reject vague labels
      if (/^(unknown|none|null|n\/a|food|dish|item|product|snack|sweet|dessert|curry|meal|an? |the |some |indian |this )/i.test(lbl)) {
        parsed.label = null;
        parsed.confidence = 'low';
      } else {
        parsed.label = lbl;
      }
      return parsed;
    }
    return { category: 'food', label: null, confidence: 'low', hasText: false, prepMethod: 'unknown', portionSize: 'unknown' };
  } catch (err) {
    console.error('[classifyAndIdentify] Error:', err.message);
    return { category: 'food', label: null, confidence: 'low', hasText: false, prepMethod: 'unknown', portionSize: 'unknown' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1b — RE-IDENTIFY (fallback with simpler prompt)
// ─────────────────────────────────────────────────────────────────────────────
async function reIdentify(imagePath, category) {
  const hints = {
    food: 'What specific dish is this? Name it precisely. Examples: Jalebi, Samosa, Biryani, Paneer Tikka, Chole Bhature, Pasta Alfredo, Margherita Pizza. Answer with just the dish name, nothing else.',
    beverage: 'What drink is this? Examples: Mango Lassi, Masala Chai, Espresso, Orange Juice. Answer with just the name.',
    medicine: 'Read the text on this medicine. What is the drug name? Answer with just the name and dosage.',
    skincare: 'Read the brand and product name. Answer with just the name.',
    packaged_food: 'Read the brand and product name on this package. Answer with just the name.',
  };

  try {
    const resp = await analyzeImage(imagePath, hints[category] || hints.food, { temperature: 0.1 });
    let clean = resp.trim()
      .replace(/['""\u201c\u201d\u2018\u2019[\]{}]/g, '')
      .replace(/\.$/, '')
      .replace(/^(the |this is |it is |i see |it looks like |this appears to be |this image shows )/i, '')
      .split('\n')[0].trim();

    if (/^(unknown|i (cannot|can't|don't)|sorry|unable|not sure|cannot|i'm not)/i.test(clean)) return null;
    if (clean.length < 2 || clean.length > 80) return null;

    console.log('[reIdentify] Label:', clean);
    return clean;
  } catch (err) {
    console.error('[reIdentify] Error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — OCR EXTRACTION (for packaged_food, medicine, skincare)
// ─────────────────────────────────────────────────────────────────────────────
async function extractOCRData(imagePath, category) {
  const prompts = {
    packaged_food: `Read ALL text on this packaged food product. Extract and return JSON:
{"brandName":"","productName":"","rawIngredientsText":"exact ingredients as printed","ingredientsList":["item1","item2"],"nutritionPer100g":{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"sugar_g":0,"sodium_mg":0,"fibre_g":0},"servingSize":"","allergens":[],"additives":[]}`,

    medicine: `Read ALL text on this medicine. Extract and return JSON:
{"brandName":"","drugName":"","strength":"","activeIngredients":[""],"manufacturer":"","formulation":"tablet/capsule/syrup","warnings":[]}`,

    skincare: `Read ALL text on this skincare product. Extract and return JSON:
{"brandName":"","productName":"","keyIngredients":[""],"claims":[],"skinType":"","volume":""}`
  };

  const prompt = prompts[category];
  if (!prompt) return null;

  try {
    const resp = await analyzeImage(imagePath, prompt, { temperature: 0.1, json: true });
    console.log('[extractOCRData] Raw:', resp.substring(0, 300));
    return extractJSON(resp, false);
  } catch (err) {
    console.error('[extractOCRData] Error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — BUILD ANALYSIS PROMPT (sent to text model)
// ─────────────────────────────────────────────────────────────────────────────
function buildAnalysisPrompt(label, category, userCtx, ocrData, prepContext) {
  const base = userCtx || '';
  const allergies = prepContext.allergies || 'None';
  const diseases = prepContext.diseases || 'None';

  // Build item reference
  let itemRef = `Item: "${label}"`;
  if (ocrData) {
    if (category === 'packaged_food' && ocrData.rawIngredientsText) {
      itemRef = `Product: "${ocrData.brandName || ''} ${ocrData.productName || label}"\nIngredients from label: ${ocrData.rawIngredientsText}\nNutrition per 100g: ${JSON.stringify(ocrData.nutritionPer100g || {})}`;
    } else if (category === 'medicine') {
      itemRef = `Medicine: "${ocrData.brandName || label}" ${ocrData.drugName || ''} ${ocrData.strength || ''}\nActive: ${JSON.stringify(ocrData.activeIngredients || [])}`;
    } else if (category === 'skincare') {
      itemRef = `Product: "${ocrData.brandName || ''} ${ocrData.productName || label}"\nIngredients: ${JSON.stringify(ocrData.keyIngredients || [])}`;
    }
  }

  const prepLine = (prepContext.method && prepContext.method !== 'unknown')
    ? `\nPreparation: ${prepContext.method}. Portion: ${prepContext.portionSize || 'medium'}.` : '';

  // Personalized fields that go in ALL category prompts
  const personalFields = '"personalWarnings":["Specific warning for THIS user based on their health report"],' +
    '"ingredientRisks":[{"ingredient":"ingredient name","risk":"why bad for this user","condition":"which condition it affects"}],' +
    '"homemadeVersion":"How to make a healthier version at home with specific recipe tips",' +
    '"closestHealthyAlternative":"Specific similar dish/product that is healthier for this user",';

  // ── MEDICINE ──
  if (category === 'medicine') {
    return base + itemRef + '\n\n' +
      'You are a pharmacist. Provide accurate info. Recommend consulting a doctor.\n' +
      `User allergies: ${allergies}. Conditions: ${diseases}. Set isBeneficialForUser to false if conflicts exist.\n\n` +
      'Return ONLY valid JSON:\n' +
      '{"product":"name","category":"medicine","productDescription":"what this medicine is and does",' +
      '"activeIngredients":["ingredient with strength"],"basicNutrients":{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0},' +
      '"basicUse":"dosage and when to take","type":"medicine",' +
      '"positives":["benefit1","benefit2","benefit3"],"negatives":["side effect1","warning1"],' +
      '"verdict":"consult_doctor","uses":["indication1","indication2"],' +
      personalFields +
      '"isBeneficialForUser":true,"medicalAlternatives":["alternative1"],' +
      '"recommendedFor":["condition1"],"avoidFor":["group1"],' +
      '"doctorAdvice":"Always consult a doctor.","storageInstructions":"storage info",' +
      '"alternatives":["otc alternative","natural supplement"]}';
  }

  // ── SKINCARE ──
  if (category === 'skincare') {
    return base + itemRef + '\n\n' +
      'You are a dermatologist. Provide evidence-based analysis.\n' +
      `User allergies: ${allergies}. Conditions: ${diseases}. Set isBeneficialForUser accordingly.\n\n` +
      'Return ONLY valid JSON:\n' +
      '{"product":"name","category":"skincare","productDescription":"what this product does",' +
      '"keyIngredients":["ingredient — benefit"],"basicNutrients":{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0},' +
      '"basicUse":"how and when to apply","type":"skincare",' +
      '"positives":["benefit1","benefit2"],"negatives":["concern1"],' +
      '"verdict":"beneficial","uses":["purpose1","purpose2"],' +
      personalFields +
      '"isBeneficialForUser":true,"suitableForSkinTypes":["Oily","Dry","Normal","Sensitive"],' +
      '"avoidFor":["condition1"],"applicationTips":"usage tips",' +
      '"medicalAlternatives":[],"alternatives":["alternative1","alternative2"]}';
  }

  // ── FOOD / BEVERAGE / PACKAGED FOOD ──
  const isPackaged = category === 'packaged_food';

  let ingredientBlock = '';
  if (isPackaged && ocrData) {
    ingredientBlock = `\nAnalyse every ingredient. Flag these if present: MSG (E621), Sodium Benzoate, BHA/BHT, TBHQ, HFCS, Partially Hydrogenated Oil, Artificial colours, Aspartame, Maida, Palm oil. Explain why each flagged ingredient is bad in "negatives".\n`;
  }

  return base + itemRef + prepLine + '\n\n' +
    (isPackaged
      ? 'You are a dietitian for packaged foods. Use the label data for precise analysis. Apply NOVA classification (1-4).\n'
      : 'You are a dietitian expert in Indian and global cuisine. Use real nutritional values from ICMR/USDA. For Indian food suggest Indian alternatives, not generic salad.\n'
    ) +
    ingredientBlock +
    `User allergies: ${allergies}. Conditions: ${diseases}. Set isBeneficialForUser accordingly.\n` +
    'Based on the user health report, provide SPECIFIC personalWarnings (e.g. "Your fasting sugar is 180mg/dL - this dish has 30g sugar which will spike your blood glucose").\n' +
    'List ingredientRisks mapping each risky ingredient to the user condition it affects.\n' +
    'Suggest a homemadeVersion with specific healthier substitutions.\n' +
    'Suggest closestHealthyAlternative - a real similar dish that is better for this user.\n\n' +
    'Return ONLY valid JSON with real numbers:\n' +
    '{"product":"' + label + '","category":"' + category + '",' +
    '"productDescription":"description with cooking method, ingredients, cultural context",' +
    '"basicNutrients":{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"fibre_g":0,"sugar_g":0,"sodium_mg":0},' +
    '"vitaminsAndMinerals":["vitamin/mineral with % RDA"],' +
    '"basicUse":"best time to eat, portion guidance",' +
    '"type":"' + category + '",' +
    (isPackaged ? '"additives":["additive — concern"],"redFlagIngredients":["ingredient — why bad"],"topIngredients":["first","second","third"],"allergens":["allergen"],"totalIngredientCount":0,"processingLevel":"NOVA Group X — reason",' : '') +
    '"positives":["specific benefit with reason","benefit2","benefit3"],' +
    '"negatives":["specific concern with reason","concern2"],' +
    '"verdict":"healthy or neutral or unhealthy",' +
    '"uses":["Energy","Muscle repair"],' +
    personalFields +
    '"isBeneficialForUser":true,"medicalAlternatives":[],' +
    '"recommendedFor":["group with reason"],' +
    '"avoidFor":["group with reason"],' +
    '"servingSuggestion":"portion size, best time, pairing tips",' +
    '"alternatives":["healthier Indian alternative","lighter version","homemade tip","nutrient swap"]}';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER — POST /api/identify
// ─────────────────────────────────────────────────────────────────────────────
async function identifyImage(req, res) {
  console.log('[POST /api/identify] Handler started');

  // ── Load user profile + health report ──
  if (req.user) {
    try {
      const u = await Information.findOne({ authId: req.user }).lean();
      if (u) {
        req.userInfo = {
          fullName: u.fullName, dob: u.dateOfBirth, gender: u.gender,
          height: u.heightCm, weight: u.weightKg, purpose: u.purposes,
          allergies: u.allergies || [], diseases: u.diseases || [],
          dietPreference: u.dietPreference,
          healthReport: u.healthReport || null,
        };
      }
    } catch (dbErr) {
      console.error('[identify] DB error:', dbErr.message);
    }
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  let processedPath = null;

  try {
    const originalPath = path.resolve(req.file.path);
    console.log('[identify] Preprocessing image...');
    processedPath = await preprocessImage(originalPath);
    const imagePath = processedPath;

    // ── Build user context with health report ──
    const ui = req.userInfo;
    const allergiesStr = ui ? (ui.allergies.length ? ui.allergies.join(', ') : 'None') : 'None';
    const diseasesStr = ui ? (ui.diseases.length ? ui.diseases.join(', ') : 'None') : 'None';
    const dietHint = ui?.dietPreference ? `Diet: ${ui.dietPreference}.\n` : '';

    // Build health report context for personalized analysis
    let healthCtx = '';
    if (ui?.healthReport) {
      const hr = ui.healthReport;
      const parts = [];
      if (hr.bloodSugar?.fasting) parts.push(`Blood Sugar: Fasting=${hr.bloodSugar.fasting}mg/dL, HbA1c=${hr.bloodSugar.hba1c || 'N/A'}% (${hr.bloodSugar.status || 'unknown'})`);
      if (hr.cholesterol?.total) parts.push(`Cholesterol: Total=${hr.cholesterol.total}, HDL=${hr.cholesterol.hdl}, LDL=${hr.cholesterol.ldl}, Triglycerides=${hr.cholesterol.triglycerides} (${hr.cholesterol.status || 'unknown'})`);
      if (hr.bloodPressure?.systolic) parts.push(`BP: ${hr.bloodPressure.systolic}/${hr.bloodPressure.diastolic} (${hr.bloodPressure.status || 'unknown'})`);
      if (hr.hemoglobin?.value) parts.push(`Hemoglobin: ${hr.hemoglobin.value} (${hr.hemoglobin.status || 'unknown'})`);
      if (hr.thyroid?.tsh) parts.push(`Thyroid TSH: ${hr.thyroid.tsh} (${hr.thyroid.status || 'unknown'})`);
      if (hr.kidneyFunction?.creatinine) parts.push(`Creatinine: ${hr.kidneyFunction.creatinine} (${hr.kidneyFunction.status || 'unknown'})`);
      if (hr.liverFunction?.sgot) parts.push(`Liver: SGOT=${hr.liverFunction.sgot}, SGPT=${hr.liverFunction.sgpt} (${hr.liverFunction.status || 'unknown'})`);
      if (hr.vitamins?.d) parts.push(`Vit D: ${hr.vitamins.d}, B12: ${hr.vitamins.b12}`);
      if (hr.riskFactors?.length) parts.push(`RISK FACTORS: ${hr.riskFactors.join(', ')}`);
      if (hr.dietaryRestrictions?.length) parts.push(`DIETARY RESTRICTIONS: ${hr.dietaryRestrictions.join(', ')}`);
      if (parts.length) healthCtx = `\nHEALTH REPORT (from lab tests):\n${parts.join('\n')}\n`;
    }

    const userCtx = ui
      ? `User: ${ui.fullName} | ${ui.gender} | ${ui.height}cm/${ui.weight}kg\n` +
        `Goal: ${ui.purpose} | ${dietHint}` +
        `Allergies: ${allergiesStr} | Conditions: ${diseasesStr}\n` +
        healthCtx +
        `IMPORTANT: Provide personalWarnings specific to this user's health report. Flag ingredient-level risks. Set isBeneficialForUser accordingly.\n\n`
      : '';

    // ── STAGE 1: CLASSIFY + IDENTIFY ──
    console.log('[identify] Stage 1: Classify + Identify...');
    let result = await classifyAndIdentify(imagePath);
    let { category, label, confidence, hasText, prepMethod, portionSize } = result;
    console.log(`[identify] -> Category: ${category} | Label: "${label}" | Confidence: ${confidence}`);

    // Rejection
    if (category === 'rejected') {
      return res.status(200).json({
        rejected: true, detections: [], analysis: null,
        userMessage: "😊 This doesn't look like food, medicine, or skincare. Try scanning a dish, packaged snack, medicine strip, or skincare product!",
        suggestion: "Try: a meal plate, a chips packet, a medicine strip, or a face cream.",
      });
    }

    // Re-identify if label missing or vague
    if (!label || label.length < 2 || confidence === 'low') {
      console.log('[identify] Stage 1b: Re-identifying...');
      const retryLabel = await reIdentify(imagePath, category);
      if (retryLabel) { label = retryLabel; confidence = 'medium'; }
    }

    // Final fallback label
    const defaults = { food: 'Food Dish', beverage: 'Beverage', medicine: 'Medicine', skincare: 'Skincare Product', packaged_food: 'Packaged Food' };
    if (!label || label.length < 2) {
      label = defaults[category] || 'Food Item';
      console.warn('[identify] Using default label:', label);
    }

    // ── STAGE 2: OCR (for packaged_food, medicine, skincare) ──
    let ocrData = null;
    const needsOCR = ['packaged_food', 'medicine', 'skincare'].includes(category);

    if (needsOCR) {
      console.log(`[identify] Stage 2: OCR for ${category}...`);
      ocrData = await extractOCRData(imagePath, category);
      if (ocrData) {
        // Improve label from OCR
        if (category === 'packaged_food' && ocrData.brandName && ocrData.productName) {
          label = `${ocrData.brandName} ${ocrData.productName}`.trim();
        } else if (category === 'medicine' && ocrData.brandName) {
          label = ocrData.strength ? `${ocrData.brandName} ${ocrData.strength}` : ocrData.brandName;
        } else if (category === 'skincare' && ocrData.brandName) {
          label = `${ocrData.brandName} ${ocrData.productName || ''}`.trim();
        }
        console.log(`[identify] OCR label: "${label}"`);
      }
    } else if (hasText) {
      // Food/beverage with visible text — might be packaged
      console.log('[identify] Food with text detected — running OCR check...');
      const check = await extractOCRData(imagePath, 'packaged_food');
      if (check && check.brandName && check.rawIngredientsText) {
        category = 'packaged_food';
        ocrData = check;
        label = `${check.brandName} ${check.productName || ''}`.trim();
        console.log(`[identify] Reclassified as packaged_food: "${label}"`);
      }
    }

    const detections = [{ label, category }];

    // ── STAGE 3: DEEP ANALYSIS ──
    console.log(`[identify] Stage 3: Analysing "${label}" (${category})...`);
    const prepContext = { method: prepMethod, portionSize, allergies: allergiesStr, diseases: diseasesStr };
    const analysisPrompt = buildAnalysisPrompt(label, category, userCtx, ocrData, prepContext);

    const systemPrompts = {
      medicine: 'You are a pharmacist. Respond ONLY with valid JSON. Use real pharmacological data. Include doctor consultation advice.',
      skincare: 'You are a dermatologist. Respond ONLY with valid JSON. Use evidence-based knowledge.',
      packaged_food: 'You are a dietitian for packaged foods. Respond ONLY with valid JSON. Use label data for precise values.',
      food: 'You are a dietitian expert in Indian and global cuisine. Respond ONLY with valid JSON. Use ICMR/USDA data.',
      beverage: 'You are a nutrition specialist. Respond ONLY with valid JSON.',
    };

    const analysisResp = await generateText(analysisPrompt, {
      system: systemPrompts[category] || systemPrompts.food,
      json: true,
      temperature: 0.3,
    });

    let analysis = extractJSON(analysisResp, false) || {};
    analysis.category = category;

    // ── STAGE 4: FETCH YOUTUBE RECIPES & AMAZON PRODUCTS ──
    // Only for food/beverage/packaged_food categories
    if (['food', 'beverage', 'packaged_food'].includes(category)) {
      const alternatives = Array.isArray(analysis.alternatives) ? analysis.alternatives : [];
      // Use the product label + alternatives for fetching external data
      const searchTerms = [label, ...alternatives].slice(0, 4);

      console.log(`[identify] Stage 4: Fetching YouTube/Amazon for:`, searchTerms);

      try {
        const [youtubeResults, amazonResults] = await Promise.all([
          Promise.all(searchTerms.map(term => fetchTopYouTubeRecipe(term).catch(() => null))),
          Promise.all(searchTerms.map(term => fetchTopAmazonProduct(term).catch(() => null))),
        ]);

        analysis.youtubeRecipes = youtubeResults.filter(Boolean);
        analysis.amazonProducts = amazonResults.filter(Boolean);
        console.log(`[identify] Got ${analysis.youtubeRecipes.length} YouTube videos, ${analysis.amazonProducts.length} Amazon products`);
      } catch (extErr) {
        console.error('[identify] External API error (non-fatal):', extErr.message);
        analysis.youtubeRecipes = [];
        analysis.amazonProducts = [];
      }
    } else {
      analysis.amazonProducts = [];
      analysis.youtubeRecipes = [];
    }

    console.log(`[identify] ✅ Done: "${label}"`);

    // ── Build rawLabelText for frontend display ──
    let rawLabelText = null;
    if (ocrData) {
      if (category === 'packaged_food' && ocrData.rawIngredientsText) {
        rawLabelText = `Brand: ${ocrData.brandName || 'Unknown'}\nProduct: ${ocrData.productName || label}\n\nIngredients:\n${ocrData.rawIngredientsText}`;
        if (ocrData.nutritionPer100g) rawLabelText += `\n\nNutrition per 100g:\n${JSON.stringify(ocrData.nutritionPer100g, null, 2)}`;
      } else if (category === 'medicine') {
        rawLabelText = `Drug: ${ocrData.brandName || label}\nGeneric: ${ocrData.drugName || 'N/A'}\nStrength: ${ocrData.strength || 'N/A'}\nManufacturer: ${ocrData.manufacturer || 'N/A'}`;
        if (ocrData.activeIngredients?.length) rawLabelText += `\nActive: ${ocrData.activeIngredients.join(', ')}`;
      } else if (category === 'skincare') {
        rawLabelText = `Brand: ${ocrData.brandName || 'Unknown'}\nProduct: ${ocrData.productName || label}`;
        if (ocrData.keyIngredients?.length) rawLabelText += `\nKey Ingredients: ${ocrData.keyIngredients.join(', ')}`;
      }
    }

    return res.json({
      rejected: false, detections, analysis, category,
      ...(rawLabelText && { rawLabelText }),
      ...(ocrData && { ocrData }),
    });

  } catch (err) {
    console.error('[POST /api/identify] Error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (processedPath) cleanupProcessed(processedPath, req.file?.path ? path.resolve(req.file.path) : null);
  }
}

module.exports = { identifyImage };