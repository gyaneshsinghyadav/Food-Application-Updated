const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const mongoDB = require('./connectDb');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const path = require('path');
const fs = require('fs');
const userRoute = require('./routes/User.Auth.routes.js');
const userPersonalDetails = require('./routes/User.PersonalDetails.routes.js');
const postRoute = require('./routes/Post.routes.js');
const chatRoutes = require('./routes/chatRoutes');
const jwt = require('jsonwebtoken');
const routes = require('./routes/index.js');
const Information = require('./models/UserInformation.js');

const app = express();
const server = http.createServer(app);

// Database connection
mongoDB();

const PORT = process.env.PORT || 3000;

// Middleware
const upload = multer({ dest: 'uploads/' });
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));


// CORS configuration
app.use(cors({
  origin: [`${process.env.FRONTEND_URL || 'http://localhost:5173'}`],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add a simple health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check if Ollama is running
    const response = await fetch(`${process.env.OLLAMA_URL || 'http://127.0.0.1:11434'}/api/tags`);
    const isOllamaUp = response.ok;
    res.status(200).json({ status: 'ok', ollamaAvailable: isOllamaUp });
  } catch (error) {
    res.status(200).json({ status: 'ok', ollamaAvailable: false, error: error.message });
  }
});

// Middleware to inject user profile information if available
app.use(async (req, res, next) => {
  if (req.user) {
    const u = await Information.findOne({ authId: req.user }).lean();
    if (!u) {
      console.log('[Middleware] No additional user info found for:', req.user);
      return next(); 
    }
    console.log('[Middleware] User profile loaded:', u.fullName);
    req.userInfo = {
      fullName:       u.fullName,
      dob:            u.dateOfBirth,
      gender:         u.gender,
      height:         u.heightCm,
      weight:         u.weightKg,
      purpose:        u.purposes,
      allergies:      u.allergies,
      diseases:       u.diseases,
      dietPreference: u.dietPreference,
      documents:      u.documents,
    };
  }
  next();
});

// API Routes
app.use('/api', routes);
app.use('/chat', chatRoutes);
app.use('/api/v1/user', userRoute);
app.use('/api/v1/profile', userPersonalDetails);
app.use('/api/v1/posts', postRoute);


// Scanning routes are already defined in routes aggregator


// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});