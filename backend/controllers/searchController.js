const { fetchAlternatives, fetchTopAmazonProduct, fetchTopYouTubeRecipe } = require('./alternatives.js'); // Correct path

async function searchAlternatives(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter `q` is required' });

  try {
    console.log('[searchAlternatives] Fetching alternatives...');
    const alternatives = await fetchAlternatives(q);

    if (!alternatives || alternatives.length === 0) {
      return res.status(404).json({ error: 'No alternatives found for the query.' });
    }

    console.log('[searchAlternatives] Fetching Amazon products and YouTube recipes...');
    const [amazonProducts, youtubeRecipes] = await Promise.all([
      Promise.all(alternatives.map(fetchTopAmazonProduct)),
      Promise.all(alternatives.map(fetchTopYouTubeRecipe))
    ]);

    res.json({
      amazonProducts: amazonProducts.filter(Boolean),
      youtubeRecipes: youtubeRecipes.filter(Boolean),
      query: q,
      alternatives
    });
  } catch (err) {
    console.error('[searchAlternatives] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch data', details: err.message });
  }
}

module.exports = { searchAlternatives };
