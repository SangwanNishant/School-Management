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
// Simply lists ALL schools (no proximity sorting)
app.get('/listSchools', async (req, res) => {
  try {
    const schools = await School.find({});
    res.json({
      success: true,
      count: schools.length,
      data: schools // Return raw list without distance calculations
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
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