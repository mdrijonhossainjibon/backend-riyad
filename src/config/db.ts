import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    // Use env variable if available, otherwise fallback to local dev MongoDB (no auth)
    const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:Roman123@localhost:27017/Taskwave?authSource=admin'

    console.log('📊 MongoDB URI:', process.env)
    
    await mongoose.connect(mongoURI);
    
    console.log('📦 MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
  