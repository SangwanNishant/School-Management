require('dotenv').config(); // Load environment variables FIRST
const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

// Debug: Verify environment variables are loading
console.log('Environment Variables:', {
  MONGODB_URI: process.env.MONGODB_URI ? 'Loaded successfully' : 'NOT FOUND',
  PORT: process.env.PORT
});

// Connect to MongoDB
async function connectDB() {
  try {
    // Validate connection string exists
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Attempted connection string:', process.env.MONGODB_URI);
    process.exit(1); // Exit with failure
  }
}

connectDB();

// School Schema
const schoolSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'School name is required'],
    trim: true
  },
  address: { 
    type: String, 
    required: [true, 'Address is required'],
    trim: true
  },
  latitude: { 
    type: Number, 
    required: [true, 'Latitude is required'],
    min: -90,
    max: 90
  },
  longitude: { 
    type: Number, 
    required: [true, 'Longitude is required'],
    min: -180,
    max: 180
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create model
const School = mongoose.model('School', schoolSchema);

// Add School API
app.post('/addSchool', async (req, res) => {
  try {
    const { name, address, latitude, longitude } = req.body;
    
    // Create new school
    const school = new School({ 
      name, 
      address, 
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    });

    await school.validate(); // Explicit validation
    await school.save();
    
    res.status(201).json({
      success: true,
      message: 'School added successfully',
      data: school
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
      message: 'Failed to add school'
    });
  }
});

// List Schools API with proximity sorting
app.get('/listSchools', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Both latitude and longitude are required as query parameters'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude must be valid numbers'
      });
    }

    // Get all schools and calculate distances
    const schools = await School.find();
    const processedSchools = schools.map(school => {
      const distance = Math.sqrt(
        Math.pow(school.latitude - lat, 2) +
        Math.pow(school.longitude - lng, 2)
      );
      return {
        ...school.toObject(),
        distance: parseFloat(distance.toFixed(2)) // Round to 2 decimals
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      count: processedSchools.length,
      data: processedSchools
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: 'Server error while fetching schools'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    dbState: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 MongoDB URI: ${process.env.MONGODB_URI || 'Not configured'}`);
});