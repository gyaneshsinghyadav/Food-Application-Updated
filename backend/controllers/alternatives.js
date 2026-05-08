const axios = require('axios');
const { generateText, extractJSON } = require('../utils/aiService.js');

// Fetch top-rated Amazon product for a query
async function fetchTopAmazonProduct(query) {
  try {
    const { data } = await axios.get(
      'https://api.scraperapi.com/structured/amazon/search',
      {
        params: {
          api_key: process.env.SCRAPERAPI_KEY,
          query,
          country: 'us'
        }
      }
    );
    const topProduct = (data.results || [])[0];
    return topProduct
      ? {
          name: topProduct.name,
          url: topProduct.url,
          image: topProduct.image,
          price: topProduct.price
        }
      : null;
  } catch (err) {
    console.error(`Error fetching Amazon data for ${query}:`, err.message);
    return null;
  }
}

// Fetch one healthy homemade recipe video from YouTube for a query
async function fetchTopYouTubeRecipe(query) {
  try {
    const searchTerm = `healthy homemade ${query} recipe`;
    const { data } = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: searchTerm,
          part: 'snippet',
          type: 'video',
          maxResults: 1,
          videoEmbeddable: 'true',
          safeSearch: 'moderate'
        }
      }
    );

    const video = data.items?.[0];
    return video
      ? {
          title: video.snippet.title,
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          thumbnail: video.snippet.thumbnails?.medium?.url || 'https://via.placeholder.com/320x180.png?text=No+Thumbnail',
          channelTitle: video.snippet.channelTitle,
          description: video.snippet.description || 'No description available'
        }
      : null;
  } catch (err) {
    console.error(`Error fetching YouTube data for ${query}:`, err.message);
    return null;
  }
}

// Fetch alternatives using local AI (Ollama)
async function fetchAlternatives(query) {
  try {
    const prompt =
      `You are a health and diet assistant. ` +
      `Suggest 4 healthy alternatives to "${query}" that are nutritious and suitable for a balanced diet. ` +
      `Focus on options that are lower in calories, higher in nutrients, or better for specific dietary needs. ` +
      `Return ONLY a JSON array like: ["Alternative 1", "Alternative 2", "Alternative 3", "Alternative 4"]. ` +
      `No other text.`;

    const result = await generateText(prompt, { json: true });
    const alternatives = extractJSON(result, true) || [];

    // Filter out invalid or duplicate alternatives
    const uniqueAlternatives = [...new Set(alternatives)].filter(
      alt => typeof alt === 'string' && alt.trim().length > 0
    );

    return uniqueAlternatives;
  } catch (err) {
    console.error(`Error fetching alternatives for ${query}:`, err.message);
    return [`Healthy alternative to ${query}`, `Nutritious version of ${query}`, `Low-calorie ${query}`, `Diet-friendly ${query}`];
  }
}

// API route handler for searching alternatives
async function searchAlternatives(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter `q` is required' });

  try {
    // Fetch alternatives using local AI
    const alternatives = await fetchAlternatives(q);
    console.log(`Got ${alternatives.length} alternatives for "${q}":`, alternatives);

    // Fetch Amazon products and YouTube recipes for each alternative
    const amazonPromises = alternatives.map(alt => fetchTopAmazonProduct(alt));
    const youtubePromises = alternatives.map(alt => fetchTopYouTubeRecipe(alt));

    const [amazonResults, youtubeResults] = await Promise.all([
      Promise.all(amazonPromises),
      Promise.all(youtubePromises)
    ]);

    // Filter out null results
    const amazonProducts = amazonResults.filter(Boolean);
    const youtubeRecipes = youtubeResults.filter(Boolean);

    res.json({
      amazonProducts,
      youtubeRecipes,
      query: q,
      alternatives
    });
  } catch (err) {
    console.error('Error in /api/search:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}

module.exports = {
  fetchTopAmazonProduct,
  fetchTopYouTubeRecipe,
  fetchAlternatives,
  searchAlternatives
};
