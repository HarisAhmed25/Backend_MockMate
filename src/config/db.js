const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set in environment');
  // Newer mongoose versions (>=6) don't require/use these options.
  // Keep connection simple; you can add options here if needed (e.g., serverSelectionTimeoutMS).
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

module.exports = connectDB;
