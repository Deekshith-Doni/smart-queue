// One-off script to create a local admin user in MongoDB
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await Admin.findOne({ username });
    if (existing) {
      console.log(`Admin '${username}' already exists`);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);
    await Admin.create({ username, password: hashed });
    console.log(`Created admin '${username}' with the configured password.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
};

run();
