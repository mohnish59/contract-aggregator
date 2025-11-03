import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const connectDB = async () => {
  // Check if already connected
  if (mongoose.connections[0].readyState) {
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    console.log('Connected to MongoDB');
    return connection;
  } catch (error) {
    console.error('DB connection error:', error.message);
    // Re-throw error so API routes can handle it
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

export default connectDB;