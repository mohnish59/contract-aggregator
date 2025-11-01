import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return; // Already connected
  try {
    await mongoose.connect('mongodb+srv://admin:ADm1n123*@contracts.sol6g5b.mongodb.net/?appName=contracts');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('DB connection error:', error);
  }
};

export default connectDB;