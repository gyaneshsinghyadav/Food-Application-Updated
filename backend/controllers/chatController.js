const fs = require('fs');
const path = require('path');
const { generateText, analyzeImage } = require('../utils/aiService.js');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const handleChat = async (req, res) => {
  const { message, sessionId } = req.body;
  const file = req.file;

  console.log('Request payload:', { message, file: file?.originalname, sessionId });

  let tempFilePath = null;

  try {
    let reply;

    if (file) {
      // Save the uploaded file temporarily
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      tempFilePath = path.join(uploadsDir, uniqueSuffix + '-' + file.originalname);

      console.log(`Saving temporary file to: ${tempFilePath}`);
      fs.writeFileSync(tempFilePath, file.buffer);

      // Use vision model to analyze the image with the user's message
      console.log(`Analyzing image with prompt: ${message}`);
      reply = await analyzeImage(tempFilePath, message || 'Describe this image.');
    } else {
      // Text-only chat — use text model
      reply = await generateText(message, {
        system: 'You are a helpful nutrition and health assistant. Give concise, practical advice about food, diet, and nutrition. Keep responses friendly and informative.',
      });
    }

    console.log('Response from AI:', reply);
    res.json({ reply: reply || 'No response from AI' });

  } catch (error) {
    console.error('Error communicating with AI:', error.message);
    res.status(500).json({ reply: 'Error: Unable to process your request. Make sure Ollama is running (ollama serve).' });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Deleted temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(`Error deleting temporary file ${tempFilePath}:`, cleanupError);
      }
    }
  }
};

module.exports = { handleChat };
