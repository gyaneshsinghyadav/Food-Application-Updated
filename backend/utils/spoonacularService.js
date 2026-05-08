const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const SPOONACULAR_BASE = 'https://api.spoonacular.com';
const API_KEY = process.env.SPOONACULAR_API_KEY || '';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Analyze image file: classify food + get nutrition + matching recipes
// POST /food/images/analyze
// Returns: { category: { name, probability }, nutrition: { calories, fat, protein, carbs }, recipes: [] }
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeImageFile(imagePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: 'image/jpeg',
  });

  const resp = await axios.post(
    `${SPOONACULAR_BASE}/food/images/analyze`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        'x-api-key': API_KEY,
      },
      timeout: 30000,
    }
  );
  return resp.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Guess nutrition by dish name (title-based, for enrichment)
// GET /recipes/guessNutrition?title=
// ─────────────────────────────────────────────────────────────────────────────
async function guessNutritionByName(title) {
  try {
    const resp = await axios.get(`${SPOONACULAR_BASE}/recipes/guessNutrition`, {
      params: { title, apiKey: API_KEY },
      timeout: 15000,
    });
    return resp.data; // { calories, protein, fat, carbs, recipesUsed }
  } catch (err) {
    console.warn('[guessNutritionByName] Failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Search recipes by name (to get richer nutrition via recipe info)
// GET /recipes/complexSearch?query=&addRecipeNutrition=true
// ─────────────────────────────────────────────────────────────────────────────
async function searchRecipesWithNutrition(query, number = 3) {
  try {
    const resp = await axios.get(`${SPOONACULAR_BASE}/recipes/complexSearch`, {
      params: {
        query,
        addRecipeNutrition: true,
        addRecipeInformation: true,
        number,
        apiKey: API_KEY,
      },
      timeout: 15000,
    });
    return resp.data.results || [];
  } catch (err) {
    console.warn('[searchRecipesWithNutrition] Failed:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Get full recipe nutrition by ID
// GET /recipes/{id}/nutritionWidget.json
// ─────────────────────────────────────────────────────────────────────────────
async function getRecipeNutritionById(id) {
  try {
    const resp = await axios.get(
      `${SPOONACULAR_BASE}/recipes/${id}/nutritionWidget.json`,
      { params: { apiKey: API_KEY }, timeout: 15000 }
    );
    return resp.data; // { calories, carbs, fat, protein, nutrients: [...] }
  } catch (err) {
    console.warn('[getRecipeNutritionById] Failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a numeric value from a string like "508 kcal" → 508
 */
function extractNumber(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return Math.round(val);
  const n = parseFloat(String(val).replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
}

/**
 * Pull the most useful nutrient values out of a Spoonacular nutrients array.
 */
function parseNutrientArray(nutrients) {
  if (!Array.isArray(nutrients)) return {};
  const find = (name) => {
    const n = nutrients.find((x) => x.name?.toLowerCase() === name.toLowerCase());
    return n ? Math.round(n.amount || 0) : 0;
  };
  return {
    calories: find('Calories'),
    protein_g: find('Protein'),
    fat_g: find('Fat'),
    carbs_g: find('Carbohydrates'),
    fibre_g: find('Fiber'),
    sugar_g: find('Sugar'),
    sodium_mg: find('Sodium'),
  };
}

module.exports = {
  analyzeImageFile,
  guessNutritionByName,
  searchRecipesWithNutrition,
  getRecipeNutritionById,
  extractNumber,
  parseNutrientArray,
};
