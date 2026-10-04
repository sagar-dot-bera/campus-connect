const mongoose = require('mongoose');

async function connectDB({ retries = 10, delayMs = 2000 } = {}) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(uri);
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      console.warn(`MongoDB connection attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = connectDB;
