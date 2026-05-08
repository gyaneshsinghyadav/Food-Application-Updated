const path = require('path');
const fs = require('fs');
const { generateText, extractJSON } = require('../utils/aiService.js');
const spoonacular = require('../utils/spoonacularService');
const { preprocessImage, cleanupProcessed } = require('../utils/imagePreprocessor.js');
const Information = require('../models/UserInformation.js');

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const VALID_CATEGORIES = ['food', 'beverage', 'medicine', 'skincare', 'packaged_food', 'rejected'];

const DEFAULT_LABELS = {
  food: 'Food Dish',
  beverage: 'Beverage',
  medicine: 'Medicine',
  skincare: 'Skincare Product',
  packaged_food: 'Packaged Food Pasync function classifyImage(imagePath) {
  // Use Spoonacular's image analysis endpoint to get category and nutrition.
  try {
    const result = await spoonacular.analyzeImageFile(imagePath);
    // result.category.name may be like "burger", "pizza" etc. Map to our internal categories.
    const spoonCategory = result.category && result.category.name ? result.category.name.toLowerCase() : '';
    // Simple heuristic mapping based on Spoonacular category names.
    if (spoonCategory.includes('beverage') || spoonCategory.includes('drink')) return 'beverage';
    if (spoonCategory.includes('medicine') || spoonCategory.includes('pill') || spoonCategory.includes('tablet')) return 'medicine';
    if (spoonCategory.includes('skincare') || spoonCategory.includes('cream') || spoonCategory.includes('lotion')) return 'skincare';
    if (spoonCategory.includes('packaged') || spoonCategory.includes('packet') || spoonCategory.includes('snack')) return 'packaged_food';
    // Default to food for most dish categories.
    return 'food';
  } catch (err) {
    console.error('[classifyImage] Spoonacular error:', err.message);
    // Fallback to original AI classification if Spoonacular fails.
    return 'food';
  }
}ablet') || lower.includes('capsule')) return 'medicine';
    if (lower.includes('skincare') || lower.includes('cream') || lower.includes('serum')) return 'skincare';
    if (lower.includes('beverage') || lower.includes('drink') || lower.includes('juice') || lower.includes('coffee') || lower.includes('tea') || lower.includes('lassi')) return 'beverage';
    if (lower.includes('rejected') || lower.includes('vehicle') || lower.includes('furniture') || lower.includes('electronic')) return 'rejected';

    return 'food'; // Safe default
  } catch (err) {
    console.error('[classifyImage] Error:', err.message);
    return 'food';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1b — IDENTIFY (focused single-task prompt, category-aware)
// One job only: name the specific item. Uses the known category for context.
// ─────────────────────────────────────────────────────────────────────────────
async function identifyItem(imagePath, category) {
  const categoryContext = {
    food: `This is a FOOD DISH. Identify the EXACT dish name.

EXAMPLES of the specificity expected:
- "Chole Bhature" NOT "Indian food" or "curry"
- "Palak Paneer" NOT "green curry" or "paneer dish"
- "Hyderabadi Chicken Biryani" NOT "rice" or "biryani" alone
- "Masala Dosa" NOT "crepe" or "dosa" alone if you can see stuffing
- "Aloo Paratha" NOT "flatbread" or "paratha" alone if you can see potato
- "Pav Bhaji" NOT "vegetable curry"
- "Gulab Jamun" NOT "dessert" or "sweet"
- "Medu Vada" NOT "fritter" or "vada"
- "Samosa" NOT "fried snack"
- "Jalebi" NOT "sweet" or "Indian sweet"
- "Paneer Tikka" NOT "grilled cheese"
- "Butter Chicken" NOT "chicken curry"
- "Dal Makhani" NOT "lentils" or "dal"
- "Rajma Chawal" NOT "beans and rice"
- "Pasta Alfredo" NOT "pasta"
- "Margherita Pizza" NOT "pizza"

Think step by step: What ingredients can you see? What cooking method? What shape? What colour? What garnish? Use these clues to name the exact dish.`,

    beverage: `This is a BEVERAGE. Identify the EXACT drink.
Examples: "Mango Lassi", "Masala Chai", "Cold Brew Coffee", "Orange Juice", "Nimbu Pani", "Thandai", "Green Smoothie"
If it's a branded product, read the brand name: "Coca Cola", "Tropicana Orange Juice", "Bisleri Water"`,

    medicine: `This is a MEDICINE or SUPPLEMENT. Read any visible text on the packaging, strip, or bottle.
Identify the drug name and strength if visible.
Examples: "Paracetamol 500mg", "Crocin Advance", "Dolo 650", "Vitamin D3 1000IU", "Becosules Capsule"`,

    skincare: `This is a SKINCARE or COSMETIC product. Read the brand name and product name from the packaging.
Examples: "Nivea Soft Moisturising Cream", "Neutrogena Sunscreen SPF 50", "Lakme Absolute Foundation", "Cetaphil Gentle Cleanser"`,

    packaged_food: `This is a PACKAGED FOOD product. Read the EXACT brand name and product name from the packaging.
Examples: "Lays Magic Masala Chips", "Maggi 2-Minute Masala Noodles", "Britannia Marie Gold Biscuits", "Amul Butter 500g", "Haldiram's Aloo Bhujia", "Parle-G Biscuits"
Look carefully at ALL text on the pack for the brand and product name.`,
  };

  const context = categoryContext[category] || categoryContext.food;

  const prompt = `You are an expert identification system with deep knowledge of Indian and global cuisine, medicines, and consumer products.

${context}

Look at this image VERY carefully. What SPECIFIC item is this?

Reply with ONLY a JSON object:
{"label": "Exact specific item name here", "confidence": "high", "prepMethod": "fried", "portionSize": "medium"}

For prepMethod use one of: fried | baked | grilled | steamed | raw | boiled | roasted | shallow_fried | sauteed | unknown
For portionSize use one of: small | medium | large | single_serving | unknown
For confidence use one of: high | medium | low`;

  try {
    const resp = await analyzeImage(imagePath, prompt, { temperature: 0.1, json: true });
    console.log('[identifyItem] Raw response:', resp);

    const parsed = extractJSON(resp, false);
    if (parsed && parsed.label) {
      let lbl = String(parsed.label).replace(/['"""''[\]]/g, '').trim();

      // Reject vague/generic labels
      if (/^(unknown|none|null|undefined|n\/a|not |cannot|can't|unable|food item|a food|the food|some food|an? (indian|chinese|western|dish|item|product|snack|drink|beverage|food|meal|curry|rice|bread|sweet|dessert)$)/i.test(lbl)) {
        return { label: null, confidence: 'low', prepMethod: 'unknown', portionSize: 'unknown' };
      }

      return {
        label: lbl,
        confidence: parsed.confidence || 'medium',
        prepMethod: parsed.prepMethod || 'unknown',
        portionSize: parsed.portionSize || 'unknown',
      };
    }

    // Try to extract just the label text
    const clean = resp.trim()
      .replace(/['""\u201c\u201d\u2018\u2019[\]]/g, '')
      .replace(/\.$/, '')
      .split('\n')[0]
      .trim();

    if (clean.length >= 2 && clean.length <= 100 && !/^(unknown|i (cannot|can't|don't)|sorry|unable)/i.test(clean)) {
      return { label: clean, confidence: 'low', prepMethod: 'unknown', portionSize: 'unknown' };
    }

    return { label: null, confidence: 'low', prepMethod: 'unknown', portionSize: 'unknown' };
  } catch (err) {
    console.error('[identifyItem] Error:', err.message);
    return { label: null, confidence: 'low', prepMethod: 'unknown', portionSize: 'unknown' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1c — RE-IDENTIFY (last-resort ultra-simple prompt)
// Called only when primary identification fails or returns a vague label.
// ─────────────────────────────────────────────────────────────────────────────
async function reIdentify(imagePath, category) {
  const hints = {
    food: 'Name this food dish. Think: What is the main ingredient? How is it cooked? What region is it from? Give the specific dish name like "Palak Paneer", "Chole Bhature", "Margherita Pizza".',
    beverage: 'Name this drink specifically. Example: "Mango Lassi", "Masala Chai", "Espresso".',
    medicine: 'Read the text on this medicine. What is the drug name and dosage?',
    skincare: 'Read the brand and product name on this skincare item.',
    packaged_food: 'Read the brand name and product name printed on this food package.',
  };

  const prompt = `${hints[category] || hints.food}

Reply with ONLY the item name. Nothing else. 2-7 words maximum.`;

  try {
    const resp = await analyzeImage(imagePath, prompt, { temperature: 0.05 });
    let clean = resp.trim()
      .replace(/['""\u201c\u201d\u2018\u2019[\]{}]/g, '')
      .replace(/\.$/, '')
      .replace(/^(the |this is |it is |i see |it looks like |this appears to be )/i, '')
      .split('\n')[0]
      .trim();

    if (/^(unknown|i (cannot|can't|don't|am not)|sorry|unable|no food|not sure|cannot|this (is|appears|looks))/i.test(clean)) return null;
    if (clean.length < 2 || clean.length > 100) return null;

    console.log('[reIdentify] Final label:', clean);
    return clean;
  } catch (err) {
    console.error('[reIdentify] Error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2a — DETECT WHAT TEXT SURFACES ARE VISIBLE ON PACKAGING
// ─────────────────────────────────────────────────────────────────────────────
async function detectPackagingTextSurfaces(imagePath) {
  const prompt = `Look at this packaged food product image. What printed text panels are visible?

Answer ONLY with valid JSON:
{
  "hasNutritionTable": true,
  "hasIngredientsList": true,
  "hasBrandName": true,
  "hasServingInfo": false,
  "notes": "brief note on what's visible"
}

- "hasNutritionTable" = a printed table showing Calories, Protein, Fat, Carbs with numbers
- "hasIngredientsList" = a text block starting with "Ingredients:" listing components
- "hasBrandName" = brand or product name text visible
- "hasServingInfo" = serving size info shown`;

  try {
    const resp = await analyzeImage(imagePath, prompt, { temperature: 0.1, json: true });
    const parsed = extractJSON(resp, false);
    if (parsed) return parsed;
    return { hasNutritionTable: true, hasIngredientsList: true, hasBrandName: true, hasServingInfo: false };
  } catch (err) {
    console.error('[detectPackagingTextSurfaces] Error:', err.message);
    return { hasNutritionTable: false, hasIngredientsList: false, hasBrandName: false, hasServingInfo: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2b — OCR: EXTRACT INGREDIENTS LIST
// ─────────────────────────────────────────────────────────────────────────────
async function extractIngredientsList(imagePath) {
  const prompt = `You are a precision OCR system for food packaging.

Extract the INGREDIENTS LIST from this packaged food image.

Rules:
1. Find text starting with "Ingredients:" and transcribe EXACTLY as printed
2. Preserve spelling, order, parentheses, and E-numbers
3. Do NOT paraphrase or reorder
4. Extract ENGLISH version if multiple languages

Also identify: individual ingredients, E-numbers/additive codes, allergen callouts, artificial additives.

Respond ONLY with valid JSON:
{
  "rawIngredientsText": "Exact text as printed",
  "ingredientsList": ["Ingredient 1", "Ingredient 2"],
  "eNumbers": ["E621 (MSG)"],
  "allergens": ["Gluten", "Dairy"],
  "artificialAdditives": ["Artificial flavour"],
  "isPartiallyVisible": false,
  "ingredientsCount": 0
}`;

  try {
    const resp = await analyzeImage(imagePath, prompt, { temperature: 0.1, json: true });
    console.log('[extractIngredientsList] Raw response:', resp.substring(0, 200));
    const parsed = extractJSON(resp, false);
    if (parsed && parsed.rawIngredientsText) return parsed;
    const textMatch = resp.match(/ingredients[:\s]+(.+?)(?=\n\n|\{|$)/i);
    if (textMatch) {
      return {
        rawIngredientsText: textMatch[1].trim(),
        ingredientsList: [],
        eNumbers: [],
        allergens: [],
        artificialAdditives: [],
        isPartiallyVisible: true,
        ingredientsCount: 0,
      };
    }
    return null;
  } catch (err) {
    console.error('[extractIngredientsList] Error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2c — OCR: EXTRACT NUTRITION TABLE
// ─────────────────────────────────────────────────────────────────────────────
async function extractNutritionTable(imagePath) {
  try {
    const rawText = await analyzeImage(
      imagePath,
      `You are a precision OCR system for nutrition labels.

Extract the nutrition facts table from this image with 100% numeric accuracy.

Extract in order:
1. Brand name and product name
2. Serving size (with weight/volume)
3. Servings per container
4. Every row: nutrient name | value per serving | value per 100g | % RDA
5. Column headers (per serving vs per 100g)
6. Health claims (High Protein, Low Fat, No Added Sugar, etc.)

Preserve exact numbers and units. Transcribe verbatim.`,
      { temperature: 0.1 }
    );
    return rawText.trim();
  } catch (err) {
    console.error('[extractNutritionTable] Error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — ORCHESTRATE PACKAGED FOOD OCR
// ─────────────────────────────────────────────────────────────────────────────
async function extractPackagedFoodData(imagePath) {
  // For packaged food, Spoonacular's analyze endpoint already provides nutrition estimates.
  try {
    const result = await spoonacular.analyzeImageFile(imagePath);
    const nutrition = result.nutrition || null;
    const label = result.category && result.category.name ? result.category.name : null;
    // Spoonacular does not return raw ingredient list; keep existing OCR fallback if needed.
    const surfaces = await detectPackagingTextSurfaces(imagePath);
    const ingredientsData = surfaces.hasIngredientsList ? await extractIngredientsList(imagePath) : null;
    return {
      nutritionText: nutrition ? JSON.stringify(nutrition) : null,
      ingredientsData,
      surfaces,
    };
  } catch (err) {
    console.error('[extractPackagedFoodData] Spoonacular error:', err.message);
    // Fallback to original OCR approach.
    const surfaces = await detectPackagingTextSurfaces(imagePath);
    const tasks = [];
    if (surfaces.hasNutritionTable || surfaces.hasServingInfo) {
      tasks.push(extractNutritionTable(imagePath).catch(e => null));
    } else {
      tasks.push(Promise.resolve(null));
    }
    if (surfaces.hasIngredientsList) {
      tasks.push(extractIngredientsList(imagePath).catch(e => null));
    } else {
      tasks.push(Promise.resolve(null));
    }
    const [nutritionText, ingredientsData] = await Promise.all(tasks);
    return { nutritionText, ingredientsData, surfaces };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — BUILD ANALYSIS PROMPT (category-specific)
// ─────────────────────────────────────────────────────────────────────────────
function buildAnalysisPrompt(label, category, userCtx, rawLabelText, prepContext = {}, ingredientsData = null) {
  const base = userCtx || '';

  // Build the item reference
  let itemRef;
  if (ingredientsData && ingredientsData.rawIngredientsText) {
    const nutritionSection = rawLabelText
      ? `Nutrition table:\n"""\n${rawLabelText}\n"""`
      : `(Nutrition table not visible in image)`;
    const ingredientsSection =
      `Ingredients list (verbatim from pack):\n"""\n${ingredientsData.rawIngredientsText}\n"""`;
    const additivesSection = ingredientsData.eNumbers?.length
      ? `\nDetected E-numbers/additives: ${ingredientsData.eNumbers.join(', ')}`
      : '';
    const allergenSection = ingredientsData.allergens?.length
      ? `\nDeclared allergens: ${ingredientsData.allergens.join(', ')}`
      : '';
    itemRef =
      `Product: "${label}"\n\n` +
      `${nutritionSection}\n\n` +
      `${ingredientsSection}` +
      additivesSection +
      allergenSection;
  } else if (rawLabelText) {
    itemRef = `Extracted label text:\n"""\n${rawLabelText}\n"""\nProduct: "${label}"`;
  } else {
    itemRef = `Item: "${label}"`;
  }

  // Prep context line (food only)
  const prepLine = (prepContext.method && prepContext.method !== 'unknown')
    ? `\nPreparation: ${prepContext.method}. Estimated portion: ${prepContext.portionSize || 'medium'}.`
    : '';

  // Dynamic isBeneficialForUser instruction
  const allergies = prepContext.allergies || 'None';
  const diseases = prepContext.diseases || 'None';
  const beneficialInstruction =
    `Set "isBeneficialForUser" to false if this item conflicts with user allergies (${allergies}) ` +
    `or medical conditions (${diseases}). Otherwise set to true.`;

  // ── MEDICINE ──
  if (category === 'medicine') {
    return (
      base + itemRef + `\n\n` +
      `You are a qualified pharmacist with clinical expertise. ` +
      `Provide a comprehensive, accurate overview of this medicine or supplement. ` +
      `Use REAL pharmacological data. Always recommend consulting a doctor.\n` +
      `${beneficialInstruction}\n\n` +
      `Return ONLY valid JSON — no markdown, no explanation:\n` +
      `{\n` +
      `  "product": "${label}",\n` +
      `  "category": "medicine",\n` +
      `  "productDescription": "Clear explanation of what this medicine is, its drug class, and primary therapeutic purpose.",\n` +
      `  "activeIngredients": ["Active ingredient 1 with strength", "Active ingredient 2"],\n` +
      `  "basicNutrients": { "calories": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0 },\n` +
      `  "basicUse": "Standard dosage instructions, when to take (before/after food), frequency, and typical course duration.",\n` +
      `  "type": "medicine",\n` +
      `  "positives": ["Therapeutic benefit 1", "benefit 2", "benefit 3"],\n` +
      `  "negatives": ["Common side effect 1", "serious warning 1", "contraindication 1"],\n` +
      `  "verdict": "consult_doctor",\n` +
      `  "uses": ["Primary indication 1", "Secondary indication 2"],\n` +
      `  "isBeneficialForUser": true,\n` +
      `  "medicalAlternatives": ["Generic alternative 1", "Natural supplement if applicable"],\n` +
      `  "recommendedFor": ["Condition 1", "Condition 2"],\n` +
      `  "avoidFor": ["Pregnant women", "Children under X", "Specific condition"],\n` +
      `  "doctorAdvice": "Always consult a licensed medical professional before starting, stopping, or changing any medication.",\n` +
      `  "storageInstructions": "Specific temperature range, light exposure, and humidity requirements.",\n` +
      `  "alternatives": ["OTC alternative 1", "Natural supplement 1", "Lifestyle intervention 1", "Herbal alternative 1"]\n` +
      `}`
    );
  }

  // ── SKINCARE ──
  if (category === 'skincare') {
    return (
      base + itemRef + `\n\n` +
      `You are a board-certified dermatologist with expertise in cosmetic formulations. ` +
      `Provide a thorough, evidence-based analysis of this skincare product.\n` +
      `${beneficialInstruction}\n\n` +
      `Return ONLY valid JSON — no markdown, no explanation:\n` +
      `{\n` +
      `  "product": "${label}",\n` +
      `  "category": "skincare",\n` +
      `  "productDescription": "What this product does, which skin concern it targets, and how it works at a skin-biology level.",\n` +
      `  "keyIngredients": ["Ingredient 1 — its specific skin benefit", "Ingredient 2 — its benefit"],\n` +
      `  "basicNutrients": { "calories": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0 },\n` +
      `  "basicUse": "Step-by-step application: when (AM/PM), how much, technique, what to apply before/after.",\n` +
      `  "type": "skincare",\n` +
      `  "positives": ["Clinically proven benefit 1", "benefit 2", "benefit 3"],\n` +
      `  "negatives": ["Potential irritant (specific ingredient)", "overuse risk", "incompatible ingredient"],\n` +
      `  "verdict": "beneficial",\n` +
      `  "uses": ["Hydration", "UV protection", "Anti-aging"],\n` +
      `  "isBeneficialForUser": true,\n` +
      `  "suitableForSkinTypes": ["Oily", "Dry", "Combination", "Normal", "Sensitive"],\n` +
      `  "avoidFor": ["Specific skin condition", "Ingredient sensitivity"],\n` +
      `  "applicationTips": "Best layering order in routine, frequency, patch test advice, SPF pairing if relevant.",\n` +
      `  "medicalAlternatives": [],\n` +
      `  "alternatives": ["Budget dupe with same actives", "Natural/DIY alternative", "Premium upgrade", "Dermatologist-recommended brand"]\n` +
      `}`
    );
  }

  const isPackaged = category === 'packaged_food';

  // Build ingredient-aware instruction block for packaged food
  const ingredientAnalysisBlock = (isPackaged && ingredientsData)
    ? `\nINGREDIENT ANALYSIS REQUIREMENTS:
- Analyse EVERY ingredient in the list for its health impact
- Flag any of these red-flag ingredients if present: MSG (E621), Sodium Benzoate (E211), BHA/BHT (E320/E321), TBHQ (E319), Carrageenan (E407), High Fructose Corn Syrup, Partially Hydrogenated Oil (trans fat), Artificial colours (E102, E110, E122, E124, E129), Aspartame (E951), Acesulfame-K (E950), Maida/Refined flour, Palm oil
- For each red-flag found, explain WHY it is concerning in the "negatives" array
- Check if ingredients are listed in descending order by weight (first ingredient = highest quantity)
- Note if sugar, salt, or refined flour appears in the top 3 ingredients (a warning sign)
- Identify any allergen-containing ingredients even if not declared separately
- Count total ingredients — more than 15 usually signals high processing
`
    : '';

  return (
    base + itemRef + prepLine + `\n\n` +
    (isPackaged
      ? `You are a senior clinical dietitian specialising in packaged and ultra-processed foods. ` +
      `Use the extracted label text AND ingredients list for PRECISE analysis — do not estimate, use exact data from the label. ` +
      `Identify all additives, preservatives, artificial colours/flavours, and ultra-processing markers. ` +
      `Apply NOVA food classification (1-4).\n`
      : `You are a senior clinical dietitian with deep expertise in Indian and global cuisine. ` +
      `Provide REAL, ACCURATE nutritional values — use standard food composition databases (ICMR, USDA). ` +
      `Account for the preparation method when calculating calories and fat content. ` +
      `For Indian dishes, suggest genuinely healthier Indian alternatives (not just generic "salad").\n`
    ) +
    ingredientAnalysisBlock +
    `${beneficialInstruction}\n\n` +
    `Return ONLY valid JSON — no markdown, no explanation, no placeholder text. Use real numbers:\n` +
    `{\n` +
    `  "product": "${label}",\n` +
    `  "category": "${category}",\n` +
    `  "productDescription": "Rich description including cooking method, key ingredients, cultural context, and what makes it distinctive.",\n` +
    `  "basicNutrients": { "calories": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0, "fibre_g": 0, "sugar_g": 0, "sodium_mg": 0 },\n` +
    `  "vitaminsAndMinerals": ["Specific vitamin/mineral with approximate % RDA if known"],\n` +
    `  "basicUse": "Best time to eat, ideal pairing, portion guidance.",\n` +
    `  "type": "${category}",\n` +
    (isPackaged
      ? `  "additives": ["Additive name (E-number) — health concern or function"],\n` +
      `  "redFlagIngredients": ["Ingredient name — why it is concerning"],\n` +
      `  "topIngredients": ["First ingredient (most by weight)", "Second", "Third"],\n` +
      `  "allergens": ["Declared allergen 1", "Undeclared but present allergen"],\n` +
      `  "totalIngredientCount": 0,\n` +
      `  "processingLevel": "NOVA Group X — reason (e.g. NOVA 4: contains emulsifiers, artificial flavour, preservatives)",\n`
      : ''
    ) +
    `  "positives": ["Specific health benefit with reason", "benefit 2", "benefit 3"],\n` +
    `  "negatives": ["Specific drawback with reason — cite the actual ingredient causing it", "drawback 2"],\n` +
    `  "verdict": "healthy | neutral | unhealthy",\n` +
    `  "uses": ["Energy", "Muscle repair", "Bone health"],\n` +
    `  "isBeneficialForUser": true,\n` +
    `  "medicalAlternatives": [],\n` +
    `  "recommendedFor": ["Specific group with reason"],\n` +
    `  "avoidFor": ["Specific group with reason — e.g. diabetics due to high GI"],\n` +
    `  "servingSuggestion": "Specific portion size in grams or cups, best time of day, pairing tips.",\n` +
    `  "alternatives": ["Specific healthier Indian alternative", "Specific lighter version", "Homemade version tip", "Nutrient-equivalent healthy swap"]\n` +
    `}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER — POST /api/identify
// ─────────────────────────────────────────────────────────────────────────────
async function identifyImage(req, res) {
  console.log('[POST /api/identify] Handler started');

  // ── Load user profile ──
  if (req.user) {
    try {
      const u = await Information.findOne({ authId: req.user }).lean();
      if (u) {
        req.userInfo = {
          fullName: u.fullName,
          dob: u.dateOfBirth,
          gender: u.gender,
          height: u.heightCm,
          weight: u.weightKg,
          purpose: u.purposes,
          allergies: u.allergies || [],
          diseases: u.diseases || [],
          dietPreference: u.dietPreference,
        };
      }
    } catch (dbErr) {
      console.error('[identify] DB error loading user profile:', dbErr.message);
    }
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  let processedPath = null;

  try {
    const originalPath = path.resolve(req.file.path);

    // ── PREPROCESS IMAGE ──
    console.log('[identify] Preprocessing image...');
    processedPath = await preprocessImage(originalPath);
    const imagePath = processedPath;

    // ── Build user context string ──
    const ui = req.userInfo;
    const allergiesStr = ui ? ((ui.allergies.length ? ui.allergies.join(', ') : 'None')) : 'None';
    const diseasesStr = ui ? ((ui.diseases.length ? ui.diseases.join(', ') : 'None')) : 'None';

    const dietHint = ui?.dietPreference
      ? `User follows a ${ui.dietPreference} diet. Tailor all recommendations accordingly.\n`
      : '';

    const userCtx = ui
      ? `User profile:\n` +
      `Name: ${ui.fullName} | Gender: ${ui.gender} | Height: ${ui.height}cm | Weight: ${ui.weight}kg\n` +
      `Health Goal: ${ui.purpose} | Diet: ${ui.dietPreference || 'No preference'}\n` +
      `Allergies: ${allergiesStr}\n` +
      `Medical Conditions: ${diseasesStr}\n` +
      `${dietHint}` +
      `IMPORTANT: Flag any conflicts with the user's allergies or medical conditions in "negatives" and set "isBeneficialForUser" accordingly.\n\n`
      : '';

    // ── STEP 1a: CLASSIFY (single focused call) ──
    console.log('[identify] Step 1a: Classifying image...');
    const category = await classifyImage(imagePath);
    console.log(`[identify] Category: ${category}`);

    // ── Graceful rejection ──
    if (category === 'rejected') {
      console.warn('[identify] Non-applicable item. Sending graceful rejection.');
      return res.status(200).json({
        rejected: true,
        detections: [],
        analysis: null,
        userMessage: "😊 This doesn't look like something I can analyse! EatiT is designed for food, beverages, medicines, and skincare products. Please try scanning a food dish, a packaged product, a medicine, or a skincare item.",
        suggestion: "Try scanning: a meal, a packaged snack, a medicine strip, a supplement bottle, or a skincare cream.",
      });
    }

    // ── STEP 1b: IDENTIFY (category-aware focused call) ──
    console.log('[identify] Step 1b: Identifying item...');
    let { label, confidence, prepMethod, portionSize } = await identifyItem(imagePath, category);
    console.log(`[identify] Label: "${label}" | Confidence: ${confidence}`);

    // ── STEP 1c: RE-IDENTIFY if label is missing or vague ──
    const isBadLabel = !label
      || label.length < 2
      || label.length > 110
      || /^(unknown|null|undefined|none|n\/a|food item|a food|the food|some food|an? (dish|item|product|snack|drink|beverage|food|indian|chinese|western|meal|curry|rice|bread)$)/i.test(label);

    if (isBadLabel || confidence === 'low') {
      console.log('[identify] Step 1c: Re-identifying with ultra-simple prompt...');
      const retryLabel = await reIdentify(imagePath, category);
      if (retryLabel && retryLabel.length >= 2) {
        label = retryLabel;
        confidence = 'medium';
        console.log(`[identify] Re-identified as: "${label}"`);
      }
    }

    // Final safety net
    if (!label || label.length < 2) {
      label = DEFAULT_LABELS[category] || 'Food Item';
      console.warn('[identify] Using default label:', label);
    }

    let effectiveCategory = category;
    let rawLabelText = null;
    let ingredientsData = null;

    // ── STEP 2: Deep OCR for packaged food ──
    if (category === 'packaged_food') {
      console.log('[identify] Step 2: Extracting packaged food data (nutrition + ingredients)...');
      const packagedData = await extractPackagedFoodData(imagePath);

      rawLabelText = packagedData.nutritionText || null;
      ingredientsData = packagedData.ingredientsData || null;

      if (rawLabelText || ingredientsData) {
        effectiveCategory = 'packaged_food';
        console.log(`[identify] Packaged data: nutrition=${!!rawLabelText} | ingredients=${!!ingredientsData} | count=${ingredientsData?.ingredientsCount || 0}`);
      }
    }

    const detections = [{ label, category: effectiveCategory }];

    // ── STEP 3: Deep analysis ──
    console.log(`[identify] Step 3: Analysing "${label}" | Category: ${effectiveCategory}`);

    const prepContext = {
      method: prepMethod,
      portionSize,
      allergies: allergiesStr,
      diseases: diseasesStr,
    };

    const analysisPrompt = buildAnalysisPrompt(label, effectiveCategory, userCtx, rawLabelText, prepContext, ingredientsData);

    const systemPrompts = {
      medicine: 'You are a qualified pharmacist and clinical pharmacologist. Respond ONLY with valid JSON. Always include a doctor consultation disclaimer. Use real pharmacological data.',
      skincare: 'You are a board-certified dermatologist with cosmetic formulation expertise. Respond ONLY with valid JSON. Use evidence-based dermatological knowledge.',
      packaged_food: 'You are a clinical dietitian specialising in packaged and ultra-processed foods. Respond ONLY with valid JSON. Extract precise nutritional values from the provided label text. Apply NOVA classification.',
      food: 'You are a senior clinical dietitian with deep expertise in Indian and global cuisine. Respond ONLY with valid JSON. Use real nutritional values from ICMR/USDA databases. Account for cooking method in calorie estimates.',
      beverage: 'You are a senior clinical dietitian and beverage nutrition specialist. Respond ONLY with valid JSON. Provide accurate hydration, sugar, and calorie data.',
    };

    const analysisResp = await generateText(analysisPrompt, {
      system: systemPrompts[effectiveCategory] || systemPrompts.food,
      json: true,
      temperature: 0.3,
    });

    let analysis = extractJSON(analysisResp, false) || {};
    analysis.category = effectiveCategory;

    // Placeholder for future Amazon + YouTube enrichment
    analysis.amazonProducts = [];
    analysis.youtubeRecipes = [];

    console.log(`[identify] ✅ Analysis complete for: "${label}"`);

    // ── RESPOND ──
    return res.json({
      rejected: false,
      detections,
      analysis,
      category: effectiveCategory,
      ...(rawLabelText && { rawLabelText }),
      ...(ingredientsData && { ingredientsData }),
    });

  } catch (err) {
    console.error('[POST /api/identify] Uncaught error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    // Clean up image files
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    if (processedPath) {
      cleanupProcessed(processedPath, req.file?.path ? path.resolve(req.file.path) : null);
    }
  }
}

module.exports = { identifyImage };